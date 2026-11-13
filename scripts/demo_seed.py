"""Demo seed script — creates plans, the Muthamilarignar Pathipagam bookstore
tenant, owner user, categories, homepage blocks and all 27 Muthamilarignar
Pathipagam books (neutral No cover placeholder until admin upload). Idempotent: safe to re-run.

Usage:
    python scripts/demo_seed.py                 # uses DATABASE_URL (sqlite fallback)
Env:
    DEMO_TENANT_SLUG   (default: demo-store)
    DEMO_OWNER_EMAIL   (default: owner@demo.test)
    DEMO_OWNER_PASSWORD(default: demo1234)
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))
for pkg in [
    "config",
    "validation",
    "database",
    "auth",
    "commerce",
    "automation",
    "analytics",
    "seo",
    "integrations",
]:
    sys.path.insert(0, str(REPO / "packages" / pkg / "src"))

TENANT_SLUG = os.environ.get("DEMO_TENANT_SLUG", "demo-store")
OWNER_EMAIL = os.environ.get("DEMO_OWNER_EMAIL", "owner@demo.test")
OWNER_PASSWORD = os.environ.get("DEMO_OWNER_PASSWORD", "demo1234")

PLANS = [
    {
        "name": "Store",
        "slug": "store",
        "price_cents": 99900,
        "description": "Custom storefront, catalog, checkout, orders, SEO",
    },
    {
        "name": "Store + Automation",
        "slug": "store_automation",
        "price_cents": 249900,
        "description": "Adds Instagram/WhatsApp automation, checkout links, unified inbox",
    },
    {
        "name": "Store + Automation + CRM",
        "slug": "store_automation_crm",
        "price_cents": 499900,
        "description": "Adds full CRM, funnel analytics, segments, exports",
    },
]

CATEGORIES = [
    {
        "name": "திராவிட இயக்க வரலாறு | Dravidian Movement History",
        "slug": "dravidian-history",
        "description": "Books on the history, ideology, and struggles of the Dravidian movement and DMK.",
    },
    {
        "name": "கலைஞர் படைப்புகள் | Kalaignar Works & Studies",
        "slug": "kalaignar-works",
        "description": "Biographies, letters, literary works, and political analyses of Muthamilarignar Kalaignar M. Karunanidhi.",
    },
    {
        "name": "திராவிட மாடல் & சமூகநீதி | Dravidian Model & Social Justice",
        "slug": "dravidian-model-social-justice",
        "description": "Publications on the Dravidian Model governance, reservation, state autonomy, and language rights.",
    },
    {
        "name": "திராவிட சினிமா & பண்பாடு | Dravidian Cinema & Culture",
        "slug": "dravidian-cinema-culture",
        "description": "Explorations of Dravidian cinema, art, cultural transformation, and youth movement.",
    },
]

# Owner book catalog placeholders (Tamil | English title, slug, SKU, category, price).
# Covers, descriptions, author, and ISBN remain empty until uploaded/entered in Admin.
PRODUCTS = [
    dict(name="காலத்தின் நிறம் கருப்பு சிவப்பு | Kaalatthin Niram Karuppu Sivappu", slug="kaalatthin-niram-karuppu-sivappu", sku="MP-BOOK-001", category_slug="dravidian-history", price_cents=75000, tax_class="reduced", inventory_quantity=150),
    dict(name="இளைய திராவிடம் எழுகிறது | Ilaya Dravidam Ezhugirathu", slug="ilaya-dravidam-ezhugirathu", sku="MP-BOOK-002", category_slug="dravidian-cinema-culture", price_cents=4000, tax_class="reduced", inventory_quantity=200),
    dict(name="இந்தியாவில் சமூகநீதியும் இடஒதுக்கீடும் ? | Indiavil Samuganithiyum Idaothikkidum?", slug="indiavil-samuganithiyum-idaothikkidum", sku="MP-BOOK-003", category_slug="dravidian-model-social-justice", price_cents=4000, tax_class="reduced", inventory_quantity=200),
    dict(name="இந்தியாவுக்கு வழிகாட்டும் திராவிட மாடல் | Indiavuku Vazhikatum Dravida Maadal", slug="indiavuku-vazhikatum-dravida-maadal", sku="MP-BOOK-004", category_slug="dravidian-model-social-justice", price_cents=4000, tax_class="reduced", inventory_quantity=220),
    dict(name="இந்தித் திணிப்பை எதிர்க்கிறோம்-ஏன்? | Hindhi Theenipai Ethirkirom - Yen?", slug="hindhi-theenipai-ethirkirom-yen", sku="MP-BOOK-005", category_slug="dravidian-model-social-justice", price_cents=4000, tax_class="reduced", inventory_quantity=250),
    dict(name="திராவிட இயக்க வரலாறு - கேள்வி-பதில் | Dravida Iyakka Varalaru - Kelvi-Bathil", slug="dravida-iyakka-varalaru-kelvi-bathil", sku="MP-BOOK-006", category_slug="dravidian-history", price_cents=4000, tax_class="reduced", inventory_quantity=250),
    dict(name="மாநில சுயாட்சி முழக்கம் | Maanilla Suyatchi Muzhukkam", slug="maanilla-suyatchi-muzhukkam", sku="MP-BOOK-007", category_slug="dravidian-model-social-justice", price_cents=4000, tax_class="reduced", inventory_quantity=180),
    dict(name="தமிழ்நாடு போராடும் - தமிழ்நாடு வெல்லும் | Tamilnadu Poradum - Tamilnadu Vellum", slug="tamilnadu-poradum-tamilnadu-vellum", sku="MP-BOOK-008", category_slug="dravidian-model-social-justice", price_cents=4000, tax_class="reduced", inventory_quantity=200),
    dict(name="திராவிட சினிமா (பாகம் - 2) | Dravida Cinema (Vol. 2)", slug="dravida-cinema-paagam-2", sku="MP-BOOK-009", category_slug="dravidian-cinema-culture", price_cents=15000, tax_class="reduced", inventory_quantity=120),
    dict(name="திராவிட மாடல் அரசு (பாகம் 2) | Dravida Model Arasu (Vol. 2)", slug="dravida-model-arasu-paagam-2", sku="MP-BOOK-010", category_slug="dravidian-model-social-justice", price_cents=30000, tax_class="reduced", inventory_quantity=100),
    dict(name="திராவிடப் போராளிகள் (பாகம் 2) | Dravida Poraligal (Vol. 2)", slug="dravida-poraligal-paagam-2", sku="MP-BOOK-011", category_slug="dravidian-history", price_cents=15000, tax_class="reduced", inventory_quantity=120),
    dict(name="உடன் பிறப்பே (பாகம் 2) | Udan Pireppe (Vol. 2)", slug="udan-pireppe-paagam-2", sku="MP-BOOK-012", category_slug="kalaignar-works", price_cents=20000, tax_class="reduced", inventory_quantity=130),
    dict(name="இடம் பொருள் கலைஞர் (பாகம் 2) | Idam Porul Kalaignar (Vol. 2)", slug="idam-porul-kalaignar-paagam-2", sku="MP-BOOK-013", category_slug="kalaignar-works", price_cents=15000, tax_class="reduced", inventory_quantity=140),
    dict(name="கலைஞர் இயக்கவியல் | Kalaignar Iyakkaviyal", slug="kalaignar-iyakkaviyal", sku="MP-BOOK-014", category_slug="kalaignar-works", price_cents=20000, tax_class="reduced", inventory_quantity=110),
    dict(name="கலைஞரும் நானும் (பாகம் 2) | Kalaignarum Naanum (Vol. 2)", slug="kalaignarum-naanum-paagam-2", sku="MP-BOOK-015", category_slug="kalaignar-works", price_cents=15000, tax_class="reduced", inventory_quantity=125),
    dict(name="திமுக இளைஞரணி அத்தியாயம் - 1 | DMK Ilaignarani Athiyayam - 1", slug="dmk-ilaignarani-athiyayam-1", sku="MP-BOOK-016", category_slug="dravidian-history", price_cents=35000, tax_class="reduced", inventory_quantity=100),
    dict(name="திராவிடத்தால் வாழ்கிறோம் 3 | Dravidaththaal Vaazhkirom (Vol. 3)", slug="dravidaththaal-vaazhkirom-3", sku="MP-BOOK-017", category_slug="dravidian-history", price_cents=25000, tax_class="reduced", inventory_quantity=115),
    dict(name="திராவிட மாடல் அரசு | Dravida Model Arasu (Vol. 1)", slug="dravida-model-arasu", sku="MP-BOOK-018", category_slug="dravidian-model-social-justice", price_cents=30000, tax_class="reduced", inventory_quantity=110),
    dict(name="திராவிடத்தால் வாழ்கிறோம் 2 | Dravidaththaal Vaazhkirom (Vol. 2)", slug="dravidaththaal-vaazhkirom-2", sku="MP-BOOK-019", category_slug="dravidian-history", price_cents=25000, tax_class="reduced", inventory_quantity=120),
    dict(name="கலைஞரும் நானும் | Kalaignarum Naanum (Vol. 1)", slug="kalaignarum-naanum", sku="MP-BOOK-020", category_slug="kalaignar-works", price_cents=20000, tax_class="reduced", inventory_quantity=130),
    dict(name="திராவிடப் போராளிகள் | Dravida Poraligal (Vol. 1)", slug="dravida-poraligal", sku="MP-BOOK-021", category_slug="dravidian-history", price_cents=25000, tax_class="reduced", inventory_quantity=120),
    dict(name="இடம் பொருள் கலைஞர் | Idam Porul Kalaignar (Vol. 1)", slug="idam-porul-kalaignar", sku="MP-BOOK-022", category_slug="kalaignar-works", price_cents=20000, tax_class="reduced", inventory_quantity=130),
    dict(name="உடன் பிறப்பே | Udan Pireppe (Vol. 1)", slug="udan-pireppe", sku="MP-BOOK-023", category_slug="kalaignar-works", price_cents=20000, tax_class="reduced", inventory_quantity=140),
    dict(name="தி.மு.க. வரலாறு (1949-1967) | D.M.K. Varalaru (1949-1967)", slug="d-m-k-varalaru-1949-1967", sku="MP-BOOK-024", category_slug="dravidian-history", price_cents=32000, tax_class="reduced", inventory_quantity=110),
    dict(name="திராவிடத்தால் வாழ்கிறோம் 1 | Dravidaththaal Vaazhkirom (Vol. 1)", slug="dravidaththaal-vaazhkirom-1", sku="MP-BOOK-025", category_slug="dravidian-history", price_cents=25000, tax_class="reduced", inventory_quantity=125),
    dict(name="திராவிட சினிமா (முத்தமிழறிஞர் பதிப்பகம்) | Dravida Cinema (Vol. 1)", slug="dravida-cinema-muththamizharignar-pathippagam", sku="MP-BOOK-026", category_slug="dravidian-cinema-culture", price_cents=20000, tax_class="reduced", inventory_quantity=130),
    dict(name="டாக்டர் கலைஞர் | Doctor Kalaignar", slug="doctor-kalaignar", sku="MP-BOOK-027", category_slug="kalaignar-works", price_cents=10000, sale_price_cents=9500, tax_class="reduced", inventory_quantity=160),
]


HOME_BLOCKS = [
    {
        "type": "hero",
        "data": {
            "eyebrow": "முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
            "title": "திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள்",
            "subtitle": "Official online bookstore for Muthamilarignar Pathipagam publications — exploring Dravidian history, social justice, state autonomy, and the works of Kalaignar.",
            "cta_label": "நூல்களைப் பார்வையிடுக | Browse Books",
            "cta_url": "/demo-store/products",
        },
    },
    {
        "type": "featured_products",
        "data": {"title": "சிறப்பு நூல்கள் | Featured Publications", "limit": 8},
    },
]


async def main() -> None:
    from sqlalchemy import delete, select, text

    from infalette_auth.security import PasswordHasher
    from infalette_database.base import Base
    from infalette_database.models.category import Category
    from infalette_database.models.discount_code import DiscountCode
    from infalette_database.models.page import Page, PageStatus
    from infalette_database.models.plan import Plan, PlanType
    from infalette_database.models.product import Product, ProductStatus
    from infalette_database.models.store import Store, StoreStatus
    from infalette_database.models.tenant import Tenant, TenantStatus
    from infalette_database.models.user import User, UserStatus
    from infalette_database.session import get_engine, get_session_factory

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if engine.dialect.name == "sqlite":
            # Normalize any legacy lowercase/uppercase enum strings in existing SQLite DBs
            await conn.execute(text("UPDATE tenants SET status = 'ACTIVE' WHERE lower(status) = 'active'"))
            await conn.execute(text("UPDATE users SET status = 'ACTIVE' WHERE lower(status) = 'active'"))
            await conn.execute(text("UPDATE users SET role = 'tenant_owner' WHERE lower(role) = 'tenant_owner'"))
            await conn.execute(text("UPDATE users SET role = 'platform_owner' WHERE lower(role) = 'platform_owner'"))
            await conn.execute(text("UPDATE stores SET status = 'PUBLISHED' WHERE lower(status) = 'published'"))
            await conn.execute(text("UPDATE products SET status = 'ACTIVE' WHERE lower(status) = 'active'"))
            await conn.execute(text("UPDATE pages SET status = 'PUBLISHED' WHERE lower(status) = 'published'"))

    created = []
    async with get_session_factory()() as s:
        # Plans
        plan_by_slug = {}
        for p in PLANS:
            row = (
                await s.execute(select(Plan).where(Plan.slug == p["slug"]))
            ).scalar_one_or_none()
            if not row:
                row = Plan(
                    name=p["name"],
                    slug=p["slug"],
                    plan_type=PlanType(p["slug"]),
                    price_cents=p["price_cents"],
                    currency="INR",
                    interval="month",
                    features_json={"description": p["description"]},
                )
                s.add(row)
                await s.flush()
                created.append(f"plan:{p['slug']}")
            plan_by_slug[p["slug"]] = row

        # Tenant
        tenant = (
            await s.execute(select(Tenant).where(Tenant.slug == TENANT_SLUG))
        ).scalar_one_or_none()
        if not tenant:
            tenant = Tenant(
                name="Muthamilarignar Pathipagam",
                slug=TENANT_SLUG,
                plan="store_automation_crm",
                status=TenantStatus.ACTIVE,
            )
            s.add(tenant)
            await s.flush()
            created.append(f"tenant:{TENANT_SLUG}")
        else:
            tenant.name = "Muthamilarignar Pathipagam"
            tenant.plan = "store_automation_crm"
        tenant.plan_id = plan_by_slug["store_automation_crm"].id

        # Owner users (both documented staging owner and legacy test owner)
        owner_accounts = [
            (OWNER_EMAIL, OWNER_PASSWORD),
            ("owner@demo.infalette.com", os.environ.get("DEMO_OWNER_ALT_PASSWORD", "DemoOwner!2026")),
        ]
        for o_email, o_pw in owner_accounts:
            u_row = (
                await s.execute(select(User).where(User.email == o_email))
            ).scalar_one_or_none()
            if not u_row:
                u_row = User(
                    tenant_id=tenant.id,
                    email=o_email,
                    password_hash=PasswordHasher().hash_password(o_pw),
                    first_name="Muthamilarignar",
                    last_name="Pathipagam",
                    role="tenant_owner",
                    status=UserStatus.ACTIVE,
                )
                s.add(u_row)
                await s.flush()
                created.append(f"user:{o_email}")
            else:
                u_row.tenant_id = tenant.id
                u_row.password_hash = PasswordHasher().hash_password(o_pw)
                u_row.role = "tenant_owner"
                u_row.status = UserStatus.ACTIVE

        # Platform super-admin users (for apps/platform-admin)
        platform_accounts = [
            (
                os.environ.get("DEMO_PLATFORM_EMAIL", "admin@infalette.com"),
                os.environ.get("DEMO_PLATFORM_PASSWORD", "PlatformAdmin!2026"),
            ),
        ]
        for p_email, p_pw in platform_accounts:
            puser = (
                await s.execute(select(User).where(User.email == p_email))
            ).scalar_one_or_none()
            if not puser:
                puser = User(
                    tenant_id=None,
                    email=p_email,
                    password_hash=PasswordHasher().hash_password(p_pw),
                    first_name="Platform",
                    last_name="Admin",
                    role="platform_owner",
                    status=UserStatus.ACTIVE,
                )
                s.add(puser)
                await s.flush()
                created.append(f"user:{p_email}")
            else:
                puser.tenant_id = None
                puser.password_hash = PasswordHasher().hash_password(p_pw)
                puser.role = "platform_owner"
                puser.status = UserStatus.ACTIVE

        # Store
        default_logo_url = "https://res.cloudinary.com/dikaxqooz/image/upload/v1794509921/Logo_vuhujt.jpg"
        store = (
            await s.execute(select(Store).where(Store.tenant_id == tenant.id))
        ).scalar_one_or_none()
        if not store:
            store = Store(
                tenant_id=tenant.id,
                name="Muthamilarignar Pathipagam",
                slug=f"{TENANT_SLUG}-main",
                description="முத்தமிழறிஞர் பதிப்பகம் — திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் | Official Bookstore of Muthamilarignar Pathipagam.",
                logo_url=default_logo_url,
                theme_config={
                    "primary_color": "#dc2626",
                    "secondary_color": "#0a0a0a",
                    "logo_url": default_logo_url,
                },
                status=StoreStatus.PUBLISHED,
                published_at=datetime.now(timezone.utc),
            )
            s.add(store)
            await s.flush()
            created.append("store")
        else:
            existing_tc = dict(store.theme_config or {})
            custom_logo = existing_tc.get("logo_url") or store.logo_url
            resolved_logo = (
                custom_logo
                if isinstance(custom_logo, str) and custom_logo.strip() and custom_logo.strip() != "/logo.jpg"
                else default_logo_url
            )
            store.name = "Muthamilarignar Pathipagam"
            store.description = "முத்தமிழறிஞர் பதிப்பகம் — திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் | Official Bookstore of Muthamilarignar Pathipagam."
            store.logo_url = resolved_logo
            store.theme_config = {
                **existing_tc,
                "primary_color": existing_tc.get("primary_color") or "#dc2626",
                "secondary_color": existing_tc.get("secondary_color") or "#0a0a0a",
                "logo_url": resolved_logo,
            }
            store.status = StoreStatus.PUBLISHED

        # Primary domain
        from infalette_database.models.domain import Domain

        dom = (
            await s.execute(
                select(Domain).where(
                    Domain.tenant_id == tenant.id,
                    Domain.domain == f"{TENANT_SLUG}.infalette.com",
                )
            )
        ).scalar_one_or_none()
        if not dom:
            s.add(
                Domain(
                    tenant_id=tenant.id,
                    domain=f"{TENANT_SLUG}.infalette.com",
                    is_primary=True,
                    verified=True,
                )
            )
            created.append(f"domain:{TENANT_SLUG}.infalette.com")

        # Categories
        cat_by_slug = {}
        for cdata in CATEGORIES:
            cat = (
                await s.execute(
                    select(Category).where(
                        Category.tenant_id == tenant.id,
                        Category.slug == cdata["slug"],
                    )
                )
            ).scalar_one_or_none()
            if not cat:
                cat = Category(
                    tenant_id=tenant.id,
                    name=cdata["name"],
                    slug=cdata["slug"],
                    description=cdata["description"],
                )
                s.add(cat)
                await s.flush()
                created.append(f"category:{cdata['slug']}")
            else:
                cat.name = cdata["name"]
                cat.description = cdata["description"]
            cat_by_slug[cdata["slug"]] = cat

        # Remove legacy baby/postpartum demo products (DEMO-*) so only books remain
        await s.execute(
            delete(Product).where(
                Product.tenant_id == tenant.id,
                Product.sku.like("DEMO-%"),
            )
        )

        # Seed all 27 Muthamilarignar Pathipagam books
        for pdata in PRODUCTS:
            exists = (
                await s.execute(
                    select(Product).where(
                        Product.tenant_id == tenant.id, Product.sku == pdata["sku"]
                    )
                )
            ).scalar_one_or_none()
            image_url = pdata.get("image")
            desc = pdata.get("description", "")
            cat_obj = cat_by_slug.get(pdata.get("category_slug", ""))
            cat_id = cat_obj.id if cat_obj else None

            if exists:
                exists.name = pdata["name"]
                exists.slug = pdata["slug"]
                if desc:
                    exists.description = desc
                elif exists.description is None:
                    exists.description = ""
                exists.price_cents = pdata["price_cents"]
                exists.sale_price_cents = pdata.get("sale_price_cents")
                exists.tax_class = pdata["tax_class"]
                exists.inventory_quantity = pdata["inventory_quantity"]
                exists.inventory = pdata["inventory_quantity"]
                existing_img = (exists.image_url or "").strip()
                is_admin_upload = any(
                    h in existing_img.lower()
                    for h in ("res.cloudinary.com", ".blob.vercel-storage.com", ".infalette.com")
                )
                kept_img = existing_img if is_admin_upload else image_url
                exists.image_url = kept_img
                exists.images_json = [kept_img] if kept_img else []
                exists.gallery_urls = [kept_img] if kept_img else []
                exists.category_id = cat_id
                exists.meta_title = pdata["name"]
                exists.meta_description = (exists.description or "")[:160] or None
                exists.status = ProductStatus.ACTIVE
                continue

            prod = Product(
                tenant_id=tenant.id,
                category_id=cat_id,
                name=pdata["name"],
                slug=pdata["slug"],
                sku=pdata["sku"],
                description=desc,
                price_cents=pdata["price_cents"],
                sale_price_cents=pdata.get("sale_price_cents"),
                tax_class=pdata["tax_class"],
                inventory_quantity=pdata["inventory_quantity"],
                inventory=pdata["inventory_quantity"],
                inventory_track=True,
                inventory_policy="deny",
                images_json=[image_url] if image_url else [],
                gallery_urls=[image_url] if image_url else [],
                image_url=image_url,
                ingredients=None,
                safety_info=None,
                barcode=None,
                dimensions_json={},
                meta_title=pdata["name"],
                meta_description=desc[:160] or None,
                status=ProductStatus.ACTIVE,
            )
            s.add(prod)
            await s.flush()
            created.append(f"book:{pdata['sku']}")

        # Homepage page with blocks
        home = (
            await s.execute(
                select(Page).where(Page.tenant_id == tenant.id, Page.slug == "home")
            )
        ).scalar_one_or_none()
        if not home:
            home = Page(
                tenant_id=tenant.id,
                store_id=store.id,
                title="Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம்",
                slug="home",
                path="/",
                blocks_json=HOME_BLOCKS,
                status=PageStatus.PUBLISHED,
                is_homepage=True,
                meta_title="Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம் — Official Bookstore",
                meta_description="Official online bookstore for Muthamilarignar Pathipagam (முத்தமிழறிஞர் பதிப்பகம்) books on Dravidian history, social justice, and Kalaignar literature.",
            )
            s.add(home)
            created.append("page:home")
        else:
            home.title = "Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம்"
            home.blocks_json = HOME_BLOCKS
            home.status = PageStatus.PUBLISHED
            home.meta_title = "Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம் — Official Bookstore"
            home.meta_description = "Official online bookstore for Muthamilarignar Pathipagam (முத்தமிழறிஞர் பதிப்பகம்) books on Dravidian history, social justice, and Kalaignar literature."

        # Welcome coupon
        coupon = (
            await s.execute(
                select(DiscountCode).where(
                    DiscountCode.tenant_id == tenant.id,
                    DiscountCode.code == "WELCOME10",
                )
            )
        ).scalar_one_or_none()
        if not coupon:
            s.add(
                DiscountCode(
                    tenant_id=tenant.id,
                    code="WELCOME10",
                    discount_type="percentage",
                    value=10,
                    minimum_order_cents=20000,
                    is_active=True,
                    expires_at=datetime.now(timezone.utc).replace(
                        year=datetime.now(timezone.utc).year + 1
                    ),
                )
            )
            created.append("coupon:WELCOME10")

        await s.commit()

    print("Seed complete - Muthamilarignar Pathipagam Bookstore (27 books).")
    print(
        "  created :",
        ", ".join(created) if created else "(updated existing records)",
    )
    print("  login   :", f"{OWNER_EMAIL} / {OWNER_PASSWORD}")
    print("  storefront:", f"/{TENANT_SLUG}")
    print("  admin   : http://localhost:3001 (login with credentials above)")


if __name__ == "__main__":
    asyncio.run(main())
