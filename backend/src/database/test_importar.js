const axios = require('axios');

async function run() {
  try {
    const response = await axios.post('http://localhost:5000/api/folhas/importar', {
      mes: 5,
      ano: 2026,
      curso_id: 2,
      dados: [
        {
          docente_nome: 'Almeida Albuquerque',
          semanas: [
            { semana: 1, ap: 12, ad: 10 },
            { semana: 2, ap: 12, ad: 10 },
            { semana: 3, ap: 12, ad: 10 },
            { semana: 4, ap: 12, ad: 10 },
            { semana: 5, ap: 12, ad: 10 }
          ],
          retificada: 0,
          observacoes: null
        }
      ]
    });
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
  }
}

run();
