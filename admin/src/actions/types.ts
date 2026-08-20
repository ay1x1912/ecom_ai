/**
 * Shared shape for every `useActionState` form on the site.
 *
 * `fields` comes straight from the backend's `error.fields`, so validation rules
 * are written once — in the API's zod schemas — and rendered here. There is no
 * second copy of "password must be at least 8 characters" to drift out of sync.
 */
export type FormState = {
  message?: string;
  fields?: Record<string, string>;
} | null;
