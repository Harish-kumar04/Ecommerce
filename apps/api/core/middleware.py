"""Custom middleware for the API."""

from __future__ import annotations

import time
from typing import Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware adding a per-request ID (X-Request-ID) and timing."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        import uuid as uuid_mod

        start_time = time.time()
        request_id = request.headers.get("X-Request-ID") or uuid_mod.uuid4().hex
        request.state.request_id = request_id
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(process_time)
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware using Redis sliding window with in-memory fallback."""

    def __init__(self, app: ASGIApp, requests_per_minute: int = 60) -> None:
        super().__init__(app)
        self._requests_per_minute = requests_per_minute
        self._redis = None
        self._redis_unavailable = False
        self._mem_windows: dict[str, list[float]] = {}

    async def _get_redis(self):
        """Get Redis connection lazily, skipping unconfigured localhost on serverless."""
        if self._redis_unavailable:
            return None
        if self._redis is None:
            try:
                import os
                import redis.asyncio as redis
                from infalette_config import get_settings

                settings = get_settings()
                redis_url = settings.redis.url
                if os.environ.get("VERCEL") == "1" and ("localhost" in redis_url or "127.0.0.1" in redis_url):
                    self._redis_unavailable = True
                    return None
                self._redis = redis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=0.5,
                    socket_timeout=0.5,
                )
            except Exception:
                self._redis_unavailable = True
                return None
        return self._redis

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in ("/health", "/healthz", "/ready") or path.startswith(("/webhooks/", "/api/v1/webhooks/")):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        rate_key = f"rate_limit:{client_ip}:{path}"
        now = time.time()
        window_start = now - 60

        redis = await self._get_redis()
        if redis is not None:
            try:
                await redis.zremrangebyscore(rate_key, 0, window_start)
                count = await redis.zcard(rate_key)
                if count >= self._requests_per_minute:
                    from fastapi.responses import JSONResponse

                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Rate limit exceeded. Try again in a minute."},
                        headers={"Retry-After": "60"},
                    )
                await redis.zadd(rate_key, {str(now): now})
                await redis.expire(rate_key, 60)
                return await call_next(request)
            except Exception:
                self._redis_unavailable = True

        # Redis unavailable: check fail_closed setting, otherwise enforce in-memory window
        from infalette_config import get_settings as _gs

        try:
            fail_closed = bool(getattr(_gs(), "rate_limit_fail_closed", False))
        except Exception:
            fail_closed = False
        if fail_closed:
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=503,
                content={"detail": "Rate limiter unavailable, retry shortly."},
                headers={"Retry-After": "10"},
            )

        if len(self._mem_windows) > 2000:
            self._mem_windows.clear()
        hits = [ts for ts in self._mem_windows.get(rate_key, []) if ts > window_start]
        if len(hits) >= self._requests_per_minute:
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again in a minute."},
                headers={"Retry-After": "60"},
            )
        hits.append(now)
        self._mem_windows[rate_key] = hits
        return await call_next(request)
