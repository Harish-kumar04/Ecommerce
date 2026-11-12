"""Order management routes."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from infalette_database.session import get_async_session
from infalette_auth.dependencies import get_current_user, require_role
from infalette_auth.rbac import RBACService
from infalette_commerce.schemas import OrderStatusUpdate, FulfillmentCreate, RefundCreate

router = APIRouter()
_rbac = RBACService()


def _is_merchant_staff(user) -> bool:
    return any(_rbac.check_role(user, r) for r in ("owner", "admin", "staff"))


async def _customer_owned_ids(user, session: AsyncSession) -> set[UUID]:
    owned: set[UUID] = set()
    if getattr(user, "id", None):
        try:
            owned.add(UUID(str(user.id)))
        except Exception:
            pass
    email = (getattr(user, "email", None) or "").strip()
    if email and getattr(user, "tenant_id", None):
        from infalette_database.models.customer import Customer

        rows = (
            await session.execute(
                select(Customer.id).where(
                    Customer.tenant_id == user.tenant_id,
                    Customer.email.ilike(email),
                )
            )
        ).scalars().all()
        owned.update(rows)
    return owned


async def _assert_order_access(order_id: UUID, user, session: AsyncSession):
    from apps.api.modules.order.services import get_order as svc_get_order

    order = await svc_get_order(user.tenant_id, order_id, session)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if _is_merchant_staff(user):
        return order
    owned_ids = await _customer_owned_ids(user, session)
    if not getattr(order, "customer_id", None) or order.customer_id not in owned_ids:
        raise HTTPException(status_code=403, detail="Forbidden: access denied to this order")
    return order


def _serialize_order(o) -> dict:
    if isinstance(o, dict):
        return o
    ship = getattr(o, "shipping_address_json", None) or {}
    bill = getattr(o, "billing_address_json", None) or {}
    return {
        "id": str(o.id),
        "tenant_id": str(o.tenant_id),
        "customer_id": str(o.customer_id) if getattr(o, "customer_id", None) else None,
        "checkout_id": str(o.checkout_id) if getattr(o, "checkout_id", None) else None,
        "status": str(getattr(o.status, "value", o.status)),
        "total_cents": o.total_cents,
        "currency": getattr(o, "currency", "INR") or "INR",
        "shipping_address": ship,
        "billing_address": bill,
        "shipping_address_json": ship,
        "billing_address_json": bill,
        "created_at": o.created_at.isoformat() if getattr(o, "created_at", None) else None,
        "updated_at": o.updated_at.isoformat() if getattr(o, "updated_at", None) else None,
    }


@router.get("/", response_model=list)
async def list_orders(
    status: Optional[str] = Query(default=None),
    customer_id: Optional[UUID] = Query(default=None),
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff", "customer")),
):
    """List orders for the tenant (customers see only their own orders)."""
    from apps.api.modules.order.services import list_orders as svc_list_orders

    if _is_merchant_staff(user):
        orders = await svc_list_orders(user.tenant_id, session, status, customer_id)
        return [_serialize_order(o) for o in orders]

    owned_ids = await _customer_owned_ids(user, session)
    if not owned_ids:
        return []
    orders = await svc_list_orders(user.tenant_id, session, status, None)
    return [
        _serialize_order(o)
        for o in orders
        if getattr(o, "customer_id", None) in owned_ids
    ]


@router.get("/{order_id}")
async def get_order(
    order_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff", "customer")),
):
    """Get an order by ID (with customer ownership verification)."""
    return await _assert_order_access(order_id, user, session)


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: UUID,
    data: OrderStatusUpdate,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff")),
):
    """Update order status (merchant roles only)."""
    from apps.api.modules.order.services import update_order_status
    return await update_order_status(user.tenant_id, order_id, data, session)


@router.post("/{order_id}/fulfillments", status_code=status.HTTP_201_CREATED)
async def create_fulfillment(
    order_id: UUID,
    data: FulfillmentCreate,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff")),
):
    """Create a fulfillment for an order – tenant isolated."""
    from apps.api.modules.order.services import create_fulfillment
    return await create_fulfillment(order_id, data, session, tenant_id=user.tenant_id)


@router.get("/{order_id}/fulfillments")
async def get_order_fulfillments(
    order_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff", "customer")),
):
    """Get fulfillments for an order – tenant and customer isolated."""
    await _assert_order_access(order_id, user, session)
    from apps.api.modules.order.services import get_order_fulfillments
    return await get_order_fulfillments(order_id, session, tenant_id=user.tenant_id)


@router.post("/{order_id}/returns")
async def create_return(
    order_id: UUID,
    items: list[dict],
    reason: str,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff", "customer")),
):
    """Create a return request for an order – tenant and customer isolated."""
    await _assert_order_access(order_id, user, session)
    from apps.api.modules.order.services import create_return
    return await create_return(order_id, items, reason, session, tenant_id=user.tenant_id)


@router.post("/refunds", status_code=status.HTTP_201_CREATED)
async def process_refund(
    data: RefundCreate,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff")),
):
    """Process a refund – tenant isolated."""
    from apps.api.modules.order.services import process_refund
    return await process_refund(data, session, tenant_id=user.tenant_id)


class OrderRefundRequest(BaseModel):
    """Refund an order by id; the payment is resolved server-side."""

    amount_cents: Optional[int] = None
    reason: Optional[str] = None


@router.post("/{order_id}/refunds", status_code=status.HTTP_201_CREATED)
async def refund_order(
    order_id: UUID,
    data: OrderRefundRequest,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff")),
):
    """Refund an order — resolves its succeeded payment automatically."""
    from sqlalchemy import select as _select

    from infalette_database.models.payment import Payment, PaymentStatus
    from infalette_database.models.order import Order
    from fastapi import HTTPException as _HTTPException

    order = (
        await session.execute(
            _select(Order).where(Order.id == order_id, Order.tenant_id == user.tenant_id)
        )
    ).scalar_one_or_none()
    if not order:
        raise _HTTPException(status_code=404, detail="Order not found")

    payment = (
        await session.execute(
            _select(Payment).where(
                Payment.order_id == order_id,
                Payment.status == PaymentStatus.SUCCEEDED,
            )
        )
    ).scalars().first()
    if not payment:
        raise _HTTPException(
            status_code=422,
            detail="No succeeded payment found for this order (COD orders are refunded offline)",
        )

    refund_data = RefundCreate(
        payment_id=payment.id,
        amount_cents=data.amount_cents if data.amount_cents is not None else payment.amount_cents,
        reason=data.reason,
    )
    from apps.api.modules.order.services import process_refund
    return await process_refund(refund_data, session, tenant_id=user.tenant_id)


@router.get("/{order_id}/refunds")
async def get_order_refunds(
    order_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff", "customer")),
):
    """Get refunds for an order – tenant and customer isolated."""
    await _assert_order_access(order_id, user, session)
    from apps.api.modules.order.services import get_order_refunds
    return await get_order_refunds(order_id, session, tenant_id=user.tenant_id)


@router.get("/{order_id}/payments")
async def get_order_payments(
    order_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff", "customer")),
):
    """Get payments for an order – tenant and customer isolated."""
    await _assert_order_access(order_id, user, session)
    from apps.api.modules.order.services import get_order_payments
    return await get_order_payments(order_id, session, tenant_id=user.tenant_id)
