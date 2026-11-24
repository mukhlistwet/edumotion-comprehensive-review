import crypto from 'node:crypto';
import express from 'express';
import { HttpApiError } from '../security/errors.js';
import { createRateLimiter } from '../security/rate-limiter.js';
import { verifyAccessToken } from '../security/tokens.js';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:4173',
  'http://127.0.0.1:4174',
  'http://127.0.0.1:4175',
  'http://127.0.0.1:4176',
  'http://localhost:4173',
  'http://localhost:4174',
  'http://localhost:4175',
  'http://localhost:5173',
  'http://localhost:5174'
];

export function resolveAllowedOrigins(raw = process.env.ALLOWED_ORIGINS) {
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '*');
}

export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function createApiMiddlewares({
  repos,
  jwtSecret,
  logger,
  allowedOrigins = resolveAllowedOrigins(),
  rateLimiter = createRateLimiter()
}) {
  const allowSet = new Set(allowedOrigins);

  const correlationAndHeaders = (req, res, next) => {
    const correlationId = req.get('X-Correlation-ID') || crypto.randomUUID();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.on('finish', () => {
      logger.recordRequestMetric(res.statusCode);
    });
    next();
  };

  const strictCors = (req, res, next) => {
    const origin = req.get('Origin');
    if (origin) {
      if (!allowSet.has(origin)) {
        return res.status(403).json({
          error: {
            code: 'CORS_ORIGIN_FORBIDDEN',
            message: `Origin '${origin}' tidak termasuk allowlist CORS.`,
            correlationId: req.correlationId || null
          }
        });
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Correlation-ID,Idempotency-Key');
    }
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    return next();
  };

  const authParser = asyncRoute(async (req, _res, next) => {
    req.ctx = {
      user: null,
      correlationId: req.correlationId
    };
    const publicAuthPaths = ['/auth/login', '/auth/demo-login', '/auth/refresh', '/auth/register'];
    if (publicAuthPaths.some((p) => req.path.startsWith(p))) {
      return next();
    }
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.slice(7).trim();
    const claims = verifyAccessToken(token, { secret: jwtSecret });
    const user = await repos.getUserById(claims.sub);
    if (!user) {
      throw new HttpApiError({ code: 'UNAUTHORIZED', message: 'Sesi pengguna tidak ditemukan.', status: 401 });
    }
    req.ctx.user = user;
    return next();
  });

  const notFoundHandler = (req, res) => {
    res.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Endpoint '${req.method} ${req.originalUrl}' tidak ditemukan.`,
        correlationId: req.correlationId || null
      }
    });
  };

  const errorHandler = (err, req, res, _next) => {
    const status = Number(err?.status || err?.statusCode || 500);
    const code = err?.code || (status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR');
    const safeMessage =
      status >= 500 && process.env.NODE_ENV === 'production'
        ? 'Terjadi kesalahan internal server.'
        : err?.message || 'Permintaan gagal diproses.';

    logger.error('http_error', {
      method: req.method,
      path: req.path,
      status,
      code,
      correlationId: req.correlationId,
      body: req.body
    });

    res.status(status).json({
      error: {
        code,
        message: safeMessage,
        details: err?.details || {},
        fieldErrors: err?.fieldErrors || {},
        correlationId: req.correlationId || null
      }
    });
  };

  return {
    jsonParser: express.json({ limit: '2mb' }),
    correlationAndHeaders,
    strictCors,
    rateLimiter,
    authParser,
    notFoundHandler,
    errorHandler
  };
}
