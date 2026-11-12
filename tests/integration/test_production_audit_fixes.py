"""Regression tests for production audit fixes (P0/P1/P2)."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from sqlalchemy import select

from infalette_database.models.tenant import Tenant
from infalette_database.models.customer import Customer
from infalette_database.models.product import Product
from infalette_auth.jwt import TokenManager
from infalette_validation.schemas import CartItemCreate

from apps.api.modules.auth import routes as auth_routes
from apps.api.modules.auth import services as auth_services
from apps.api.modules.platform import routes as platform_routes
from apps.api.modules.cart import services as cart_services
from apps.api.modules.product import services as product_services
from apps.api.modules.public import routes as public_routes
from apps.api.modules.media import routes as media_routes


@pytest.mark.asyncio
async def test_auth_privilege_escalation_blocked(db_session):
    """Tenant owners and store managers cannot mint platform_owner or higher-privilege accounts."""
    tenant = Tenant(name="Esc Tenant", slug=f"esc-{uuid.uuid4().hex[:6]}", plan="starter")
    db_session.add(tenant)
    await db_session.flush()

    tenant_owner = SimpleNamespace(id=uuid.uuid4(), tenant_id=tenant.id, role="tenant_owner")
    store_manager = SimpleNamespace(id=uuid.uuid4(), tenant_id=tenant.id, role="store_manager")

    # Tenant owner attempting to create platform_owner -> 403
    with pytest.raises(HTTPException) as exc1:
        await auth_routes.create_tenant_user(
            payload={
                "email": "hacker@esc.test",
                "password": "StrongPassword123!",
                "first_name": "Hack",
                "last_name": "Root",
                "role": "platform_owner",
            },
            user=tenant_owner,
            session=db_session,
        )
    assert exc1.value.status_code == 403

    # Store manager attempting to create tenant_owner -> 403
    with pytest.raises(HTTPException) as exc2:
        await auth_routes.create_tenant_user(
            payload={
                "email": "mgr@esc.test",
                "password": "StrongPassword123!",
                "first_name": "Mgr",
                "last_name": "Esc",
                "role": "tenant_owner",
            },
            user=store_manager,
            session=db_session,
        )
    assert exc2.value.status_code == 403

    # Tenant admin attempting to access platform-owner endpoints -> 403
    tenant_admin = SimpleNamespace(id=uuid.uuid4(), tenant_id=tenant.id, role="admin")
    with pytest.raises(HTTPException) as exc3:
        platform_routes._require_platform(tenant_admin)
    assert exc3.value.status_code == 403


@pytest.mark.asyncio
async def test_cart_item_idor_blocked_and_total_recalculated(db_session):
    """Customer B cannot modify or delete Customer A's cart items within the same tenant."""
    tenant = Tenant(name="Cart IDOR Tenant", slug=f"cart-{uuid.uuid4().hex[:6]}", plan="starter")
    db_session.add(tenant)
    await db_session.flush()

    cust_a = Customer(tenant_id=tenant.id, email="a@cart.test", first_name="A", last_name="One")
    cust_b = Customer(tenant_id=tenant.id, email="b@cart.test", first_name="B", last_name="Two")
    product = Product(
        tenant_id=tenant.id,
        name="Secure Widget",
        slug=f"widget-{uuid.uuid4().hex[:6]}",
        sku=f"SKU-{uuid.uuid4().hex[:6]}",
        price_cents=1500,
        sale_price_cents=1200,
        inventory=20,
        status="active",
    )
    db_session.add_all([cust_a, cust_b, product])
    await db_session.commit()

    # Customer A adds item (should use sale_price_cents = 1200)
    item = await cart_services.add_to_cart(
        tenant.id,
        cust_a.id,
        CartItemCreate(product_id=product.id, quantity=2),
        db_session,
    )
    assert item.price_cents == 1200

    cart_a = await cart_services.get_or_create_cart(tenant.id, cust_a.id, db_session)
    assert cart_a.total_cents == 2400

    # Customer B tries to update Customer A's cart item -> 404
    with pytest.raises(HTTPException) as exc_upd:
        await cart_services.update_cart_item(
            item.id,
            5,
            db_session,
            tenant_id=tenant.id,
            customer_id=cust_b.id,
        )
    assert exc_upd.value.status_code == 404

    # Customer B tries to remove Customer A's cart item -> 404
    with pytest.raises(HTTPException) as exc_rem:
        await cart_services.remove_from_cart(
            item.id,
            db_session,
            tenant_id=tenant.id,
            customer_id=cust_b.id,
        )
    assert exc_rem.value.status_code == 404

    # Customer A updates their own item -> 200 and cart total updates
    updated = await cart_services.update_cart_item(
        item.id,
        3,
        db_session,
        tenant_id=tenant.id,
        customer_id=cust_a.id,
    )
    assert updated.quantity == 3
    cart_a_after = await cart_services.get_or_create_cart(tenant.id, cust_a.id, db_session)
    assert cart_a_after.total_cents == 3600


