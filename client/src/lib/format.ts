/**
 * Display formatting. Kept in one place so a price never renders two ways.
 *
 * Money arrives from the API as a JSON number (the backend converts DECIMAL at
 * the edge), so there is nothing to parse here — only to present.
 */

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatMoney = (value: number | null | undefined) =>
  currency.format(typeof value === "number" ? value : 0);

const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateOnly = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? dateTime.format(new Date(iso)) : "—";

export const formatDate = (iso: string | null | undefined) =>
  iso ? dateOnly.format(new Date(iso)) : "—";
