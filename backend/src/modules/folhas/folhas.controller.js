const db = require('../../config/database');

const importar = async (req, res, next) => {
  const trx = await db.transaction();
  try {
    const { mes, ano, curso_id, dados } = req.body;

    for (const item of dados) {
      const trimmedNome = item.docente_nome.trim();
      let docente = await trx('docentes')
        .whereRaw('LOWER(nome) = ?', [trimmedNome.toLowerCase()])
        .first();
      if (!docente) {
        [docente] = await trx('docentes').insert({ nome: trimmedNome }).returning('*');
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

    // 1. Fetch all docentes who are registered for this course in their profile
    const docentes = await db('docentes').select('*').orderBy('nome', 'asc');
    const courseDocentes = docentes.filter(doc => {
      try {
        let cursosArray = [];
        if (typeof doc.cursos === 'string') {
          const parsed = JSON.parse(doc.cursos);
          cursosArray = Array.isArray(parsed) ? parsed : [parsed];
        } else if (Array.isArray(doc.cursos)) {
          cursosArray = doc.cursos;
        } else if (typeof doc.cursos === 'number') {
          cursosArray = [{ id: doc.cursos, ap: 0 }];
        }
        return cursosArray.some(c => (c.id || c) === Number(curso_id));
      } catch {
        return false;
      }
    });

    const courseDocenteIds = courseDocentes.map(d => d.id);

    // 2. Fetch only sheets that belong to both this course and these valid teachers
    const data = await db('folhas as f')
      .join('docentes as d', 'f.docente_id', 'd.id')
      .select('f.*', 'd.nome as docente_nome')
      .where({ 'f.curso_id': curso_id, 'f.mes': mes, 'f.ano': ano })
      .whereIn('f.docente_id', courseDocenteIds);

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

    // 1. Fetch all docentes from the database
    const docentes = await db('docentes').select('*').orderBy('nome', 'asc');

    // 2. Fetch all saved sheets for this month/year
    const savedFolhas = await db('folhas as f')
      .select('f.*')
      .where({ 'f.mes': mes, 'f.ano': ano });

    const folha_ids = savedFolhas.map(f => f.id);
    const detalhes = folha_ids.length > 0 ? await db('folha_detalhes').whereIn('folha_id', folha_ids) : [];

    const data = docentes.map(doc => {
      // Parse doc.cursos to find all courses and sum their AP
      let total_weekly_ap = 0;
      try {
        let cursosArray = [];
        if (typeof doc.cursos === 'string') {
          const parsed = JSON.parse(doc.cursos);
          cursosArray = Array.isArray(parsed) ? parsed : [parsed];
        } else if (Array.isArray(doc.cursos)) {
          cursosArray = doc.cursos;
        } else if (typeof doc.cursos === 'number') {
          cursosArray = [{ id: doc.cursos, ap: 0 }];
        }
        cursosArray.forEach(c => {
          if (c && c.ap !== undefined) {
            total_weekly_ap += parseFloat(c.ap) || 0;
          } else if (typeof c === 'object' && c.ap) {
            total_weekly_ap += parseFloat(c.ap) || 0;
          }
        });
      } catch (e) {}

      // Find all saved sheets for this teacher in this month/year
      const teacherFolhas = savedFolhas.filter(f => f.docente_id === doc.id);
      
      let total_ad = 0;
      let retificada = 0;
      let observacoes = [];

      // Weeks initialization
      const semanas = [
        { semana: 1, ap: total_weekly_ap, ad: 0 },
        { semana: 2, ap: total_weekly_ap, ad: 0 },
        { semana: 3, ap: total_weekly_ap, ad: 0 },
        { semana: 4, ap: total_weekly_ap, ad: 0 },
        { semana: 5, ap: total_weekly_ap, ad: 0 }
      ];

      // Sum saved AD weekly values from database details
      teacherFolhas.forEach(f => {
        retificada = retificada || f.retificada || 0;
        if (f.observacoes) observacoes.push(f.observacoes);

        const f_detalhes = detalhes.filter(d => d.folha_id === f.id);
        f_detalhes.forEach(d => {
          const idx = d.semana - 1;
          if (idx >= 0 && idx < 5) {
            semanas[idx].ad += Number(d.ad) || 0;
          }
        });
      });

      // Recalculate totals
      const total_ap = semanas.reduce((acc, s) => acc + s.ap, 0);
      const computed_total_ad = semanas.reduce((acc, s) => acc + s.ad, 0);
      const valor_receber = computed_total_ad * 500;

      return {
        docente_nome: doc.nome,
        total_ap,
        total_ad: computed_total_ad,
        valor_receber,
        retificada,
        observacoes: observacoes.length > 0 ? observacoes.join('; ') : null,
        semanas
      };
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = { importar, getByCurso, getGeral };
