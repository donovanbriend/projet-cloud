import json
import logging
import sys
import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class JSONFormatter(logging.Formatter):
    """Formatte les logs en JSON structuré pour Cloud Logging."""

    def format(self, record: logging.LogRecord) -> str:
        log = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "time": self.formatTime(record),
        }
        if record.exc_info:
            log["exception"] = self.formatException(record.exc_info)
        return json.dumps(log)


def setup_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    logging.basicConfig(level=logging.INFO, handlers=[handler])
    # Silence les logs verbeux de libs tierces
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


logger = logging.getLogger("auth-service")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log chaque requête HTTP avec latence, status et chemin."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        # Pas de log pour les health checks (trop verbeux)
        if request.url.path != "/health":
            logger.info(json.dumps({
                "httpRequest": {
                    "method": request.method,
                    "url": str(request.url),
                    "status": response.status_code,
                    "latency": f"{duration_ms}ms",
                    "userAgent": request.headers.get("user-agent", ""),
                }
            }))

        return response
