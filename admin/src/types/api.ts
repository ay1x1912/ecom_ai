/**
 * Hand-written mirrors of the backend's presenters (server/src/presenters/*).
 *
 * These are the only place the API's shape is written down on this side, so a
 * backend field rename shows up as a compile error rather than `undefined` in a
 * template.
 */

/**
 * The API's full role enum (server/src/modules/users/schema.js).
 *
 * `deliveryman` is included because records can carry it and the panel must be
 * able to display one — but it is never OFFERED in a create or edit form, since
 * nothing in the API treats the role differently yet.
 */
export const ROLES = ["admin", "user", "deliveryman"] as const;

export type Role = (typeof ROLES)[number];

/** The subset an admin may assign from this panel. */
export const ASSIGNABLE_ROLES = ["admin", "user"] as const satisfies readonly Role[];

export type User = {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: Role;
  createdAt: string;
};

export type Address = {
  id: number;
  street: string;
  city: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
  note: string | null;
};

export type UserWithAddresses = User & { addresses: Address[] };

export const CATEGORY_TYPES = ["featured", "hot", "top"] as const;

export type CategoryType = (typeof CATEGORY_TYPES)[number];

export type Category = {
  id: number;
  name: string;
  image: string | null;
  categoryType: CategoryType | null;
  createdAt: string;
};

export type Banner = {
  id: number;
  name: string;
  title: string | null;
  /** Free text on the API — a label like "From $9.99", not a date. */
  startFrom: string | null;
  image: string | null;
  bannerType: string | null;
  createdAt: string;
};

export type Brand = {
  id: number;
  name: string;
  image: string | null;
  createdAt: string;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  /** List price before any discount. */
  price: number;
  discountPercentage: number;
  /** Price actually charged — computed by the backend so everyone agrees. */
  finalPrice: number;
  stock: number;
  inStock: boolean;
  image: string;
  averageRating: number | null;
  ratingsCount: number;
  category?: Category;
  brand?: Brand;
  createdAt: string;
};

export type CartItem = {
  productId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  availableStock: number;
  /** False when the requested quantity now exceeds stock. */
  inStock: boolean;
  product: Product | null;
};

export type Cart = {
  id: number;
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  /** Non-empty and every line still satisfiable — gate checkout on this. */
  orderable: boolean;
};

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Mirrors ORDER_TRANSITIONS in server/src/models/Order.js.
 *
 * The backend rejects anything not listed here with a 409; this copy exists so
 * the admin UI can offer only the moves that will actually succeed, rather than
 * showing four options and failing on three of them.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export type OrderItem = {
  id: number;
  /** Null once the product has been deleted — the snapshot below is the record. */
  productId: number | null;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
  image: string | null;
};

export type Order = {
  id: number;
  orderNumber: string;
  userId: number | null;
  status: OrderStatus;
  subtotal: number;
  total: number;
  shippingAddress: {
    street: string;
    city: string;
    country: string;
    postalCode: string;
  };
  payment: {
    provider: string | null;
    reference: string | null;
    paidAt: string | null;
  };
  items: OrderItem[];
  /** Present only on admin reads, where the customer is joined in. */
  customer?: { id: number; name: string; email: string };
  createdAt: string;
  updatedAt: string;
};

export type CheckoutSession = {
  orderId: number;
  orderNumber: string;
  amount: number;
  provider: string;
  sessionId: string;
  /** Where to send the browser to "pay". For the mock provider this is our own
   *  /mock-checkout page. */
  checkoutUrl: string;
};

export type SettleResult = {
  alreadyProcessed: boolean;
  order: Order;
};

export type AuthResult = {
  user: User;
  token: string;
};

/** The `meta` block on every paginated list response. */
export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

/** Response of POST /api/uploads/signature. */
export type UploadSignature = {
  uploadUrl: string;
  /** What to store on the resource once the PUT succeeds. */
  publicUrl: string;
  key: string;
  expiresIn: number;
  /** Must be sent verbatim on the PUT or R2 rejects the signature. */
  requiredHeaders: Record<string, string>;
};

export const UPLOAD_FOLDERS = [
  "products",
  "categories",
  "brands",
  "banners",
  "avatars",
] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

/**
 * GET /api/stats — the whole dashboard in one call.
 *
 * Mirrors server/src/modules/stats/service.js. Everything here is aggregated in
 * SQL; nothing on the dashboard recomputes a total in JavaScript.
 */
export type StatsResponse = {
  totals: {
    users: number;
    products: number;
    categories: number;
    brands: number;
    orders: number;
  };
  revenue: {
    /** Paid + completed only. Pending is a forecast, not income. */
    earned: number;
    pending: number;
    cancelled: number;
    averageOrderValue: number;
  };
  orders: {
    byStatus: { status: OrderStatus; count: number; total: number }[];
    recent: Order[];
  };
  users: {
    byRole: { role: Role; count: number }[];
  };
  products: {
    byCategory: { id: number; name: string; count: number }[];
    byBrand: { id: number; name: string; count: number }[];
    outOfStock: number;
    lowStock: number;
    unitsOnHand: number;
    bestSellers: {
      productId: number | null;
      name: string;
      unitsSold: number;
      revenue: number;
    }[];
    neverSold: { id: number; name: string; stock: number; price: number }[];
  };
};
