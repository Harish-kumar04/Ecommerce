"""Role-based access control."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status

from infalette_database.models.user import User
from infalette_database.models.role import UserRole


class RBACService:
    """Role-based access control with permission checking."""

    # Role hierarchy: higher roles inherit lower roles' permissions
    ROLE_HIERARCHY: dict[UserRole, list[UserRole]] = {
        UserRole.PLATFORM_OWNER: [
            UserRole.TENANT_OWNER,
            UserRole.STORE_MANAGER,
            UserRole.MARKETING_AGENT,
            UserRole.SUPPORT_AGENT,
            UserRole.CUSTOMER,
        ],
        UserRole.TENANT_OWNER: [
            UserRole.STORE_MANAGER,
            UserRole.MARKETING_AGENT,
            UserRole.SUPPORT_AGENT,
            UserRole.CUSTOMER,
        ],
        UserRole.STORE_MANAGER: [
            UserRole.MARKETING_AGENT,
            UserRole.SUPPORT_AGENT,
            UserRole.CUSTOMER,
        ],
        UserRole.MARKETING_AGENT: [
            UserRole.SUPPORT_AGENT,
            UserRole.CUSTOMER,
        ],
        UserRole.SUPPORT_AGENT: [
            UserRole.CUSTOMER,
        ],
        UserRole.CUSTOMER: [],
    }

    # Permission catalog per role (string keys matching users.role column)
    ROLE_PERMISSIONS: dict[str, set[str]] = {
        "platform_owner": {
            "tenants.manage", "subscriptions.manage", "templates.manage",
            "integrations.manage", "platform.health",
            "store.manage", "products.manage", "orders.manage",
            "discounts.manage", "content.manage", "crm.manage",
            "automation.manage", "conversations.manage", "leads.manage",
            "analytics.view", "exports.run", "settings.manage",
        },
        "tenant_owner": {
            "store.manage", "products.manage", "orders.manage",
            "discounts.manage", "content.manage", "crm.manage",
            "automation.manage", "conversations.manage", "leads.manage",
            "analytics.view", "exports.run", "settings.manage",
            "team.manage", "billing.manage", "integrations.manage",
        },
        "store_manager": {
            "products.manage", "orders.manage", "discounts.manage",
            "content.manage", "analytics.view", "settings.manage",
        },
        "marketing_agent": {
            "automation.manage", "conversations.manage",
            "leads.manage", "analytics.view", "content.manage",
        },
        "support_agent": {
            "conversations.manage", "orders.manage", "customers.manage",
        },
        "customer": set(),
    }

    ROLE_ALIASES: dict[str, UserRole] = {
        "owner": UserRole.TENANT_OWNER,
        "admin": UserRole.STORE_MANAGER,
        "store_admin": UserRole.STORE_MANAGER,
        "super_admin": UserRole.PLATFORM_OWNER,
        "staff": UserRole.SUPPORT_AGENT,
    }

    @classmethod
    def _resolve_role_enum(cls, role: "UserRole | str") -> Optional[UserRole]:
        if isinstance(role, UserRole):
            return role
        raw = str(getattr(role, "value", role) or "").strip().lower()
        if not raw:
            return None
        if raw in cls.ROLE_ALIASES:
            return cls.ROLE_ALIASES[raw]
        try:
            return UserRole(raw)
        except ValueError:
            return None

    def check_permission(self, user: User, permission: str) -> bool:
        """Check if a user has a specific permission."""
        if not user.role:
            return False
        resolved = self._resolve_role_enum(user.role)
        if resolved is None:
            return False
        perms = set(self.ROLE_PERMISSIONS.get(resolved.value, set()))
        for sub in self.ROLE_HIERARCHY.get(resolved, []):
            perms |= set(self.ROLE_PERMISSIONS.get(sub.value, set()))
        return permission in perms

    def check_role(self, user: User, required_role: "UserRole | str") -> bool:
        """Check if a user has a required role or higher (hierarchy-aware)."""
        if not user.role:
            return False
        user_raw = str(getattr(user.role, "value", user.role) or "").strip().lower()
        req_raw = str(getattr(required_role, "value", required_role) or "").strip().lower()
        if user_raw == req_raw:
            return True
        user_enum = self._resolve_role_enum(user_raw)
        req_enum = self._resolve_role_enum(req_raw)
        if user_enum is None or req_enum is None:
            return False
        if user_enum == req_enum:
            return True
        higher = self.ROLE_HIERARCHY.get(user_enum, [])
        return req_enum in higher

    def require_role(self, required_role: UserRole):
        """FastAPI dependency for role checking.

        Args:
            required_role: The minimum required role.

        Returns:
            A FastAPI dependency function.
        """
        def role_checker(
            user: User = Depends(self._get_current_user_with_role),
        ) -> User:
            if not self.check_role(user, required_role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required role: {required_role.value}",
                )
            return user

        return role_checker

    def require_permission(self, permission: str):
        """FastAPI dependency for permission checking.

        Args:
            permission: The required permission.

        Returns:
            A FastAPI dependency function.
        """
        def permission_checker(
            user: User = Depends(self._get_current_user_with_role),
        ) -> User:
            if not self.check_permission(user, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required permission: {permission}",
                )
            return user

        return permission_checker

    def _get_current_user_with_role(self) -> User:
        """Get the current user with role loaded.

        This is a placeholder - the actual implementation should use
        the auth dependencies to get the current user.
        """
        # This will be replaced by the actual dependency injection
        raise NotImplementedError("Use get_current_user dependency instead")
