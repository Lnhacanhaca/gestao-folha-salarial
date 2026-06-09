const db = require('../backend/src/config/database');

async function run() {
  try {
    const logs = await db('audit_logs').orderBy('id', 'desc').limit(30).select('*');
    console.log('Last 30 audit logs:');
    console.log(logs);
  } catch (error) {
    console.error(error);
  } finally {
    await db.destroy();
  }
}

run();
