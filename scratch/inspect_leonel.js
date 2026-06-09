const db = require('../backend/src/config/database');

async function run() {
  try {
    const leonel = await db('docentes').where('nome', 'like', '%Leonel%').first();
    console.log('Leonel docente profile:', leonel);
  } catch (error) {
    console.error(error);
  } finally {
    await db.destroy();
  }
}

run();
