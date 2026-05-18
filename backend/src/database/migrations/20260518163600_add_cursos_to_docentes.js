/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('docentes', table => {
    table.string('cursos').defaultTo('1'); // Default to '1' (Geral) or we can leave it empty
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('docentes', table => {
    table.dropColumn('cursos');
  });
};
