"""Media upload, presigned URL, listing, and deletion routes (S3-backed)."""

from __future__ import annotations

import os
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel

from apps.api.core.tenant_utils import resolve_tenant_id
from infalette_auth.dependencies import get_current_user, require_role
from infalette_database.models.user import User
from infalette_integrations.s3.client import S3Client

router = APIRouter()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "application/pdf",
}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


class PresignRequest(BaseModel):
    filename: str
    content_type: str = "image/jpeg"
    expires_in: int = 3600


def _sanitize_key(tenant_id: UUID, filename: str) -> str:
    base = os.path.basename(filename or "upload.bin").replace("..", "").strip()
    if not base:
        base = "upload.bin"
    return f"tenants/{tenant_id}/{uuid4().hex[:12]}_{base}"


def _ensure_tenant_key(tenant_id: UUID, key: str) -> str:
    prefix = f"tenants/{tenant_id}/"
    normalized = key.lstrip("/")
    if ".." in normalized or not normalized.startswith(prefix):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Media key does not belong to current tenant",
        )
    return normalized


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    tenant_id: UUID = Depends(resolve_tenant_id),
    user: User = Depends(require_role("owner", "admin", "staff")),
):
    """Upload a media file to S3 under the current tenant prefix."""
    content_type = (file.content_type or "application/octet-stream").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content type: {content_type}",
        )
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 10 MB limit",
        )
    key = _sanitize_key(tenant_id, file.filename or "upload")
    try:
        client = S3Client()
        res = client.upload_file(data, key=key, content_type=content_type)
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@router.post("/presign")
async def create_presigned_upload(
    body: PresignRequest,
    tenant_id: UUID = Depends(resolve_tenant_id),
    user: User = Depends(require_role("owner", "admin", "staff")),
):
    """Generate a presigned POST payload for direct browser upload to S3."""
    if body.content_type.lower() not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content type: {body.content_type}",
        )
    key = _sanitize_key(tenant_id, body.filename)
    try:
        client = S3Client()
        post_data = client.get_presigned_post(
            key=key,
            expires_in=min(max(body.expires_in, 60), 86400),
            content_type=body.content_type,
            max_size=MAX_UPLOAD_BYTES,
        )
        return {"key": key, **post_data}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@router.get("/signed-url")
async def get_media_signed_url(
    key: str = Query(...),
    expires_in: int = Query(3600, ge=60, le=86400),
    tenant_id: UUID = Depends(resolve_tenant_id),
    user: User = Depends(require_role("owner", "admin", "staff")),
):
    """Get a temporary signed download URL for a tenant media key."""
    safe_key = _ensure_tenant_key(tenant_id, key)
    try:
        client = S3Client()
        url = client.get_signed_url(safe_key, expires_in=expires_in)
        return {"key": safe_key, "url": url, "expires_in": expires_in}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@router.get("")
async def list_media(
    max_keys: int = Query(100, ge=1, le=500),
    continuation_token: str | None = Query(None),
    tenant_id: UUID = Depends(resolve_tenant_id),
    user: User = Depends(require_role("owner", "admin", "staff")),
):
    """List media objects under the current tenant prefix."""
    prefix = f"tenants/{tenant_id}/"
    try:
        client = S3Client()
        return client.list_files(
            prefix=prefix,
            max_keys=max_keys,
            continuation_token=continuation_token,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@router.delete("/{key:path}")
async def delete_media(
    key: str,
    tenant_id: UUID = Depends(resolve_tenant_id),
    user: User = Depends(require_role("owner", "admin", "staff")),
):
    """Delete a media object belonging to the current tenant."""
    safe_key = _ensure_tenant_key(tenant_id, key)
    try:
        client = S3Client()
        return client.delete_file(safe_key)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
