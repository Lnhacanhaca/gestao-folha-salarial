const db = require('../backend/src/config/database');

async function run() {
  try {
    console.log('--- USERS ---');
    const users = await db('users').select('*');
    console.log(users);

    console.log('\n--- DOCENTES ---');
    const docentes = await db('docentes').select('*');
    console.log(docentes);

    console.log('\n--- FOLHAS (with Leonel or generally) ---');
    const folhas = await db('folhas as f')
      .join('docentes as d', 'f.docente_id', 'd.id')
      .select('f.id as folha_id', 'd.nome as docente_nome', 'f.curso_id', 'f.mes', 'f.ano', 'f.total_ap', 'f.total_ad');
    console.log(folhas);
  } catch (error) {
    console.error(error);
  } finally {
    await db.destroy();
  }
}

run();
