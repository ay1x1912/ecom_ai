import { Op } from 'sequelize';
import { notFoundError } from '../utils/AppError.js';
import { paginationMeta } from '../utils/respond.js';

/**
 * LIKE treats % and _ as wildcards. Escaping them stops a search for "50%" from
 * matching everything, and keeps a user from crafting expensive scan patterns.
 */
const escapeLike = (value) => String(value).replace(/[\\%_]/g, '\\$&');

/**
 * Shared CRUD for resources whose behaviour is generic.
 *
 * This is the composition half of the architecture decision (implementation.md §2):
 * resources like brands and banners get all five operations for free, while
 * resources with real rules (users, orders, cart) write their own service and
 * spread this in for the parts that ARE generic.
 *
 * Services take plain arguments and return plain data — no req/res in here, which
 * is what makes them reusable from a seeder, a CLI or a worker.
 */
export const createCrudService = (
  Model,
  {
    resourceName = Model.name,
    searchable = [],
    sortable = ['createdAt'],
    defaultInclude = [],
  } = {},
) => {
  const buildWhere = ({ search, where = {} }) => {
    if (!search || searchable.length === 0) return where;
    return {
      ...where,
      [Op.or]: searchable.map((field) => ({
        [field]: { [Op.like]: `%${escapeLike(search)}%` },
      })),
    };
  };

  const service = {
    async list({
      page = 1,
      perPage = 20,
      sortBy,
      sortOrder = 'asc',
      search,
      where = {},
      include,
      transaction,
    } = {}) {
      const orderColumn = sortable.includes(sortBy) ? sortBy : sortable[0];
      const inc = include ?? defaultInclude;

      const { rows, count } = await Model.findAndCountAll({
        where: buildWhere({ search, where }),
        include: inc,
        order: [[orderColumn, sortOrder.toUpperCase()]],
        limit: perPage,
        offset: (page - 1) * perPage,
        // Joining a hasMany association multiplies rows, which inflates `count`
        // and makes `limit` truncate wrongly. distinct fixes the count.
        distinct: inc.length > 0,
        transaction,
      });

      return { rows, meta: paginationMeta({ page, perPage, total: count }) };
    },

    async get(id, { include, transaction } = {}) {
      const row = await Model.findByPk(id, {
        include: include ?? defaultInclude,
        transaction,
      });
      if (!row) throw notFoundError(`${resourceName} not found`);
      return row;
    },

    async create(data, { transaction } = {}) {
      return Model.create(data, { transaction });
    },

    async update(id, data, { transaction } = {}) {
      const row = await service.get(id, { include: [], transaction });
      row.set(data);
      // .save() so model hooks run; Model.update() would bypass them.
      await row.save({ transaction });
      return row;
    },

    async remove(id, { transaction } = {}) {
      const row = await service.get(id, { include: [], transaction });
      await row.destroy({ transaction });
      return true;
    },
  };

  return service;
};
