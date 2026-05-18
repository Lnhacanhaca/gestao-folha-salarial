const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('folha_detalhes').del();
  await knex('folhas').del();
  await knex('docentes').del();
  await knex('users').del();

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const directorPassword = await bcrypt.hash('password', 10);

  await knex('users').insert([
    { username: 'admin', password: hashedPassword, role: 'ADMIN' },
    { username: 'almeida', password: directorPassword, role: 'DIRETOR_CURSO', curso_id: 2 },
    { username: 'lucas', password: directorPassword, role: 'DIRETOR_CURSO', curso_id: 3 },
    { username: 'luis', password: directorPassword, role: 'DIRETOR_CURSO', curso_id: 4 }
  ]);

  await knex('docentes').insert([
    { nome: 'Almeida Albuquerque', categoria: 'Mestre' },
    { nome: 'Lucas Simoco', categoria: 'Mestre' },
    { nome: 'Luís Jorge Nhacanhaca', categoria: 'Mestre' },
    { nome: 'João Baptista', categoria: 'Licenciado' }
  ]);
};
