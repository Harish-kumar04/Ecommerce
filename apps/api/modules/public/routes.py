"""Public (unauthenticated) storefront endpoints.

Storefront visitors have no JWT; these routes resolve the tenant from the
``X-Tenant`` header (slug or UUID) or from request.state.tenant_context
(domain/subdomain) and expose only tenant-scoped read surfaces plus the
newsletter lead-capture write.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from infalette_database.session import get_async_session

router = APIRouter()


async def _public_tenant_id(request: Request, session: AsyncSession) -> UUID:
    """Resolve tenant for an anonymous storefront request."""
    ctx = getattr(request.state, "tenant_context", None)
    if ctx is not None:
        tenant_id = getattr(ctx, "tenant_id", None)
        is_platform = getattr(ctx, "is_platform", False)
        if (
            tenant_id
            and not is_platform
            and str(tenant_id) != "00000000-0000-0000-0000-000000000000"
        ):
            return tenant_id  # type: ignore[return-value]

    header_val = request.headers.get("X-Tenant") or request.headers.get("x-tenant")
    if not header_val:
        raise HTTPException(
            status_code=401,
            detail="Tenant required: send X-Tenant header",
        )

    from infalette_database.models.tenant import Tenant

    try:
        tenant_uuid = UUID(header_val)
    except ValueError:
        result = await session.execute(
            select(Tenant).where(Tenant.slug == header_val)
        )
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        return tenant.id  # type: ignore[return-value]
    else:
        result = await session.execute(select(Tenant).where(Tenant.id == tenant_uuid))
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        return tenant.id  # type: ignore[return-value]


@router.get("/resolve")
async def public_resolve_host(
    request: Request,
    host: str,
    session: AsyncSession = Depends(get_async_session),
):
    """Resolve a custom domain/subdomain to a tenant for the storefront edge.

    Used by storefront middleware to map ``Host`` → tenant slug and to
    serve the tenant's 301/302 redirect table.
    """
    from infalette_database.models.domain import Domain
    from infalette_database.models.seo_redirect import SeoRedirect

    host = (host or "").strip().lower().split(":")[0]
    if not host:
        raise HTTPException(status_code=422, detail="host required")

    # 1. Exact custom-domain match
    domain_row = (
        await session.execute(
            select(Domain).where(Domain.domain == host, Domain.verified == True)  # noqa: E712
        )
    ).scalar_one_or_none()

    # 2. Subdomain fallback: "<slug>.<platform-apex>" → slug
    slug = None
    resolved_tenant_id = domain_row.tenant_id if domain_row is not None else None
    if domain_row is not None:
        from infalette_database.models.tenant import Tenant

        tenant_row = (
            await session.execute(select(Tenant).where(Tenant.id == domain_row.tenant_id))
        ).scalar_one_or_none()
        slug = getattr(tenant_row, "slug", None)
    else:
        labels = host.split(".")
        if len(labels) >= 3 and labels[0] not in ("www", "api", "admin", "app"):
            from infalette_database.models.tenant import Tenant

            candidate = labels[0]
            tenant_row = (
                await session.execute(select(Tenant).where(Tenant.slug == candidate))
            ).scalar_one_or_none()
            if tenant_row is not None:
                slug = tenant_row.slug
                resolved_tenant_id = tenant_row.id

    if not slug:
        raise HTTPException(status_code=404, detail="No tenant mapped to this host")

    redirects = []
    if resolved_tenant_id:
        rows = await session.execute(
            select(SeoRedirect).where(
                SeoRedirect.tenant_id == resolved_tenant_id,
                SeoRedirect.is_active == True,  # noqa: E712
            )
        )
        redirects = rows.scalars().all()

    return {
        "tenant": slug,
        "verified_domain": bool(domain_row),
        "redirects": [
            {
                "old_path": r.old_path,
                "new_path": r.new_path,
                "status_code": r.status_code,
            }
            for r in redirects
        ],
    }


@router.get("/tenants")
async def public_list_tenants(
    session: AsyncSession = Depends(get_async_session),
):
    """Public directory of all active tenants.

    Used by the storefront root page to render a directory of stores
    when the host has no embedded tenant context, and to auto-redirect
    to the single tenant on a fresh install. The response is unauthenticated
    and intentionally only exposes the minimum fields needed by the
    storefront landing page (slug + display name).
    """
    from infalette_database.models.tenant import Tenant, TenantStatus
    from infalette_database.models.store import Store

    rows = (
        await session.execute(
            select(Tenant)
            .where(Tenant.status == TenantStatus.ACTIVE)
            .order_by(Tenant.name)
        )
    ).scalars().all()

    # Best-effort join: surface a friendly name from the tenant's primary
    # store if one exists, otherwise fall back to the tenant name. The
    # request is unauthenticated so we don't join on every Store column.
    store_rows = (
        await session.execute(select(Store))
    ).scalars().all()
    store_name_by_tenant: dict[str, str] = {}
    for s in store_rows:
        tid = getattr(s, "tenant_id", None)
        if tid and tid not in store_name_by_tenant:
            store_name_by_tenant[str(tid)] = s.name

    return [
        {
            "id": str(t.id),
            "slug": t.slug,
            "name": store_name_by_tenant.get(str(t.id), t.name) or t.slug,
            "status": getattr(t.status, "value", t.status) or "active",
        }
        for t in rows
    ]


def _serialize_public_list_product(product) -> dict:
    """Lean serializer for storefront catalog/list/search cards (drops unused heavy metadata)."""
    from apps.api.modules.product.services import _merge_cover_and_gallery

    status = getattr(product.status, "value", product.status)
    raw_gallery = list(getattr(product, "images_json", None) or []) or list(
        getattr(product, "gallery_urls", None) or []
    )
    cover, images = _merge_cover_and_gallery(getattr(product, "image_url", None), raw_gallery)
    inventory = getattr(product, "inventory_quantity", None)
    if inventory is None:
        inventory = getattr(product, "inventory", 0)
    inv_int = int(inventory or 0)
    return {
        "id": str(product.id),
        "tenant_id": str(product.tenant_id),
        "category_id": str(product.category_id) if getattr(product, "category_id", None) else None,
        "name": product.name,
        "slug": product.slug,
        "sku": product.sku,
        "price_cents": product.price_cents,
        "sale_price_cents": product.sale_price_cents,
        "inventory": inv_int,
        "inventory_quantity": inv_int,
        "image_url": cover,
        "images": images[:2],
        "status": status,
        "visibility": getattr(product, "visibility", "published") or "published",
        "tax_class": getattr(product, "tax_class", "zero"),
        "safety_info": getattr(product, "safety_info", None),
        "dimensions_json": getattr(product, "dimensions_json", None) or {},
    }


def _set_public_cache(response: Response, max_age: int = 60, swr: int = 300) -> None:
    response.headers["Cache-Control"] = (
        f"public, max-age={max_age}, s-maxage={max_age}, stale-while-revalidate={swr}"
    )
    response.headers["Vary"] = "X-Tenant, Accept-Encoding"


@router.get("/products")
async def public_list_products(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_async_session),
    search: str | None = Query(default=None, max_length=100),
    category_id: str | None = Query(default=None),
    category: str | None = Query(default=None),
):
    """Published products for the resolved tenant (storefront catalog).

    Supports ``?search=`` (ilike on name/sku) and ``?category=`` (slug) or
    ``?category_id=`` (UUID or slug) filtering.
    """
    from uuid import UUID as _UUID
    from apps.api.modules.product.services import search_products
    from infalette_database.models.category import Category
    from infalette_database.models.product import Product, ProductStatus

    tenant_id = await _public_tenant_id(request, session)
    _set_public_cache(response, max_age=60, swr=300)

    cat_target = (category or category_id or "").strip()
    cat_uuid: _UUID | None = None
    if cat_target:
        try:
            cat_uuid = _UUID(cat_target)
        except ValueError:
            cat_row = (
                await session.execute(
                    select(Category.id).where(
                        Category.tenant_id == tenant_id,
                        Category.slug == cat_target,
                    )
                )
            ).scalar_one_or_none()
            if cat_row is not None:
                cat_uuid = cat_row

    if search:
        items = await search_products(tenant_id, search, session)
        filtered = [
            p
            for p in items
            if str(getattr(p, "visibility", "published") or "published").lower()
            not in ("hidden", "draft")
            and (
                str(
                    getattr(getattr(p, "status", None), "value", getattr(p, "status", "")) or ""
                ).lower()
                in ("active", "published")
                or getattr(p, "status", None) is None
            )
        ]
        if cat_uuid:
            filtered = [
                p for p in filtered if str(getattr(p, "category_id", None)) == str(cat_uuid)
            ]
        return [_serialize_public_list_product(p) for p in filtered]

    stmt = (
        select(Product)
        .where(
            Product.tenant_id == tenant_id,
            Product.status == ProductStatus.ACTIVE,
        )
        .order_by(Product.created_at.desc())
        .limit(200)
    )
    if cat_uuid is not None:
        stmt = stmt.where(Product.category_id == cat_uuid)

    rows = (await session.execute(stmt)).scalars().all()
    return [
        _serialize_public_list_product(p)
        for p in rows
        if str(getattr(p, "visibility", "published") or "published").lower()
        not in ("hidden", "draft")
    ]


@router.get("/products/{product_id}")
async def public_get_product(
    product_id: str,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_async_session),
):
    """Single published product for the resolved tenant (by UUID, slug, or SKU)."""
    from apps.api.modules.product.services import get_product, serialize_product
    from infalette_database.models.product import Product

    tenant_id = await _public_tenant_id(request, session)
    product = None
    clean_id = product_id.strip()
    try:
        parsed_uuid = UUID(clean_id)
        product = await get_product(tenant_id, parsed_uuid, session)
    except ValueError:
        row = (
            await session.execute(
                select(Product).where(
                    Product.tenant_id == tenant_id,
                    Product.slug.ilike(clean_id),
                )
            )
        ).scalar_one_or_none()
        if row is None:
            row = (
                await session.execute(
                    select(Product).where(
                        Product.tenant_id == tenant_id,
                        Product.sku.ilike(clean_id),
                    )
                )
            ).scalar_one_or_none()
        if row is not None:
            product = serialize_product(row)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if str(product.get("visibility", "published") or "published").lower() in ("hidden", "draft"):
        raise HTTPException(status_code=404, detail="Product not found")
    if str(product.get("status", "")).lower() not in ("active", "published") and product.get("status") is not None:
        raise HTTPException(status_code=404, detail="Product not found")
    _set_public_cache(response, max_age=120, swr=600)
    return product


@router.get("/store")
async def public_get_store(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_async_session),
):
    """First store for the resolved tenant (theme/branding + payment provider availability)."""
    from apps.api.modules.store.services import list_stores
    from infalette_integrations.razorpay.client import RazorpayClient

    tenant_id = await _public_tenant_id(request, session)
    stores = await list_stores(tenant_id, session)
    if not stores:
        raise HTTPException(status_code=404, detail="Store not found")
    store = stores[0]
    razorpay_enabled = False
    try:
        razorpay_enabled = RazorpayClient().is_configured()
    except Exception:
        razorpay_enabled = False
    _set_public_cache(response, max_age=60, swr=300)
    return {
        "id": str(store.id),
        "tenant_id": str(store.tenant_id),
        "name": store.name,
        "slug": store.slug,
        "description": getattr(store, "description", None),
        "theme_id": str(store.theme_id) if getattr(store, "theme_id", None) else None,
        "custom_domain": getattr(store, "custom_domain", None),
        "logo_url": getattr(store, "logo_url", None),
        "currency": getattr(store, "currency", None) or "INR",
        "tax_rate": getattr(store, "tax_rate", None),
        "theme_config": getattr(store, "theme_config", None) or {},
        "published_at": getattr(store, "published_at", None),
        "status": getattr(store.status, "value", store.status)
        if getattr(store, "status", None) is not None
        else None,
        "razorpay_enabled": razorpay_enabled,
        "payment_providers": {
            "razorpay": razorpay_enabled,
            "cod": True,
        },
    }


@router.post("/coupons/validate")
async def public_validate_coupon(
    request: Request,
    data: dict,
    session: AsyncSession = Depends(get_async_session),
):
    """Validate a coupon code for the storefront cart/checkout."""
    from infalette_commerce.discounts import DiscountService

    tenant_id = await _public_tenant_id(request, session)
    code = str(data.get("code") or "").strip().upper()
    try:
        order_total_cents = max(int(data.get("order_total_cents") or 0), 0)
    except (TypeError, ValueError):
        order_total_cents = 0

    svc = DiscountService()
    try:
        res = await svc.validate_coupon_code(code, tenant_id, order_total_cents, session)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    discount_type = res["type"]
    value = int(res["value"])
    discount_cents = svc.calculate_discount_amount(order_total_cents, discount_type, value)
    final_total_cents = svc.apply_coupon(order_total_cents, discount_type, value)
    return {
        "valid": True,
        "code": res["code"],
        "type": discount_type,
        "value": value,
        "discount_cents": discount_cents,
        "final_total_cents": final_total_cents,
    }


@router.get("/pages")
async def public_list_pages(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_async_session),
):
    """Published pages (with blocks) for the resolved tenant."""
    from apps.api.modules.page.services import list_pages

    tenant_id = await _public_tenant_id(request, session)
    pages = await list_pages(tenant_id, session, status="PUBLISHED")
    _set_public_cache(response, max_age=60, swr=300)
    return [
        {
            "id": str(p.id),
            "tenant_id": str(p.tenant_id),
            "store_id": str(p.store_id) if p.store_id else None,
            "title": p.title,
            "slug": p.slug,
            "path": getattr(p, "path", f"/{p.slug}"),
            "blocks_json": getattr(p, "blocks_json", []) or [],
            "status": p.status.value if hasattr(p.status, "value") else p.status,
            "is_homepage": getattr(p, "is_homepage", False),
            "meta_title": getattr(p, "meta_title", None),
            "meta_description": getattr(p, "meta_description", None),
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in pages
    ]


@router.get("/categories")
async def public_list_categories(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_async_session),
):
    """Categories for the resolved tenant (navigation/filtering)."""
    from infalette_database.models.category import Category

    tenant_id = await _public_tenant_id(request, session)
    result = await session.execute(
        select(Category).where(Category.tenant_id == tenant_id).order_by(Category.name)
    )
    _set_public_cache(response, max_age=60, swr=300)
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "slug": c.slug,
            "description": c.description,
            "parent_id": str(c.parent_id) if c.parent_id else None,
        }
        for c in result.scalars().all()
    ]


@router.post("/track", status_code=202)
async def public_track_event(
    request: Request,
    data: dict,
    session: AsyncSession = Depends(get_async_session),
):
    """Anonymous storefront event capture (product.viewed etc.).

    Body: {"event_type": "product.viewed", "product_id"?: uuid, ...}
    Only a safe allow-list of event types is accepted.
    """
    allowed = {"product.viewed", "checkout.started"}
    event_type = str(data.get("event_type") or "")
    if event_type not in allowed:
        raise HTTPException(status_code=422, detail=f"event_type must be one of {sorted(allowed)}")

    tenant_id = await _public_tenant_id(request, session)

    from infalette_analytics.event_bus import record_event

    payload = {k: v for k, v in data.items() if k != "event_type"}
    await record_event(
        tenant_id=tenant_id,
        actor_id=None,
        event_type=event_type,
        payload=payload,
        session=session,
    )
    return {"status": "accepted"}


@router.get("/track-order")
async def public_track_order(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    order_id: str = Query(..., description="Order id (from confirmation page/email)"),
    email: str = Query(..., description="Email used at checkout (verification)"),
):
    """Guest order tracking (spec §1 customer role: "track orders").

    Verifies ownership by matching the checkout email — the order id alone
    is not sufficient — and returns status plus fulfillment tracking.
    """
    from infalette_database.models.order import Order, OrderStatus
    from infalette_database.models.customer import Customer
    from infalette_database.models.fulfillment import Fulfillment

    tenant_id = await _public_tenant_id(request, session)

    try:
        oid = UUID(str(order_id).strip())
    except ValueError:
        raise HTTPException(status_code=422, detail="order_id must be a UUID")

    order = (
        await session.execute(
            select(Order).where(Order.id == oid, Order.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if order is None:
        # 404 (not 403) so the endpoint never reveals order existence.
        raise HTTPException(status_code=404, detail="Order not found")

    email_norm = (email or "").strip().lower()
    authorized = False
    if order.customer_id:
        customer = (
            await session.execute(select(Customer).where(Customer.id == order.customer_id))
        ).scalar_one_or_none()
        if customer and (customer.email or "").strip().lower() == email_norm:
            authorized = True
    if not authorized:
        shipping_email = (order.shipping_address_json or {}).get("email")
        if shipping_email and str(shipping_email).strip().lower() == email_norm:
            authorized = True
    if not authorized:
        raise HTTPException(status_code=404, detail="Order not found")

    fulfillments = list(
        (
            await session.execute(
                select(Fulfillment).where(Fulfillment.order_id == order.id)
            )
        ).scalars().all()
    )

    # Human-readable status timeline for the storefront UI.
    timeline = ["confirmed", "processing", "shipped", "delivered"]
    order_status = str(getattr(order.status, "value", order.status))
    try:
        stage_index = timeline.index(order_status)
    except ValueError:
        stage_index = 0 if order_status in ("pending",) else len(timeline) - 1

    return {
        "order_id": str(order.id),
        "status": order_status,
        "placed_at": order.created_at.isoformat() if getattr(order, "created_at", None) else None,
        "total_cents": order.total_cents,
        "currency": order.currency,
        "timeline": timeline[: stage_index + 1],
        "tracking": [
            {
                "tracking_number": f.tracking_number,
                "carrier": f.carrier,
                "status": str(getattr(f.status, "value", f.status)),
                "created_at": f.created_at.isoformat() if getattr(f, "created_at", None) else None,
            }
            for f in fulfillments
        ],
    }


@router.post("/newsletter", status_code=201)
async def newsletter_signup(
    data: dict,
    session: AsyncSession = Depends(get_async_session),
):
    """Public newsletter/lead capture for storefront pages.

    Body: {"store_id": uuid, "email": str, "name"?: str}
    """
    from infalette_database.models.store import Store
    from infalette_database.models.lead import Lead
    from infalette_analytics.event_bus import record_event

    email = (data.get("email") or "").strip().lower()
    store_id = data.get("store_id")
    if not email or "@" not in email:
        raise HTTPException(status_code=422, detail="Valid email required")

    if store_id:
        try:
            result = await session.execute(
                select(Store).where(Store.id == UUID(str(store_id)))
            )
            store = result.scalar_one_or_none()
        except ValueError:
            store = None
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        tenant_id = store.tenant_id
    else:
        raise HTTPException(status_code=422, detail="store_id required")

    # Dedupe by tenant+email
    result = await session.execute(
        select(Lead).where(
            Lead.tenant_id == tenant_id,
            Lead.email == email,
        )
    )
    lead = result.scalar_one_or_none()
    if not lead:
        lead = Lead(
            tenant_id=tenant_id,
            email=email,
            first_name=(data.get("name") or "").strip() or None,
            source="newsletter",
            status="new",
        )
        session.add(lead)
        await session.commit()
        await session.refresh(lead)

    try:
        await record_event(
            tenant_id=tenant_id,
            actor_id=None,
            event_type="lead.created",
            payload={"lead_id": str(lead.id), "source": "newsletter"},
            session=session,
        )
    except Exception:
        pass

    return {"status": "subscribed", "lead_id": str(lead.id)}


# --------------------------------------------------------------------- #
# Shopper (customer) self-service endpoints, scoped to the resolved tenant.
#
# These mirror the private ``/customers/...`` routes but resolve the
# tenant from the storefront request (X-Tenant header or host mapping)
# and authenticate the customer by email + password / token rather than
# the admin JWT. They are intentionally thin: validation + delegation to
# the existing private services so behavior stays consistent.
# --------------------------------------------------------------------- #


@router.post("/customer/register", status_code=201)
async def public_customer_register(
    request: Request,
    data: dict,
    session: AsyncSession = Depends(get_async_session),
):
    """Storefront shopper signup — delegates to auth.services.customer_register.

    Body: {"email": str, "password": str, "first_name"?: str, "last_name"?: str}
    """
    from apps.api.modules.auth.services import customer_register as _customer_register

    tenant_id = await _public_tenant_id(request, session)

    from apps.api.modules.auth.routes import CustomerRegisterRequest
    from pydantic import ValidationError as _ValidationError

    try:
        payload = CustomerRegisterRequest(
            email=data.get("email"),
            password=data.get("password"),
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
        )
    except _ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return await _customer_register(payload, session, tenant_id)


@router.post("/customer/login")
async def public_customer_login(
    request: Request,
    data: dict,
    session: AsyncSession = Depends(get_async_session),
):
    """Storefront shopper login — delegates to the private login service.

    Body: {"email": str, "password": str, "mfa_code"?: str}
    """
    from fastapi import HTTPException as _HTTPException

    from infalette_auth.schemas import LoginRequest
    from apps.api.modules.auth.services import login as _login

    tenant_id = await _public_tenant_id(request, session)

    try:
        payload = LoginRequest(
            email=data.get("email"),
            password=data.get("password"),
            mfa_code=data.get("mfa_code"),
        )
    except Exception as e:
        raise _HTTPException(status_code=422, detail=str(e))

    try:
        result = await _login(payload, session)
    except ValueError as e:
        raise _HTTPException(status_code=401, detail=str(e))

    # Scope the issued token to the storefront tenant: a shopper with the
    # same email at a different tenant must not be able to log in here.
    # The private /auth/login is global, so we re-issue a tenant-scoped
    # pair when the user's tenant matches the storefront; otherwise
    # reject so cross-tenant credentials can't authenticate here.
    from sqlalchemy import select as _select

    from infalette_database.models.user import User as _User

    user_row = (
        await session.execute(
            _select(_User).where(_User.email == str(payload.email).lower().strip())
        )
    ).scalar_one_or_none()
    if not user_row or str(user_row.tenant_id or "") != str(tenant_id):
        raise _HTTPException(status_code=401, detail="Invalid email or password")

    return result


@router.get("/customer/me")
async def public_customer_me(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    """Return the storefront's logged-in shopper profile."""

    from fastapi import HTTPException as _HTTPException
    from infalette_auth.jwt import TokenManager

    auth = request.headers.get("Authorization") or ""
    token = auth[7:] if auth.lower().startswith("bearer ") else None
    if not token:
        raise _HTTPException(status_code=401, detail="Authorization required")

    try:
        payload = TokenManager().decode_token(token)
    except Exception:
        raise _HTTPException(status_code=401, detail="Invalid or expired token")
    if not payload:
        raise _HTTPException(status_code=401, detail="Invalid token")

    from sqlalchemy import select as _select

    from infalette_database.models.user import User as _User

    user = (
        await session.execute(_select(_User).where(_User.id == UUID(payload.sub)))
    ).scalar_one_or_none()
    if not user:
        raise _HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": getattr(user.role, "value", user.role),
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
    }


