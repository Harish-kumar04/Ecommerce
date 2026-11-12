"""Invoice API routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from infalette_database.session import get_async_session
from infalette_auth.dependencies import require_role
from apps.api.modules.order.routes import _assert_order_access

router = APIRouter()


@router.get("/{order_id}", response_model=dict)
async def get_invoice(
    order_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff", "customer")),
):
    """Get invoice data for an order – tenant and customer isolated."""
    await _assert_order_access(order_id, user, session)
    from apps.api.modules.invoice.services import get_invoice as svc_get_invoice
    return await svc_get_invoice(user.tenant_id, order_id, session)


@router.get("/{order_id}/download")
async def download_invoice(
    order_id: UUID,
    format: str = Query(default="html", description="html or pdf"),
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff", "customer")),
):
    """Download invoice as HTML or PDF – tenant and customer isolated."""
    await _assert_order_access(order_id, user, session)
    from apps.api.modules.invoice.services import get_invoice_html, get_invoice_pdf

    fmt = (format or "html").lower()
    if fmt == "pdf":
        pdf_bytes = await get_invoice_pdf(user.tenant_id, order_id, session)
        is_pdf = pdf_bytes.startswith(b"%PDF")
        if is_pdf:
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="invoice-{order_id}.pdf"'},
            )
        else:
            return HTMLResponse(content=pdf_bytes.decode("utf-8", errors="replace"))
    else:
        html = await get_invoice_html(user.tenant_id, order_id, session)
        return HTMLResponse(
            content=html,
            headers={"Content-Disposition": f'inline; filename="invoice-{order_id}.html"'},
        )


@router.get("/{order_id}/html", response_class=HTMLResponse)
async def get_invoice_html_route(
    order_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    user=Depends(require_role("owner", "admin", "staff", "customer")),
):
    """Render invoice as HTML page – tenant and customer isolated."""
    await _assert_order_access(order_id, user, session)
    from apps.api.modules.invoice.services import get_invoice_html
    html = await get_invoice_html(user.tenant_id, order_id, session)
    return HTMLResponse(content=html)
