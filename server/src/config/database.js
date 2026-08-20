import { Sequelize } from 'sequelize';
import { env, isProduction, isTest } from './env.js';

const database = isTest ? `${env.DB_NAME}_test` : env.DB_NAME;

export const sequelize = new Sequelize(database, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',

  // Everything is stored in UTC. Formatting for a locale is the client's job;
  // mixed-timezone storage is very hard to unpick later.
  timezone: '+00:00',

  // snake_case columns in MySQL, camelCase attributes in JS.
  define: { underscored: true, timestamps: true },

  logging: isProduction || isTest ? false : (sql) => console.log(`[sql] ${sql}`),

  pool: { max: 10, min: 0, acquire: 30_000, idle: 10_000 },

  dialectOptions: { charset: 'utf8mb4' },
});

/**
 * NOTE: schema changes go through migrations only — never sequelize.sync({ alter: true }).
 * sync is convenient right up until it silently rebuilds a column and loses data.
 */
export const assertDatabaseConnection = async () => {
  await sequelize.authenticate();
};
