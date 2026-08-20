/**
 * Response shapes for catalogue resources.
 *
 * Money is stored as DECIMAL, which mysql2 returns as a *string* to preserve
 * precision. We convert at the edge so clients get JSON numbers, and never
 * accumulate money in floats on the way there.
 */

const money = (value) => (value === null || value === undefined ? null : Number(value));

export const publicCategory = (c) => ({
  id: Number(c.id),
  name: c.name,
  image: c.image,
  categoryType: c.categoryType,
  createdAt: c.createdAt,
});

export const publicBrand = (b) => ({
  id: Number(b.id),
  name: b.name,
  image: b.image,
  createdAt: b.createdAt,
});

export const publicBanner = (b) => ({
  id: Number(b.id),
  name: b.name,
  title: b.title,
  startFrom: b.startFrom,
  image: b.image,
  bannerType: b.bannerType,
  createdAt: b.createdAt,
});

export const publicProduct = (p) => ({
  id: Number(p.id),
  name: p.name,
  slug: p.slug,
  description: p.description,
  price: money(p.price),
  discountPercentage: Number(p.discountPercentage),
  // Computed server-side so every client agrees on the sale price.
  finalPrice: p.discountedPrice,
  stock: Number(p.stock),
  inStock: Number(p.stock) > 0,
  image: p.image,
  averageRating: money(p.averageRating),
  ratingsCount: Number(p.ratingsCount),
  category: p.category ? publicCategory(p.category) : undefined,
  brand: p.brand ? publicBrand(p.brand) : undefined,
  createdAt: p.createdAt,
});
