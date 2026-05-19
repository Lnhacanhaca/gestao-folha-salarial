const db = require('./src/config/database');

async function checkDb() {
  try {
    const sheets = await db('folhas').where('total_ad', '>', 0).select('*');
    console.log("=== FOLHAS WITH AD > 0 ===");
    console.log(sheets);
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

checkDb();
