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


def _validate_stock_for_cart(product, variant, desired_qty: int) -> None:
    """Reject out-of-stock products/variants and desired_qty exceeding available stock."""
    if desired_qty <= 0:
        raise ValueError("Quantity must be at least 1")

    status_val = str(getattr(getattr(product, "status", None), "value", getattr(product, "status", "active")) or "active").lower()
    if status_val not in ("active", "published"):
        raise ValueError("Product is out of stock or unavailable")

    if variant is not None:
        policy = str(getattr(variant, "inventory_policy", None) or getattr(product, "inventory_policy", "deny") or "deny").lower()
        if policy != "continue":
            avail = int(getattr(variant, "inventory", 0) or 0)
            if avail <= 0:
                raise ValueError("Item is out of stock")
            if desired_qty > avail:
                raise ValueError(f"Requested quantity ({desired_qty}) exceeds available stock ({avail})")
        return

    tracks = getattr(product, "inventory_track", True)
    policy = str(getattr(product, "inventory_policy", "deny") or "deny").lower()
    if tracks is not False and policy != "continue":
        avail_raw = getattr(product, "inventory_quantity", None)
        if avail_raw is None:
            avail_raw = getattr(product, "inventory", 0)
        avail = int(avail_raw or 0)
        if avail <= 0:
            raise ValueError("Item is out of stock")
        if desired_qty > avail:
            raise ValueError(f"Requested quantity ({desired_qty}) exceeds available stock ({avail})")


async def _ensure_valid_customer_id(
    tenant_id: UUID,
    customer_id: UUID | None,
    session: AsyncSession,
) -> UUID | None:
    """Ensure customer_id references customers.id (resolving User -> Customer if needed)."""
    if customer_id is None:
        return None
    from infalette_database.models.customer import Customer

    direct = (
        await session.execute(
            select(Customer.id).where(
                Customer.tenant_id == tenant_id,
                Customer.id == customer_id,
            ).limit(1)
        )
    ).scalars().first()
    if direct is not None:
        return direct

    from infalette_database.models.user import User as _User
    from infalette_commerce.customers import resolve_user_customer_id

    user_row = (
        await session.execute(select(_User).where(_User.id == customer_id).limit(1))
    ).scalars().first()
    if user_row is not None:
        return await resolve_user_customer_id(tenant_id, user_row, session)
    return customer_id


