import type {
  NextFunction,
  Request,
  Response,
} from "express";

type Entry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
  key: (request: Request) => string;
  message?: string;
};

/**
 * Rate limit em memória, suficiente para uma instância.
 * Para várias réplicas, trocar por Redis mantendo a mesma interface.
 */
export function createRateLimit(options: RateLimitOptions) {
  const store = new Map<string, Entry>();
  let lastCleanup = Date.now();

  return function rateLimit(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    const now = Date.now();

    if (now - lastCleanup > options.windowMs) {
      for (const [key, entry] of store) {
        if (entry.resetAt <= now) {
          store.delete(key);
        }
      }

      lastCleanup = now;
    }

    const key = options.key(request);
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });

      next();
      return;
    }

    current.count += 1;

    if (current.count > options.max) {
      const retryAfter = Math.ceil(
        (current.resetAt - now) / 1000
      );

      response.setHeader("Retry-After", String(retryAfter));
      response.status(429).json({
        error:
          options.message ??
          "Muitas tentativas. Tente novamente mais tarde.",
      });
      return;
    }

    next();
  };
}
