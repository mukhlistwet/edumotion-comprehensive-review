import crypto from 'node:crypto';
import { HttpApiError } from './errors.js';

const DEFAULT_SECRET = process.env.JWT_SECRET || 'edumotion-local-dev-signing-secret-replace-in-prod';

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function createAccessToken(payload, { secret = DEFAULT_SECRET, expiresInSeconds = 900 } = {}) {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(
    JSON.stringify({
      sub: payload.sub,
      role: payload.role,
      tenantId: payload.tenantId || null,
      iat: nowSec,
      exp: nowSec + Number(expiresInSeconds)
    })
  );
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyAccessToken(token, { secret = DEFAULT_SECRET } = {}) {
  if (!token || typeof token !== 'string') {
    throw new HttpApiError({ code: 'UNAUTHORIZED', message: 'Token autentikasi tidak valid.', status: 401 });
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new HttpApiError({ code: 'UNAUTHORIZED', message: 'Format token autentikasi tidak valid.', status: 401 });
  }
  const [header, body, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new HttpApiError({ code: 'UNAUTHORIZED', message: 'Tanda tangan token tidak valid.', status: 401 });
  }
  let parsed;
  try {
    parsed = JSON.parse(base64UrlDecode(body));
  } catch {
    throw new HttpApiError({ code: 'UNAUTHORIZED', message: 'Payload token rusak.', status: 401 });
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (parsed.exp && parsed.exp < nowSec) {
    throw new HttpApiError({ code: 'TOKEN_EXPIRED', message: 'Sesi token sudah kedaluwarsa.', status: 401 });
  }
  return parsed;
}

export function generateRefreshToken() {
  return `rt_${crypto.randomBytes(32).toString('hex')}`;
}

export function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken || '')).digest('hex');
}
