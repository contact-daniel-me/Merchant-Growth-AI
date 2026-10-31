import { Request, Response, NextFunction } from 'express';

// Sliding window in-memory rate limiting store
interface RateLimitRecord {
  count: number;
  resetTimeMs: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export class SecurityMiddleware {
  /**
   * Applies production-grade HTTP security headers
   */
  public static applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
    // 1. Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src 'self' data: https:; media-src 'self' data: blob: https:;"
    );

    // 2. Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 3. Clickjacking protection
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // 4. Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 5. Strict-Transport-Security (HSTS) in production
    if (process.env.NODE_ENV === 'production' || req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  }

  /**
   * Configurable sliding window rate limiter
   */
  public static createRateLimiter(maxRequests: number, windowSec: number = 60) {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const key = `${req.baseUrl || req.path}:${ip}`;
      const now = Date.now();
      const windowMs = windowSec * 1000;

      const record = rateLimitStore.get(key);

      if (!record || now > record.resetTimeMs) {
        rateLimitStore.set(key, { count: 1, resetTimeMs: now + windowMs });
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
        return next();
      }

      if (record.count >= maxRequests) {
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('Retry-After', Math.ceil((record.resetTimeMs - now) / 1000));
        return res.status(429).json({
          success: false,
          error: `Too many requests. Rate limit of ${maxRequests} requests per ${windowSec} seconds exceeded.`,
        });
      }

      record.count += 1;
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
      return next();
    };
  }
}
