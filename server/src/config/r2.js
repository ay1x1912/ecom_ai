import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

/**
 * Cloudflare R2 is S3-compatible, so the standard AWS SDK client works and no
 * Cloudflare-specific library is needed.
 *
 * region must be 'auto' — R2 has no regions, and any other value fails signing.
 */
export const R2_ENDPOINT =
  env.R2_ENDPOINT ?? `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET = env.R2_BUCKET;

/**
 * Public base URL for serving objects — a custom domain or the bucket's public
 * URL. Keeps the account id out of URLs the browser sees, and lets Cloudflare's
 * CDN cache the objects.
 */
export const R2_PUBLIC_BASE_URL = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '');
