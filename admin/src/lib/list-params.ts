/**
 * Reading list state out of the URL.
 *
 * Every list screen keeps its search, filters, sort and page in the query string
 * rather than in component state — so a filtered view is linkable, the back
 * button is correct, and the filtering happens in the database. The course does
 * the opposite at [05:50] ("we're not calling in the database"), which only works
 * while the table is small enough to download whole.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

/** First value only: `?role=a&role=b` is a malformed URL, not a feature. */
export const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const positiveInt = (value: string | string[] | undefined) => {
  const parsed = Number(one(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
};

/** Keeps a value only if the API's enum will accept it — anything else is a 400. */
export const oneOf = <T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T | undefined => {
  const single = one(value);
  return allowed.includes(single as T) ? (single as T) : undefined;
};

/** Flattens searchParams for <Pagination>, which rebuilds the query string. */
export const flatten = (params: SearchParams): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(params).map(([key, value]) => [key, one(value)]));

export const DEFAULT_PER_PAGE = 20;
