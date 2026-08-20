/**
 * The only shapes of user/address data we send to clients.
 *
 * Centralised so a new field on the model is never exposed by accident: adding a
 * column does nothing until it is named here. Notably, `password` has no path to
 * a response even if a query forgets the default scope.
 */

export const publicUser = (user) => ({
  id: Number(user.id),
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  createdAt: user.createdAt,
});

export const publicAddress = (address) => ({
  id: Number(address.id),
  street: address.street,
  city: address.city,
  country: address.country,
  postalCode: address.postalCode,
  isDefault: Boolean(address.isDefault),
  note: address.note,
});

/** A user with their addresses attached — used by profile and GET /users/:id. */
export const publicUserWithAddresses = (user) => ({
  ...publicUser(user),
  addresses: (user.addresses ?? []).map(publicAddress),
});
