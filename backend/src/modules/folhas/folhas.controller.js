const db = require('../../config/database');
const { logAction } = require('../../shared/utils/auditLogger');

const isLaunchWindowOpen = (targetMes, targetAno) => {
  const now = new Date();
  const curDay = now.getDate();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  // Determine superior month and year
  let supMonth = Number(targetMes) + 1;
  let supYear = Number(targetAno);
  if (supMonth === 13) {
    supMonth = 1;
    supYear = Number(targetAno) + 1;
  }

  return curYear === supYear && curMonth === supMonth && curDay >= 1 && curDay <= 15;
};

const importar = async (req, res, next) => {
  const { mes, ano, curso_id, dados } = req.body;
  
  if (parseInt(curso_id) === 1) {
    return res.status(400).json({ error: 'Não é permitido fazer lançamentos directos na vista Geral Consolidada.' });
  }

  if (req.user.role !== 'ADMIN' && !isLaunchWindowOpen(mes, ano)) {
    return res.status(403).json({ error: 'Erro de permissão: O período de lançamento para este mês de referência está fechado para diretores de curso (permitido apenas de 1 a 15 do mês seguinte).' });
  }


  // Validate inputs
  if (dados && Array.isArray(dados)) {
    for (const item of dados) {
      if (item.semanas && Array.isArray(item.semanas)) {
        for (const s of item.semanas) {
          const apVal = parseFloat(s.ap) || 0;
          const adVal = parseFloat(s.ad) || 0;
          const vpVal = parseFloat(s.vp) || 0;
          const vdVal = parseFloat(s.vd) || 0;
          if (apVal < 0 || adVal < 0 || vpVal < 0 || vdVal < 0) {
            return res.status(400).json({ error: 'As horas não podem ser valores negativos.' });
          }
          if (adVal > apVal) {
            return res.status(400).json({ error: 'As Aulas Dadas (AD) não podem ser maiores que as Aulas Programadas (AP).' });
          }
        }
      }
    }
  }

  const trx = await db.transaction();
  try {

    for (const item of dados) {
      const trimmedNome = item.docente_nome.trim();
      let docente = await trx('docentes')
        .whereRaw('LOWER(nome) = ?', [trimmedNome.toLowerCase()])
        .first();
      if (!docente) {
        // Fetch generated ID safely
        const [insertedId] = await trx('docentes').insert({ nome: trimmedNome });
        docente = await trx('docentes').where({ id: insertedId }).first();
      }

      // Calculate Totals
      const total_ap = item.semanas.reduce((acc, s) => acc + (parseFloat(s.ap) || 0), 0);
      const total_ad = item.semanas.reduce((acc, s) => acc + (parseFloat(s.ad) || 0), 0);
      const total_vp = item.semanas.reduce((acc, s) => acc + (parseFloat(s.vp) || 0), 0);
      const total_vd = item.semanas.reduce((acc, s) => acc + (parseFloat(s.vd) || 0), 0);
      const valor_receber = (total_ad + total_vd) * 500;

      // Upsert Folha
      let folha = await trx('folhas')
        .where({ docente_id: docente.id, mes, ano, curso_id })
        .first();

      if (folha) {
        await trx('folhas').where({ id: folha.id }).update({
          total_ap,
          total_ad,
          total_vp,
          total_vd,
          valor_receber,
          retificada: item.retificada ? 1 : 0,
          observacoes: item.observacoes || null,
          updated_at: new Date()
        });
        // Clear details to re-insert
        await trx('folha_detalhes').where({ folha_id: folha.id }).del();
      } else {
        const [insertedFolhaId] = await trx('folhas').insert({
          docente_id: docente.id,
          curso_id,
          mes,
          ano,
          total_ap,
          total_ad,
          total_vp,
          total_vd,
          valor_receber,
          retificada: item.retificada ? 1 : 0,
          observacoes: item.observacoes || null
        });
        folha = await trx('folhas').where({ id: insertedFolhaId }).first();
      }

      const detalhes = item.semanas.map(s => ({
        folha_id: folha.id,
        semana: s.semana,
        ap: s.ap,
        ad: s.ad,
        vp: s.vp || 0,
        vd: s.vd || 0
      }));

      await trx('folha_detalhes').insert(detalhes);
    }

    await trx.commit();

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'SAVE_FOLHA',
      targetType: 'folhas',
      targetId: curso_id,
      details: `Lançadas/Atualizadas horas para o curso ID ${curso_id} do mês ${mes}/${ano}. Total de docentes: ${dados.length}.`
    });

    res.json({ message: 'Dados importados com sucesso' });
  } catch (error) {
    await trx.rollback();
    next(error);
  }
};

