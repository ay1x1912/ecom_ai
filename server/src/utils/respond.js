/**
 * One response envelope for the whole API.
 *
 * success: { data, meta? }
 * error:   { error: { message, fields? } }
 *
 * The course this design came from used a different shape per endpoint
 * (see backend-spec.md defect #7). Consistency here is what lets clients
 * write one response handler instead of one per route.
 */

export const ok = (res, data, meta) =>
  res.status(200).json(meta ? { data, meta } : { data });

export const created = (res, data) => res.status(201).json({ data });

export const noContent = (res) => res.status(204).send();

/** Build the meta block for a paginated list. */
export const paginationMeta = ({ page, perPage, total }) => ({
  page,
  perPage,
  total,
  totalPages: Math.max(1, Math.ceil(total / perPage)),
});
