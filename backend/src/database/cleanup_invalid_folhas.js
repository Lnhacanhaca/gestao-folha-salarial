const db = require('../config/database');

async function run() {
  try {
    console.log('Starting cleanup...');
    const invalidFolhas = await db('folhas').where({ curso_id: 1 });
    console.log(`Found ${invalidFolhas.length} invalid sheets with curso_id = 1.`);

    if (invalidFolhas.length > 0) {
      const ids = invalidFolhas.map(f => f.id);
      
      const deletedDetailsCount = await db('folha_detalhes').whereIn('folha_id', ids).del();
      console.log(`Deleted ${deletedDetailsCount} details from folha_detalhes.`);
      
      const deletedFolhasCount = await db('folhas').whereIn('id', ids).del();
      console.log(`Deleted ${deletedFolhasCount} sheets from folhas.`);
    }

    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await db.destroy();
  }
}

run();