const getByCurso = async (req, res, next) => {
  try {
    const { id: curso_id } = req.params;
    const { mes, ano, combined } = req.query;

    let targetCursoIds = [Number(curso_id)];
    if (combined === 'true') {
      if (Number(curso_id) === 2) {
        targetCursoIds = [2, 3];
      } else if (Number(curso_id) === 3) {
        targetCursoIds = [4, 5];
      } else if (Number(curso_id) === 4) {
        targetCursoIds = [6];
      }
    }

    const activeSemestre = (Number(mes) >= 7 && Number(mes) <= 12) ? 2 : 1;

    // 1. Fetch all docentes who are registered for these courses in their profile
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
        return cursosArray.some(c => targetCursoIds.includes(Number(c.id || c)));
      } catch {
        return false;
      }
    });

    const courseDocenteIds = courseDocentes.map(d => d.id);

    // 2. Fetch sheets belonging to any of the target courses for this month/year
    const savedFolhas = courseDocenteIds.length > 0 ? await db('folhas as f')
      .select('f.*')
      .where({ 'f.mes': mes, 'f.ano': ano })
      .whereIn('f.curso_id', targetCursoIds)
      .whereIn('f.docente_id', courseDocenteIds) : [];

    const folha_ids = savedFolhas.map(f => f.id);
    const detalhes = folha_ids.length > 0 ? await db('folha_detalhes').whereIn('folha_id', folha_ids) : [];

    const data = courseDocentes.map(doc => {
      let activeCursoIds = [];
      let cursosArray = [];
      try {
        if (typeof doc.cursos === 'string') {
          const parsed = JSON.parse(doc.cursos);
          cursosArray = Array.isArray(parsed) ? parsed : [parsed];
        } else if (Array.isArray(doc.cursos)) {
          cursosArray = doc.cursos;
        }

        cursosArray.forEach(c => {
          const curSem = c.semestre !== undefined ? Number(c.semestre) : null;
          if (curSem === null || curSem === activeSemestre) {
            activeCursoIds.push(Number(c.id || c));
          }
        });
      } catch (e) {}

      // Find saved sheets for this teacher and only allow courses they teach in active semester
      const teacherFolhas = savedFolhas.filter(f => f.docente_id === doc.id);
      const validTeacherFolhas = teacherFolhas.filter(f => activeCursoIds.includes(f.curso_id));

      // Weeks initialization
      const semanas = [
        { semana: 1, ap: 0, ad: 0, vp: 0, vd: 0 },
        { semana: 2, ap: 0, ad: 0, vp: 0, vd: 0 },
        { semana: 3, ap: 0, ad: 0, vp: 0, vd: 0 },
        { semana: 4, ap: 0, ad: 0, vp: 0, vd: 0 },
        { semana: 5, ap: 0, ad: 0, vp: 0, vd: 0 }
      ];

      let retificada = 0;
      let observacoes = [];

      // Loop through target course IDs that the teacher teaches in the active semester
      const queryActiveCursos = targetCursoIds.filter(cid => activeCursoIds.includes(cid));

      queryActiveCursos.forEach(cid => {
        const f = validTeacherFolhas.find(fol => fol.curso_id === cid);
        if (f) {
          retificada = retificada || f.retificada || 0;
          if (f.observacoes) observacoes.push(f.observacoes);

          const f_detalhes = detalhes.filter(d => d.folha_id === f.id);
          if (f_detalhes.length > 0) {
            f_detalhes.forEach(d => {
              const idx = d.semana - 1;
              if (idx >= 0 && idx < 5) {
                semanas[idx].ap += parseFloat(d.ap) || 0;
                semanas[idx].ad += parseFloat(d.ad) || 0;
                semanas[idx].vp += parseFloat(d.vp) || 0;
                semanas[idx].vd += parseFloat(d.vd) || 0;
              }
            });
          } else {
            // Sheet has no details, fall back to profile default AP
            let match = cursosArray.find(c => {
              const curId = Number(c.id || c);
              const curSem = c.semestre !== undefined ? Number(c.semestre) : null;
              return curId === cid && curSem === activeSemestre;
            });
            if (!match) {
              match = cursosArray.find(c => {
                const curId = Number(c.id || c);
                const curSem = c.semestre !== undefined ? Number(c.semestre) : null;
                return curId === cid && curSem === null;
              });
            }
            const defaultAp = match ? (parseFloat(match.ap) || 0) : 0;
            for (let i = 0; i < 5; i++) {
              semanas[i].ap += defaultAp;
            }
          }
        } else {
          // No saved sheet, use profile default AP
          let match = cursosArray.find(c => {
            const curId = Number(c.id || c);
            const curSem = c.semestre !== undefined ? Number(c.semestre) : null;
            return curId === cid && curSem === activeSemestre;
          });
          if (!match) {
            match = cursosArray.find(c => {
              const curId = Number(c.id || c);
              const curSem = c.semestre !== undefined ? Number(c.semestre) : null;
              return curId === cid && curSem === null;
            });
          }
          const defaultAp = match ? (parseFloat(match.ap) || 0) : 0;
          for (let i = 0; i < 5; i++) {
            semanas[i].ap += defaultAp;
          }
        }
      });

      // Recalculate totals
      const total_ap = semanas.reduce((acc, s) => acc + s.ap, 0);
      const total_ad = semanas.reduce((acc, s) => acc + s.ad, 0);
      const total_vp = semanas.reduce((acc, s) => acc + s.vp, 0);
      const total_vd = semanas.reduce((acc, s) => acc + s.vd, 0);
      const valor_receber = (total_ad + total_vd) * 500;

      return {
        docente_nome: doc.nome,
        total_ap,
        total_ad,
        total_vp,
        total_vd,
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

    const activeSemestre = (Number(mes) >= 7 && Number(mes) <= 12) ? 2 : 1;

    const data = docentes.map(doc => {
      let activeCursoIds = [];
      let cursosArray = [];
      try {
        if (typeof doc.cursos === 'string') {
          const parsed = JSON.parse(doc.cursos);
          cursosArray = Array.isArray(parsed) ? parsed : [parsed];
        } else if (Array.isArray(doc.cursos)) {
          cursosArray = doc.cursos;
        } else if (typeof doc.cursos === 'number') {
          cursosArray = [{ id: doc.cursos, ap: 0 }];
        }

        cursosArray.forEach(c => {
          const curSem = c.semestre !== undefined ? Number(c.semestre) : null;
          if (curSem === null || curSem === activeSemestre) {
            activeCursoIds.push(Number(c.id || c));
          }
        });
      } catch (e) {}

      // Find all saved sheets for this teacher in this month/year and only allow courses they teach in active semester
      const teacherFolhas = savedFolhas.filter(f => f.docente_id === doc.id);
      const validTeacherFolhas = teacherFolhas.filter(f => activeCursoIds.includes(f.curso_id));
      
      let total_ad = 0;
      let retificada = 0;
      let observacoes = [];

      // Weeks initialization
      const semanas = [
        { semana: 1, ap: 0, ad: 0, vp: 0, vd: 0 },
        { semana: 2, ap: 0, ad: 0, vp: 0, vd: 0 },
        { semana: 3, ap: 0, ad: 0, vp: 0, vd: 0 },
        { semana: 4, ap: 0, ad: 0, vp: 0, vd: 0 },
        { semana: 5, ap: 0, ad: 0, vp: 0, vd: 0 }
      ];

      // Loop through all course IDs that the teacher teaches in the active semester
      activeCursoIds.forEach(cid => {
        const f = validTeacherFolhas.find(fol => fol.curso_id === cid);
        if (f) {
          retificada = retificada || f.retificada || 0;
          if (f.observacoes) observacoes.push(f.observacoes);

          const f_detalhes = detalhes.filter(d => d.folha_id === f.id);
          if (f_detalhes.length > 0) {
            f_detalhes.forEach(d => {
              const idx = d.semana - 1;
              if (idx >= 0 && idx < 5) {
                semanas[idx].ap += parseFloat(d.ap) || 0;
                semanas[idx].ad += parseFloat(d.ad) || 0;
                semanas[idx].vp += parseFloat(d.vp) || 0;
                semanas[idx].vd += parseFloat(d.vd) || 0;
              }
            });
          } else {
            // Sheet has no details, fall back to profile default AP
            let match = cursosArray.find(c => {
              const curId = Number(c.id || c);
              const curSem = c.semestre !== undefined ? Number(c.semestre) : null;
              return curId === cid && curSem === activeSemestre;
            });
            if (!match) {
              match = cursosArray.find(c => {
                const curId = Number(c.id || c);
                const curSem = c.semestre !== undefined ? Number(c.semestre) : null;
                return curId === cid && curSem === null;
              });
            }
            const defaultAp = match ? (parseFloat(match.ap) || 0) : 0;
            for (let i = 0; i < 5; i++) {
              semanas[i].ap += defaultAp;
            }
          }
        } else {
          // No saved sheet, use profile default AP
          let match = cursosArray.find(c => {
            const curId = Number(c.id || c);
            const curSem = c.semestre !== undefined ? Number(c.semestre) : null;
            return curId === cid && curSem === activeSemestre;
          });
          if (!match) {
            match = cursosArray.find(c => {
              const curId = Number(c.id || c);
              const curSem = c.semestre !== undefined ? Number(c.semestre) : null;
              return curId === cid && curSem === null;
            });
          }
          const defaultAp = match ? (parseFloat(match.ap) || 0) : 0;
          for (let i = 0; i < 5; i++) {
            semanas[i].ap += defaultAp;
          }
        }
      });

      // Recalculate totals
      const total_ap = semanas.reduce((acc, s) => acc + s.ap, 0);
      const computed_total_ad = semanas.reduce((acc, s) => acc + s.ad, 0);
      const computed_total_vp = semanas.reduce((acc, s) => acc + s.vp, 0);
      const computed_total_vd = semanas.reduce((acc, s) => acc + s.vd, 0);
      const valor_receber = (computed_total_ad + computed_total_vd) * 500;

      return {
        docente_nome: doc.nome,
        total_ap,
        total_ad: computed_total_ad,
        total_vp: computed_total_vp,
        total_vd: computed_total_vd,
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

const deletarDocenteFolha = async (req, res, next) => {
  const { curso_id, docente_nome } = req.body;
  const { mes, ano } = req.query;

  if (req.user.role !== 'ADMIN' && !isLaunchWindowOpen(mes, ano)) {
    return res.status(403).json({ error: 'Erro de permissão: O período de modificação/exclusão para este mês de referência está fechado para diretores de curso (permitido apenas de 1 a 15 do mês seguinte).' });
  }

  const trx = await db.transaction();
  try {
    const trimmedNome = docente_nome.trim();
    const docente = await trx('docentes')
      .whereRaw('LOWER(nome) = ?', [trimmedNome.toLowerCase()])
      .first();

    if (docente) {
      const folha = await trx('folhas')
        .where({ docente_id: docente.id, mes, ano, curso_id })
        .first();

      if (folha) {
        await trx('folha_detalhes').where({ folha_id: folha.id }).del();
        await trx('folhas').where({ id: folha.id }).del();

        await trx.commit();

        await logAction({
          userId: req.user.id,
          username: req.user.username,
          action: 'DELETE_FOLHA',
          targetType: 'folhas',
          targetId: curso_id,
          details: `Removido lançamento do docente "${trimmedNome}" no curso ID ${curso_id} do mês ${mes}/${ano}.`
        });

        return res.json({ message: 'Lançamento do docente removido com sucesso' });
      }
    }

    await trx.rollback();
    res.json({ message: 'Nenhum lançamento encontrado para remover' });
  } catch (error) {
    await trx.rollback();
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const { ano } = req.query;
    const year = Number(ano) || new Date().getFullYear();

    const folhas = await db('folhas').where({ ano: year });

    const evolutionByMonth = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      total_ap: 0,
      total_ad: 0,
      custo_total: 0
    }));

    const courseStats = {};

    folhas.forEach(f => {
      const monthIndex = f.mes - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        evolutionByMonth[monthIndex].total_ap += f.total_ap || 0;
        evolutionByMonth[monthIndex].total_ad += f.total_ad || 0;
        evolutionByMonth[monthIndex].custo_total += f.valor_receber || 0;
      }

      if (!courseStats[f.curso_id]) {
        courseStats[f.curso_id] = { curso_id: f.curso_id, custo_total: 0 };
      }
      courseStats[f.curso_id].custo_total += f.valor_receber || 0;
    });

    const ranking = Object.values(courseStats).sort((a, b) => b.custo_total - a.custo_total);

    res.json({
      ano: year,
      evolution: evolutionByMonth,
      ranking
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { importar, getByCurso, getGeral, deletarDocenteFolha, getAnalytics };
