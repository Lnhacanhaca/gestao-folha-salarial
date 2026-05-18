/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('folhas', table => {
    table.boolean('retificada').defaultTo(false);
    table.string('observacoes');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('folhas', table => {
    table.dropColumn('retificada');
    table.dropColumn('observacoes');
  });
};
