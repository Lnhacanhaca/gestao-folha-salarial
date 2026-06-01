/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('folha_detalhes', table => {
    table.decimal('vp', 10, 2).defaultTo(0);
    table.decimal('vd', 10, 2).defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('folha_detalhes', table => {
    table.dropColumn('vp');
    table.dropColumn('vd');
  });
};
