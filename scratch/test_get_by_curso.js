const { getByCurso } = require('../backend/src/modules/folhas/folhas.controller');
const db = require('../backend/src/config/database');

async function run() {
  const req = {
    params: { id: '2' },
    query: { mes: '5', ano: '2026', combined: 'true' }
  };
  
  const res = {
    json: (data) => {
      console.log('Result length:', data.length);
      const withHours = data.filter(d => d.total_ad > 0 || d.total_vd > 0);
      console.log('Results with hours:', JSON.stringify(withHours, null, 2));
    }
  };
  
  try {
    await getByCurso(req, res, (err) => console.error('Next err:', err));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

run();
