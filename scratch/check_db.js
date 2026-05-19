const db = require('../backend/src/config/database');

async function checkDb() {
  try {
    const sheets = await db('folhas').select('*');
    console.log("=== FOLHAS ===");
    console.log(sheets);

    const details = await db('folha_detalhes').select('*');
    console.log("=== FOLHA DETALHES ===");
    console.log(details);
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

checkDb();
