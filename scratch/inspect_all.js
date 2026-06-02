const db = require('../backend/src/config/database');

async function run() {
  try {
    const totalFolhas = await db('folhas').count('* as count').first();
    console.log('Total folhas in DB:', totalFolhas.count);

    const nonZeroFolhas = await db('folhas').where('total_ad', '>', 0).orWhere('total_vd', '>', 0);
    console.log('Folhas with non-zero AD or VD:', nonZeroFolhas.length);
    if (nonZeroFolhas.length > 0) {
      console.log('Sample non-zero folhas:', nonZeroFolhas.slice(0, 5));
    }

    const allFolhas = await db('folhas')
      .join('docentes', 'folhas.docente_id', 'docentes.id')
      .select('folhas.*', 'docentes.nome as docente_nome')
      .limit(10);
    console.log('First 10 folhas in DB:', allFolhas);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

run();
