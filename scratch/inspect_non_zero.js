const db = require('../backend/src/config/database');

async function run() {
  try {
    const records = await db('folhas')
      .join('docentes', 'folhas.docente_id', 'docentes.id')
      .select('folhas.*', 'docentes.nome as docente_nome')
      .where('total_ad', '>', 0)
      .orWhere('total_vd', '>', 0);
    
    console.log('Non-zero sheets in DB:');
    records.forEach(r => {
      console.log(`Docente: ${r.docente_nome}, Curso ID: ${r.curso_id}, Mês: ${r.mes}, Ano: ${r.ano}, Total AP: ${r.total_ap}, Total AD: ${r.total_ad}, Total VP: ${r.total_vp}, Total VD: ${r.total_vd}, Valor: ${r.valor_receber}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

run();
