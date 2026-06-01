/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Verificar e adicionar colunas na tabela folha_detalhes
  const hasVpDetalhe = await knex.schema.hasColumn('folha_detalhes', 'vp');
  const hasVdDetalhe = await knex.schema.hasColumn('folha_detalhes', 'vd');
  
  await knex.schema.alterTable('folha_detalhes', table => {
    if (!hasVpDetalhe) {
      table.float('vp').defaultTo(0);
    }
    if (!hasVdDetalhe) {
      table.float('vd').defaultTo(0);
    }
  });

  // 2. Verificar e adicionar colunas na tabela folhas
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
  await knex.schema.alterTable('folha_detalhes', table => {
    try {
      table.dropColumn('vp');
      table.dropColumn('vd');
    } catch (e) {}
  });

  await knex.schema.alterTable('folhas', table => {
    try {
      table.dropColumn('total_vp');
      table.dropColumn('total_vd');
    } catch (e) {}
  });
};