async def get_or_create_cart(
    tenant_id: UUID,
    customer_id: UUID | None,
    session: AsyncSession,
    session_key: str | None = None,
) -> Cart:
    """Get or create a cart for a customer or a guest session.

    Authenticated users are keyed by customer_id (customers.id). If an
    unlinked guest cart exists for ``session_key``, it is adopted/merged.
    """
    customer_id = await _ensure_valid_customer_id(tenant_id, customer_id, session)

    cart = None
    if customer_id is not None:
        result = await session.execute(
            select(Cart).where(Cart.tenant_id == tenant_id, Cart.customer_id == customer_id).limit(1)
        )
        cart = result.scalars().first()
        if session_key:
            guest_cart = (
                await session.execute(
                    select(Cart).where(
                        Cart.tenant_id == tenant_id,
                        Cart.session_key == session_key,
                        Cart.customer_id.is_(None),
                    ).limit(1)
                )
            ).scalars().first()
            if guest_cart is not None:
                if cart is None:
                    guest_cart.customer_id = customer_id
                    await session.commit()
                    await session.refresh(guest_cart)
                    cart = guest_cart
                elif guest_cart.id != cart.id:
                    guest_items = list(
                        (await session.execute(select(CartItem).where(CartItem.cart_id == guest_cart.id))).scalars().all()
                    )
                    for gi in guest_items:
                        existing = (
                            await session.execute(
                                select(CartItem).where(
                                    CartItem.cart_id == cart.id,
                                    CartItem.product_id == gi.product_id,
                                    CartItem.variant_id == gi.variant_id if gi.variant_id else CartItem.variant_id.is_(None),
                                ).limit(1)
                            )
                        ).scalars().first()
                        if existing:
                            existing.quantity += gi.quantity
                            await session.delete(gi)
                        else:
                            gi.cart_id = cart.id
                    await session.delete(guest_cart)
                    await session.commit()
                    await _recalculate_cart_total(cart.id, session)
    elif session_key:
        result = await session.execute(
            select(Cart).where(Cart.tenant_id == tenant_id, Cart.session_key == session_key).limit(1)
        )
        cart = result.scalars().first()
    else:
        raise ValueError("Either customer_id or session_key is required")

    if not cart:
        cart = Cart(
            tenant_id=tenant_id,
            customer_id=customer_id,
            session_key=session_key if customer_id is None else None,
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
    """Add an item to the cart, rejecting out-of-stock items and qty > stock."""
    if data.quantity <= 0:
        raise ValueError("Quantity must be at least 1")

    result = await session.execute(
        select(Product).where(Product.id == data.product_id, Product.tenant_id == tenant_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise ValueError("Product not found")

    variant = None
    unit_price = (
        product.sale_price_cents
        if getattr(product, "sale_price_cents", None)
        else product.price_cents
    )
    if data.variant_id is not None:
        from infalette_database.models.product import ProductVariant

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
        unit_price = (
            variant.sale_price_cents
            if getattr(variant, "sale_price_cents", None)
            else variant.price_cents
        )

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
    existing_item = result.scalars().first()

    desired_total_qty = (existing_item.quantity if existing_item else 0) + data.quantity
    _validate_stock_for_cart(product, variant, desired_total_qty)

    if existing_item:
        existing_item.quantity = desired_total_qty
        existing_item.price_cents = unit_price
        await session.commit()
        await session.refresh(existing_item)
        await _recalculate_cart_total(cart.id, session)
        return existing_item

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
            actor_id=None,
            event_type="cart.item_added",
            payload={
                "cart_id": str(cart.id),
                "product_id": str(data.product_id),
                "variant_id": str(data.variant_id) if data.variant_id else None,
                "quantity": data.quantity,
                "customer_id": str(cart.customer_id) if cart.customer_id else None,
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
            "inventory_quantity": getattr(product, "inventory_quantity", None) if product else None,
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
    from sqlalchemy import or_

    if customer_id is not None and session_key:
        return stmt.where(or_(Cart.customer_id == customer_id, Cart.session_key == session_key))
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
    """Update a cart item quantity with tenant, owner, and stock validation."""
    from sqlalchemy import update
    from fastapi import HTTPException

    if tenant_id is not None and customer_id is not None:
        customer_id = await _ensure_valid_customer_id(tenant_id, customer_id, session)

    target_cart_id: UUID | None = None
    item: CartItem | None = None
    if tenant_id is not None:
        stmt = select(CartItem).join(Cart, CartItem.cart_id == Cart.id).where(
            CartItem.id == item_id,
            Cart.tenant_id == tenant_id,
        )
        stmt = _apply_cart_owner_filter(stmt, customer_id, session_key)
        result = await session.execute(stmt)
        item = result.scalars().first()
        if not item:
            raise HTTPException(status_code=404, detail="Cart item not found or access denied")
        target_cart_id = item.cart_id
    else:
        item = (await session.execute(select(CartItem).where(CartItem.id == item_id))).scalars().first()
        if item:
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

    if item is not None:
        product = (
            await session.execute(select(Product).where(Product.id == item.product_id))
        ).scalars().first()
        variant = None
        if item.variant_id is not None:
            from infalette_database.models.product import ProductVariant

            variant = (
                await session.execute(
                    select(ProductVariant).where(ProductVariant.id == item.variant_id)
                )
            ).scalars().first()
        if product is not None:
            _validate_stock_for_cart(product, variant, quantity)

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
