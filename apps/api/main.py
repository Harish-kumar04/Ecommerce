"""Infalette FastAPI application entry point."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import os
from pathlib import Path
import sys
import types as _types

# Ensure `apps.api.*`, `api.*`, and `main:app` imports all work across:
#   1) Local / Docker repo root (`apps.api.main:app`)
#   2) Vercel Services isolated FastAPI root (`root = "apps/api"`, `entrypoint = "main:app"`, `/var/task`)
_API_DIR = Path(__file__).resolve().parent
_APPS_DIR = _API_DIR.parent
_REPO_ROOT = _APPS_DIR.parent

if "apps" not in sys.modules:
    _apps_pkg = _types.ModuleType("apps")
    _apps_pkg.__path__ = [str(_APPS_DIR)] if (_APPS_DIR / "api").is_dir() else []  # type: ignore[attr-defined]
    sys.modules["apps"] = _apps_pkg

if "apps.api" not in sys.modules:
    if "api" in sys.modules and getattr(sys.modules["api"], "__path__", None):
        _api_pkg = sys.modules["api"]
    else:
        _api_pkg = _types.ModuleType("apps.api")
        _api_pkg.__path__ = [str(_API_DIR)]  # type: ignore[attr-defined]
        _api_pkg.__package__ = "apps.api"
    sys.modules["apps.api"] = _api_pkg
    setattr(sys.modules["apps"], "api", _api_pkg)

if __name__ in ("main", "api.main"):
    sys.modules.setdefault("apps.api.main", sys.modules[__name__])

# Ensure repo root, packages/*/src (local/Docker), and _vendor (Vercel Serverless) are importable
for _candidate in (_REPO_ROOT, _APPS_DIR):
    if (_candidate / "packages").is_dir():
        if str(_candidate) not in sys.path:
            sys.path.insert(0, str(_candidate))
        for _pkg_src in sorted((_candidate / "packages").glob("*/src")):
            if str(_pkg_src) not in sys.path:
                sys.path.insert(0, str(_pkg_src))
        break

for _vendor_candidate in (
    _API_DIR / "_packages",
    _APPS_DIR / "_packages",
    _API_DIR / "_vendor",
):
    if _vendor_candidate.is_dir() and str(_vendor_candidate) not in sys.path:
        sys.path.insert(0, str(_vendor_candidate))

try:
    import sentry_sdk
    from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
except ImportError:  # pragma: no cover - optional in slim runtimes
    sentry_sdk = None  # type: ignore[assignment]
    SentryAsgiMiddleware = None  # type: ignore[assignment]

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from infalette_config import get_settings
from infalette_config.logging import configure_logging

from infalette_auth.middleware import AuthMiddleware

# Observability:
# - Structured logging is configured via infalette_config/logging.py (structlog + JSON)
# - Sentry config lives in infrastructure/monitoring/sentry.yaml (DSN via env SENTRY_DSN)
# - OTEL Collector config lives in infrastructure/monitoring/otel-collector.yaml (endpoint via OTEL_EXPORTER_OTLP_ENDPOINT)
# This module wires both at runtime.

# API version
API_VERSION = "v1"
API_PREFIX = f"/api/{API_VERSION}"

_RUNTIME_READY = False
_RUNTIME_LOCK: asyncio.Lock | None = None


async def _auto_seed_if_empty() -> None:
    """Seed the Muthamilarignar Pathipagam staging catalog when running in Vercel/staging with an empty DB."""
    if "PYTEST_CURRENT_TEST" in os.environ:
        return
    should_seed = bool(os.getenv("VERCEL")) or os.getenv("AUTO_SEED_DEMO", "").lower() in ("1", "true", "yes")
    if not should_seed:
        return

    import logging

    log = logging.getLogger(__name__)
    try:
        from sqlalchemy import select
        from infalette_database.models.tenant import Tenant
        from infalette_database.session import get_session_factory

        async with get_session_factory()() as session:
            existing = (
                await session.execute(select(Tenant.id).where(Tenant.slug == "demo-store").limit(1))
            ).scalar_one_or_none()
        if existing is not None:
            return

        log.info("Empty staging database detected - seeding 27 Muthamilarignar Pathipagam books...")
        try:
            import demo_seed  # type: ignore[import-not-found]
        except ImportError:
            scripts_dir = _REPO_ROOT / "scripts"
            if scripts_dir.is_dir() and str(scripts_dir) not in sys.path:
                sys.path.append(str(scripts_dir))
            import demo_seed  # type: ignore[import-not-found]

        await demo_seed.main()
    except Exception as exc:
        log.warning("Auto-seed skipped or failed: %s", exc)


async def _ensure_runtime_ready() -> None:
    """Idempotent startup initializer safe for both ASGI lifespan and cold serverless invocations."""
    global _RUNTIME_READY, _RUNTIME_LOCK
    if _RUNTIME_READY:
        return
    if _RUNTIME_LOCK is None:
        _RUNTIME_LOCK = asyncio.Lock()
    async with _RUNTIME_LOCK:
        if _RUNTIME_READY:
            return

        settings = get_settings()
        if not os.getenv("VERCEL"):
            configure_logging(debug=settings.debug)

        from infalette_database import session as _db_session

        try:
            await _db_session.init_db()
        except Exception as db_exc:
            if not os.getenv("VERCEL"):
                raise
            import logging
            import tempfile

            logging.getLogger(__name__).warning(
                "Primary DATABASE_URL unreachable on Vercel (%s); falling back to /tmp SQLite staging DB",
                db_exc.__class__.__name__,
            )
            tmp_db = (Path(tempfile.gettempdir()) / "muthamilarignar_staging.db").as_posix()
            os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{tmp_db}"
            os.environ.pop("DATABASE_URL_POOLED", None)
            get_settings.cache_clear()
            settings = get_settings()
            _db_session._engine = None
            _db_session._session_factory = None
            await _db_session.init_db()

        await _auto_seed_if_empty()

        if settings.sentry_dsn and sentry_sdk is not None:
            sentry_sdk.init(
                dsn=settings.sentry_dsn,
                traces_sample_rate=0.1,
                profiles_sample_rate=0.1,
            )

        # Initialize OpenTelemetry (if configured)
        # OTEL endpoint can come from top-level `otel_endpoint` or nested `otel.endpoint`
        # Config example: infrastructure/monitoring/otel-collector.yaml
        otel_endpoint = getattr(settings, "otel_endpoint", None) or getattr(getattr(settings, "otel", None), "endpoint", None)
        otel_enabled = getattr(getattr(settings, "otel", None), "enabled", False) or bool(otel_endpoint)
        if otel_enabled and otel_endpoint:
            try:
                from opentelemetry import trace
                from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
                from opentelemetry.sdk.resources import Resource
                from opentelemetry.sdk.trace import TracerProvider
                from opentelemetry.sdk.trace.export import BatchSpanProcessor

                service_name = getattr(getattr(settings, "otel", None), "service_name", "infalette-api")
                resource = Resource.create({"service.name": service_name, "service.version": "0.1.0", "deployment.environment": settings.app_env})
                provider = TracerProvider(resource=resource)
                processor = BatchSpanProcessor(OTLPSpanExporter(endpoint=otel_endpoint, insecure=True))
                provider.add_span_processor(processor)
                trace.set_tracer_provider(provider)
            except Exception as e:
                import logging

                logging.getLogger(__name__).warning("OTEL init failed (optional): %s", e)

        # Event-driven CRM stage progression (spec §3 pipeline)
        try:
            from apps.api.modules.crm_listeners import register_crm_listeners

            register_crm_listeners()
        except Exception as e:
            import logging

            logging.getLogger(__name__).warning("CRM listeners init failed (optional): %s", e)

        _RUNTIME_READY = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # On Vercel Serverless / Fluid Compute, defer DB + catalog initialization
    # to the outermost HTTP middleware so container Init completes immediately
    # (<1s) instead of risking a cold-start lifespan timeout.
    if not os.getenv("VERCEL"):
        await _ensure_runtime_ready()

    yield

    # Cleanup
    from infalette_database import session as _db_session

    if _db_session._engine is not None:
        await _db_session._engine.dispose()


def create_app() -> FastAPI:
    """Factory function creating the FastAPI application.

    Returns:
        Configured FastAPI application instance.
    """
    settings = get_settings()

    app = FastAPI(
        title="Infalette API",
        description="Multi-tenant, headless commerce SaaS for influencers",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=f"{API_PREFIX}/docs",
        redoc_url=f"{API_PREFIX}/redoc",
        openapi_url=f"{API_PREFIX}/openapi.json",
    )

    # Middleware - order matters (last added is outermost)
    # AuthMiddleware MUST run before IdempotencyMiddleware so tenant scoping
    # is available when building the idempotency cache key.
    # Starlette: last added = outermost, so we add Idempotency FIRST (innermost)
    # then RateLimit, RequestID, CORSMiddleware, Audit, Auth, Sentry outermost.
    from apps.api.core.idempotency import IdempotencyMiddleware
    from apps.api.core.middleware import RateLimitMiddleware, RequestIDMiddleware
    from apps.api.core.audit import AuditMiddleware
    from apps.api.core.bot_protection import BotProtectionMiddleware

    app.add_middleware(IdempotencyMiddleware)  # innermost, closest to handler
    app.add_middleware(RateLimitMiddleware, requests_per_minute=getattr(settings, "rate_limit_per_minute", 60))
    app.add_middleware(BotProtectionMiddleware)  # bot checks + stricter rate limit for bots
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(AuditMiddleware)  # logs POST/PATCH/DELETE after auth
    app.add_middleware(AuthMiddleware)  # must wrap Idempotency for tenant scoping
    if SentryAsgiMiddleware is not None:
        app.add_middleware(SentryAsgiMiddleware)

    if os.getenv("VERCEL"):
        class _VercelColdStartMiddleware:
            def __init__(self, inner_app):
                self.app = inner_app

            async def __call__(self, scope, receive, send):
                if scope.get("type") == "http" and not _RUNTIME_READY:
                    path = scope.get("path", "")
                    if path not in ("/health", "/_vercel/ping"):
                        await _ensure_runtime_ready()
                await self.app(scope, receive, send)

        app.add_middleware(_VercelColdStartMiddleware)  # outermost on Vercel

    # Register exception handlers
    from apps.api.core.exceptions import register_exception_handlers
    register_exception_handlers(app)

    # OpenAPI customization: bearerAuth security scheme in /docs.
    # Installed before routers so the schema is generated lazily, after
    # all routes exist.
    from apps.api.core.openapi import install_openapi_customization
    install_openapi_customization(app)

    # Health check
    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "healthy", "version": "0.1.0"}

    @app.get("/health/detailed", tags=["health"])
    async def health_detailed():
        """Component-level health: database and Redis connectivity."""
        components = {"database": "unknown", "redis": "unknown"}
        try:
            from infalette_database.session import get_engine
            from sqlalchemy import text

            engine = get_engine()
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            components["database"] = "healthy"
        except Exception as e:
            components["database"] = f"error: {e.__class__.__name__}"

        if os.getenv("VERCEL") and not os.getenv("REDIS_URL"):
            components["redis"] = "in-memory-fallback"
        else:
            try:
                from infalette_config import get_settings as _gs
                import redis.asyncio as aioredis

                r = aioredis.from_url(_gs().redis.url, socket_connect_timeout=1)
                await r.ping()
                await r.aclose()
                components["redis"] = "healthy"
            except Exception as e:
                components["redis"] = f"error: {e.__class__.__name__}"

        healthy = components["database"] == "healthy" and (
            components["redis"] in ("healthy", "in-memory-fallback")
        )
        return {
            "status": "healthy" if healthy else "degraded",
            "version": "0.1.0",
            "components": components,
        }

    # Register routers
    from apps.api.modules.tenant.routes import router as tenant_router
    from apps.api.modules.auth.routes import router as auth_router
    from apps.api.modules.store.routes import router as store_router
    from apps.api.modules.product.routes import router as product_router
    from apps.api.modules.category.routes import router as category_router
    from apps.api.modules.collection.routes import router as collection_router
    from apps.api.modules.cart.routes import router as cart_router
    from apps.api.modules.checkout.routes import router as checkout_router
    from apps.api.modules.order.routes import router as order_router
    from apps.api.modules.customer.routes import router as customer_router
    from apps.api.modules.conversation.routes import router as conversation_router
    from apps.api.modules.lead.routes import router as lead_router
    from apps.api.modules.automation.routes import router as automation_router
    from apps.api.modules.analytics.routes import router as analytics_router
    from apps.api.modules.integration.routes import router as integration_router
    from apps.api.modules.seo.routes import router as seo_router
    from apps.api.modules.webhook.routes import router as webhook_router
    from apps.api.modules.webhook.inbound import router as inbound_webhook_router
    from apps.api.modules.page.routes import router as page_router
    from apps.api.modules.theme.routes import router as theme_router
    from apps.api.modules.media.routes import router as media_router
    from apps.api.modules.invoice.routes import router as invoice_router
    from apps.api.modules.discount.routes import router as discount_router
    from apps.api.modules.campaigns.routes import router as campaign_router
    from apps.api.modules.reports.routes import router as reports_router
    from apps.api.modules.public.routes import router as public_router
    from apps.api.modules.platform.routes import router as platform_router

    app.include_router(auth_router, prefix=f"{API_PREFIX}/auth", tags=["auth"])
    app.include_router(tenant_router, prefix=f"{API_PREFIX}/tenants", tags=["tenants"])
    app.include_router(store_router, prefix=f"{API_PREFIX}/stores", tags=["stores"])
    app.include_router(product_router, prefix=f"{API_PREFIX}/products", tags=["products"])
    app.include_router(category_router, prefix=f"{API_PREFIX}/categories", tags=["categories"])
    app.include_router(collection_router, prefix=f"{API_PREFIX}/collections", tags=["collections"])
    app.include_router(cart_router, prefix=f"{API_PREFIX}/cart", tags=["cart"])
    app.include_router(checkout_router, prefix=f"{API_PREFIX}/checkout", tags=["checkout"])
    app.include_router(order_router, prefix=f"{API_PREFIX}/orders", tags=["orders"])
    app.include_router(customer_router, prefix=f"{API_PREFIX}/customers", tags=["customers"])
    app.include_router(conversation_router, prefix=f"{API_PREFIX}/conversations", tags=["conversations"])
    app.include_router(lead_router, prefix=f"{API_PREFIX}/leads", tags=["leads"])
    app.include_router(automation_router, prefix=f"{API_PREFIX}/automation", tags=["automation"])
    app.include_router(analytics_router, prefix=f"{API_PREFIX}/analytics", tags=["analytics"])
    app.include_router(integration_router, prefix=f"{API_PREFIX}/integrations", tags=["integrations"])
    app.include_router(seo_router, prefix=f"{API_PREFIX}/seo", tags=["seo"])
    app.include_router(webhook_router, prefix=f"{API_PREFIX}/webhooks", tags=["webhooks"])
    # Inbound provider webhooks (unauthenticated, signature-verified):
    #   POST /api/v1/webhooks/payments/{razorpay|stripe}
    #   GET+POST /api/v1/webhooks/instagram | /whatsapp
    app.include_router(inbound_webhook_router, prefix=f"{API_PREFIX}/webhooks", tags=["webhooks-inbound"])
    app.include_router(page_router, prefix=f"{API_PREFIX}/pages", tags=["pages"])
    app.include_router(theme_router, prefix=f"{API_PREFIX}/themes", tags=["themes"])
    app.include_router(media_router, prefix=f"{API_PREFIX}/media", tags=["media"])
    app.include_router(invoice_router, prefix=f"{API_PREFIX}/invoices", tags=["invoices"])
    app.include_router(discount_router, prefix=f"{API_PREFIX}/discounts", tags=["discounts"])
    app.include_router(campaign_router, prefix=f"{API_PREFIX}/campaigns", tags=["campaigns"])
    app.include_router(reports_router, prefix=f"{API_PREFIX}/reports", tags=["reports"])
    # Public storefront endpoints (rate-limited; no auth)
    app.include_router(public_router, prefix=f"{API_PREFIX}/public", tags=["public"])
    # Platform billing surfaces: plans + subscriptions
    app.include_router(platform_router, prefix=f"{API_PREFIX}/platform", tags=["platform"])

    # Instrument with OpenTelemetry (if available)
    # Requires `opentelemetry-instrumentation-fastapi` and `opentelemetry-exporter-otlp`
    # Collector config: infrastructure/monitoring/otel-collector.yaml
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor  # type: ignore

        # Only instrument if OTEL is configured — avoids overhead in dev without collector
        otel_endpoint = getattr(settings, "otel_endpoint", None) or getattr(getattr(settings, "otel", None), "endpoint", None)
        otel_enabled = getattr(getattr(settings, "otel", None), "enabled", False) or bool(otel_endpoint)
        if otel_enabled or otel_endpoint:
            FastAPIInstrumentor.instrument_app(app, excluded_urls="/health,/healthz,/ready")
    except ImportError:
        # OTEL not installed — log at debug and continue (e.g. local dev without otel deps)
        import logging

        logging.getLogger(__name__).debug("opentelemetry.instrumentation.fastapi not installed — skipping instrumentation")
    except Exception as e:
        import logging

        logging.getLogger(__name__).warning("FastAPI OTEL instrumentation failed: %s", e)

    return app


def _build_asgi_app():
    try:
        return create_app()
    except Exception as _boot_exc:
        if not os.getenv("VERCEL"):
            raise
        import json as _json
        import traceback as _tb

        _boot_tb = _tb.format_exc()

        async def _fallback_app(scope, receive, send):
            if scope.get("type") == "lifespan":
                while True:
                    msg = await receive()
                    if msg["type"] == "lifespan.startup":
                        await send({"type": "lifespan.startup.complete"})
                    elif msg["type"] == "lifespan.shutdown":
                        await send({"type": "lifespan.shutdown.complete"})
                        return
            body = _json.dumps(
                {"status": "boot_error", "error": repr(_boot_exc), "traceback": _boot_tb}
            ).encode("utf-8")
            await send(
                {
                    "type": "http.response.start",
                    "status": 503,
                    "headers": [(b"content-type", b"application/json")],
                }
            )
            await send({"type": "http.response.body", "body": body})

        return _fallback_app


app = _build_asgi_app()


