"""Security hardening tests for RBAC, token isolation, webhooks, ownership, and startup guards."""

from __future__ import annotations

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import create_app
from infalette_auth.jwt import TokenManager
from infalette_auth.security import PasswordHasher
from infalette_commerce.invoice import InvoiceService
from infalette_config import Settings, get_settings
from infalette_database.models.customer import Customer
from infalette_database.models.order import Order, OrderStatus
from infalette_database.models.tenant import Tenant
from infalette_database.models.user import User
from infalette_database.session import get_async_session


@pytest.mark.asyncio
async def test_customer_token_gets_403_on_five_admin_endpoints(db_session):
    """Customer tokens must get HTTP 403 on merchant/admin endpoints."""
    tenant = Tenant(name="RBAC Test Store", slug=f"rbac-{uuid.uuid4().hex[:6]}", plan="growth")
    db_session.add(tenant)
    await db_session.flush()

    customer_user = User(
        tenant_id=tenant.id,
        email=f"shopper-{uuid.uuid4().hex[:6]}@example.com",
        password_hash=PasswordHasher().hash_password("ShopperPass123!"),
        first_name="Shopper",
        last_name="Test",
        role="customer",
        status="active",
    )
    db_session.add(customer_user)
    await db_session.commit()

    tm = TokenManager()
    customer_access_token = tm.create_access_token(
        subject=str(customer_user.id),
        tenant_id=tenant.id,
        role="customer",
    )
    decoded = tm.decode_token(customer_access_token)
    assert decoded.role == "customer"
    assert decoded.token_type == "access"

    app = create_app()

    async def _override_session():
        yield db_session

    app.dependency_overrides[get_async_session] = _override_session
    headers = {
        "Authorization": f"Bearer {customer_access_token}",
        "X-Tenant": str(tenant.id),
    }

    fake_order_id = uuid.uuid4()
    admin_calls = [
        ("POST", "/api/v1/products/", {"name": "Unauthorized Book", "price_cents": 50000}),
        ("POST", "/api/v1/discounts/", {"code": "HACK50", "discount_type": "percentage", "value": 50}),
        ("GET", "/api/v1/customers/", None),
        ("PATCH", f"/api/v1/orders/{fake_order_id}/status", {"status": "shipped"}),
        ("GET", "/api/v1/stores/", None),
    ]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for method, path, body in admin_calls:
            resp = await client.request(method, path, json=body, headers=headers)
            assert resp.status_code == 403, f"Expected 403 for {method} {path}, got {resp.status_code}: {resp.text}"


@pytest.mark.asyncio
async def test_refresh_token_rejected_as_access_token(db_session):
    """Refresh tokens must carry token_type='refresh' and be rejected by get_current_user (401)."""
    tenant = Tenant(name="Token Type Store", slug=f"tok-{uuid.uuid4().hex[:6]}", plan="starter")
    db_session.add(tenant)
    await db_session.flush()

    owner = User(
        tenant_id=tenant.id,
        email=f"owner-{uuid.uuid4().hex[:6]}@example.com",
        password_hash=PasswordHasher().hash_password("OwnerSecure123!"),
        first_name="Owner",
        last_name="User",
        role="tenant_owner",
        status="active",
    )
    db_session.add(owner)
    await db_session.commit()

    tm = TokenManager()
    refresh_tok = tm.create_refresh_token(subject=str(owner.id), tenant_id=tenant.id, role="tenant_owner")
    decoded = tm.decode_token(refresh_tok)
    assert decoded.token_type == "refresh"
    assert decoded.role == "tenant_owner"

    app = create_app()

    async def _override_session():
        yield db_session

    app.dependency_overrides[get_async_session] = _override_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {refresh_tok}"},
        )
        assert resp.status_code == 401


def test_startup_fails_on_default_secret_key_outside_development(monkeypatch):
    """create_app() must fail if SECRET_KEY is the default and APP_ENV != development."""
    monkeypatch.setenv("INFALETTE_ENV_FILE", "")
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SECRET_KEY", "change-me-to-a-long-random-string")
    get_settings.cache_clear()
    try:
        with pytest.raises(RuntimeError, match="SECRET_KEY"):
            create_app()
    finally:
        get_settings.cache_clear()


def test_vercel_defaults_app_env_to_production_and_requires_pooled_db(monkeypatch):
    """When VERCEL is set, app_env defaults to 'production' and missing DATABASE_URL_POOLED raises RuntimeError."""
    monkeypatch.setenv("INFALETTE_ENV_FILE", "")
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("DATABASE_URL_POOLED", raising=False)
    s = Settings(_env_file=None)
    assert s.app_env == "production"
    with pytest.raises(RuntimeError, match="DATABASE_URL_POOLED"):
        s.database.resolved_url()


