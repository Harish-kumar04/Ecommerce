"""Cart management routes — supports authenticated users AND guest sessions.

Requirement (docs/requirements.md §3): "Support guest checkout".
Guests are identified by the ``X-Cart-Session-ID`` header (opaque uuid kept
in localStorage by the storefront). Authenticated requests use user carts.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from infalette_database.session import get_async_session
from infalette_auth.dependencies import get_optional_user
from apps.api.core.tenant_utils import resolve_tenant_id, get_cart_session_key
from infalette_validation.schemas import CartItemCreate

router = APIRouter()


async def _context(request: Request, user, session: AsyncSession):
    from infalette_commerce.customers import resolve_user_customer_id

    tenant_id = await resolve_tenant_id(request, user, session)
    customer_id = await resolve_user_customer_id(tenant_id, user, session) if user is not None else None
    return tenant_id, customer_id, get_cart_session_key(request)


@router.get("/", response_model=dict)
async def get_cart(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(get_optional_user),
):
    """Get the current cart (user cart or guest session cart) with items."""
    from apps.api.modules.cart.services import get_or_create_cart, get_cart_with_items

    tenant_id, customer_id, session_key = await _context(request, user, session)
    if customer_id is None and not session_key:
        # No identity at all -> empty guest cart (avoids 401 noise on first visit)
        return {"id": None, "total_cents": 0, "currency": "INR", "items": []}
    cart = await get_or_create_cart(
        tenant_id,
        customer_id,
        session,
        session_key=session_key,
    )
    data = await get_cart_with_items(cart.id, session)
    data.setdefault("id", str(cart.id))
    data.setdefault("total_cents", cart.total_cents)
    data["currency"] = data.get("currency") or getattr(cart, "currency", "INR") or "INR"
    return data


@router.post("/items", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_to_cart(
    data: CartItemCreate,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(get_optional_user),
):
    """Add an item to the cart (guest or user)."""
    from apps.api.modules.cart.services import add_to_cart as svc_add

    tenant_id, customer_id, session_key = await _context(request, user, session)
    if customer_id is None and not session_key:
        raise HTTPException(status_code=400, detail="X-Cart-Session-ID header required for guest carts")
    try:
        cart_item = await svc_add(
            tenant_id,
            customer_id,
            data,
            session,
            session_key=session_key,
        )
    except ValueError as e:
        raise HTTPException(status_code=404 if "not found" in str(e).lower() else 400, detail=str(e))
    return {"id": str(cart_item.id), "product_id": str(cart_item.product_id), "quantity": cart_item.quantity}


@router.put("/items/{item_id}", response_model=dict)
async def update_cart_item(
    item_id: UUID,
    quantity: int,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(get_optional_user),
):
    """Update a cart item quantity – tenant and owner isolated."""
    from apps.api.modules.cart.services import update_cart_item as svc_update

    tenant_id, customer_id, session_key = await _context(request, user, session)
    if customer_id is None and not session_key:
        raise HTTPException(status_code=400, detail="X-Cart-Session-ID header required for guest carts")
    try:
        cart_item = await svc_update(
            item_id,
            quantity,
            session,
            tenant_id=tenant_id,
            customer_id=customer_id,
            session_key=session_key,
        )
    except ValueError as e:
        raise HTTPException(status_code=404 if "not found" in str(e).lower() else 400, detail=str(e))
    if not cart_item:
        return {"id": str(item_id), "quantity": 0}
    return {"id": str(cart_item.id), "quantity": cart_item.quantity}


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_cart(
    item_id: UUID,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(get_optional_user),
):
    """Remove an item from the cart – tenant and owner isolated."""
    from apps.api.modules.cart.services import remove_from_cart as svc_remove

    tenant_id, customer_id, session_key = await _context(request, user, session)
    if customer_id is None and not session_key:
        raise HTTPException(status_code=400, detail="X-Cart-Session-ID header required for guest carts")
    await svc_remove(
        item_id,
        session,
        tenant_id=tenant_id,
        customer_id=customer_id,
        session_key=session_key,
    )


@router.delete("/", response_model=dict)
async def clear_cart(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(get_optional_user),
):
    """Clear all items from the current cart."""
    from apps.api.modules.cart.services import get_or_create_cart, clear_cart as svc_clear

    tenant_id, customer_id, session_key = await _context(request, user, session)
    if customer_id is None and not session_key:
        return {"cleared": True}
    cart = await get_or_create_cart(
        tenant_id,
        customer_id,
        session,
        session_key=session_key,
    )
    await svc_clear(cart.id, session)
    return {"cleared": True}
