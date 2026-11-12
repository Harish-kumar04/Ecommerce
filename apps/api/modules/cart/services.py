"""Cart management services."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from infalette_database.models.cart import Cart
from infalette_database.models.cart_item import CartItem
from infalette_database.models.product import Product
from infalette_validation.schemas import CartItemCreate


async def _recalculate_cart_total(cart_id: UUID, session: AsyncSession) -> int:
    """Recompute and persist a single cart's total_cents."""
    from sqlalchemy import func

    res = await session.execute(
        select(func.coalesce(func.sum(CartItem.price_cents * CartItem.quantity), 0)).where(
            CartItem.cart_id == cart_id
        )
    )
    total = int(res.scalar() or 0)
    cart = (await session.execute(select(Cart).where(Cart.id == cart_id))).scalar_one_or_none()
    if cart is not None and cart.total_cents != total:
        cart.total_cents = total
        await session.commit()
    return total


async def _recalculate_total(tenant_id: UUID, session: AsyncSession, cart_id: UUID | None = None) -> int | None:
    """Recompute and persist cart total(s)."""
    if cart_id is not None:
        return await _recalculate_cart_total(cart_id, session)

    from sqlalchemy import func

    result = await session.execute(
        select(Cart).where(Cart.tenant_id == tenant_id).order_by(Cart.created_at.desc())
    )
    carts = list(result.scalars().all())
    if not carts:
        return None
    updated = 0
    for cart in carts:
        res = await session.execute(
            select(func.coalesce(func.sum(CartItem.price_cents * CartItem.quantity), 0)).where(
                CartItem.cart_id == cart.id
            )
        )
        total = int(res.scalar() or 0)
        if cart.total_cents != total:
            cart.total_cents = total
            updated += 1
    if updated:
        await session.commit()
    return carts[0].total_cents


async def get_or_create_cart(
    tenant_id: UUID,
    customer_id: UUID | None,
    session: AsyncSession,
    session_key: str | None = None,
) -> Cart:
    """Get or create a cart for a customer or a guest session.

    Authenticated users are keyed by customer_id. Guests (storefront
    without login) are keyed by the opaque ``session_key`` sent via
    ``X-Cart-Session-ID``.
    """
    if customer_id is not None:
        result = await session.execute(
            select(Cart).where(Cart.tenant_id == tenant_id, Cart.customer_id == customer_id)
        )
    elif session_key:
        result = await session.execute(
            select(Cart).where(Cart.tenant_id == tenant_id, Cart.session_key == session_key)
        )
    else:
        raise ValueError("Either customer_id or session_key is required")

    cart = result.scalar_one_or_none()
    if not cart:
        cart = Cart(
            tenant_id=tenant_id,
            customer_id=customer_id,
            session_key=session_key,
            total_cents=0,
        )
        session.add(cart)
        await session.commit()
        await session.refresh(cart)
    return cart


