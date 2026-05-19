/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('audit_logs', table => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.string('username').notNullable();
    table.string('action').notNullable(); // e.g. 'CREATE_USER', 'UPDATE_FOLHA', etc.
    table.string('target_type').notNullable(); // e.g. 'users', 'folhas', 'docentes'
    table.string('target_id'); // Identifier of target
    table.text('details'); // JSON representation of changes or description
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('audit_logs');
};
