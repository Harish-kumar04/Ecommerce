"""CartItem model."""

from __future__ import annotations

from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from infalette_database.base import Base


class CartItem(Base):
    """Cart item model.

    Individual items within a cart.
    """

    __tablename__ = "cart_items"

    # tenant_id was added by migration 006 to enable row-level security on
    # child tables. The service populates it from the parent cart so we
    # keep it as a plain FK here rather than re-using the TenantMixin.
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    cart_id = Column(
        UUID(as_uuid=True), ForeignKey("carts.id"), nullable=False, index=True
    )
    product_id = Column(
        UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True
    )
    variant_id = Column(
        UUID(as_uuid=True), ForeignKey("product_variants.id"), nullable=True
    )
    quantity = Column(Integer, nullable=False)
    price_cents = Column(Integer, nullable=False)


from sqlalchemy import event, select as _select
from sqlalchemy.orm import Session as _SyncSession


@event.listens_for(_SyncSession, "before_flush")
def _backfill_cart_item_tenant_id(session: _SyncSession, flush_context, instances) -> None:
    """Populate CartItem.tenant_id from the parent Cart when omitted by callers."""
    from infalette_database.models.cart import Cart

    for obj in session.new:
        if isinstance(obj, CartItem) and getattr(obj, "tenant_id", None) is None and getattr(obj, "cart_id", None) is not None:
            # Check in-session Cart instances first
            for candidate in list(session.identity_map.values()) + list(session.new):
                if isinstance(candidate, Cart) and candidate.id == obj.cart_id and candidate.tenant_id is not None:
                    obj.tenant_id = candidate.tenant_id
                    break
            if obj.tenant_id is None:
                with session.no_autoflush:
                    row = session.execute(
                        _select(Cart.tenant_id).where(Cart.id == obj.cart_id)
                    ).scalar_one_or_none()
                    if row is not None:
                        obj.tenant_id = row

