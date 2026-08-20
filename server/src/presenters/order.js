const money = (v) => (v === null || v === undefined ? null : Number(v));

export const publicOrderItem = (item) => ({
  id: Number(item.id),
  // Null once the product has been deleted — the snapshot below is the record.
  productId: item.productId === null ? null : Number(item.productId),
  name: item.name,
  price: money(item.price),
  quantity: Number(item.quantity),
  lineTotal: item.lineTotal,
  image: item.image,
});

export const publicOrder = (order) => ({
  id: Number(order.id),
  orderNumber: order.orderNumber,
  userId: order.userId === null ? null : Number(order.userId),
  status: order.status,
  subtotal: money(order.subtotal),
  total: money(order.total),
  shippingAddress: {
    street: order.shippingStreet,
    city: order.shippingCity,
    country: order.shippingCountry,
    postalCode: order.shippingPostalCode,
  },
  payment: {
    provider: order.paymentProvider,
    reference: order.paymentRef,
    paidAt: order.paidAt,
  },
  items: (order.items ?? []).map(publicOrderItem),
  customer: order.user ? { id: Number(order.user.id), name: order.user.name, email: order.user.email } : undefined,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});
