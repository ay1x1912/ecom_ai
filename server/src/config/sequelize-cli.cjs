// CommonJS config consumed only by sequelize-cli (migrations, seeders).
// The running app uses src/config/database.js instead — keep the two in sync.
require('dotenv').config();

const common = {
  dialect: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  timezone: '+00:00',
  define: { underscored: true, timestamps: true },
  dialectOptions: { charset: 'utf8mb4' },
};

module.exports = {
  development: { ...common, database: process.env.DB_NAME },
  test: { ...common, database: `${process.env.DB_NAME}_test`, logging: false },
  production: { ...common, database: process.env.DB_NAME, logging: false },
};
