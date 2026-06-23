from __future__ import annotations

import time
from typing import Any, Dict, Optional


class CacheService:
    """
    Thread-safe, lightweight, in-memory caching service with TTL support.
    Ideal for optimizing frequent database lists, metadata, and status checks.
    """

    def __init__(self) -> None:
        self._cache: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        """Retrieve a cached value if it exists and has not expired."""
        if key not in self._cache:
            return None
        
        entry = self._cache[key]
        if time.time() > entry["expires_at"]:
            self.delete(key)
            return None
            
        return entry["value"]

    def set(self, key: str, value: Any, ttl_seconds: int = 30) -> None:
        """Cache a value with a Time-To-Live (TTL) expiration in seconds."""
        self._cache[key] = {
            "value": value,
            "expires_at": time.time() + ttl_seconds,
        }

    def delete(self, key: str) -> None:
        """Remove a specific key from cache."""
        if key in self._cache:
            del self._cache[key]

    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()


# Singleton Instance
cache_service = CacheService()
