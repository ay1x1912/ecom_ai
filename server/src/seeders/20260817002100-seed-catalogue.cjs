'use strict';

/**
 * Categories and brands must exist before products — products.category_id and
 * products.brand_id are NOT NULL with ON DELETE RESTRICT, so there is no way to
 * seed a product first.
 */
const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await queryInterface.bulkInsert('categories', [
      { name: 'Nappies & Wipes', image: null, category_type: 'featured', created_at: now, updated_at: now },
      { name: 'Feeding', image: null, category_type: 'top', created_at: now, updated_at: now },
      { name: 'Toys', image: null, category_type: 'hot', created_at: now, updated_at: now },
      { name: 'Clothing', image: null, category_type: 'featured', created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('brands', [
      { name: 'Pampers', image: null, created_at: now, updated_at: now },
      { name: 'Philips Avent', image: null, created_at: now, updated_at: now },
      { name: 'Fisher-Price', image: null, created_at: now, updated_at: now },
    ]);

    // Read the generated ids back rather than assuming they start at 1.
    const [categories] = await queryInterface.sequelize.query(
      'SELECT id, name FROM categories',
    );
    const [brands] = await queryInterface.sequelize.query('SELECT id, name FROM brands');

    const cat = (name) => categories.find((c) => c.name === name).id;
    const brand = (name) => brands.find((b) => b.name === name).id;

    const products = [
      {
        name: 'Baby Dry Nappies Size 3 (84 pack)',
        description: 'Up to 12 hours of dryness for sizes 6-10kg.',
        price: 18.99,
        discount_percentage: 10,
        stock: 120,
        category_id: cat('Nappies & Wipes'),
        brand_id: brand('Pampers'),
      },
      {
        name: 'Natural Response Baby Bottle 260ml',
        description: 'Slow-flow teat designed to mimic natural feeding.',
        price: 12.5,
        discount_percentage: 0,
        stock: 60,
        category_id: cat('Feeding'),
        brand_id: brand('Philips Avent'),
      },
      {
        name: 'Rock-a-Stack Ring Toy',
        description: 'Five colourful stacking rings for early motor skills.',
        price: 9.99,
        discount_percentage: 25,
        stock: 40,
        category_id: cat('Toys'),
        brand_id: brand('Fisher-Price'),
      },
      {
        name: 'Sensitive Baby Wipes (12 x 52)',
        description: 'Fragrance-free wipes for newborn skin.',
        price: 22.0,
        discount_percentage: 0,
        // Deliberately zero: gives you an out-of-stock case to test against.
        stock: 0,
        category_id: cat('Nappies & Wipes'),
        brand_id: brand('Pampers'),
      },
    ];

    await queryInterface.bulkInsert(
      'products',
      products.map((p) => ({
        ...p,
        slug: slugify(p.name),
        image: 'https://placehold.co/600x600?text=BabyMart',
        average_rating: 0,
        ratings_count: 0,
        created_at: now,
        updated_at: now,
      })),
    );

    await queryInterface.bulkInsert('banners', [
      {
        name: 'homepage-hero',
        title: 'Best deals today',
        start_from: '9.99',
        image: 'https://placehold.co/1200x400?text=Best+Deals',
        banner_type: 'hero',
        created_at: now,
        updated_at: now,
      },
      {
        name: 'homepage-secondary',
        title: 'Hot this week',
        start_from: '4.99',
        image: 'https://placehold.co/1200x400?text=Hot+This+Week',
        banner_type: 'strip',
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    // Reverse dependency order: products reference categories and brands.
    await queryInterface.bulkDelete('banners', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('brands', null, {});
    await queryInterface.bulkDelete('categories', null, {});
  },
};
