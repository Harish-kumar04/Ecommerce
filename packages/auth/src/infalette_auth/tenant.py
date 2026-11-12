"""Tenant context resolution."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from fastapi import Request

from infalette_database.models.tenant import Tenant
from infalette_database.models.domain import Domain
from infalette_auth.jwt import TokenManager


@dataclass
class TenantContext:
    """Tenant context resolved from domain or JWT."""

    tenant_id: UUID
    tenant: Optional[Tenant] = None
    domain: Optional[str] = None
    is_platform: bool = False


class TenantResolver:
    """Resolves tenant from domain, subdomain, or JWT token."""

    def __init__(self) -> None:
        self._token_manager = TokenManager()

    async def resolve_tenant_from_domain(self, domain: str) -> Optional[Tenant]:
        """Resolve tenant from custom domain.

        Args:
            domain: The domain to resolve.

        Returns:
            The tenant if found, None otherwise.
        """
        from sqlalchemy import select
        from infalette_database.session import get_session_factory
        from infalette_database.models.domain import Domain

        async with get_session_factory()() as session:
            result = await session.execute(
                select(Domain).where(Domain.domain == domain)
            )
            domain_record = result.scalar_one_or_none()
            if domain_record:
                result = await session.execute(
                    select(Tenant).where(Tenant.id == domain_record.tenant_id)
                )
                return result.scalar_one_or_none()
        return None

    async def resolve_tenant_from_subdomain(self, subdomain: str) -> Optional[Tenant]:
        """Resolve tenant from subdomain.

        Args:
            subdomain: The subdomain to resolve.

        Returns:
            The tenant if found, None otherwise.
        """
        from sqlalchemy import select
        from infalette_database.session import get_session_factory

        async with get_session_factory()() as session:
            result = await session.execute(
                select(Tenant).where(Tenant.slug == subdomain)
            )
            return result.scalar_one_or_none()

    async def get_tenant_context(self, request: Request) -> TenantContext:
        """Get tenant context from request.

        Resolution order:
        1. JWT token (legacy HS256 or Clerk RS256)
        2. Explicit X-Tenant header (UUID or slug)
        3. Custom domain (port-stripped)
        4. Subdomain (port-stripped)
        """
        from infalette_database.context import PLATFORM_TENANT_ID

        # 1. Try JWT token first
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                payload = self._token_manager.decode_token(token)
                if payload.token_type == "access":
                    tid = UUID(payload.tenant_id)
                    return TenantContext(
                        tenant_id=tid,
                        is_platform=(payload.sub == "platform" or str(tid) == PLATFORM_TENANT_ID),
                    )
            except Exception:
                # Try Clerk token if configured
                try:
                    from infalette_auth.clerk import resolve_jwks_url, verify_clerk_token
                    from infalette_database.models.user import User
                    from infalette_database.session import get_session_factory
                    from sqlalchemy import select

                    if resolve_jwks_url():
                        claims = verify_clerk_token(token)
                        clerk_sub = claims.get("sub")
                        if clerk_sub:
                            async with get_session_factory()() as session:
                                user = (
                                    await session.execute(
                                        select(User).where(User.clerk_user_id == clerk_sub)
                                    )
                                ).scalar_one_or_none()
                                if user and user.tenant_id:
                                    return TenantContext(
                                        tenant_id=user.tenant_id,
                                        is_platform=(str(user.tenant_id) == PLATFORM_TENANT_ID),
                                    )
                except Exception:
                    pass

        # 2. Try explicit X-Tenant header
        x_tenant = (request.headers.get("X-Tenant") or request.headers.get("x-tenant") or "").strip()
        if x_tenant:
            try:
                tid = UUID(x_tenant)
                return TenantContext(
                    tenant_id=tid,
                    is_platform=(str(tid) == PLATFORM_TENANT_ID),
                )
            except ValueError:
                try:
                    tenant = await self.resolve_tenant_from_subdomain(x_tenant)
                    if tenant:
                        return TenantContext(tenant_id=tenant.id, tenant=tenant)
                except Exception:
                    pass

        # 3. Try domain / subdomain resolution (strip :port first)
        raw_host = request.headers.get("Host", "")
        host = raw_host.split(":")[0].strip().lower() if raw_host else ""
        if host and host not in ("localhost", "127.0.0.1", "testserver"):
            try:
                tenant = await self.resolve_tenant_from_domain(host)
                if tenant:
                    return TenantContext(
                        tenant_id=tenant.id,
                        tenant=tenant,
                        domain=host,
                    )

                subdomain = host.split(".")[0] if "." in host else host
                if subdomain not in ("www", "api", "admin", "platform"):
                    tenant = await self.resolve_tenant_from_subdomain(subdomain)
                    if tenant:
                        return TenantContext(
                            tenant_id=tenant.id,
                            tenant=tenant,
                            domain=host,
                        )
            except Exception:
                pass

        # Fallback: unresolved / platform context
        return TenantContext(
            tenant_id=UUID(PLATFORM_TENANT_ID),
            is_platform=True,
        )
