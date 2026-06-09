const db = require('../backend/src/config/database');

async function run() {
  try {
    const duplicates = await db('folhas')
      .select('docente_id', 'curso_id', 'mes', 'ano')
      .groupBy('docente_id', 'curso_id', 'mes', 'ano')
      .havingRaw('count(*) > 1');
    console.log('Duplicate sheets found:');
    console.log(duplicates);

    for (const d of duplicates) {
      const rows = await db('folhas as f')
        .join('docentes as doc', 'f.docente_id', 'doc.id')
        .where({
          docente_id: d.docente_id,
          curso_id: d.curso_id,
          mes: d.mes,
          ano: d.ano
        })
        .select('f.id', 'doc.nome', 'f.curso_id', 'f.mes', 'f.ano', 'f.total_ap', 'f.total_ad', 'f.created_at');
      console.log(`Rows for docente_id=${d.docente_id}, curso_id=${d.curso_id}:`, rows);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await db.destroy();
  }
}

run();
