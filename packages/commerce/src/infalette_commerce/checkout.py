"""Checkout service with payment integration."""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from infalette_database.models.cart import Cart
from infalette_database.models.cart_item import CartItem
from infalette_database.models.checkout import Checkout, CheckoutStatus
from infalette_database.models.checkout_item import CheckoutItem
from infalette_database.models.order import Order, OrderStatus
from infalette_database.models.payment import Payment, PaymentStatus, PaymentProvider
from infalette_database.models.product import Product
from infalette_database.models.event import Event
from infalette_database.models.customer import Customer
from infalette_commerce.discounts import DiscountService
from infalette_commerce.inventory import (
    reserve_inventory,
    release_inventory,
    reserve_inventory_atomic,
)
from infalette_commerce.pricing import calculate_total, apply_discount, calculate_tax
from infalette_commerce.shipping import ShippingService
from infalette_commerce.tax import TaxService
from infalette_analytics.event_bus import record_event
from infalette_integrations.razorpay.client import RazorpayClient
from infalette_integrations.stripe.client import StripeClient
from infalette_validation.schemas import CheckoutCreate


def _resolve_lead_hint(session_key: Optional[str]) -> Optional[str]:
    """Best-effort lead linkage from a guest session key.

    Social-generated carts use ``wa-{phone}`` / ``ig-{handle}`` session
    keys; the corresponding lead email convention is
    ``{identifier}@whatsapp.com`` / ``@instagram.com``.
    """
    if not session_key:
        return None
    key = str(session_key)
    for prefix, domain in (("wa-", "whatsapp.com"), ("ig-", "instagram.com")):
        if key.startswith(prefix):
            identifier = key[len(prefix):]
            if identifier:
                return f"lead:{identifier}@{domain}"
    return None


async def _resolve_campaign_id(tenant_id: UUID, slug: str, session: AsyncSession) -> Optional[UUID]:
    """Resolve a ``utm_campaign`` value to the tenant's Campaign id.

    Matches the campaign slug, name, or its configured ``utm_campaign``
    tag so web checkouts attribute to campaigns exactly like the social
    paths do.
    """
    try:
        from infalette_database.models.campaign import Campaign

        value = str(slug).strip()
        result = await session.execute(
            select(Campaign).where(
                Campaign.tenant_id == tenant_id,
                (Campaign.slug == value)
                | (Campaign.name == value)
                | (Campaign.utm_campaign == value),
            ).limit(1)
        )
        campaign = result.scalar_one_or_none()
        return campaign.id if campaign else None
    except Exception:
        return None


