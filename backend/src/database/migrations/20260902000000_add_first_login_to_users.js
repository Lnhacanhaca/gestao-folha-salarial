/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'first_login');
  if (!hasColumn) {
    await knex.schema.alterTable('users', table => {
      table.boolean('first_login').defaultTo(true);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('users', table => {
    try {
      table.dropColumn('first_login');
    } catch (e) {}
  });
};
