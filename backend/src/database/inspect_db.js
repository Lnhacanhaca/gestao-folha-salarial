const db = require('../config/database');

async function run() {
  try {
    const docentes = await db('docentes').whereRaw("LOWER(nome) LIKE '%albuquerque%'");
    console.log('Docentes found:', docentes);
    
    if (docentes.length > 0) {
      const docenteIds = docentes.map(d => d.id);
      const folhas = await db('folhas').whereIn('docente_id', docenteIds);
      console.log('Folhas found for Albuquerque:', folhas);
      
      if (folhas.length > 0) {
        const folhaIds = folhas.map(f => f.id);
        const detalhes = await db('folha_detalhes').whereIn('folha_id', folhaIds);
        console.log('Folha Detalhes found for Albuquerque:', detalhes);
      }
    }
    
  } catch (error) {
    console.error('Error running script:', error);
  } finally {
    await db.destroy();
  }
}

run();
