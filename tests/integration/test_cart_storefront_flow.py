"""Integration tests for storefront cart serialization, fallback ID guard, and guest COD -> admin orders flow."""

from __future__ import annotations

import json
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from apps.api.main import create_app
from infalette_auth.jwt import TokenManager
from infalette_auth.security import PasswordHasher
from infalette_database.base import Base
from infalette_database.models.product import Product, ProductStatus
from infalette_database.models.store import Store, StoreStatus
from infalette_database.models.tenant import Tenant
from infalette_database.models.user import User
from infalette_database.session import get_async_session


@pytest_asyncio.fixture
async def db_session():
    """SQLite in-memory session with foreign keys strictly enforced."""
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
async def test_seeded_product_get_cart_returns_complete_item_fields(db_session):
    """Requirement 2: Add a real seeded product (doctor-kalaignar, price_cents=10000) to a cart
    and assert GET /api/v1/cart/ items include product_id, name, slug, price_cents, quantity,
    image_url, and stock, plus server-side subtotal."""
    tenant_slug = "muthamilarignar"
    tenant = Tenant(name="Muthamilarignar Pathipagam", slug=tenant_slug, plan="growth")
    db_session.add(tenant)
    await db_session.flush()

    store = Store(
        tenant_id=tenant.id,
        name="Muthamilarignar Pathipagam",
        slug=tenant_slug,
        status=StoreStatus.PUBLISHED,
        currency="INR",
    )
    product = Product(
        tenant_id=tenant.id,
        name="டாக்டர் கலைஞர் | Doctor Kalaignar",
        slug="doctor-kalaignar",
        sku="MP-BOOK-027",
        price_cents=10000,
        sale_price_cents=None,
        tax_class="books",
        inventory_quantity=25,
        inventory_track=True,
        image_url="https://res.cloudinary.com/dikaxqooz/image/upload/v1794458056/doctor_kalaignar.png",
        images_json=["https://res.cloudinary.com/dikaxqooz/image/upload/v1794458056/doctor_kalaignar.png"],
        status=ProductStatus.ACTIVE,
    )
    db_session.add_all([store, product])
    await db_session.commit()

    app = create_app()

    async def _override_session():
        yield db_session

    app.dependency_overrides[get_async_session] = _override_session

    guest_headers = {
        "X-Tenant": tenant_slug,
        "X-Cart-Session-ID": f"sess-{uuid.uuid4()}",
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Reject fallback slug IDs (never create phantom ₹0 "Book" items)
        bad_resp = await client.post(
            "/api/v1/cart/items",
            json={"product_id": "doctor-kalaignar", "quantity": 1},
            headers=guest_headers,
        )
        assert bad_resp.status_code == 422

        # Add real seeded UUID product (qty = 2)
        add_resp = await client.post(
            "/api/v1/cart/items",
            json={"product_id": str(product.id), "quantity": 2},
            headers=guest_headers,
        )
        assert add_resp.status_code == 201, add_resp.text

        cart_resp = await client.get("/api/v1/cart/", headers=guest_headers)
        assert cart_resp.status_code == 200, cart_resp.text
        cart_json = cart_resp.json()
        print("\nACTUAL_GET_CART_JSON=" + json.dumps(cart_json, ensure_ascii=False, indent=2))

        assert cart_json["total_cents"] == 20000
        assert cart_json["currency"] == "INR"
        assert len(cart_json["items"]) == 1

        item = cart_json["items"][0]
        assert item["product_id"] == str(product.id)
        assert item["name"] == "டாக்டர் கலைஞர் | Doctor Kalaignar"
        assert item["slug"] == "doctor-kalaignar"
        assert item["price_cents"] == 10000
        assert item["unit_price_cents"] == 10000
        assert item["line_total_cents"] == 20000
        assert item["quantity"] == 2
        assert item["image_url"] == "https://res.cloudinary.com/dikaxqooz/image/upload/v1794458056/doctor_kalaignar.png"
        assert item["stock"] == 25
        assert item["inventory_quantity"] == 25


@pytest.mark.asyncio
async def test_two_books_cart_to_guest_cod_order_visible_in_admin_orders(db_session):
    """Requirement 6: Add 2 different books (regular + sale price) -> GET /cart shows both names,
    covers, correct unit prices, line totals, and server-side subtotal -> guest COD checkout
    creates a confirmed order that appears in GET /orders for admin."""
    tenant_slug = f"mp-live-{uuid.uuid4().hex[:6]}"
    tenant = Tenant(name="Muthamilarignar Pathipagam", slug=tenant_slug, plan="growth")
    db_session.add(tenant)
    await db_session.flush()

    store = Store(
        tenant_id=tenant.id,
        name="Muthamilarignar Pathipagam",
        slug=tenant_slug,
        status=StoreStatus.PUBLISHED,
        currency="INR",
    )
    book1 = Product(
        tenant_id=tenant.id,
        name="டாக்டர் கலைஞர் | Doctor Kalaignar",
        slug="doctor-kalaignar",
        sku="MP-BOOK-027",
        price_cents=10000,
        sale_price_cents=None,
        tax_class="books",
        inventory_quantity=20,
        inventory_track=True,
        image_url="https://res.cloudinary.com/dikaxqooz/image/upload/v1794458056/doctor_kalaignar.png",
        status=ProductStatus.ACTIVE,
    )
    book2 = Product(
        tenant_id=tenant.id,
        name="திராவிட சினிமா | Dravida Cinema",
        slug="dravida-cinema",
        sku="MP-BOOK-026",
        price_cents=20000,
        sale_price_cents=17500,
        tax_class="books",
        inventory_quantity=15,
        inventory_track=True,
        image_url="https://res.cloudinary.com/dikaxqooz/image/upload/v1794458056/9_dravida_cinema_takf6r.png",
        status=ProductStatus.ACTIVE,
    )
    admin_user = User(
        tenant_id=tenant.id,
        email="owner@muthamilarignar.in",
        password_hash=PasswordHasher().hash_password("StrongPass123!"),
        first_name="Store",
        last_name="Owner",
        role="owner",
        status="active",
    )
    db_session.add_all([store, book1, book2, admin_user])
    await db_session.commit()

    admin_token = TokenManager().create_access_token(
        subject=str(admin_user.id),
        tenant_id=tenant.id,
        role="owner",
    )

    app = create_app()

    async def _override_session():
        yield db_session

    app.dependency_overrides[get_async_session] = _override_session

    guest_headers = {
        "X-Tenant": tenant_slug,
        "X-Cart-Session-ID": f"guest-{uuid.uuid4()}",
    }
    admin_headers = {
        "X-Tenant": tenant_slug,
        "Authorization": f"Bearer {admin_token}",
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Guest adds Book 1 (qty=1 @ ₹100) and Book 2 (qty=2 @ sale ₹175 = ₹350)
        r1 = await client.post(
            "/api/v1/cart/items",
            json={"product_id": str(book1.id), "quantity": 1},
            headers=guest_headers,
        )
        assert r1.status_code == 201, r1.text

        r2 = await client.post(
            "/api/v1/cart/items",
            json={"product_id": str(book2.id), "quantity": 2},
            headers=guest_headers,
        )
        assert r2.status_code == 201, r2.text

        # 2. Verify GET /cart returns both names, covers, unit prices, line totals, and ₹450 subtotal
        cart_resp = await client.get("/api/v1/cart/", headers=guest_headers)
        assert cart_resp.status_code == 200, cart_resp.text
        cart = cart_resp.json()

        assert len(cart["items"]) == 2
        by_slug = {it["slug"]: it for it in cart["items"]}
        assert set(by_slug.keys()) == {"doctor-kalaignar", "dravida-cinema"}

        assert by_slug["doctor-kalaignar"]["name"] == "டாக்டர் கலைஞர் | Doctor Kalaignar"
        assert by_slug["doctor-kalaignar"]["image_url"].endswith("doctor_kalaignar.png")
        assert by_slug["doctor-kalaignar"]["price_cents"] == 10000
        assert by_slug["doctor-kalaignar"]["line_total_cents"] == 10000
        assert by_slug["doctor-kalaignar"]["stock"] == 20

        assert by_slug["dravida-cinema"]["name"] == "திராவிட சினிமா | Dravida Cinema"
        assert by_slug["dravida-cinema"]["image_url"].endswith("9_dravida_cinema_takf6r.png")
        assert by_slug["dravida-cinema"]["price_cents"] == 17500  # sale price applied!
        assert by_slug["dravida-cinema"]["line_total_cents"] == 35000
        assert by_slug["dravida-cinema"]["stock"] == 15

        assert cart["total_cents"] == 45000  # 10000 + 35000 = ₹450

        # 3. Guest creates checkout and confirms COD order
        chk_resp = await client.post(
            "/api/v1/checkout/",
            json={
                "email": "reader@example.com",
                "shipping_address": {
                    "name": "Muthu Kumar",
                    "email": "reader@example.com",
                    "phone": "9840012345",
                    "line1": "18 Anna Arivalayam Road, Teynampet",
                    "city": "Chennai",
                    "state": "Tamil Nadu",
                    "postal_code": "600018",
                    "country": "India",
                },
            },
            headers=guest_headers,
        )
        assert chk_resp.status_code == 201, chk_resp.text
        chk = chk_resp.json()
        assert chk["subtotal_cents"] == 45000

        cod_resp = await client.post(
            f"/api/v1/checkout/{chk['id']}/cod",
            headers=guest_headers,
        )
        assert cod_resp.status_code == 200, cod_resp.text
        cod = cod_resp.json()
        order_id = cod["order_id"]
        assert uuid.UUID(order_id)

        # 4. Admin fetches GET /api/v1/orders/ and sees the guest COD order + line items
        orders_resp = await client.get("/api/v1/orders/", headers=admin_headers)
        assert orders_resp.status_code == 200, orders_resp.text
        orders_payload = orders_resp.json()
        orders_list = orders_payload if isinstance(orders_payload, list) else orders_payload.get("items") or orders_payload.get("data") or []
        matching = [o for o in orders_list if str(o.get("id")) == order_id]
        assert len(matching) == 1
        assert matching[0]["total_cents"] == chk["total_cents"]

        detail_resp = await client.get(f"/api/v1/orders/{order_id}", headers=admin_headers)
        assert detail_resp.status_code == 200, detail_resp.text
        order_detail = detail_resp.json()
        assert order_detail["subtotal_cents"] == 45000
        assert len(order_detail["items"]) == 2
        ordered_product_ids = {it["product_id"] for it in order_detail["items"]}
        assert ordered_product_ids == {str(book1.id), str(book2.id)}
