const db = require('../../config/database');

const importar = async (req, res, next) => {
  const trx = await db.transaction();
  try {
    const { mes, ano, curso_id, dados } = req.body;

    for (const item of dados) {
      // Find or Create Docente
      let docente = await trx('docentes').where({ nome: item.docente_nome }).first();
      if (!docente) {
        [docente] = await trx('docentes').insert({ nome: item.docente_nome }).returning('*');
      }

      // Calculate Totals
      const total_ap = item.semanas.reduce((acc, s) => acc + (parseFloat(s.ap) || 0), 0);
      const total_ad = item.semanas.reduce((acc, s) => acc + (parseFloat(s.ad) || 0), 0);
      const valor_receber = total_ad * 500;

      // Upsert Folha
      let folha = await trx('folhas')
        .where({ docente_id: docente.id, mes, ano, curso_id })
        .first();

      if (folha) {
        await trx('folhas').where({ id: folha.id }).update({
          total_ap,
          total_ad,
          valor_receber,
          retificada: item.retificada ? 1 : 0,
          observacoes: item.observacoes || null,
          updated_at: new Date()
        });
        // Clear details to re-insert
        await trx('folha_detalhes').where({ folha_id: folha.id }).del();
      } else {
        [folha] = await trx('folhas').insert({
          docente_id: docente.id,
          curso_id,
          mes,
          ano,
          total_ap,
          total_ad,
          valor_receber,
          retificada: item.retificada ? 1 : 0,
          observacoes: item.observacoes || null
        }).returning('*');
      }

      // Insert Details
      const detalhes = item.semanas.map(s => ({
        folha_id: folha.id,
        semana: s.semana,
        ap: s.ap,
        ad: s.ad
      }));

      await trx('folha_detalhes').insert(detalhes);
    }

    await trx.commit();
    res.json({ message: 'Dados importados com sucesso' });
  } catch (error) {
    await trx.rollback();
    next(error);
  }
};

const getByCurso = async (req, res, next) => {
  try {
    const { id: curso_id } = req.params;
    const { mes, ano } = req.query;

    const data = await db('folhas as f')
      .join('docentes as d', 'f.docente_id', 'd.id')
      .select('f.*', 'd.nome as docente_nome')
      .where({ 'f.curso_id': curso_id, 'f.mes': mes, 'f.ano': ano });

    for (let row of data) {
      const dbSemanas = await db('folha_detalhes')
        .where({ folha_id: row.id })
        .orderBy('semana', 'asc');
        
      row.semanas = [
        { semana: 1, ap: 0, ad: 0 },
        { semana: 2, ap: 0, ad: 0 },
        { semana: 3, ap: 0, ad: 0 },
        { semana: 4, ap: 0, ad: 0 },
        { semana: 5, ap: 0, ad: 0 }
      ];
      
      dbSemanas.forEach(s => {
         const idx = s.semana - 1;
         if (idx >= 0 && idx < 5) {
           row.semanas[idx].ap = s.ap;
           row.semanas[idx].ad = s.ad;
         }
      });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getGeral = async (req, res, next) => {
  try {
    const { mes, ano } = req.query;

    const folhas = await db('folhas as f')
      .join('docentes as d', 'f.docente_id', 'd.id')
      .select('f.id as folha_id', 'd.id as docente_id', 'd.nome as docente_nome', 'f.total_ap', 'f.total_ad', 'f.valor_receber', 'f.retificada', 'f.observacoes')
      .where({ 'f.mes': mes, 'f.ano': ano });

    const folha_ids = folhas.map(f => f.folha_id);
    const detalhes = folha_ids.length > 0 ? await db('folha_detalhes').whereIn('folha_id', folha_ids) : [];

    const grouped = {};
    for (const f of folhas) {
      if (!grouped[f.docente_id]) {
        grouped[f.docente_id] = {
          docente_nome: f.docente_nome,
          total_ap: 0,
          total_ad: 0,
          valor_receber: 0,
          retificada: f.retificada || 0,
          observacoes: f.observacoes || null,
          semanas: [
            { semana: 1, ap: 0, ad: 0 },
            { semana: 2, ap: 0, ad: 0 },
            { semana: 3, ap: 0, ad: 0 },
            { semana: 4, ap: 0, ad: 0 },
            { semana: 5, ap: 0, ad: 0 }
          ]
        };
      }
      
      const g = grouped[f.docente_id];
      g.total_ap += f.total_ap || 0;
      g.total_ad += f.total_ad || 0;
      g.valor_receber += f.valor_receber || 0;
      g.retificada = g.retificada || f.retificada || 0;
      if (f.observacoes) {
        g.observacoes = g.observacoes ? `${g.observacoes}; ${f.observacoes}` : f.observacoes;
      }

      const f_detalhes = detalhes.filter(d => d.folha_id === f.folha_id);
      f_detalhes.forEach(d => {
        const idx = d.semana - 1;
        if (idx >= 0 && idx < 5) {
          g.semanas[idx].ap += d.ap || 0;
          g.semanas[idx].ad += d.ad || 0;
        }
      });
    }

    const data = Object.values(grouped).sort((a, b) => a.docente_nome.localeCompare(b.docente_nome));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = { importar, getByCurso, getGeral };