async def _resolve_shopper_customer_id(payload, session: AsyncSession) -> tuple[UUID, UUID]:
    """Resolve (tenant_id, Customer.id) from a JWT payload whose sub may be User.id or Customer.id."""
    from sqlalchemy import select as _select
    from infalette_database.models.customer import Customer
    from infalette_database.models.user import User as _User

    tenant_id = UUID(payload.tenant_id or "00000000-0000-0000-0000-000000000000")
    sub_uuid = UUID(payload.sub)

    # 1. Direct Customer.id match
    cust = (
        await session.execute(
            _select(Customer).where(Customer.id == sub_uuid, Customer.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if cust is not None:
        return tenant_id, cust.id

    # 2. Resolve User -> Customer by (tenant_id, email)
    user = (
        await session.execute(_select(_User).where(_User.id == sub_uuid))
    ).scalar_one_or_none()
    if user is not None:
        eff_tenant = user.tenant_id or tenant_id
        cust = (
            await session.execute(
                _select(Customer).where(
                    Customer.tenant_id == eff_tenant,
                    Customer.email == user.email.lower().strip(),
                )
            )
        ).scalars().first()
        if cust is not None:
            return eff_tenant, cust.id

    return tenant_id, sub_uuid


@router.post("/customer/consent")
async def public_customer_consent(
    request: Request,
    data: dict,
    session: AsyncSession = Depends(get_async_session),
):
    """Update shopper marketing consent flags (DPDP).

    Body: {"consent": {"marketing_email": bool, ...}}
    Authenticated by Bearer token; identifies the customer by sub.
    """

    from fastapi import HTTPException as _HTTPException
    from infalette_auth.jwt import TokenManager

    auth = request.headers.get("Authorization") or ""
    token = auth[7:] if auth.lower().startswith("bearer ") else None
    if not token:
        raise _HTTPException(status_code=401, detail="Authorization required")

    try:
        payload = TokenManager().decode_token(token)
    except Exception:
        raise _HTTPException(status_code=401, detail="Invalid or expired token")
    if not payload:
        raise _HTTPException(status_code=401, detail="Invalid token")

    consent = data.get("consent") or {}
    if not isinstance(consent, dict) or not consent:
        raise _HTTPException(status_code=422, detail="consent object required")

    from apps.api.modules.customer.services import update_customer_consent

    tenant_id, customer_id = await _resolve_shopper_customer_id(payload, session)
    customer = await update_customer_consent(
        tenant_id,
        customer_id,
        consent,
        session,
    )
    if not customer:
        raise _HTTPException(status_code=404, detail="Customer not found")
    return {"id": str(customer.id), "consent_json": customer.consent_json}


@router.get("/customer/export")
async def public_customer_export(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    """DPDP data-portability export for the authenticated shopper."""

    from fastapi import HTTPException as _HTTPException
    from infalette_auth.jwt import TokenManager

    auth = request.headers.get("Authorization") or ""
    token = auth[7:] if auth.lower().startswith("bearer ") else None
    if not token:
        raise _HTTPException(status_code=401, detail="Authorization required")

    try:
        payload = TokenManager().decode_token(token)
    except Exception:
        raise _HTTPException(status_code=401, detail="Invalid or expired token")
    if not payload:
        raise _HTTPException(status_code=401, detail="Invalid token")

    from apps.api.modules.customer.services import export_customer_data

    tenant_id, customer_id = await _resolve_shopper_customer_id(payload, session)
    data = await export_customer_data(
        tenant_id,
        customer_id,
        session,
    )
    if data is None:
        raise _HTTPException(status_code=404, detail="Customer not found")
    return data


@router.post("/customer/erase")
async def public_customer_erase(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    """DPDP right-to-erasure for the authenticated shopper."""

    from fastapi import HTTPException as _HTTPException
    from infalette_auth.jwt import TokenManager

    auth = request.headers.get("Authorization") or ""
    token = auth[7:] if auth.lower().startswith("bearer ") else None
    if not token:
        raise _HTTPException(status_code=401, detail="Authorization required")

    try:
        payload = TokenManager().decode_token(token)
    except Exception:
        raise _HTTPException(status_code=401, detail="Invalid or expired token")
    if not payload:
        raise _HTTPException(status_code=401, detail="Invalid token")

    from apps.api.modules.customer.services import erase_customer_data

    tenant_id, customer_id = await _resolve_shopper_customer_id(payload, session)
    result = await erase_customer_data(
        tenant_id,
        customer_id,
        session,
    )
    if result is None:
        raise _HTTPException(status_code=404, detail="Customer not found")
    return result
