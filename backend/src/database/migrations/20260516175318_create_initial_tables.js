/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('users', table => {
      table.increments('id').primary();
      table.string('username').notNullable().unique();
      table.string('password').notNullable();
      table.enum('role', ['ADMIN', 'DIRETOR_CURSO']).notNullable();
      table.integer('curso_id'); // Optional, links to course if role is DIRETOR_CURSO
      table.timestamps(true, true);
    })
    .createTable('docentes', table => {
      table.increments('id').primary();
      table.string('nome').notNullable();
      table.string('categoria');
      table.timestamps(true, true);
    })
    .createTable('folhas', table => {
      table.increments('id').primary();
      table.integer('docente_id').unsigned().references('id').inTable('docentes');
      table.integer('curso_id').notNullable(); // 1: Geral, 2: CA/CAP, 3: EM/EPM, 4: EI
      table.integer('mes').notNullable();
      table.integer('ano').notNullable();
      table.float('total_ap').defaultTo(0);
      table.float('total_ad').defaultTo(0);
      table.float('valor_receber').defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('folha_detalhes', table => {
      table.increments('id').primary();
      table.integer('folha_id').unsigned().references('id').inTable('folhas').onDelete('CASCADE');
      table.integer('semana').notNullable();
      table.float('ap').defaultTo(0);
      table.float('ad').defaultTo(0);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('folha_detalhes')
    .dropTableIfExists('folhas')
    .dropTableIfExists('docentes')
    .dropTableIfExists('users');
};
