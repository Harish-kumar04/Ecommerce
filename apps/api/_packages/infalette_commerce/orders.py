"""Order management service."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from infalette_database.models.order import Order, OrderStatus
from infalette_database.models.order_item import OrderItem
from infalette_database.models.checkout_item import CheckoutItem
from infalette_database.models.checkout import Checkout
from infalette_database.models.fulfillment import Fulfillment, FulfillmentStatus
from infalette_database.models.refund import Refund, RefundStatus
from infalette_database.models.payment import Payment, PaymentStatus, PaymentProvider
from infalette_analytics.event_bus import record_event


class OrderService:
    """Order management, status transitions, fulfillments, and refunds."""

    async def get_orders(
        self,
        tenant_id: UUID,
        session: AsyncSession,
        filters: Optional[dict] = None,
    ) -> list[Order]:
        """Get orders for a tenant with optional filters."""
        query = select(Order).where(Order.tenant_id == tenant_id)

        if filters:
            if "status" in filters:
                query = query.where(Order.status == OrderStatus(filters["status"]))
            if "customer_id" in filters:
                query = query.where(Order.customer_id == UUID(filters["customer_id"]))
            if "date_from" in filters:
                query = query.where(Order.created_at >= filters["date_from"])
            if "date_to" in filters:
                query = query.where(Order.created_at <= filters["date_to"])

        result = await session.execute(query)
        return list(result.scalars().all())

    async def get_order(
        self,
        tenant_id: UUID,
        order_id: UUID,
        session: AsyncSession,
    ) -> Order | None:
        """Get an order by ID."""
        result = await session.execute(
            select(Order).where(
                Order.id == order_id,
                Order.tenant_id == tenant_id,
            )
        )
        return result.scalar_one_or_none()

    async def update_order_status(
        self,
        tenant_id: UUID,
        order_id: UUID,
        status: OrderStatus,
        session: AsyncSession,
    ) -> Order | None:
        """Update order status with valid transitions."""
        order = await self.get_order(tenant_id, order_id, session)
        if not order:
            return None

        valid_transitions = {
            OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            OrderStatus.CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
            OrderStatus.PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
            OrderStatus.SHIPPED: [OrderStatus.DELIVERED],
            OrderStatus.DELIVERED: [OrderStatus.RETURNED, OrderStatus.REFUNDED],
            OrderStatus.CANCELLED: [],
            OrderStatus.REFUNDED: [],
            OrderStatus.RETURNED: [],
        }

        if status not in valid_transitions.get(order.status, []):
            raise ValueError(
                f"Invalid status transition from {order.status.value} to {status.value}"
            )

        # Restock when an order is cancelled (stock was deducted at checkout)
        if status == OrderStatus.CANCELLED:
            from sqlalchemy import select as _select
            from infalette_database.models.order_item import OrderItem as _OrderItem
            from infalette_commerce.inventory import release_inventory as _release

            items = list(
                (
                    await session.execute(
                        _select(_OrderItem).where(_OrderItem.order_id == order_id)
                    )
                ).scalars().all()
            )
            for item in items:
                await _release(
                    item.product_id, item.quantity, session, variant_id=item.variant_id
                )

        await session.execute(
            update(Order)
            .where(Order.id == order_id)
            .values(status=status)
            .execution_options(synchronize_session="fetch")
        )
        await session.commit()

        # COD settlement (spec §3): cash collected on delivery — flip the
        # PENDING COD payment to SUCCEEDED so revenue/LTV reflect reality.
        if status == OrderStatus.DELIVERED:
            await self._settle_cod_payments(tenant_id, order_id, session)

        await record_event(
            tenant_id=tenant_id,
            actor_id=None,
            event_type=f"order.{status.value}",
            payload={"order_id": str(order_id)},
            session=session,
        )

        return await self.get_order(tenant_id, order_id, session)

    async def _settle_cod_payments(
        self,
        tenant_id: UUID,
        order_id: UUID,
        session: AsyncSession,
    ) -> int:
        """Mark PENDING COD payments for an order as SUCCEEDED (delivered).

        Returns the number of payments settled. Emits ``payment.succeeded``
        per payment so CRM stage progression and revenue analytics include
        cash-on-delivery sales.
        """
        from sqlalchemy import select as _select, update as _update

        from infalette_database.models.payment import (
            Payment,
            PaymentProvider,
            PaymentStatus,
        )
        from infalette_analytics.event_bus import record_event as _record

        payments = list(
            (
                await session.execute(
                    _select(Payment).where(
                        Payment.order_id == order_id,
                        Payment.provider == PaymentProvider.COD,
                        Payment.status == PaymentStatus.PENDING,
                    )
                )
            ).scalars().all()
        )
        if not payments:
            return 0

        await session.execute(
            _update(Payment)
            .where(Payment.id.in_([p.id for p in payments]))
            .values(status=PaymentStatus.SUCCEEDED)
            .execution_options(synchronize_session="fetch")
        )
        await session.commit()

        for payment in payments:
            await _record(
                tenant_id=tenant_id,
                actor_id=None,
                event_type="payment.succeeded",
                payload={
                    "order_id": str(order_id),
                    "payment_id": str(payment.id),
                    "amount_cents": payment.amount_cents,
                    "provider": "cod",
                    "settled_on_delivery": True,
                },
                session=session,
            )
        return len(payments)

    async def create_fulfillment(
        self,
        order_id: UUID,
        tracking_number: Optional[str],
        carrier: Optional[str],
        session: AsyncSession,
    ) -> Fulfillment:
        """Create a fulfillment for an order."""
        fulfillment = Fulfillment(
            order_id=order_id,
            tracking_number=tracking_number,
            carrier=carrier,
            status=FulfillmentStatus.PENDING,
        )
        session.add(fulfillment)
        await session.flush()

        await session.execute(
            update(Order)
            .where(Order.id == order_id)
            .values(status=OrderStatus.PROCESSING)
            .execution_options(synchronize_session="fetch")
        )

        await session.commit()
        await session.refresh(fulfillment)
        return fulfillment

    async def process_refund(
        self,
        payment_id: UUID,
        amount_cents: int,
        reason: Optional[str],
        session: AsyncSession,
    ) -> Refund:
        """Process a refund for a payment.

        Moves money through the provider when the payment was collected
        online (Razorpay/Stripe); COD refunds are explicitly offline.
        The provider call happens BEFORE any ledger row is written so a
        failed API call never leaves a phantom succeeded refund.
        """
        result = await session.execute(
            select(Payment).where(Payment.id == payment_id)
        )
        payment = result.scalar_one_or_none()
        if not payment:
            raise ValueError("Payment not found")

        from sqlalchemy import func

        if amount_cents <= 0:
            raise ValueError("Refund amount must be positive")

        existing_refunded_res = await session.execute(
            select(func.coalesce(func.sum(Refund.amount_cents), 0)).where(
                Refund.payment_id == payment_id,
                Refund.status == RefundStatus.SUCCEEDED,
            )
        )
        existing_refunded = int(existing_refunded_res.scalar() or 0)
        if existing_refunded + amount_cents > payment.amount_cents:
            remaining = max(payment.amount_cents - existing_refunded, 0)
            raise ValueError(
                f"Cumulative refund exceeds payment amount (remaining refundable: {remaining} cents)"
            )
        if not payment.provider_payment_id and payment.provider != PaymentProvider.COD:
            raise ValueError("Payment has no provider reference to refund against")

        provider_refund_id: Optional[str] = None
        if payment.provider == PaymentProvider.RAZORPAY:
            try:
                from infalette_integrations.razorpay.client import RazorpayClient

                provider_result = await RazorpayClient().create_refund(
                    payment.provider_payment_id, amount_cents, reason
                )
                provider_refund_id = str(provider_result.get("id") or "")
            except Exception as exc:  # pragma: no cover - network path
                refund = Refund(
                    payment_id=payment_id,
                    amount_cents=amount_cents,
                    currency=payment.currency,
                    reason=reason,
                    status=RefundStatus.FAILED,
                )
                session.add(refund)
                await session.commit()
                raise ValueError(f"Provider refund failed: {exc}") from exc
        elif payment.provider == PaymentProvider.STRIPE:
            try:
                from infalette_integrations.stripe.client import StripeClient

                provider_result = await StripeClient().create_refund(
                    payment.provider_payment_id, amount_cents, reason
                )
                provider_refund_id = str(provider_result.get("id") or "")
            except Exception as exc:  # pragma: no cover - network path
                refund = Refund(
                    payment_id=payment_id,
                    amount_cents=amount_cents,
                    currency=payment.currency,
                    reason=reason,
                    status=RefundStatus.FAILED,
                )
                session.add(refund)
                await session.commit()
                raise ValueError(f"Provider refund failed: {exc}") from exc
        # COD refunds are settled offline by the merchant; no provider call.

        refund = Refund(
            payment_id=payment_id,
            amount_cents=amount_cents,
            currency=payment.currency,
            reason=reason,
            status=RefundStatus.SUCCEEDED,
        )
        session.add(refund)
        await session.flush()

        if reason and provider_refund_id:
            refund.reason = f"{reason} [provider_refund:{provider_refund_id}]"

        is_fully_refunded = existing_refunded + amount_cents >= payment.amount_cents
        if is_fully_refunded:
            payment.status = PaymentStatus.REFUNDED
        else:
            payment.status = PaymentStatus.PARTIALLY_REFUNDED

        order_row = None
        if payment.order_id:
            order_row = (
                await session.execute(select(Order).where(Order.id == payment.order_id))
            ).scalar_one_or_none()
            if is_fully_refunded and order_row and order_row.status in (
                OrderStatus.DELIVERED,
                OrderStatus.SHIPPED,
                OrderStatus.PROCESSING,
                OrderStatus.CONFIRMED,
                OrderStatus.PENDING,
            ):
                await session.execute(
                    update(Order)
                    .where(Order.id == payment.order_id)
                    .values(status=OrderStatus.REFUNDED)
                    .execution_options(synchronize_session="fetch")
                )

        await record_event(
            tenant_id=getattr(payment, "tenant_id", None) or (order_row.tenant_id if payment.order_id and order_row else None),
            actor_id=None,
            event_type="payment.refunded",
            payload={
                "payment_id": str(payment_id),
                "order_id": str(payment.order_id) if payment.order_id else None,
                "amount_cents": amount_cents,
                "provider": payment.provider.value if hasattr(payment.provider, "value") else str(payment.provider),
            },
            session=session,
        )

        await session.commit()
        await session.refresh(refund)
        return refund

    async def create_return(
        self,
        order_id: UUID,
        items: list[dict],
        reason: str,
        session: AsyncSession,
    ) -> dict:
        """Create a return request for an order, capping returned quantities at OrderItem.quantity."""
        from infalette_database.models.event import Event
        from infalette_commerce.inventory import release_inventory as _release

        result = await session.execute(
            select(Order).where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise ValueError("Order not found")

        current_status = order.status.value if hasattr(order.status, "value") else str(order.status)
        allowed_sources = {
            OrderStatus.DELIVERED.value,
            OrderStatus.SHIPPED.value,
            OrderStatus.RETURNED.value,
        }
        if current_status not in allowed_sources:
            raise ValueError(
                f"Invalid status transition from {current_status} to {OrderStatus.RETURNED.value}"
            )

        order_items = list(
            (
                await session.execute(
                    select(OrderItem).where(OrderItem.order_id == order_id)
                )
            ).scalars().all()
        )
        if not order_items:
            raise ValueError("Order has no items to return")

        # Sum previously returned quantities per (product_id, variant_id)
        prior_returned: dict[tuple[str, Optional[str]], int] = {}
        try:
            prior_events = list(
                (
                    await session.execute(
                        select(Event).where(
                            Event.tenant_id == order.tenant_id,
                            Event.event_type == "order.returned",
                        )
                    )
                ).scalars().all()
            )
            for ev in prior_events:
                pl = getattr(ev, "payload_json", None) or {}
                if str(pl.get("order_id") or "") != str(order_id):
                    continue
                for ri in pl.get("items") or []:
                    rk = (
                        str(ri.get("product_id") or ""),
                        str(ri.get("variant_id")) if ri.get("variant_id") else None,
                    )
                    prior_returned[rk] = prior_returned.get(rk, 0) + max(int(ri.get("quantity") or 0), 0)
        except Exception:
            prior_returned = {}

        # Map order items (aggregating if same product+variant appears)
        ordered_map: dict[tuple[str, Optional[str]], OrderItem] = {}
        ordered_qty: dict[tuple[str, Optional[str]], int] = {}
        by_product_only: dict[str, tuple[str, Optional[str]]] = {}
        for oi in order_items:
            k = (str(oi.product_id), str(oi.variant_id) if oi.variant_id else None)
            ordered_map[k] = oi
            ordered_qty[k] = ordered_qty.get(k, 0) + int(oi.quantity)
            by_product_only.setdefault(str(oi.product_id), k)

        normalized_return_items: list[dict] = []
        requested_by_key: dict[tuple[str, Optional[str]], int] = {}

        if items:
            for req in items:
                pid = str(req.get("product_id") or "").strip()
                vid = str(req.get("variant_id")).strip() if req.get("variant_id") else None
                try:
                    qty = int(req.get("quantity", 0))
                except (TypeError, ValueError):
                    raise ValueError("Return quantity must be a positive integer")
                if qty <= 0:
                    raise ValueError("Return quantity must be positive")
                key = (pid, vid)
                if key not in ordered_qty:
                    if vid is None and pid in by_product_only:
                        key = by_product_only[pid]
                    else:
                        raise ValueError(f"Item {pid} does not belong to this order")
                requested_by_key[key] = requested_by_key.get(key, 0) + qty

            for key, req_qty in requested_by_key.items():
                already = prior_returned.get(key, 0)
                max_allowed = ordered_qty[key] - already
                if req_qty > max_allowed:
                    raise ValueError(
                        f"Return quantity ({req_qty}) exceeds remaining returnable quantity ({max(max_allowed, 0)})"
                    )
        else:
            for key, max_q in ordered_qty.items():
                rem = max_q - prior_returned.get(key, 0)
                if rem > 0:
                    requested_by_key[key] = rem
            if not requested_by_key:
                raise ValueError("All items in this order have already been returned")

        for key, qty in requested_by_key.items():
            oi = ordered_map[key]
            await _release(
                oi.product_id, qty, session, variant_id=oi.variant_id
            )
            normalized_return_items.append({
                "product_id": str(oi.product_id),
                "variant_id": str(oi.variant_id) if oi.variant_id else None,
                "quantity": qty,
            })

        await session.execute(
            update(Order)
            .where(Order.id == order_id)
            .values(status=OrderStatus.RETURNED)
            .execution_options(synchronize_session="fetch")
        )

        await record_event(
            tenant_id=order.tenant_id,
            actor_id=None,
            event_type="order.returned",
            payload={"order_id": str(order_id), "reason": reason, "items": normalized_return_items},
            session=session,
        )

        await session.commit()

        return {
            "order_id": str(order_id),
            "status": OrderStatus.RETURNED.value,
            "reason": reason,
            "items": normalized_return_items,
        }

    async def get_order_fulfillments(
        self,
        order_id: UUID,
        session: AsyncSession,
    ) -> list[Fulfillment]:
        """Get all fulfillments for an order."""
        result = await session.execute(
            select(Fulfillment).where(Fulfillment.order_id == order_id)
        )
        return list(result.scalars().all())

    async def get_order_refunds(
        self,
        order_id: UUID,
        session: AsyncSession,
    ) -> list[Refund]:
        """Get all refunds for an order."""
        result = await session.execute(
            select(Payment).where(Payment.order_id == order_id)
        )
        payments = list(result.scalars().all())

        refunds = []
        for payment in payments:
            result = await session.execute(
                select(Refund).where(Refund.payment_id == payment.id)
            )
            refunds.extend(result.scalars().all())

        return refunds
