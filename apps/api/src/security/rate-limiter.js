export function createRateLimiter({
  windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  limits = {
    general: Number(process.env.RATE_LIMIT_MAX_GENERAL || 300),
    auth: Number(process.env.RATE_LIMIT_MAX_AUTH || 40),
    ai: 20,
    media: 30
  }
} = {}) {
  const buckets = new Map();

  function classifyBucket(path) {
    if (path.startsWith('/auth')) return 'auth';
    if (path.startsWith('/ai')) return 'ai';
    if (path.startsWith('/question-media')) return 'media';
    return 'general';
  }

  return function rateLimitMiddleware(req, res, next) {
    const bucket = classifyBucket(req.path || '');
    const maxHits = limits[bucket] ?? limits.general;
    const key = `${bucket}:${req.ip || '127.0.0.1'}`;
    const now = Date.now();
    const cutoff = now - windowMs;

    const hits = (buckets.get(key) || []).filter((ts) => ts > cutoff);
    if (hits.length >= maxHits) {
      const retryAfterSec = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Terlalu banyak permintaan pada kategori '${bucket}'. Coba lagi dalam ${retryAfterSec} detik.`,
          details: { bucket, retryAfterSec },
          correlationId: req.correlationId || null
        }
      });
    }
    hits.push(now);
    buckets.set(key, hits);
    return next();
  };
}