@pytest.mark.asyncio
async def test_clerk_webhook_returns_503_when_secret_unset(db_session, monkeypatch):
    """Unsigned Clerk webhooks must be rejected with 503 when CLERK_WEBHOOK_SECRET is unset."""
    monkeypatch.delenv("CLERK_WEBHOOK_SECRET", raising=False)
    get_settings.cache_clear()

    tenant = Tenant(name="Clerk Store", slug=f"clerk-{uuid.uuid4().hex[:6]}", plan="starter")
    db_session.add(tenant)
    await db_session.flush()

    victim_email = f"victim-{uuid.uuid4().hex[:6]}@example.com"
    victim = User(
        tenant_id=tenant.id,
        email=victim_email,
        password_hash=PasswordHasher().hash_password("VictimPass123!"),
        first_name="Victim",
        last_name="Admin",
        role="tenant_owner",
        status="active",
    )
    db_session.add(victim)
    await db_session.commit()

    app = create_app()

    async def _override_session():
        yield db_session

    app.dependency_overrides[get_async_session] = _override_session

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/webhooks/clerk",
                json={
                    "type": "user.updated",
                    "data": {
                        "id": "user_attacker_123",
                        "email_addresses": [{"id": "idn_1", "email_address": victim_email}],
                        "primary_email_address_id": "idn_1",
                    },
                },
            )
            assert resp.status_code == 503
            await db_session.refresh(victim)
            assert victim.clerk_user_id is None
    finally:
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_order_and_invoice_customer_ownership_and_html_escaping(db_session):
    """Customers can read only their own orders/invoices; InvoiceService.render_html escapes HTML."""
    tenant = Tenant(name="Order Own Store", slug=f"own-{uuid.uuid4().hex[:6]}", plan="starter")
    db_session.add(tenant)
    await db_session.flush()

    email_a = f"alice-{uuid.uuid4().hex[:6]}@example.com"
    email_b = f"bob-{uuid.uuid4().hex[:6]}@example.com"
    user_a = User(
        tenant_id=tenant.id,
        email=email_a,
        password_hash="x",
        first_name="Alice",
        last_name="One",
        role="customer",
        status="active",
    )
    user_b = User(
        tenant_id=tenant.id,
        email=email_b,
        password_hash="x",
        first_name="Bob",
        last_name="Two",
        role="customer",
        status="active",
    )
    cust_a = Customer(tenant_id=tenant.id, email=email_a, first_name="Alice", last_name="One")
    db_session.add_all([user_a, user_b, cust_a])
    await db_session.flush()

    order_a = Order(
        tenant_id=tenant.id,
        customer_id=cust_a.id,
        total_cents=25000,
        currency="INR",
        status=OrderStatus.CONFIRMED,
        shipping_address_json={"line1": "10 Anna Salai", "city": "Chennai", "state": "TN", "postal_code": "600002", "country": "IN"},
        billing_address_json={"line1": "10 Anna Salai", "city": "Chennai", "state": "TN", "postal_code": "600002", "country": "IN"},
    )
    db_session.add(order_a)
    await db_session.commit()

    tm = TokenManager()
    tok_a = tm.create_access_token(str(user_a.id), tenant.id, role="customer")
    tok_b = tm.create_access_token(str(user_b.id), tenant.id, role="customer")

    app = create_app()

    async def _override_session():
        yield db_session

    app.dependency_overrides[get_async_session] = _override_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Customer A can read own order and invoice
        r_own_order = await client.get(f"/api/v1/orders/{order_a.id}", headers={"Authorization": f"Bearer {tok_a}"})
        assert r_own_order.status_code == 200
        r_own_inv = await client.get(f"/api/v1/invoices/{order_a.id}", headers={"Authorization": f"Bearer {tok_a}"})
        assert r_own_inv.status_code == 200

        # Customer B gets 403 on Customer A's order and invoice
        r_other_order = await client.get(f"/api/v1/orders/{order_a.id}", headers={"Authorization": f"Bearer {tok_b}"})
        assert r_other_order.status_code == 403
        r_other_inv = await client.get(f"/api/v1/invoices/{order_a.id}", headers={"Authorization": f"Bearer {tok_b}"})
        assert r_other_inv.status_code == 403

    # Verify InvoiceService.render_html escapes XSS payloads
    xss_html = InvoiceService().render_html({
        "invoice_number": 'INV-1"><script>alert(1)</script>',
        "order_id": "<img src=x onerror=alert(2)>",
        "tenant_name": "<b>Evil Store</b>",
        "customer": {"first_name": "<script>evil()</script>", "email": 'a"b@c.com'},
        "billing_address": {"line1": "<svg onload=alert(3)>"},
        "shipping_address": {"line1": "<iframe src=javascript:alert(4)>"},
        "line_items": [{"name": "<script>book()</script>", "sku": "SKU<1>", "quantity": 1, "price_display": "100.00", "line_total_display": "100.00", "tax_display": "0.00"}],
        "totals": {},
        "gst_breakdown": {},
    })
    assert "<script>" not in xss_html
    assert "<svg onload=" not in xss_html
    assert "<iframe " not in xss_html
    assert "&lt;script&gt;" in xss_html


@pytest.mark.asyncio
async def test_hardcoded_demo_admin_seed_login_removed(db_session):
    """Hard-coded admin@demo.test / admin1234 backdoor login must be rejected."""
    from apps.api.modules.auth.services import login
    from infalette_auth.schemas import LoginRequest

    tenant = Tenant(name="No Backdoor Store", slug=f"nb-{uuid.uuid4().hex[:6]}", plan="starter")
    db_session.add(tenant)
    await db_session.commit()

    with pytest.raises(ValueError, match="Invalid email or password"):
        await login(LoginRequest(email="admin@demo.test", password="admin1234"), db_session)
