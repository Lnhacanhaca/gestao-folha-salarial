/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('excecoes_prazos', table => {
    table.increments('id').primary();
    table.integer('curso_id').notNullable();
    table.integer('mes').notNullable();
    table.integer('ano').notNullable();
    table.datetime('data_limite').notNullable();
    table.string('motivo');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('excecoes_prazos');
};
