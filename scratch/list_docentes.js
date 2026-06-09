const db = require('../backend/src/config/database');

async function run() {
  try {
    const docentes = await db('docentes').select('id', 'nome', 'cursos');
    console.log('All docentes in DB:');
    docentes.forEach(d => {
      console.log(`ID: ${d.id}, Nome: ${d.nome}, Cursos: ${d.cursos}`);
    });
  } catch (error) {
    console.error(error);
  } finally {
    await db.destroy();
  }
}

run();
