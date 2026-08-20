import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2, R2_BUCKET, R2_PUBLIC_BASE_URL } from '../../config/r2.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { ok } from '../../utils/respond.js';

/**
 * Presigned direct-to-R2 upload.
 *
 * The browser PUTs the file straight to R2 and sends us only the resulting URL, so
 * upload bandwidth and memory never touch this process — and we avoid the
 * "JSON can't carry binary" problem entirely.
 *
 * A presigned URL is a CAPABILITY the browser holds for its lifetime. Anything not
 * constrained at signing time is unconstrained at upload time, which is why the
 * content type, the size and the key are all fixed here rather than trusted later.
 */

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const URL_TTL_SECONDS = 300; // 5 minutes

const FOLDERS = ['products', 'categories', 'brands', 'banners', 'avatars'];

export const signatureSchema = z.object({
  contentType: z.enum(Object.keys(ALLOWED_TYPES)),
  size: z.coerce.number().int().positive().max(MAX_BYTES),
  folder: z.enum(FOLDERS).default('products'),
});

const createSignature = asyncHandler(async (req, res) => {
  const { contentType, size, folder } = req.body;

  // The key is generated, never taken from the client: a caller-supplied filename
  // could path-traverse, collide, or overwrite an existing object.
  const key = `${folder}/${randomUUID()}.${ALLOWED_TYPES[contentType]}`;

  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: URL_TTL_SECONDS },
  );

  return ok(res, {
    uploadUrl,
    // Send this back on product/brand/banner create or update.
    publicUrl: `${R2_PUBLIC_BASE_URL}/${key}`,
    key,
    expiresIn: URL_TTL_SECONDS,
    // The browser must send exactly these on the PUT or the signature check fails.
    requiredHeaders: { 'Content-Type': contentType, 'Content-Length': String(size) },
  });
});

export const uploadRoutes = Router();

// Admin-only: signing is what authorises an upload at all.
uploadRoutes.post(
  '/signature',
  authenticate,
  requireAdmin,
  validate({ body: signatureSchema }),
  createSignature,
);

export default uploadRoutes;
