import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { env, isTest } from './config/env.js';
import { sequelize } from './config/database.js';
import { redis } from './config/redis.js';
import { passport } from './config/passport.js';
import { asyncHandler } from './middleware/asyncHandler.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './modules/auth/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { categoryRoutes } from './modules/categories/index.js';
import { brandRoutes } from './modules/brands/index.js';
import { productRoutes } from './modules/products/routes.js';
import { bannerRoutes } from './modules/banners/index.js';
import { uploadRoutes } from './modules/uploads/index.js';
import { cartRoutes } from './modules/cart/index.js';
import { wishlistRoutes } from './modules/wishlist/index.js';
import { orderRoutes } from './modules/orders/index.js';
import { paymentRoutes } from './modules/payments/index.js';
import { statsRoutes } from './modules/stats/index.js';
import { docsRoutes } from './docs/index.js';

export const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());

// CORS allow-list. The API's own origin is included so the Swagger UI's
// "try it out" works — that wall cost the course author real time.
const allowedOrigins = [env.CLIENT_URL, env.ADMIN_URL, `http://localhost:${env.PORT}`];

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin: same-origin requests, curl, mobile clients.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

if (!isTest) app.use(morgan('dev'));

/**
 * ORDERING MATTERS BELOW THIS LINE.
 *
 * When the real payment gateway lands, its webhook must be mounted with
 * express.raw() *before* express.json(). Signature verification runs against the
 * raw bytes; a parsed-and-restringified body fails every time.
 *
 *   app.use('/api/payment/webhook',
 *           express.raw({ type: 'application/json' }),
 *           webhookRouter);
 *
 * See implementation.md 12.5. The mock provider does not need this, but the seam
 * stays here so swapping providers is not an app-restructuring exercise.
 */

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Stateless: initialize() only, no session support mounted.
app.use(passport.initialize());

app.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const [db, cache] = await Promise.all([
      sequelize.authenticate().then(
        () => 'up',
        () => 'down',
      ),
      redis.ping().then(
        () => 'up',
        () => 'down',
      ),
    ]);

    // The database failing is fatal; the cache failing is degraded but servable.
    const status = db === 'up' ? 200 : 503;
    res.status(status).json({ data: { status: db === 'up' ? 'ok' : 'unhealthy', db, cache } });
  }),
);

// Feature routes.
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// Categories and brands before products: products reference both.
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/products', productRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/stats', statsRoutes);

// Generated from the live Zod schemas at startup.
app.use('/api/docs', docsRoutes);

app.use(notFound);
app.use(errorHandler);
