/**
 * Hand-written mirrors of the backend's presenters (server/src/presenters/*).
 *
 * These are the only place the API's shape is written down on this side, so a
 * backend field rename shows up as a compile error rather than `undefined` in a
 * template.
 */

export type Role = "user" | "admin";

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

export type Category = {
  id: number;
  name: string;
  image: string | null;
  categoryType: string | null;
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
