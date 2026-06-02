/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Ensure total_vp and total_vd columns exist in 'folhas'
  const hasTotalVp = await knex.schema.hasColumn('folhas', 'total_vp');
  const hasTotalVd = await knex.schema.hasColumn('folhas', 'total_vd');

  await knex.schema.alterTable('folhas', table => {
    if (!hasTotalVp) {
      table.float('total_vp').defaultTo(0);
    }
    if (!hasTotalVd) {
      table.float('total_vd').defaultTo(0);
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('folhas', table => {
    try { table.dropColumn('total_vp'); } catch (e) {}
    try { table.dropColumn('total_vd'); } catch (e) {}
  });
};
