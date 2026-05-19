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
    { username: 'lucas', password: directorPassword, role: 'DIRETOR_CURSO', curso_id: 4 },
    { username: 'luis', password: directorPassword, role: 'DIRETOR_CURSO', curso_id: 6 }
  ]);

  await knex('docentes').insert([
    { nome: 'Almeida Albuquerque', categoria: 'Mestre', cursos: JSON.stringify([{ id: 2, ap: 16 }]) },
    { nome: 'Lucas Simoco', categoria: 'Mestre', cursos: JSON.stringify([{ id: 4, ap: 12 }]) },
    { nome: 'Luís Jorge Nhacanhaca', categoria: 'Mestre', cursos: JSON.stringify([{ id: 6, ap: 14 }]) },
    { nome: 'João Baptista', categoria: 'Licenciado', cursos: JSON.stringify([{ id: 3, ap: 10 }, { id: 5, ap: 8 }]) }
  ]);
};