async def add_to_cart(
    tenant_id: UUID,
    customer_id: UUID | None,
    data: CartItemCreate,
    session: AsyncSession,
    session_key: str | None = None,
) -> CartItem:
    """Add an item to the cart."""
    cart = await get_or_create_cart(tenant_id, customer_id, session, session_key=session_key)

    # Check if item (matching product_id + variant_id) already exists in cart
    stmt = select(CartItem).where(
        CartItem.cart_id == cart.id,
        CartItem.product_id == data.product_id,
    )
    if data.variant_id is not None:
        stmt = stmt.where(CartItem.variant_id == data.variant_id)
    else:
        stmt = stmt.where(CartItem.variant_id.is_(None))
    result = await session.execute(stmt)
    existing_item = result.scalar_one_or_none()

    if existing_item:
        existing_item.quantity += data.quantity
        await session.commit()
        await session.refresh(existing_item)
        await _recalculate_cart_total(cart.id, session)
        return existing_item

    # Get product price (and variant price if variant_id specified)
    result = await session.execute(
        select(Product).where(Product.id == data.product_id, Product.tenant_id == tenant_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise ValueError("Product not found")

    unit_price = (
        product.sale_price_cents
        if getattr(product, "sale_price_cents", None)
        else product.price_cents
    )
    if data.variant_id is not None:
        from infalette_database.models.product_variant import ProductVariant

        variant = (
            await session.execute(
                select(ProductVariant).where(
                    ProductVariant.id == data.variant_id,
                    ProductVariant.product_id == product.id,
                    ProductVariant.tenant_id == tenant_id,
                )
            )
        ).scalar_one_or_none()
        if not variant:
            raise ValueError("Product variant not found")
        if getattr(variant, "price_cents", None):
            unit_price = variant.price_cents

    cart_item = CartItem(
        tenant_id=tenant_id,
        cart_id=cart.id,
        product_id=data.product_id,
        variant_id=data.variant_id,
        quantity=data.quantity,
        price_cents=unit_price,
    )
    session.add(cart_item)
    await session.commit()
    await session.refresh(cart_item)

    # Funnel instrumentation (spec §3 analytics): add_to_cart stage
    try:
        from infalette_analytics.event_bus import record_event

        await record_event(
            tenant_id=tenant_id,
            actor_id=customer_id,
            event_type="cart.item_added",
            payload={
                "cart_id": str(cart.id),
                "product_id": str(data.product_id),
                "variant_id": str(data.variant_id) if data.variant_id else None,
                "quantity": data.quantity,
                "session_key": session_key,
            },
            session=session,
        )
    except Exception:
        pass

    await _recalculate_cart_total(cart.id, session)
    return cart_item


async def get_cart_with_items(cart_id: UUID, session: AsyncSession) -> dict:
    """Return cart + items with product names for the storefront."""
    result = await session.execute(select(Cart).where(Cart.id == cart_id))
    cart = result.scalar_one_or_none()
    if not cart:
        return {}
    items = await get_cart_items(cart.id, session)
    item_dicts = []
    for it in items:
        prod_result = await session.execute(
            select(Product).where(Product.id == it.product_id)
        )
        product = prod_result.scalar_one_or_none()
        img = getattr(product, "image_url", None)
        if not img and product:
            imgs = list(getattr(product, "images_json", None) or [])
            if imgs:
                img = imgs[0]
        item_dicts.append({
            "id": str(it.id),
            "product_id": str(it.product_id),
            "variant_id": str(it.variant_id) if it.variant_id else None,
            "name": product.name if product else None,
            "image_url": img,
            "quantity": it.quantity,
            "price_cents": it.price_cents,
        })
    return {
        "id": str(cart.id),
        "total_cents": cart.total_cents,
        "currency": cart.currency,
        "items": item_dicts,
    }


async def get_cart_items(cart_id: UUID, session: AsyncSession) -> list[CartItem]:
    result = await session.execute(select(CartItem).where(CartItem.cart_id == cart_id))
    return list(result.scalars().all())


def _apply_cart_owner_filter(stmt, customer_id: UUID | None, session_key: str | None):
    if customer_id is not None:
        return stmt.where(Cart.customer_id == customer_id)
    if session_key is not None:
        return stmt.where(Cart.session_key == session_key)
    return stmt


async def update_cart_item(
    item_id: UUID,
    quantity: int,
    session: AsyncSession,
    tenant_id: UUID | None = None,
    customer_id: UUID | None = None,
    session_key: str | None = None,
) -> CartItem | None:
    """Update a cart item quantity with tenant and cart-owner isolation."""
    from sqlalchemy import update
    from fastapi import HTTPException

    target_cart_id: UUID | None = None
    if tenant_id is not None:
        stmt = select(CartItem).join(Cart, CartItem.cart_id == Cart.id).where(
            CartItem.id == item_id,
            Cart.tenant_id == tenant_id,
        )
        stmt = _apply_cart_owner_filter(stmt, customer_id, session_key)
        result = await session.execute(stmt)
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="Cart item not found or access denied")
        target_cart_id = item.cart_id

    if quantity <= 0:
        await remove_from_cart(
            item_id,
            session,
            tenant_id=tenant_id,
            customer_id=customer_id,
            session_key=session_key,
        )
        return None

    await session.execute(
        update(CartItem)
        .where(CartItem.id == item_id)
        .values(quantity=quantity)
        .execution_options(synchronize_session="fetch")
    )
    await session.commit()
    if target_cart_id is not None:
        await _recalculate_cart_total(target_cart_id, session)
    elif tenant_id is not None:
        await _recalculate_total(tenant_id, session)

    result = await session.execute(select(CartItem).where(CartItem.id == item_id))
    return result.scalar_one_or_none()


async def remove_from_cart(
    item_id: UUID,
    session: AsyncSession,
    tenant_id: UUID | None = None,
    customer_id: UUID | None = None,
    session_key: str | None = None,
) -> None:
    """Remove an item from the cart with tenant and cart-owner isolation."""
    from fastapi import HTTPException

    target_cart_id: UUID | None = None
    if tenant_id is not None:
        stmt = select(CartItem).join(Cart, CartItem.cart_id == Cart.id).where(
            CartItem.id == item_id,
            Cart.tenant_id == tenant_id,
        )
        stmt = _apply_cart_owner_filter(stmt, customer_id, session_key)
        result = await session.execute(stmt)
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="Cart item not found or access denied")
        target_cart_id = item.cart_id
        await session.execute(delete(CartItem).where(CartItem.id == item_id))
    else:
        item = (await session.execute(select(CartItem).where(CartItem.id == item_id))).scalar_one_or_none()
        if item:
            target_cart_id = item.cart_id
        await session.execute(delete(CartItem).where(CartItem.id == item_id))
    await session.commit()
    if target_cart_id is not None:
        await _recalculate_cart_total(target_cart_id, session)


async def clear_cart(cart_id: UUID, session: AsyncSession) -> None:
    """Clear all items from the cart and reset total_cents to 0."""
    await session.execute(delete(CartItem).where(CartItem.cart_id == cart_id))
    cart = (await session.execute(select(Cart).where(Cart.id == cart_id))).scalar_one_or_none()
    if cart is not None:
        cart.total_cents = 0
    await session.commit()
