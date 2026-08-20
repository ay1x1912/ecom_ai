import { publicProduct } from './catalogue.js';

/**
 * Cart lines carry NO stored price — the product is joined live, so a repriced
 * item shows its current price. Money only freezes when the order is created.
 *
 * Line and cart totals are computed here, server-side, so the client never has to
 * agree with us about arithmetic (and never gets to disagree).
 */
const round2 = (n) => Number(n.toFixed(2));

export const publicCartItem = (item) => {
  const product = item.product;
  const unitPrice = product ? product.discountedPrice : 0;
  const quantity = Number(item.quantity);

  return {
    productId: Number(item.productId),
    quantity,
    unitPrice,
    lineTotal: round2(unitPrice * quantity),
    // Whether this line can actually be ordered right now.
    availableStock: product ? Number(product.stock) : 0,
    inStock: product ? Number(product.stock) >= quantity : false,
    product: product ? publicProduct(product) : null,
  };
};

export const publicCart = (cart) => {
  const items = (cart.items ?? []).map(publicCartItem);
  const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));

  return {
    id: Number(cart.id),
    items,
    itemCount: items.length,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal,
    // True when every line is still satisfiable — the client can use this to
    // enable or disable checkout.
    orderable: items.length > 0 && items.every((i) => i.inStock),
  };
};
