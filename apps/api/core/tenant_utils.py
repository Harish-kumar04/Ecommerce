"""Resolve tenant context for storefront guest flows.

Authenticated admin requests use user.tenant_id. Storefront guests send
``X-Tenant: <slug-or-uuid>``; this helper resolves it to a tenant id and
raises 401/400 when neither is available.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from infalette_database.models.tenant import Tenant


from infalette_auth.dependencies import get_optional_user
from infalette_database.session import get_async_session


async def resolve_tenant_id(
    request: Request,
    user=Depends(get_optional_user),
    session: AsyncSession = Depends(get_async_session),
) -> UUID:
    """Return tenant_id from authenticated user or X-Tenant header.

    Order:
      1. Authenticated user -> user.tenant_id
      2. request.state.tenant_context (set by AuthMiddleware via domain/subdomain)
         when not the platform placeholder
      3. X-Tenant header (tenant slug or uuid)
    """
    if user is not None and getattr(user, "tenant_id", None):
        return user.tenant_id  # type: ignore[return-value]

    ctx = getattr(request.state, "tenant_context", None)
    if ctx is not None:
        tenant_id = getattr(ctx, "tenant_id", None)
        is_platform = getattr(ctx, "is_platform", False)
        if tenant_id and not is_platform and str(tenant_id) != "00000000-0000-0000-0000-000000000000":
            return tenant_id  # type: ignore[return-value]

    header_val = (
        request.headers.get("X-Tenant")
        or request.headers.get("x-tenant")
        or request.headers.get("X-Tenant-Slug")
        or request.headers.get("x-tenant-slug")
    )
    if not header_val:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant required: authenticate or send X-Tenant header",
        )

    # Try UUID first, then slug
    try:
        return UUID(header_val)
    except ValueError:
        result = await session.execute(select(Tenant).where(Tenant.slug == header_val))
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Unknown tenant: {header_val}")
        return tenant.id


def get_cart_session_key(request: Request) -> str | None:
    """Read the opaque guest cart session key header or cookie."""
    return (
        request.headers.get("X-Cart-Session-ID")
        or request.headers.get("x-cart-session-id")
        or request.cookies.get("cart_session_id")
        or request.cookies.get("infalette-cart-session")
    )
