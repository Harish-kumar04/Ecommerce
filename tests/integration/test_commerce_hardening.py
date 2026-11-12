"""End-to-end and integration tests for commerce hardening:
1. Logged-in User -> Customer resolution + FK enforcement + COD E2E order flow
2. Storefront API client no-fake-fallback contract + real order_id confirmation
3. Razorpay checkout_id, notes, callback_url, HMAC verification, idempotency, stock release, key hiding
4. Coupon deduplication, GST AFTER discount, tax_class='books'=0%, shared-phone customer lookup
5. Cumulative refund cap (Payment.amount_cents) & cumulative return cap (OrderItem.quantity)
6. Cart stock validation (out-of-stock & qty > stock rejected)
7. GET /orders/{id} line items & unified address keys (line1 / postal_code) across API + invoice
"""

from __future__ import annotations

import hashlib
import hmac
import json
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from apps.api.main import create_app
from infalette_auth.jwt import TokenManager
from infalette_auth.security import PasswordHasher
from infalette_commerce.customers import find_or_create_customer
from infalette_commerce.tax import TaxService
from infalette_config import get_settings
from infalette_database.base import Base
from infalette_database.models.cart import Cart
from infalette_database.models.checkout import Checkout, CheckoutStatus
from infalette_database.models.customer import Customer
from infalette_database.models.discount_code import DiscountCode
from infalette_database.models.order import Order, OrderStatus
from infalette_database.models.order_item import OrderItem
from infalette_database.models.payment import Payment, PaymentProvider, PaymentStatus
from infalette_database.models.product import Product, ProductStatus
from infalette_database.models.store import Store, StoreStatus
from infalette_database.models.tenant import Tenant
from infalette_database.models.user import User
from infalette_database.session import get_async_session
from infalette_integrations.razorpay.client import RazorpayClient


@pytest.fixture(autouse=True)
def _reset_settings_cache(monkeypatch):
    yield
    monkeypatch.undo()
    get_settings.cache_clear()


