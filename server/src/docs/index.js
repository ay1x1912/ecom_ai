import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from './openapi.js';

/**
 * The document is generated once at startup.
 *
 * Because it is built from the live request schemas, a malformed schema fails
 * here — loudly, at boot — rather than silently serving stale documentation. The
 * source project's hand-written annotations had the opposite failure mode: they
 * drifted from the handlers, and a bad one crashed the server mid-request.
 */
const document = buildOpenApiDocument();

export const docsRoutes = Router();

/** Raw spec, for client generators and CI schema checks. */
docsRoutes.get('/json', (_req, res) => res.json(document));

docsRoutes.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(document, {
    customSiteTitle: 'BabyMart API',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      tagsSorter: 'alpha',
    },
  }),
);

export default docsRoutes;