class CheckoutService:
    """Checkout creation, payment initiation, and webhook processing."""

    def __init__(self) -> None:
        self._razorpay = RazorpayClient()
        self._stripe = StripeClient()

    async def create_checkout(
        self,
        tenant_id: UUID,
        customer_id: Optional[UUID],
        data: CheckoutCreate,
        session: AsyncSession,
        session_key: Optional[str] = None,
        source: str = "website",
    ) -> Checkout:
        """Create a checkout from the cart with inventory reservation.

        ``customer_id`` may be None for guest checkout; in that case the
        customer is resolved/created from ``data.customer_data`` (email ->
        phone dedup) and the cart is located via ``session_key``.
        """
        # Get or create customer (email -> phone -> create; profile convergence)
        from sqlalchemy import or_
        from infalette_commerce.customers import (
            find_or_create_customer,
            resolve_user_customer_id,
        )
        from infalette_commerce.discounts import deduplicate_discount_codes
        from infalette_validation.schemas import normalize_address_dict

        c_email_raw = getattr(data.customer_data, "email", None) if getattr(data, "customer_data", None) else None
        c_phone_raw = getattr(data.customer_data, "phone", None) if getattr(data, "customer_data", None) else None
        c_fname_raw = getattr(data.customer_data, "first_name", None) if getattr(data, "customer_data", None) else None
        c_lname_raw = getattr(data.customer_data, "last_name", None) if getattr(data, "customer_data", None) else None

        form_customer: Optional[Customer] = None
        if c_email_raw or c_phone_raw:
            form_customer = await find_or_create_customer(
                tenant_id,
                session,
                email=c_email_raw,
                phone=c_phone_raw,
                first_name=c_fname_raw,
                last_name=c_lname_raw,
            )

        # Ensure customer_id always points to customers.id (never users.id)
        if customer_id is not None:
            existing_cust = (
                await session.execute(
                    select(Customer).where(
                        Customer.id == customer_id,
                        Customer.tenant_id == tenant_id,
                    ).limit(1)
                )
            ).scalars().first()
            if existing_cust is None:
                from infalette_database.models.user import User as _User

                user_row = (
                    await session.execute(
                        select(_User).where(_User.id == customer_id).limit(1)
                    )
                ).scalars().first()
                if user_row is not None:
                    customer_id = await resolve_user_customer_id(tenant_id, user_row, session)
                elif form_customer is not None:
                    customer_id = form_customer.id

        # Guest: adopt the resolved/created customer identity going forward
        if customer_id is None and form_customer is not None:
            customer_id = form_customer.id

        # Get cart — by customer first, then by guest session key
        cart = None
        if customer_id is not None:
            result = await session.execute(
                select(Cart).where(
                    Cart.tenant_id == tenant_id,
                    Cart.customer_id == customer_id,
                ).limit(1)
            )
            cart = result.scalars().first()

        # Check if customer cart has items; if empty/missing and session_key exists, adopt guest cart
        cart_items: list[CartItem] = []
        if cart is not None:
            cart_items = list(
                (await session.execute(select(CartItem).where(CartItem.cart_id == cart.id))).scalars().all()
            )
        if not cart_items and session_key:
            guest_cart = (
                await session.execute(
                    select(Cart).where(
                        Cart.tenant_id == tenant_id,
                        Cart.session_key == session_key,
                    ).limit(1)
                )
            ).scalars().first()
            if guest_cart is not None:
                guest_items = list(
                    (await session.execute(select(CartItem).where(CartItem.cart_id == guest_cart.id))).scalars().all()
                )
                if guest_items:
                    if cart is None:
                        guest_cart.customer_id = customer_id
                        await session.flush()
                        cart = guest_cart
                        cart_items = guest_items
                    elif guest_cart.id != cart.id:
                        for gi in guest_items:
                            gi.cart_id = cart.id
                        await session.delete(guest_cart)
                        await session.flush()
                        cart_items = guest_items

        if not cart or not cart_items:
            raise ValueError("Cart is empty")

        # Validate quantities before atomic reservation
        for item in cart_items:
            if item.quantity <= 0:
                raise ValueError("Cart item quantity must be at least 1")

        # Reserve inventory transaction-safely (spec §3): all items in one
        # shot — variant-aware; any failure releases earlier deductions.
        reservations = [
            (item.product_id, item.quantity, item.variant_id)
            for item in cart_items
        ]
        all_reserved = await reserve_inventory_atomic(reservations, session)
        if not all_reserved:
            await session.rollback()
            raise ValueError("Insufficient inventory for one or more items in cart")

        # Build checkout items and calculate subtotal
        checkout_items = []
        subtotal = 0
        product_tax_map: dict[str, str] = {}
        for item in cart_items:
            result = await session.execute(
                select(Product).where(
                    Product.id == item.product_id,
                    Product.tenant_id == tenant_id,
                )
            )
            product = result.scalar_one_or_none()
            if not product:
                continue

            price = product.sale_price_cents if product.sale_price_cents else product.price_cents
            item_total = price * item.quantity
            subtotal += item_total
            tax_class = getattr(product, "tax_class", "standard") or "standard"

            checkout_items.append({
                "product_id": str(item.product_id),
                "variant_id": str(item.variant_id) if item.variant_id else None,
                "quantity": item.quantity,
                "price_cents": price,
                "tax_class": tax_class,
                "product_snapshot": {
                    "name": product.name,
                    "sku": product.sku,
                    "price_cents": price,
                    "image_url": getattr(product, "image_url", None),
                    "tax_class": tax_class,
                    # Immutable tax + weight snapshots for invoices/shipping
                    "dimensions": getattr(product, "dimensions_json", None) or {},
                    "ingredients": getattr(product, "ingredients", None),
                    "safety_info": getattr(product, "safety_info", None),
                    "age_suitability": (
                        getattr(product.age_suitability, "value", product.age_suitability)
                        if getattr(product, "age_suitability", None) is not None
                        else None
                    ),
                    "pregnancy_stage": (
                        getattr(product.pregnancy_stage, "value", product.pregnancy_stage)
                        if getattr(product, "pregnancy_stage", None) is not None
                        else None
                    ),
                },
            })
            product_tax_map[str(item.product_id)] = tax_class

        # De-duplicate discount codes and apply via DiscountService BEFORE computing GST
        unique_discount_codes = deduplicate_discount_codes(data.discount_codes)
        applied_codes: list[str] = []
        discounted_subtotal = subtotal
        discount_service = DiscountService()
        has_free_shipping = False
        seen_discount_ids: set[str] = set()
        for code in unique_discount_codes:
            try:
                validation = await discount_service.validate_coupon_code(
                    code=code,
                    tenant_id=tenant_id,
                    order_total_cents=discounted_subtotal,
                    session=session,
                )
                did = str(validation.get("discount_id") or code)
                if did in seen_discount_ids:
                    continue
                seen_discount_ids.add(did)
                discount_type = validation["type"]
                value = validation["value"]
                if discount_type == "free_shipping":
                    has_free_shipping = True
                else:
                    discounted_subtotal = discount_service.apply_coupon(
                        discounted_subtotal, discount_type, value
                    )
                applied_codes.append(validation["code"])
                # Usage counted at payment confirmation (see _confirm_checkout),
                # not at checkout creation — abandoned checkouts must not burn
                # limited-use coupons.
            except ValueError:
                # invalid / expired / inactive coupon: skip
                continue

        total_discount_cents = max(subtotal - discounted_subtotal, 0)
        total_cents = discounted_subtotal

        # Normalize shipping & billing addresses to canonical line1 / postal_code
        shipping_address_dict = normalize_address_dict(data.shipping_address)
        billing_address_dict = normalize_address_dict(data.billing_address) or dict(shipping_address_dict)

        # Load the tenant's store once (tax override + shipping rules).
        store_row = None
        store_tax_override: Optional[int] = None
        store_rules: dict = {}
        try:
            from infalette_database.models.store import Store as _Store

            _srow = await session.execute(
                select(_Store).where(_Store.tenant_id == tenant_id).limit(1)
            )
            store_row = _srow.scalars().first()
            if store_row is not None:
                if getattr(store_row, "tax_rate", None):
                    store_tax_override = int(store_row.tax_rate)
                if getattr(store_row, "shipping_rules_json", None):
                    store_rules = dict(store_row.shipping_rules_json)
        except Exception:
            store_row = None

        # Compute GST AFTER discount (apportioning discount proportionally across items)
        tax_service = TaxService()
        tax_amount = 0
        remaining_discount = total_discount_cents
        for idx, item_data in enumerate(checkout_items):
            item_tax_class = item_data.get("tax_class") or item_data.get("product_snapshot", {}).get("tax_class", "")
            item_gross = item_data["price_cents"] * item_data["quantity"]
            if total_discount_cents > 0 and subtotal > 0:
                if idx == len(checkout_items) - 1:
                    item_discount = min(remaining_discount, item_gross)
                else:
                    item_discount = min((total_discount_cents * item_gross) // subtotal, remaining_discount, item_gross)
                remaining_discount -= item_discount
            else:
                item_discount = 0
            taxable_cents = max(item_gross - item_discount, 0)

            # Class-driven slab; tenant flat override when class is empty
            item_tax = tax_service.calculate_tax(
                taxable_cents,
                item_tax_class,
                shipping_address_dict,
                store_override=store_tax_override,
            )
            # Immutable per-item tax + discount snapshot (spec §7)
            item_rate = tax_service.get_tax_rate(item_tax_class)
            item_data["discount_cents"] = item_discount
            item_data["taxable_cents"] = taxable_cents
            item_data["tax_cents"] = item_tax
            item_data["tax_rate_bps"] = int(round(item_rate * 10000))
            item_data["product_snapshot"]["discount_cents"] = item_discount
            item_data["product_snapshot"]["taxable_cents"] = taxable_cents
            item_data["product_snapshot"]["tax_cents"] = item_tax
            item_data["product_snapshot"]["tax_rate_bps"] = item_data["tax_rate_bps"]
            tax_amount += item_tax
        total_cents += tax_amount

        # Calculate shipping via ShippingService if shipping_address present
        shipping_cost = 0
        if data.shipping_address:
            if not has_free_shipping:
                shipping_service = ShippingService(rules=store_rules)
                zone = shipping_address_dict.get("state", "") or shipping_address_dict.get("country", "") or "default"
                # Real weight from product dimensions_json.weight_kg; 0.5kg per unit fallback
                weight_kg = 0.0
                for item_data in checkout_items:
                    dims = (
                        item_data.get("product_snapshot", {}).get("dimensions")
                        or item_data.get("dimensions_json")
                        or {}
                    )
                    try:
                        item_weight = float((dims or {}).get("weight_kg") or 0.5)
                    except (TypeError, ValueError):
                        item_weight = 0.5
                    weight_kg += item_weight * item_data["quantity"]
                if weight_kg <= 0:
                    weight_kg = 0.5
                # Use current total (after discounts and tax) for free-shipping threshold check inside service
                try:
                    shipping_result = await shipping_service.get_shipping_cost(
                        zone=zone,
                        weight_kg=weight_kg,
                        order_total_cents=total_cents,
                        shipping_type="standard",
                        destination_pincode=shipping_address_dict.get("postal_code"),
                        destination_country=shipping_address_dict.get("country", "India"),
                        declared_value_cents=total_cents,
                        cod=False,
                    )
                    shipping_cost = int(shipping_result.get("price_cents", 0))
                except Exception:
                    shipping_cost = 0
            else:
                shipping_cost = 0
            total_cents += shipping_cost

        # --- Attribution (web UTM / campaign, spec §3 attribution) ---
        attribution_data = getattr(data, "attribution", None)
        attribution_dict: dict = {}
        if attribution_data is not None:
            try:
                attribution_dict = attribution_data.model_dump(exclude_none=True)
            except AttributeError:
                attribution_dict = dict(attribution_data)
        effective_source = (
            attribution_dict.get("source")
            or attribution_dict.get("utm_source")
            or source
        )
        attribution_dict["source"] = effective_source
        campaign_id = attribution_dict.get("campaign_id")
        if campaign_id is None and attribution_dict.get("utm_campaign"):
            campaign_id = await _resolve_campaign_id(
                tenant_id, attribution_dict["utm_campaign"], session
            )
        if campaign_id:
            attribution_dict["campaign_id"] = str(campaign_id)

        ship_dump = dict(shipping_address_dict)
        bill_dump = dict(billing_address_dict)
        cust_info = getattr(data, "customer_data", None)
        if cust_info is not None:
            c_email = getattr(cust_info, "email", None)
            c_phone = getattr(cust_info, "phone", None)
            c_fname = getattr(cust_info, "first_name", None)
            c_lname = getattr(cust_info, "last_name", None)
            if c_email and not ship_dump.get("email"):
                ship_dump["email"] = str(c_email).strip().lower()
            if c_phone and not ship_dump.get("phone"):
                ship_dump["phone"] = str(c_phone).strip()
            full_name = " ".join(x for x in (c_fname, c_lname) if x).strip()
            if full_name and not ship_dump.get("name"):
                ship_dump["name"] = full_name
            if full_name and not bill_dump.get("name"):
                bill_dump["name"] = full_name

        # Create checkout
        checkout = Checkout(
            tenant_id=tenant_id,
            customer_id=customer_id,
            cart_id=cart.id,
            items_json=checkout_items,
            discounts_json=applied_codes,
            total_cents=total_cents,
            currency="INR",
            status=CheckoutStatus.PENDING,
            attribution_json={
                **attribution_dict,
                "subtotal_cents": subtotal,
                "discount_cents": total_discount_cents,
                "tax_cents": tax_amount,
                "shipping_cents": shipping_cost,
                "shipping_address": ship_dump,
                "billing_address": bill_dump,
            },
            expires_at=datetime.utcnow() + timedelta(hours=2),
        )
        session.add(checkout)
        await session.flush()

        # Create checkout items
        for item_data in checkout_items:
            checkout_item = CheckoutItem(
                checkout_id=checkout.id,
                product_id=UUID(item_data["product_id"]),
                variant_id=UUID(item_data["variant_id"]) if item_data["variant_id"] else None,
                quantity=item_data["quantity"],
                price_cents=item_data["price_cents"],
                product_snapshot_json=item_data["product_snapshot"],
            )
            session.add(checkout_item)

        # Record event
        await record_event(
            tenant_id=tenant_id,
            actor_id=None,
            event_type="checkout.created",
            payload={
                "checkout_id": str(checkout.id),
                "total_cents": total_cents,
                "discount_cents": total_discount_cents,
                "customer_id": str(customer_id) if customer_id else None,
                "lead_id": getattr(data, "lead_id", None),
                "lead_hint": (
                    _resolve_lead_hint(session_key)
                    if not getattr(data, "lead_id", None)
                    else None
                ),
                "source": effective_source,
                "campaign_id": str(campaign_id) if campaign_id else None,
                "utm_source": attribution_dict.get("utm_source"),
                "utm_medium": attribution_dict.get("utm_medium"),
                "utm_campaign": attribution_dict.get("utm_campaign"),
                "utm_content": attribution_dict.get("utm_content"),
                "utm_term": attribution_dict.get("utm_term"),
            },
            session=session,
        )

        await session.commit()
        await session.refresh(checkout)
        return checkout

    async def initiate_payment(
        self,
        tenant_id: UUID,
        checkout_id: UUID,
        payment_provider: str,
        session: AsyncSession,
    ) -> dict:
        """Initiate payment for a checkout."""
        result = await session.execute(
            select(Checkout).where(
                Checkout.id == checkout_id,
                Checkout.tenant_id == tenant_id,
            )
        )
        checkout = result.scalar_one_or_none()
        if not checkout:
            raise ValueError("Checkout not found")

        if checkout.status != CheckoutStatus.PENDING:
            raise ValueError(f"Checkout is not in pending status (current: {checkout.status})")

        # Enforce plan quota BEFORE initiating payment so a customer is never
        # charged for an order the tenant's plan cannot accept.
        try:
            from apps.api.core.feature_flags import check_quota as _check_quota

            quota = await _check_quota(tenant_id, session, "orders_per_month")
            if not quota.get("allowed", True):
                from fastapi import HTTPException

                raise HTTPException(
                    status_code=402,
                    detail="Order quota exceeded for current billing period",
                )
        except Exception as e:
            if e.__class__.__name__ == "HTTPException":
                raise

        # Normalize provider string
        provider_normalized = payment_provider.lower().strip() if isinstance(payment_provider, str) else str(payment_provider).lower()

        # --- COD flow: create order directly without external payment ---
        if provider_normalized == "cod":
            payment = Payment(
                tenant_id=tenant_id,
                checkout_id=checkout.id,
                order_id=None,
                provider=PaymentProvider.COD,
                provider_payment_id=f"cod_{checkout.id.hex}",
                amount_cents=checkout.total_cents,
                currency=checkout.currency,
                status=PaymentStatus.PENDING,
            )
            session.add(payment)
            await session.flush()

            await session.execute(
                update(Checkout)
                .where(Checkout.id == checkout_id)
                .values(status=CheckoutStatus.PROCESSING)
                .execution_options(synchronize_session="fetch")
            )
            await session.flush()

            order = await self._confirm_checkout(checkout_id, payment, session)

            await session.commit()
            await session.refresh(payment)
            await session.refresh(order)

            await record_event(
                tenant_id=tenant_id,
                actor_id=None,
                event_type="order.cod_created",
                payload={
                    "order_id": str(order.id),
                    "checkout_id": str(checkout.id),
                    "payment_id": str(payment.id),
                    "customer_id": str(checkout.customer_id) if checkout.customer_id else None,
                },
                session=session,
            )
            return {
                "checkout_id": str(checkout.id),
                "payment_id": str(payment.id),
                "payment_url": None,
                "provider": "cod",
                "amount_cents": checkout.total_cents,
                "currency": checkout.currency,
                "order_id": str(order.id),
                "order_status": order.status.value if hasattr(order.status, "value") else str(order.status),
                "cod": True,
            }

        # Resolve tenant slug for callback_url redirect
        tenant_slug: Optional[str] = None
        try:
            from infalette_database.models.tenant import Tenant as _Tenant

            t_row = (
                await session.execute(select(_Tenant).where(_Tenant.id == tenant_id).limit(1))
            ).scalars().first()
            if isinstance(t_row, _Tenant) and getattr(t_row, "slug", None):
                tenant_slug = str(t_row.slug)
        except Exception:
            tenant_slug = None

        # Resolve tenant's linked merchant account (per-influencer funds routing)
        linked_account_id = await self._resolve_linked_account(tenant_id, provider_normalized, session)

        # Initiate payment with provider BEFORE committing checkout PROCESSING state;
        # if provider call fails (e.g. missing keys), release reserved inventory so cart can retry!
        try:
            if provider_normalized == "razorpay":
                payment_data = await self._razorpay.create_payment_link(
                    checkout,
                    tenant_id,
                    linked_account_id=linked_account_id,
                    tenant_slug=tenant_slug,
                )
                provider_payment_id = payment_data.get("id", "")
                payment_url = payment_data.get("short_url", "")
            elif provider_normalized == "stripe":
                payment_data = await self._stripe.create_checkout_session(
                    checkout, tenant_id, stripe_account_id=linked_account_id
                )
                provider_payment_id = payment_data.get("payment_intent", "")
                payment_url = payment_data.get("url", "")
            else:
                raise ValueError(f"Unsupported payment provider: {payment_provider}")
        except Exception:
            try:
                await self.cancel_checkout(tenant_id, checkout_id, session)
            except Exception:
                pass
            raise

        await session.execute(
            update(Checkout)
            .where(Checkout.id == checkout_id)
            .values(status=CheckoutStatus.PROCESSING)
            .execution_options(synchronize_session="fetch")
        )

        payment = Payment(
            tenant_id=tenant_id,
            checkout_id=checkout.id,
            order_id=None,
            provider=PaymentProvider(provider_normalized),
            provider_payment_id=provider_payment_id,
            amount_cents=checkout.total_cents,
            currency=checkout.currency,
            status=PaymentStatus.PENDING,
        )
        session.add(payment)
        await session.commit()

        return {
            "checkout_id": str(checkout.id),
            "payment_id": str(payment.id),
            "payment_url": payment_url,
            "provider": provider_normalized,
            "amount_cents": checkout.total_cents,
            "currency": checkout.currency,
        }

    async def _resolve_linked_account(
        self,
        tenant_id: UUID,
        provider: str,
        session: AsyncSession,
    ) -> Optional[str]:
        """Resolve the tenant's linked merchant account id, if connected.

        Returns None on any failure so payments still work with platform keys.
        """
        try:
            from infalette_database.models.integration import Integration

            result = await session.execute(
                select(Integration).where(
                    Integration.tenant_id == tenant_id,
                    Integration.provider == provider,
                    Integration.status.in_(("connected", "active")),
                )
            )
            integration = result.scalar_one_or_none()
            if not integration or not integration.credentials_json:
                return None
            creds = dict(integration.credentials_json)
            return (
                creds.get("linked_account_id")
                or creds.get("account_id")
                or creds.get("razorpay_account_id")
                or None
            )
        except Exception:
            return None

    async def process_payment_webhook(
        self,
        provider: str,
        payload: dict,
        signature: str,
        session: AsyncSession,
        raw_body=None,
    ) -> None:
        """Process payment webhook and reconcile order / stock idempotently."""
        from sqlalchemy import or_

        # Verify webhook signature (providers sign the raw body bytes)
        verification_payload = raw_body if raw_body is not None else payload
        if provider == "razorpay":
            verified = await self._razorpay.verify_webhook_signature(verification_payload, signature)
        elif provider == "stripe":
            verified = await self._stripe.verify_webhook_signature(verification_payload, signature)
        else:
            raise ValueError(f"Unsupported payment provider: {provider}")

        if not verified:
            raise ValueError("Webhook signature verification failed")

        event_type = str(payload.get("event") or payload.get("type") or "").strip().lower()
        candidate_ids: list[str] = []

        # Extract payment details across payment.captured, payment.failed, order.paid, payment_link.paid
        if provider == "razorpay":
            rp_payload = payload.get("payload") or {}
            payment_entity = (rp_payload.get("payment") or {}).get("entity") or {}
            order_entity = (rp_payload.get("order") or {}).get("entity") or {}
            plink_entity = (rp_payload.get("payment_link") or {}).get("entity") or {}

            pay_id = str(payment_entity.get("id") or "")
            plink_id = str(plink_entity.get("id") or "")
            ord_id = str(order_entity.get("id") or "")
            payment_id = pay_id or plink_id or ord_id
            candidate_ids = [cid for cid in (pay_id, plink_id, ord_id) if cid]

            checkout_id_str = (
                (payment_entity.get("notes") or {}).get("checkout_id")
                or (order_entity.get("notes") or {}).get("checkout_id")
                or (plink_entity.get("notes") or {}).get("checkout_id")
                or plink_entity.get("reference_id")
                or ""
            )
            status = str(
                payment_entity.get("status")
                or order_entity.get("status")
                or plink_entity.get("status")
                or ""
            ).lower()
            if event_type in ("payment.captured", "order.paid", "payment_link.paid"):
                status = "captured"
            elif event_type == "payment.failed":
                status = "failed"
        elif provider == "stripe":
            payment_intent = payload.get("data", {}).get("object", {}) or {}
            payment_id = str(payment_intent.get("id") or "")
            candidate_ids = [payment_id] if payment_id else []
            checkout_id_str = (payment_intent.get("metadata") or {}).get("checkout_id", "")
            status = str(payment_intent.get("status") or "").lower()

        if not checkout_id_str:
            raise ValueError("Checkout ID not found in webhook payload")

        from uuid import UUID as UUIDType

        checkout_id = UUIDType(str(checkout_id_str))

        # Reconcile Payment by checkout_id OR provider_payment_id (plink_* / pay_* / order_*)
        match_clause = (
            or_(
                Payment.checkout_id == checkout_id,
                Payment.provider_payment_id.in_(candidate_ids),
            )
            if candidate_ids
            else (Payment.checkout_id == checkout_id)
        )
        result = await session.execute(
            select(Payment)
            .where(
                Payment.provider == PaymentProvider(provider),
                match_clause,
            )
            .limit(1)
        )
        payment = result.scalar_one_or_none()
        if not payment:
            raise ValueError("Payment not found")

        # Upgrade provider_payment_id from plink_* to pay_* when Razorpay sends actual pay_* id
        if provider == "razorpay":
            rp_pay_id = str(((payload.get("payload") or {}).get("payment") or {}).get("entity", {}).get("id") or "")
            if rp_pay_id and (
                not getattr(payment, "provider_payment_id", None)
                or str(payment.provider_payment_id).startswith("plink_")
            ):
                payment.provider_payment_id = rp_pay_id
        def _has_real_id(obj, attr: str) -> bool:
            val = getattr(obj, attr, None)
            return isinstance(val, (UUIDType, str)) and bool(str(val).strip())

        if not _has_real_id(payment, "checkout_id"):
            try:
                payment.checkout_id = checkout_id
            except Exception:
                pass

        # Handle SUCCEEDED / CAPTURED / PAID idempotently
        if status in ("captured", "succeeded", "paid"):
            already_confirmed = (
                payment.status == PaymentStatus.SUCCEEDED
                and _has_real_id(payment, "order_id")
            )
            payment.status = PaymentStatus.SUCCEEDED
            order = await self._confirm_checkout(checkout_id, payment, session)
            if already_confirmed:
                await session.commit()
                return

            checkout_row = (
                await session.execute(
                    select(Checkout).where(Checkout.id == checkout_id)
                )
            ).scalar_one_or_none()

            def _coalesce(row, attr):
                if row is None:
                    return None
                if isinstance(row, dict):
                    value = row.get(attr)
                else:
                    value = getattr(row, attr, None)
                return str(value) if isinstance(value, (UUIDType, str)) and value else None

            await record_event(
                tenant_id=payment.tenant_id,
                actor_id=None,
                event_type="payment.succeeded",
                payload={
                    "payment_id": str(payment.id),
                    "order_id": str(order.id),
                    "checkout_id": str(checkout_id),
                    "customer_id": _coalesce(checkout_row, "customer_id"),
                    "lead_id": _coalesce(
                        (getattr(checkout_row, "attribution_json", None) or {}),
                        "lead_id",
                    ),
                },
                session=session,
            )
            await session.commit()
            return

        # Handle FAILED idempotently and release reserved inventory
        if status in ("failed", "denied"):
            # Never downgrade an already-captured payment or order
            if payment.status == PaymentStatus.SUCCEEDED or _has_real_id(payment, "order_id"):
                return
            if payment.status == PaymentStatus.FAILED:
                # Duplicate payment.failed delivery — idempotent no-op
                return

            payment.status = PaymentStatus.FAILED

            # Release reserved stock on Checkout if not already released/paid
            checkout_row = (
                await session.execute(select(Checkout).where(Checkout.id == checkout_id))
            ).scalar_one_or_none()
            if isinstance(checkout_row, Checkout) and checkout_row.status not in (
                CheckoutStatus.FAILED,
                CheckoutStatus.CANCELLED,
                CheckoutStatus.EXPIRED,
                CheckoutStatus.PAID,
            ):
                ci_rows = list(
                    (
                        await session.execute(
                            select(CheckoutItem).where(CheckoutItem.checkout_id == checkout_id)
                        )
                    ).scalars().all()
                )
                for ci in ci_rows:
                    await release_inventory(
                        ci.product_id, ci.quantity, session, variant_id=ci.variant_id
                    )
                await session.execute(
                    update(Checkout)
                    .where(Checkout.id == checkout_id)
                    .values(status=CheckoutStatus.FAILED)
                    .execution_options(synchronize_session="fetch")
                )

            try:
                await record_event(
                    tenant_id=payment.tenant_id,
                    actor_id=None,
                    event_type="payment.failed",
                    payload={
                        "payment_id": str(payment.id),
                        "provider": provider,
                        "provider_payment_id": payment_id,
                        "checkout_id": str(checkout_id),
                        "amount_cents": payment.amount_cents,
                    },
                    session=session,
                )
            except Exception:
                pass

            await session.commit()
            return

        return  # Ignore other intermediate statuses

    async def _confirm_checkout(
        self,
        checkout_id: UUID,
        payment: Payment,
        session: AsyncSession,
    ) -> Order:
        """Confirm checkout and create order.

        Idempotent: if this payment already produced an order, or the
        checkout was already paid, the existing order is returned instead
        of creating a duplicate (webhook providers retry deliveries).
        """
        # Guard 1: payment already linked to an order -> replay
        if payment.order_id is not None:
            result = await session.execute(
                select(Order).where(Order.id == payment.order_id)
            )
            existing = result.scalar_one_or_none()
            if existing:
                return existing

        result = await session.execute(
            select(Checkout).where(Checkout.id == checkout_id)
        )
        checkout = result.scalar_one_or_none()
        if not checkout:
            raise ValueError("Checkout not found")

        # Guard 2: an order already exists for this checkout -> replay
        result = await session.execute(
            select(Order).where(Order.checkout_id == checkout_id)
        )
        existing_order = result.scalars().first()
        if existing_order is not None:
            payment.order_id = existing_order.id
            return existing_order

        # Update checkout status
        await session.execute(
            update(Checkout)
            .where(Checkout.id == checkout_id)
            .values(status=CheckoutStatus.PAID)
            .execution_options(synchronize_session="fetch")
        )

        # Coupons are consumed when payment succeeds (not at checkout
        # creation) so abandoned checkouts don't burn limited codes.
        try:
            from infalette_commerce.discounts import DiscountService

            discount_service = DiscountService()
            for code in checkout.discounts_json or []:
                validation = await discount_service.validate_coupon_code(
                    code=code,
                    tenant_id=checkout.tenant_id,
                    order_total_cents=checkout.total_cents,
                    session=session,
                )
                if validation and validation.get("discount_id"):
                    await discount_service.increment_usage_count(
                        validation["discount_id"], session
                    )
        except Exception:
            pass

        # Create order
        # Enforce plan quota: orders_per_month — block unpaid/COD creation if the
        # tenant has exhausted their plan's monthly order limit, but NEVER drop
        # an order when an external payment has already succeeded (capture).
        is_already_paid = (
            getattr(payment, "status", None) == PaymentStatus.SUCCEEDED
            and getattr(payment, "provider", None) != PaymentProvider.COD
        )
        if not is_already_paid:
            from apps.api.core.feature_flags import check_quota as _check_quota

            quota = await _check_quota(checkout.tenant_id, session, "orders_per_month")
            if not quota.get("allowed", True):
                from fastapi import HTTPException

                raise HTTPException(
                    status_code=402,
                    detail="Order quota exceeded for current billing period",
                )

        order = Order(
            tenant_id=checkout.tenant_id,
            customer_id=checkout.customer_id,
            checkout_id=checkout.id,
            status=OrderStatus.CONFIRMED,
            total_cents=checkout.total_cents,
            currency=checkout.currency,
            shipping_address_json=checkout.attribution_json.get("shipping_address", {}),
            billing_address_json=checkout.attribution_json.get("billing_address", {}),
        )
        session.add(order)
        await session.flush()

        # Update payment with order_id
        payment.order_id = order.id

        # Create order items from checkout items
        result = await session.execute(
            select(CheckoutItem).where(CheckoutItem.checkout_id == checkout_id)
        )
        checkout_items = list(result.scalars().all())

        from infalette_database.models.order_item import OrderItem
        for ci in checkout_items:
            snapshot = ci.product_snapshot_json or {}
            order_item = OrderItem(
                order_id=order.id,
                product_id=ci.product_id,
                variant_id=ci.variant_id,
                quantity=ci.quantity,
                price_cents=ci.price_cents,
                product_snapshot_json=ci.product_snapshot_json,
                # Immutable tax snapshot (spec §7): frozen at checkout time.
                tax_cents=snapshot.get("tax_cents"),
                tax_rate_bps=snapshot.get("tax_rate_bps"),
            )
            session.add(order_item)

        # Clear cart items and reset cart total
        if checkout.cart_id:
            await session.execute(
                delete(CartItem).where(CartItem.cart_id == checkout.cart_id)
            )
            await session.execute(
                update(Cart).where(Cart.id == checkout.cart_id).values(total_cents=0)
            )

        # Record order created event
        await record_event(
            tenant_id=checkout.tenant_id,
            actor_id=checkout.customer_id,
            event_type="order.created",
            payload={"order_id": str(order.id), "total_cents": checkout.total_cents},
            session=session,
        )

        return order

    async def get_payment_status(
        self,
        tenant_id: UUID,
        checkout_id: UUID,
        session: AsyncSession,
    ) -> dict:
        """Get payment status for a checkout."""
        result = await session.execute(
            select(Payment).where(
                Payment.order_id.in_(
                    select(Order.id).where(Order.checkout_id == checkout_id)
                )
            )
        )
        payment = result.scalar_one_or_none()
        if not payment:
            return {"status": "pending", "message": "No payment found"}

        return {
            "status": payment.status.value,
            "provider": payment.provider.value,
            "amount_cents": payment.amount_cents,
            "currency": payment.currency,
        }

    async def cancel_checkout(
        self,
        tenant_id: UUID,
        checkout_id: UUID,
        session: AsyncSession,
    ) -> None:
        """Cancel a checkout and release inventory."""
        result = await session.execute(
            select(Checkout).where(
                Checkout.id == checkout_id,
                Checkout.tenant_id == tenant_id,
            )
        )
        checkout = result.scalar_one_or_none()
        if not checkout:
            raise ValueError("Checkout not found")

        # Release inventory for each checkout item (including variant stock)
        result = await session.execute(
            select(CheckoutItem).where(CheckoutItem.checkout_id == checkout_id)
        )
        checkout_items = list(result.scalars().all())

        for ci in checkout_items:
            await release_inventory(ci.product_id, ci.quantity, session, variant_id=ci.variant_id)

        # Update checkout status
        await session.execute(
            update(Checkout)
            .where(Checkout.id == checkout_id)
            .values(status=CheckoutStatus.CANCELLED)
            .execution_options(synchronize_session="fetch")
        )

        await session.commit()