@pytest_asyncio.fixture
async def fk_db_session():
    """SQLite in-memory session with PRAGMA foreign_keys=ON strictly enforced."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine.sync_engine, "connect")
    def _enable_sqlite_fk(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with maker() as session:
            yield session
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_logged_in_user_cod_e2e_coupons_gst_line_items_and_invoice(fk_db_session, monkeypatch):
    """Full COD end-to-end flow for a logged-in User (with NO pre-existing Customer row):
    - Enforces SQLite PRAGMA foreign_keys=ON (catches users.id vs customers.id & events.actor_id FKs)
    - Verifies Razorpay hidden when keys unset
    - Auto-creates Customer row and links Cart, Checkout, and Order to customers.id
    - Validates coupon via /public/coupons/validate and deduplicates duplicate codes on /checkout
    - Computes 18% GST AFTER discount (not before)
    - Places COD order, decrements stock, clears cart
    - Lists order on GET /orders, returns line items + line1/postal_code on GET /orders/{id} and GET /invoices/{id}
    """
    monkeypatch.setenv("RAZORPAY_KEY_ID", "")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "")
    get_settings.cache_clear()

    slug = f"cod-e2e-{uuid.uuid4().hex[:6]}"
    tenant = Tenant(name="COD Books", slug=slug, plan="growth")
    fk_db_session.add(tenant)
    await fk_db_session.flush()

    store = Store(
        tenant_id=tenant.id,
        name="COD Books Store",
        slug=slug,
        currency="INR",
        status=StoreStatus.PUBLISHED,
        shipping_rules_json={"free_threshold_cents": 50000, "flat_rate_cents": 5000},
    )
    product = Product(
        tenant_id=tenant.id,
        name="Modern Architecture Guide",
        slug="modern-architecture-guide",
        sku="ARCH-001",
        price_cents=50000,  # Rs 500.00
        inventory_quantity=5,
        tax_class="standard",  # 18% GST to test post-discount tax calculation
        status=ProductStatus.ACTIVE,
    )
    coupon = DiscountCode(
        tenant_id=tenant.id,
        code="SAVE10",
        discount_type="percentage",
        value=10,
        is_active=True,
    )
    shopper_user = User(
        tenant_id=tenant.id,
        email=f"reader-{uuid.uuid4().hex[:6]}@example.com",
        password_hash=PasswordHasher().hash_password("ReaderPass123!"),
        first_name="Kavitha",
        last_name="R",
        role="customer",
        status="active",
    )
    fk_db_session.add_all([store, product, coupon, shopper_user])
    await fk_db_session.commit()

    # Confirm NO Customer row exists before cart/checkout
    pre_cust = (
        await fk_db_session.execute(
            select(Customer).where(Customer.tenant_id == tenant.id, Customer.email == shopper_user.email)
        )
    ).scalars().first()
    assert pre_cust is None

    token = TokenManager().create_access_token(
        subject=str(shopper_user.id),
        tenant_id=tenant.id,
        role="customer",
    )
    app = create_app()

    async def _override_session():
        yield fk_db_session

    app.dependency_overrides[get_async_session] = _override_session
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant": slug,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Public store info hides Razorpay when keys are missing
        store_resp = await client.get("/api/v1/public/store", headers={"X-Tenant": slug})
        assert store_resp.status_code == 200
        store_body = store_resp.json()
        assert store_body["razorpay_enabled"] is False
        assert store_body["payment_providers"]["razorpay"] is False
        assert store_body["payment_providers"]["cod"] is True

        # 2. Add 2 units (Rs 1,000 = 100000 paise) to cart as logged-in User
        cart_resp = await client.post(
            "/api/v1/cart/items",
            json={"product_id": str(product.id), "quantity": 2},
            headers=headers,
        )
        assert cart_resp.status_code == 201, cart_resp.text

        resolved_cust = (
            await fk_db_session.execute(
                select(Customer).where(Customer.tenant_id == tenant.id, Customer.email == shopper_user.email)
            )
        ).scalars().first()
        assert resolved_cust is not None
        assert resolved_cust.id != shopper_user.id

        cart_row = (
            await fk_db_session.execute(select(Cart).where(Cart.tenant_id == tenant.id))
        ).scalars().first()
        assert cart_row is not None
        assert cart_row.customer_id == resolved_cust.id

        # 3. Validate coupon via storefront public endpoint
        val_resp = await client.post(
            "/api/v1/public/coupons/validate",
            json={"code": "save10", "order_total_cents": 100000},
            headers={"X-Tenant": slug},
        )
        assert val_resp.status_code == 200, val_resp.text
        val_data = val_resp.json()
        assert val_data["code"] == "SAVE10"
        assert val_data["discount_cents"] == 10000
        assert val_data["final_total_cents"] == 90000

        # 4. Create checkout with duplicate coupon codes ["SAVE10", "save10"] and legacy/canonical address
        chk_resp = await client.post(
            "/api/v1/checkout/",
            json={
                "shipping_address": {
                    "name": "Kavitha R",
                    "phone": "9876543210",
                    "line1": "42 Anna Salai",
                    "city": "Chennai",
                    "state": "Tamil Nadu",
                    "postal_code": "600002",
                    "country": "India",
                },
                "discount_codes": ["SAVE10", "save10", " SAVE10 "],
            },
            headers=headers,
        )
        assert chk_resp.status_code == 201, chk_resp.text
        chk_data = chk_resp.json()
        checkout_id = chk_data["id"]

        # Subtotal = 100000, SAVE10 applied ONCE = 10000 -> net = 90000
        # GST 18% AFTER discount = 90000 * 0.18 = 16200 (NOT 18000!)
        # Free shipping threshold = 50000 (90000 >= 50000 -> shipping = 0)
        # Total = 90000 + 16200 = 106200
        assert chk_data["subtotal_cents"] == 100000
        assert chk_data["discount_cents"] == 10000
        assert chk_data["tax_cents"] == 16200
        assert chk_data["shipping_cents"] == 0
        assert chk_data["total_cents"] == 106200
        assert len(chk_data["discounts"]) == 1

        # 5. Confirm COD order
        cod_resp = await client.post(f"/api/v1/checkout/{checkout_id}/cod", headers=headers)
        assert cod_resp.status_code == 200, cod_resp.text
        cod_data = cod_resp.json()
        assert cod_data["cod"] is True
        order_id = cod_data["order_id"]
        assert uuid.UUID(order_id)

        # Stock decremented 5 -> 3 and cart cleared
        await fk_db_session.refresh(product)
        assert product.inventory_quantity == 3
        cart_after = await client.get("/api/v1/cart/", headers=headers)
        assert cart_after.status_code == 200
        assert cart_after.json()["items"] == []

        # Payment row linked to checkout_id
        pay_row = (
            await fk_db_session.execute(select(Payment).where(Payment.order_id == uuid.UUID(order_id)))
        ).scalars().first()
        assert pay_row is not None
        assert pay_row.checkout_id == uuid.UUID(checkout_id)

        # 6. GET /orders lists the customer's order
        orders_resp = await client.get("/api/v1/orders/", headers=headers)
        assert orders_resp.status_code == 200
        orders_list = orders_resp.json()
        assert len(orders_list) == 1
        assert orders_list[0]["id"] == order_id
        assert orders_list[0]["customer_id"] == str(resolved_cust.id)

        # 7. GET /orders/{order_id} includes line items and canonical address keys
        detail_resp = await client.get(f"/api/v1/orders/{order_id}", headers=headers)
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert len(detail["items"]) == 1
        assert len(detail["line_items"]) == 1
        item0 = detail["items"][0]
        assert item0["name"] == "Modern Architecture Guide"
        assert item0["sku"] == "ARCH-001"
        assert item0["quantity"] == 2
        assert item0["price_cents"] == 50000
        assert item0["discount_cents"] == 10000
        assert item0["tax_cents"] == 16200
        assert detail["shipping_address"]["line1"] == "42 Anna Salai"
        assert detail["shipping_address"]["postal_code"] == "600002"

        # 8. GET /invoices/{order_id} has unified address keys and post-discount GST totals
        inv_resp = await client.get(f"/api/v1/invoices/{order_id}", headers=headers)
        assert inv_resp.status_code == 200, inv_resp.text
        inv = inv_resp.json()
        assert inv["shipping_address"]["line1"] == "42 Anna Salai"
        assert inv["shipping_address"]["postal_code"] == "600002"
        assert inv["totals"]["discount_cents"] == 10000
        assert inv["totals"]["tax_total_cents"] == 16200
        assert inv["totals"]["grand_total_cents"] == 106200


def test_books_tax_class_is_zero_and_existing_rates_preserved():
    """tax_class 'books' must be 0% GST and existing rates must remain untouched."""
    svc = TaxService()
    assert svc.TAX_RATES["books"] == 0.0
    assert svc.TAX_RATES["standard"] == 0.18
    assert svc.TAX_RATES["reduced"] == 0.05
    assert svc.TAX_RATES["zero"] == 0.0
    assert svc.TAX_RATES["exempt"] == 0.0
    assert svc.calculate_tax(49900, "books", {"country": "India", "state": "Tamil Nadu"}) == 0
    assert svc.calculate_tax(10000, "standard", {"country": "India", "state": "Tamil Nadu"}) == 1800


@pytest.mark.asyncio
async def test_shared_phone_customer_lookup_never_crashes_and_matches_email_first(fk_db_session):
    """Multiple customers sharing a phone number must not trigger MultipleResultsFound or merge emails."""
    tenant = Tenant(name="Family Phone Store", slug=f"fam-{uuid.uuid4().hex[:6]}", plan="starter")
    fk_db_session.add(tenant)
    await fk_db_session.flush()

    cust_a = Customer(tenant_id=tenant.id, email="alice@example.com", phone="9876543210", first_name="Alice")
    cust_b = Customer(tenant_id=tenant.id, email="bob@example.com", phone="9876543210", first_name="Bob")
    fk_db_session.add_all([cust_a, cust_b])
    await fk_db_session.commit()

    # Email match resolves exact customer despite shared phone
    found_b = await find_or_create_customer(
        tenant.id,
        fk_db_session,
        email="bob@example.com",
        phone="9876543210",
    )
    assert found_b.id == cust_b.id

    # New email sharing same phone creates distinct Customer C without mutating A or B
    found_c = await find_or_create_customer(
        tenant.id,
        fk_db_session,
        email="charlie@example.com",
        phone="9876543210",
        first_name="Charlie",
    )
    await fk_db_session.commit()
    assert found_c.id not in (cust_a.id, cust_b.id)
    assert found_c.email == "charlie@example.com"

    # Phone-only lookup with shared phone does not crash
    found_phone_only = await find_or_create_customer(
        tenant.id,
        fk_db_session,
        email=None,
        phone="9876543210",
    )
    assert found_phone_only is not None


@pytest.mark.asyncio
async def test_cart_rejects_out_of_stock_and_qty_exceeding_stock(fk_db_session):
    """Cart must reject out-of-stock products and quantities exceeding available inventory."""
    slug = f"stock-{uuid.uuid4().hex[:6]}"
    tenant = Tenant(name="Stock Guard Store", slug=slug, plan="starter")
    fk_db_session.add(tenant)
    await fk_db_session.flush()

    oos_product = Product(
        tenant_id=tenant.id,
        name="Out of Stock Book",
        slug="oos-book",
        sku="OOS-001",
        price_cents=25000,
        inventory_quantity=0,
        status=ProductStatus.ACTIVE,
    )
    limited_product = Product(
        tenant_id=tenant.id,
        name="Limited Edition Book",
        slug="limited-book",
        sku="LIM-001",
        price_cents=35000,
        inventory_quantity=3,
        status=ProductStatus.ACTIVE,
    )
    fk_db_session.add_all([oos_product, limited_product])
    await fk_db_session.commit()

    app = create_app()

    async def _override_session():
        yield fk_db_session

    app.dependency_overrides[get_async_session] = _override_session
    headers = {"X-Tenant": slug, "X-Cart-Session-ID": f"sess-{uuid.uuid4().hex}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Out-of-stock rejected
        r_oos = await client.post(
            "/api/v1/cart/items",
            json={"product_id": str(oos_product.id), "quantity": 1},
            headers=headers,
        )
        assert r_oos.status_code == 400
        err_msg = (r_oos.json().get("error") or r_oos.json().get("detail") or "").lower()
        assert "out of stock" in err_msg

        # Initial add qty=4 > stock=3 rejected
        r_over = await client.post(
            "/api/v1/cart/items",
            json={"product_id": str(limited_product.id), "quantity": 4},
            headers=headers,
        )
        assert r_over.status_code == 400

        # Add qty=2 <= stock=3 succeeds
        r_ok = await client.post(
            "/api/v1/cart/items",
            json={"product_id": str(limited_product.id), "quantity": 2},
            headers=headers,
        )
        assert r_ok.status_code == 201
        item_id = r_ok.json()["id"]

        # Adding 2 more (2 + 2 = 4 > 3) rejected
        r_cum = await client.post(
            "/api/v1/cart/items",
            json={"product_id": str(limited_product.id), "quantity": 2},
            headers=headers,
        )
        assert r_cum.status_code == 400

        # Updating cart item to 4 > 3 rejected
        r_upd = await client.put(
            f"/api/v1/cart/items/{item_id}?quantity=4",
            headers=headers,
        )
        assert r_upd.status_code == 400


@pytest.mark.asyncio
async def test_razorpay_notes_callback_hmac_idempotency_and_failed_stock_release(fk_db_session, monkeypatch):
    """Razorpay:
    - create_payment_link sets notes.checkout_id and callback_url=/{tenant}/checkout?checkout_id={id}
    - Webhook rejects bad/missing HMAC with 403
    - Reconciles payment.captured and order.paid by notes.checkout_id (plink_* -> pay_*) idempotently
    - payment.failed releases reserved stock once and marks Checkout/Payment FAILED
    """
    webhook_secret = "whsec_rzp_test_secret_999"
    monkeypatch.setenv("RAZORPAY_KEY_ID", "")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "")
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", webhook_secret)
    monkeypatch.setenv("ALLOW_DUMMY_PAYMENTS", "true")
    monkeypatch.setenv("ALLOW_UNVERIFIED_WEBHOOKS", "false")
    monkeypatch.setenv("STOREFRONT_URL", "https://books.example.com")
    get_settings.cache_clear()

    slug = f"rzp-{uuid.uuid4().hex[:6]}"
    tenant = Tenant(name="Razorpay Store", slug=slug, plan="growth")
    fk_db_session.add(tenant)
    await fk_db_session.flush()

    store = Store(tenant_id=tenant.id, name="Razorpay Store", slug=slug, status=StoreStatus.PUBLISHED)
    product = Product(
        tenant_id=tenant.id,
        name="Tamil Classics Vol. 1",
        slug="tamil-classics-vol-1",
        sku="TAM-001",
        price_cents=40000,
        inventory_quantity=6,
        tax_class="books",  # 0% GST
        status=ProductStatus.ACTIVE,
    )
    fk_db_session.add_all([store, product])
    await fk_db_session.commit()

    app = create_app()

    async def _override_session():
        yield fk_db_session

    app.dependency_overrides[get_async_session] = _override_session

    def _sign(body_bytes: bytes) -> str:
        return hmac.new(webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # --- Flow A: Successful capture + duplicate replay idempotency ---
        sess_a = {"X-Tenant": slug, "X-Cart-Session-ID": f"sess-a-{uuid.uuid4().hex}"}
        await client.post(
            "/api/v1/cart/items",
            json={"product_id": str(product.id), "quantity": 2},
            headers=sess_a,
        )
        chk_a_resp = await client.post(
            "/api/v1/checkout/",
            json={
                "shipping_address": {
                    "name": "Arun",
                    "line1": "10 MG Road",
                    "city": "Chennai",
                    "state": "Tamil Nadu",
                    "postal_code": "600001",
                    "country": "India",
                }
            },
            headers=sess_a,
        )
        assert chk_a_resp.status_code == 201
        checkout_a_id = chk_a_resp.json()["id"]

        # Stock reserved immediately at checkout: 6 -> 4
        await fk_db_session.refresh(product)
        assert product.inventory_quantity == 4

        pay_init_resp = await client.post(
            f"/api/v1/checkout/{checkout_a_id}/pay",
            json={"provider": "razorpay"},
            headers=sess_a,
        )
        assert pay_init_resp.status_code == 200, pay_init_resp.text
        pay_init = pay_init_resp.json()
        assert pay_init["payment_url"] == f"https://books.example.com/{slug}/checkout?checkout_id={checkout_a_id}"
        assert pay_init["provider"] == "razorpay"

        pay_row_a = (
            await fk_db_session.execute(
                select(Payment).where(Payment.checkout_id == uuid.UUID(checkout_a_id))
            )
        ).scalars().first()
        assert pay_row_a is not None
        assert pay_row_a.provider_payment_id.startswith("plink_")

        # Also verify RazorpayClient outbound payload includes notes.checkout_id and callback_url
        captured_payload: dict = {}
        monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_livecheck")
        monkeypatch.setenv("RAZORPAY_KEY_SECRET", "rzp_secret_livecheck")
        get_settings.cache_clear()

        class _FakeResp:
            def raise_for_status(self):
                return None

            def json(self):
                return {"id": "plink_mock123", "short_url": "https://rzp.io/i/mock"}

        class _FakeAsyncClient:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                return False

            async def post(self, url, json=None, auth=None):
                captured_payload["url"] = url
                captured_payload["json"] = json
                captured_payload["auth"] = auth
                return _FakeResp()

        import httpx as _httpx

        monkeypatch.setattr(_httpx, "AsyncClient", _FakeAsyncClient)
        chk_a_obj = (
            await fk_db_session.execute(select(Checkout).where(Checkout.id == uuid.UUID(checkout_a_id)))
        ).scalars().first()
        rzp_client = RazorpayClient()
        assert rzp_client.is_configured() is True
        await rzp_client.create_payment_link(chk_a_obj, tenant.id, tenant_slug=slug)
        assert captured_payload["json"]["notes"]["checkout_id"] == checkout_a_id
        assert (
            captured_payload["json"]["callback_url"]
            == f"https://books.example.com/{slug}/checkout?checkout_id={checkout_a_id}"
        )
        assert captured_payload["json"]["callback_method"] == "get"

        # Invalid HMAC signature must be rejected with 403
        captured_event = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_real_98765",
                        "order_id": "order_rzp_111",
                        "amount": chk_a_obj.total_cents,
                        "notes": {"checkout_id": checkout_a_id},
                    }
                }
            },
        }
        raw_captured = json.dumps(captured_event).encode("utf-8")
        bad_resp = await client.post(
            "/api/v1/webhooks/payments/razorpay",
            content=raw_captured,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": "deadbeef"},
        )
        assert bad_resp.status_code == 403

        # Valid HMAC payment.captured reconciles plink_* via notes.checkout_id -> creates Order & upgrades to pay_*
        ok_resp = await client.post(
            "/api/v1/webhooks/payments/razorpay",
            content=raw_captured,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": _sign(raw_captured)},
        )
        assert ok_resp.status_code == 200, ok_resp.text

        await fk_db_session.refresh(pay_row_a)
        assert pay_row_a.status == PaymentStatus.SUCCEEDED
        assert pay_row_a.provider_payment_id == "pay_real_98765"
        assert pay_row_a.order_id is not None

        # Replay order.paid for the same checkout -> idempotent (still exactly 1 Order)
        order_paid_event = {
            "event": "order.paid",
            "payload": {
                "payment": {"entity": {"id": "pay_real_98765", "notes": {"checkout_id": checkout_a_id}}},
                "order": {"entity": {"id": "order_rzp_111", "notes": {"checkout_id": checkout_a_id}}},
            },
        }
        raw_order_paid = json.dumps(order_paid_event).encode("utf-8")
        replay_resp = await client.post(
            "/api/v1/webhooks/payments/razorpay",
            content=raw_order_paid,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": _sign(raw_order_paid)},
        )
        assert replay_resp.status_code == 200
        orders_for_a = (
            await fk_db_session.execute(
                select(Order).where(Order.checkout_id == uuid.UUID(checkout_a_id))
            )
        ).scalars().all()
        assert len(orders_for_a) == 1

        # GET /checkout/{id} returns confirmed order_id for callback redirect page
        chk_poll = await client.get(f"/api/v1/checkout/{checkout_a_id}", headers={"X-Tenant": slug})
        assert chk_poll.status_code == 200
        assert chk_poll.json()["order_id"] == str(orders_for_a[0].id)

        # --- Flow B: payment.failed releases reserved stock idempotently ---
        monkeypatch.setenv("RAZORPAY_KEY_ID", "")
        monkeypatch.setenv("RAZORPAY_KEY_SECRET", "")
        get_settings.cache_clear()

        sess_b = {"X-Tenant": slug, "X-Cart-Session-ID": f"sess-b-{uuid.uuid4().hex}"}
        await client.post(
            "/api/v1/cart/items",
            json={"product_id": str(product.id), "quantity": 3},
            headers=sess_b,
        )
        chk_b_resp = await client.post(
            "/api/v1/checkout/",
            json={
                "shipping_address": {
                    "name": "Bala",
                    "line1": "22 Cathedral Rd",
                    "city": "Chennai",
                    "state": "Tamil Nadu",
                    "postal_code": "600086",
                    "country": "India",
                }
            },
            headers=sess_b,
        )
        assert chk_b_resp.status_code == 201
        checkout_b_id = chk_b_resp.json()["id"]

        # Stock reserved: 4 -> 1
        await fk_db_session.refresh(product)
        assert product.inventory_quantity == 1

        pay_b_resp = await client.post(
            f"/api/v1/checkout/{checkout_b_id}/pay",
            json={"provider": "razorpay"},
            headers=sess_b,
        )
        assert pay_b_resp.status_code == 200

        failed_event = {
            "event": "payment.failed",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_failed_555",
                        "notes": {"checkout_id": checkout_b_id},
                    }
                }
            },
        }
        raw_failed = json.dumps(failed_event).encode("utf-8")
        fail_resp = await client.post(
            "/api/v1/webhooks/payments/razorpay",
            content=raw_failed,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": _sign(raw_failed)},
        )
        assert fail_resp.status_code == 200

        # Stock restored: 1 -> 4, Checkout FAILED, Payment FAILED
        await fk_db_session.refresh(product)
        assert product.inventory_quantity == 4
        chk_b_obj = (
            await fk_db_session.execute(select(Checkout).where(Checkout.id == uuid.UUID(checkout_b_id)))
        ).scalars().first()
        assert chk_b_obj.status == CheckoutStatus.FAILED

        # Duplicate payment.failed replay must NOT double-release stock (stays 4)
        fail_replay = await client.post(
            "/api/v1/webhooks/payments/razorpay",
            content=raw_failed,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": _sign(raw_failed)},
        )
        assert fail_replay.status_code == 200
        await fk_db_session.refresh(product)
        assert product.inventory_quantity == 4


@pytest.mark.asyncio
async def test_cumulative_refunds_and_returns_capped(fk_db_session, monkeypatch):
    """Cumulative refunds must cap at Payment.amount_cents and cumulative returns at OrderItem.quantity."""
    async def _fake_create_refund(self, payment_id, amount_cents, reason=None):
        return {"id": f"rfnd_{uuid.uuid4().hex[:8]}"}

    monkeypatch.setattr(RazorpayClient, "create_refund", _fake_create_refund)

    slug = f"caps-{uuid.uuid4().hex[:6]}"
    tenant = Tenant(name="Caps Store", slug=slug, plan="growth")
    fk_db_session.add(tenant)
    await fk_db_session.flush()

    owner = User(
        tenant_id=tenant.id,
        email=f"owner-{uuid.uuid4().hex[:6]}@example.com",
        password_hash=PasswordHasher().hash_password("OwnerPass123!"),
        first_name="Admin",
        last_name="Owner",
        role="tenant_owner",
        status="active",
    )
    customer = Customer(tenant_id=tenant.id, email="buyer@example.com", first_name="Buyer")
    product = Product(
        tenant_id=tenant.id,
        name="Hardcover Anthology",
        slug="hardcover-anthology",
        sku="ANTH-001",
        price_cents=5000,
        inventory_quantity=10,
        status=ProductStatus.ACTIVE,
    )
    fk_db_session.add_all([owner, customer, product])
    await fk_db_session.flush()

    order = Order(
        tenant_id=tenant.id,
        customer_id=customer.id,
        status=OrderStatus.DELIVERED,
        total_cents=10000,
        currency="INR",
        shipping_address_json={"line1": "1 Main St", "city": "Chennai", "postal_code": "600001"},
        billing_address_json={"line1": "1 Main St", "city": "Chennai", "postal_code": "600001"},
    )
    return_order = Order(
        tenant_id=tenant.id,
        customer_id=customer.id,
        status=OrderStatus.DELIVERED,
        total_cents=10000,
        currency="INR",
        shipping_address_json={"line1": "1 Main St", "city": "Chennai", "postal_code": "600001"},
        billing_address_json={"line1": "1 Main St", "city": "Chennai", "postal_code": "600001"},
    )
    fk_db_session.add_all([order, return_order])
    await fk_db_session.flush()

    order_item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        quantity=2,
        price_cents=5000,
        product_snapshot_json={"name": "Hardcover Anthology", "sku": "ANTH-001"},
        tax_cents=0,
    )
    return_order_item = OrderItem(
        order_id=return_order.id,
        product_id=product.id,
        quantity=2,
        price_cents=5000,
        product_snapshot_json={"name": "Hardcover Anthology", "sku": "ANTH-001"},
        tax_cents=0,
    )
    payment = Payment(
        tenant_id=tenant.id,
        order_id=order.id,
        provider=PaymentProvider.RAZORPAY,
        provider_payment_id="pay_cap_test_1",
        status=PaymentStatus.SUCCEEDED,
        amount_cents=10000,
        currency="INR",
    )
    fk_db_session.add_all([order_item, return_order_item, payment])
    await fk_db_session.commit()

    owner_token = TokenManager().create_access_token(
        subject=str(owner.id),
        tenant_id=tenant.id,
        role="tenant_owner",
    )
    app = create_app()

    async def _override_session():
        yield fk_db_session

    app.dependency_overrides[get_async_session] = _override_session
    headers = {"Authorization": f"Bearer {owner_token}", "X-Tenant": slug}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # --- Refunds cap at 10000 ---
        r1 = await client.post(
            f"/api/v1/orders/{order.id}/refunds",
            json={"amount_cents": 6000, "reason": "Partial damage"},
            headers=headers,
        )
        assert r1.status_code == 201, r1.text
        await fk_db_session.refresh(payment)
        assert payment.status == PaymentStatus.PARTIALLY_REFUNDED

        # 6000 + 5000 = 11000 > 10000 -> 400
        r_over = await client.post(
            f"/api/v1/orders/{order.id}/refunds",
            json={"amount_cents": 5000, "reason": "Too much"},
            headers=headers,
        )
        assert r_over.status_code == 400

        # Remaining 4000 -> 201 and status REFUNDED
        r2 = await client.post(
            f"/api/v1/orders/{order.id}/refunds",
            json={"amount_cents": 4000, "reason": "Remainder"},
            headers=headers,
        )
        assert r2.status_code == 201, r2.text
        await fk_db_session.refresh(payment)
        assert payment.status == PaymentStatus.REFUNDED

        # Any further refund (even 1 paise) rejected
        r3 = await client.post(
            f"/api/v1/orders/{order.id}/refunds",
            json={"amount_cents": 1, "reason": "Extra"},
            headers=headers,
        )
        assert r3.status_code == 422 or r3.status_code == 400

        # --- Returns cap at OrderItem.quantity == 2 ---
        ret1 = await client.post(
            f"/api/v1/orders/{return_order.id}/returns?reason=Defective",
            json=[{"product_id": str(product.id), "quantity": 1}],
            headers=headers,
        )
        assert ret1.status_code == 200, ret1.text

        # 1 + 2 = 3 > 2 -> 400
        ret_over = await client.post(
            f"/api/v1/orders/{return_order.id}/returns?reason=TooMany",
            json=[{"product_id": str(product.id), "quantity": 2}],
            headers=headers,
        )
        assert ret_over.status_code == 400

        # Remaining 1 -> 200
        ret2 = await client.post(
            f"/api/v1/orders/{return_order.id}/returns?reason=SecondCopy",
            json=[{"product_id": str(product.id), "quantity": 1}],
            headers=headers,
        )
        assert ret2.status_code == 200, ret2.text

        # 3rd unit -> 400
        ret3 = await client.post(
            f"/api/v1/orders/{return_order.id}/returns?reason=ThirdCopy",
            json=[{"product_id": str(product.id), "quantity": 1}],
            headers=headers,
        )
        assert ret3.status_code == 400
