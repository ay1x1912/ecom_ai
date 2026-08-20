import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment is validated once, at import time. A bad or missing value stops the
 * process here rather than surfacing hours later inside a request handler.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8000),

    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_NAME: z.string().min(1),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string(),

    REDIS_URL: z.string().url(),
    CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),

    // A short secret is a weak secret; 32 chars is the floor, not the target.
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('7d'),

    CLIENT_URL: z.string().url(),
    ADMIN_URL: z.string().url(),

    // Cloudflare R2 (S3-compatible)
    CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
    // The S3 API endpoint Cloudflare shows in the bucket settings. Optional
    // because it is derivable from the account id; accepted because pasting the
    // dashboard value verbatim is less error-prone than retyping the hex id.
    R2_ENDPOINT: z.string().url().optional(),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET: z.string().min(1),
    // Where the browser READS objects from - a custom domain or the bucket's
    // r2.dev public URL. Never the signed S3 endpoint above.
    R2_PUBLIC_BASE_URL: z.string().url(),

    PAYMENT_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
    STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  })
  // The real gateway's keys are required only when it is actually selected.
  .refine((e) => e.PAYMENT_PROVIDER !== 'stripe' || Boolean(e.STRIPE_SECRET_KEY), {
    message: 'STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe',
    path: ['STRIPE_SECRET_KEY'],
  })
  .refine((e) => e.PAYMENT_PROVIDER !== 'stripe' || Boolean(e.STRIPE_WEBHOOK_SECRET), {
    message: 'STRIPE_WEBHOOK_SECRET is required when PAYMENT_PROVIDER=stripe',
    path: ['STRIPE_WEBHOOK_SECRET'],
  })
  // The mock provider settles orders without taking money. It must never boot in
  // production — see implementation.md 12.3.
  .refine((e) => e.NODE_ENV !== 'production' || e.PAYMENT_PROVIDER !== 'mock', {
    message: 'PAYMENT_PROVIDER=mock is forbidden when NODE_ENV=production',
    path: ['PAYMENT_PROVIDER'],
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('\nInvalid environment configuration:\n');
  for (const issue of parsed.error.issues) {
    console.error(`  • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  console.error('\nCompare your .env against .env.example.\n');
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
