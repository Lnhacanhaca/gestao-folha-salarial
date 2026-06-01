/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('folhas', table => {
    table.float('total_vp').defaultTo(0);
    table.float('total_vd').defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('folhas', table => {
    table.dropColumn('total_vp');
    table.dropColumn('total_vd');
  });
};