@pytest.mark.asyncio
async def test_variant_update_and_delete_orm_fix(db_session):
    """update_variant and delete_variant operate on ORM instances rather than serialized dicts."""
    tenant = Tenant(name="Variant Tenant", slug=f"var-{uuid.uuid4().hex[:6]}", plan="starter")
    db_session.add(tenant)
    await db_session.flush()

    product = Product(
        tenant_id=tenant.id,
        name="T-Shirt",
        slug=f"tshirt-{uuid.uuid4().hex[:6]}",
        sku=f"TS-{uuid.uuid4().hex[:6]}",
        price_cents=2000,
        status="active",
    )
    db_session.add(product)
    await db_session.commit()

    created = await product_services.create_variant(
        tenant.id,
        product.id,
        {
            "sku": f"TS-L-{uuid.uuid4().hex[:4]}",
            "price_cents": 2200,
            "inventory_quantity": 10,
            "dimensions_json": {"size": "L"},
        },
        db_session,
    )
    variant_id = uuid.UUID(str(created["id"]))

    updated = await product_services.update_variant(
        tenant.id,
        product.id,
        variant_id,
        {"price_cents": 2500, "inventory_quantity": 8},
        db_session,
    )
    assert updated["price_cents"] == 2500
    assert updated["inventory_quantity"] == 8

    deleted = await product_services.delete_variant(tenant.id, product.id, variant_id, db_session)
    assert deleted is True
    assert await product_services.get_variant(tenant.id, product.id, variant_id, db_session) is None


@pytest.mark.asyncio
async def test_password_reset_and_public_customer_dpdp_resolution(db_session):
    """Password reset token consumption is async-safe and DPDP customer resolution maps User -> Customer."""
    tenant = Tenant(name="Auth DPDP Tenant", slug=f"dpdp-{uuid.uuid4().hex[:6]}", plan="starter")
    db_session.add(tenant)
    await db_session.commit()

    # Register customer via public service (creates User + Customer)
    reg = await auth_services.customer_register(
        auth_routes.CustomerRegisterRequest(
            email="shopper@dpdp.test",
            password="InitialPassword123!",
            first_name="Priya",
            last_name="Sharma",
        ),
        db_session,
        tenant.id,
    )
    assert reg.access_token

    # Resolve shopper Customer.id from decoded JWT payload
    payload = TokenManager().decode_token(reg.access_token)
    eff_tenant, resolved_cid = await public_routes._resolve_shopper_customer_id(payload, db_session)
    cust_row = (
        await db_session.execute(
            select(Customer).where(Customer.tenant_id == tenant.id, Customer.email == "shopper@dpdp.test")
        )
    ).scalar_one()
    assert eff_tenant == tenant.id
    assert resolved_cid == cust_row.id

    # Forgot + reset password round-trip (reset_token is never echoed in response)
    auth_services._RESET_TOKENS.clear()
    forgot = await auth_services.forgot_password("shopper@dpdp.test", db_session, tenant_id=tenant.id)
    assert "reset_token" not in forgot
    stored_token = next(iter(auth_services._RESET_TOKENS.keys()))
    reset_res = await auth_services.reset_password(stored_token, "NewSecurePass456!", db_session)
    assert reset_res["status"] == "password_reset"


def test_media_key_tenant_isolation_and_sanitization():
    """Media module enforces strict filename sanitization and tenant prefix checks."""
    tid = uuid.uuid4()
    sanitized = media_routes._sanitize_key(tid, "../../etc/passwd")
    assert sanitized.startswith(f"tenants/{tid}/")
    assert sanitized.endswith("_passwd")
    assert ".." not in sanitized
    valid_key = f"tenants/{tid}/products/photo.png"
    assert media_routes._ensure_tenant_key(tid, valid_key) == valid_key

    with pytest.raises(HTTPException) as exc:
        media_routes._ensure_tenant_key(tid, f"tenants/{uuid.uuid4()}/products/photo.png")
    assert exc.value.status_code == 403
