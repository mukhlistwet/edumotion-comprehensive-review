import crypto from 'node:crypto';
import path from 'node:path';
import { HttpApiError } from './errors.js';

const ALLOWED_MIME_EXT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/svg+xml': ['.svg'],
  'audio/mpeg': ['.mp3'],
  'video/mp4': ['.mp4']
};

const MAGIC_PREFIXES = {
  'image/png': ['89504E47'],
  'image/jpeg': ['FFD8FF'],
  'audio/mpeg': ['494433', 'FFFB', 'FFF3', 'FFF2'],
  'video/mp4': ['000000']
};

export function validateAndPrepareMediaUpload({
  fileName,
  mimeType,
  sizeBytes,
  width = null,
  height = null,
  altText = '',
  magicBytesHex = null,
  contentBase64 = null
}) {
  const safeName = String(fileName || '').trim();
  const ext = path.extname(safeName).toLowerCase();
  const forbiddenExt = /\.(exe|bat|cmd|sh|js|mjs|html|htm|php|dll|msi|svgz)$/i;

  if (!safeName || forbiddenExt.test(safeName)) {
    throw new HttpApiError({
      code: 'UNSAFE_OR_UNSUPPORTED_MEDIA',
      message: `File '${safeName || 'tanpa nama'}' ditolak oleh kebijakan keamanan media.`,
      status: 415
    });
  }

  const validExts = ALLOWED_MIME_EXT[mimeType];
  if (!validExts || !validExts.includes(ext)) {
    throw new HttpApiError({
      code: 'UNSAFE_OR_UNSUPPORTED_MEDIA',
      message: `Kombinasi MIME '${mimeType}' dan ekstensi '${ext || '-'}' tidak diizinkan.`,
      status: 415
    });
  }

  const numericSize = Number(sizeBytes || 0);
  if (!Number.isFinite(numericSize) || numericSize <= 0 || numericSize > 10 * 1024 * 1024) {
    throw new HttpApiError({
      code: 'FILE_TOO_LARGE',
      message: 'Ukuran media wajib > 0 dan maksimal 10 MB.',
      status: 413
    });
  }

  if ((width !== null && Number(width) > 4096) || (height !== null && Number(height) > 4096)) {
    throw new HttpApiError({
      code: 'IMAGE_DIMENSIONS_EXCEEDED',
      message: 'Dimensi gambar maksimal 4096x4096 piksel untuk mencegah decompression bomb.',
      status: 422,
      fieldErrors: { dimensions: 'Maksimal 4096x4096 piksel.' }
    });
  }

  let effectiveHex = magicBytesHex ? String(magicBytesHex).replace(/\s+/g, '').toUpperCase() : '';
  let decodedText = '';
  if (contentBase64) {
    const buf = Buffer.from(String(contentBase64), 'base64');
    effectiveHex = buf.subarray(0, 12).toString('hex').toUpperCase();
    decodedText = buf.toString('utf8');
  }

  // Reject executable PE/ELF/Mach-O headers even when client fakes MIME/extension
  if (effectiveHex.startsWith('4D5A') || effectiveHex.startsWith('7F454C46') || effectiveHex.startsWith('2321')) {
    throw new HttpApiError({
      code: 'UNSAFE_OR_UNSUPPORTED_MEDIA',
      message: 'Signature biner executable terdeteksi meski MIME diklaim aman. Upload ditolak.',
      status: 415
    });
  }

  if (effectiveHex && MAGIC_PREFIXES[mimeType]) {
    const matchesMagic = MAGIC_PREFIXES[mimeType].some((prefix) => effectiveHex.startsWith(prefix));
    if (!matchesMagic) {
      throw new HttpApiError({
        code: 'UNSAFE_OR_UNSUPPORTED_MEDIA',
        message: `Magic bytes file tidak cocok dengan deklarasi tipe '${mimeType}'.`,
        status: 415
      });
    }
  }

  if (mimeType === 'image/svg+xml' && decodedText && /<script|onload\s*=|onerror\s*=|javascript:/i.test(decodedText)) {
    throw new HttpApiError({
      code: 'UNSAFE_OR_UNSUPPORTED_MEDIA',
      message: 'SVG mengandung skrip aktif dan ditolak demi keamanan.',
      status: 415
    });
  }

  const randomizedKey = `media/${new Date().getUTCFullYear()}/${crypto.randomUUID()}${ext}`;
  const checksumSha256 = crypto
    .createHash('sha256')
    .update(`${safeName}:${numericSize}:${effectiveHex || 'meta'}`)
    .digest('hex');

  return {
    id: `med_${crypto.randomUUID().slice(0, 12)}`,
    fileName: path.basename(safeName),
    mimeType,
    sizeBytes: numericSize,
    width: width ? Number(width) : null,
    height: height ? Number(height) : null,
    storageKey: randomizedKey,
    url: `/media-assets/${randomizedKey}`,
    altText: String(altText || ''),
    checksumSha256
  };
}
