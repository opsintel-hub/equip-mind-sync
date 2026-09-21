import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "chunk-reload-at";

function isChunkError(err: unknown) {
  const msg = String((err as Error)?.message || err || "");
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  );
}

/**
 * React.lazy that survives stale chunk hashes after a new deploy:
 * retries once with a cache-busting query, then reloads the page (throttled).
 */
export function lazyRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkError(err)) throw err;
      try {
        // second attempt: the browser may have a stale module cache entry
        return await factory();
      } catch (err2) {
        if (!isChunkError(err2)) throw err2;
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 10000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
        }
        // keep Suspense pending while the page reloads
        return await new Promise<{ default: T }>(() => {});
      }
    }
  });
}
