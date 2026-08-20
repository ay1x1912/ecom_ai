import { asyncHandler } from '../middleware/asyncHandler.js';
import { ok, created } from '../utils/respond.js';

/**
 * The HTTP half of the composition pattern.
 *
 * Pairs with createCrudService: a resource whose behaviour is genuinely generic
 * (brands, banners) gets its five handlers from here, while anything with real
 * rules writes its own controller. Note this is a factory over an explicit
 * service — NOT a generic exposer of model methods, which is the thing we
 * rejected in implementation.md §2. Routes, schemas and authorization stay
 * declared per resource.
 */
export const createCrudController = (service, present) => ({
  index: asyncHandler(async (req, res) => {
    const { rows, meta } = await service.list(req.query);
    return ok(res, rows.map(present), meta);
  }),

  show: asyncHandler(async (req, res) => {
    return ok(res, present(await service.get(req.params.id)));
  }),

  store: asyncHandler(async (req, res) => {
    return created(res, present(await service.create(req.body)));
  }),

  update: asyncHandler(async (req, res) => {
    return ok(res, present(await service.update(req.params.id, req.body)));
  }),

  destroy: asyncHandler(async (req, res) => {
    await service.remove(req.params.id);
    return ok(res, { message: 'Deleted successfully' });
  }),
});
