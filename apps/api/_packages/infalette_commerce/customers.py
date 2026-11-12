"""Customer identity resolution across channels.

Implements requirements §3 CRM: "represent a person across website,
Instagram and WhatsApp where identity can be lawfully matched".
Matching order: tenant-scoped email exact -> phone exact -> create.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from infalette_database.models.customer import Customer


async def find_or_create_customer(
    tenant_id: UUID,
    session: AsyncSession,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
) -> Customer:
    """Find an existing customer by email first, else by phone; else create.

    Uses ``scalars().first()`` (never ``scalar_one_or_none()``) so shared phone
    numbers across family/household shoppers never raise MultipleResultsFound,
    and never merges two distinct email addresses that share a phone number.
    """
    email_norm = (email or "").strip().lower() or None
    phone_norm = (phone or "").strip() or None
    customer: Optional[Customer] = None

    if email_norm:
        result = await session.execute(
            select(Customer)
            .where(
                Customer.tenant_id == tenant_id,
                func.lower(Customer.email) == email_norm,
            )
            .order_by(Customer.created_at.asc())
            .limit(1)
        )
        customer = result.scalars().first()

    if customer is None and phone_norm:
        result = await session.execute(
            select(Customer)
            .where(
                Customer.tenant_id == tenant_id,
                Customer.phone == phone_norm,
            )
            .order_by(Customer.created_at.asc())
            .limit(1)
        )
        phone_match = result.scalars().first()
        if phone_match is not None:
            existing_email = (phone_match.email or "").strip().lower()
            if not email_norm or not existing_email or existing_email == email_norm:
                customer = phone_match
                if email_norm and not existing_email:
                    customer.email = email_norm
                    await session.flush()

    if customer is not None:
        if phone_norm and not customer.phone:
            customer.phone = phone_norm
            await session.flush()
        if first_name and not customer.first_name:
            customer.first_name = first_name
        if last_name and not customer.last_name:
            customer.last_name = last_name
        return customer

    customer = Customer(
        tenant_id=tenant_id,
        email=email_norm,
        phone=phone_norm,
        first_name=(first_name or "").strip() or None,
        last_name=(last_name or "").strip() or None,
        status="active",
    )
    session.add(customer)
    await session.flush()
    return customer


async def resolve_user_customer_id(
    tenant_id: UUID,
    user,
    session: AsyncSession,
) -> Optional[UUID]:
    """Resolve an authenticated User to a ``customers.id`` row (creating one if missing)."""
    if user is None:
        return None

    raw_uid = getattr(user, "id", None)
    if raw_uid is not None:
        try:
            uid = raw_uid if isinstance(raw_uid, UUID) else UUID(str(raw_uid))
            direct = (
                await session.execute(
                    select(Customer).where(
                        Customer.tenant_id == tenant_id,
                        Customer.id == uid,
                    ).limit(1)
                )
            ).scalars().first()
            if direct is not None:
                return direct.id
        except Exception:
            pass

    email = (getattr(user, "email", None) or "").strip().lower() or None
    phone = (getattr(user, "phone", None) or "").strip() or None
    first_name = getattr(user, "first_name", None)
    last_name = getattr(user, "last_name", None)
    if not email and not phone:
        return None

    customer = await find_or_create_customer(
        tenant_id=tenant_id,
        session=session,
        email=email,
        phone=phone,
        first_name=first_name,
        last_name=last_name,
    )
    return customer.id

