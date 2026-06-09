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

const checkHasActiveException = async (curso_id, mes, ano) => {
  try {
    const exception = await db('excecoes_prazos')
      .where({
        curso_id: parseInt(curso_id),
        mes: parseInt(mes),
        ano: parseInt(ano)
      })
      .andWhere('data_limite', '>=', new Date().toISOString())
      .first();
    return !!exception;
  } catch (err) {
    console.error('Erro ao verificar exceção de prazo:', err);
    return false;
  }
};

const importar = async (req, res, next) => {
  const { mes, ano, curso_id, dados } = req.body;
  console.log('--- IMPORTAR REQUEST BODY ---');
  console.log('mes:', mes, 'ano:', ano, 'curso_id:', curso_id);
  console.log('dados length:', dados ? dados.length : 0);
  if (dados && dados.length > 0) {
    console.log('dados[0] semanas:', JSON.stringify(dados[0].semanas));
  }
  console.log('-----------------------------');
  
  if (parseInt(curso_id) === 1) {
    return res.status(400).json({ error: 'Não é permitido fazer lançamentos directos na vista Geral Consolidada.' });
  }

  if (req.user.role !== 'ADMIN') {
    const hasException = await checkHasActiveException(curso_id, mes, ano);
    if (!hasException && !isLaunchWindowOpen(mes, ano)) {
      return res.status(403).json({ error: 'Erro de permissão: O período de lançamento para este mês de referência está fechado para diretores de curso (permitido apenas de 1 a 15 do mês seguinte).' });
    }
  }


    // Validate and sanitize input arrays
    if (!Array.isArray(dados) || dados.length === 0) {
      return res.status(400).json({ error: 'Payload inválido: campo "dados" deve ser um array não vazio.' });
    }
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
    const existingFolhas = await trx('folhas')
      .where({
        curso_id: parseInt(curso_id),
        mes: parseInt(mes),
        ano: parseInt(ano)
      });

    const activeFolhaIds = [];

    for (const item of dados) {
      const semanas = Array.isArray(item.semanas) ? item.semanas : [];
      // Calculate Totals using safe array
      const total_ap = semanas.reduce((acc, s) => acc + (parseFloat(s.ap) || 0), 0);
      const total_ad = semanas.reduce((acc, s) => acc + (parseFloat(s.ad) || 0), 0);
      const total_vp = semanas.reduce((acc, s) => acc + (parseFloat(s.vp) || 0), 0);
      const total_vd = semanas.reduce((acc, s) => acc + (parseFloat(s.vd) || 0), 0);
      const valor_receber = (total_ad + total_vd) * 500;

      const isPostgres = db.client.config.client === 'pg';

      const trimmedNome = item.docente_nome.trim();
      let docente = await trx('docentes')
        .whereRaw('LOWER(nome) = ?', [trimmedNome.toLowerCase()])
        .first();
      if (!docente) {
        if (isPostgres) {
          const [inserted] = await trx('docentes').insert({ nome: trimmedNome }).returning('*');
          docente = inserted;
        } else {
          const [insertedId] = await trx('docentes').insert({ nome: trimmedNome });
          docente = await trx('docentes').where({ id: insertedId }).first();
        }
      }


      let folha = await trx('folhas')
        .where({
          docente_id: docente.id,
          mes: parseInt(mes),
          ano: parseInt(ano),
          curso_id: parseInt(curso_id)
        })
        .first();

      if (total_ad === 0 && total_vd === 0) {
        if (folha) {
          await trx('folha_detalhes').where({ folha_id: folha.id }).del();
          await trx('folhas').where({ id: folha.id }).del();
        }
      } else {
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
          // Clear details to re‑insert
          await trx('folha_detalhes').where({ folha_id: folha.id }).del();
          activeFolhaIds.push(folha.id);
        } else {
          if (isPostgres) {
            const [inserted] = await trx('folhas').insert({
              docente_id: docente.id,
              curso_id: parseInt(curso_id),
              mes: parseInt(mes),
              ano: parseInt(ano),
              total_ap,
              total_ad,
              total_vp,
              total_vd,
              valor_receber,
              retificada: item.retificada ? 1 : 0,
              observacoes: item.observacoes || null
            }).returning('*');
            folha = inserted;
            activeFolhaIds.push(folha.id);
          } else {
            const [insertedFolhaId] = await trx('folhas').insert({
              docente_id: docente.id,
              curso_id: parseInt(curso_id),
              mes: parseInt(mes),
              ano: parseInt(ano),
              total_ap,
              total_ad,
              total_vp,
              total_vd,
              valor_receber,
              retificada: item.retificada ? 1 : 0,
              observacoes: item.observacoes || null
            });
            folha = await trx('folhas').where({ id: insertedFolhaId }).first();
            activeFolhaIds.push(folha.id);
          }
        }

        // Build detalhes safely – ensure semanas is an array
        const detalhes = semanas.map(s => ({
          folha_id: folha.id,
          semana: s.semana,
          ap: s.ap,
          ad: s.ad,
          vp: s.vp || 0,
          vd: s.vd || 0
        }));

        await trx('folha_detalhes').insert(detalhes);
      }
    }

    const existingIds = existingFolhas.map(f => f.id);
    const idsToDelete = existingIds.filter(id => !activeFolhaIds.includes(id));
    if (idsToDelete.length > 0) {
      await trx('folha_detalhes').whereIn('folha_id', idsToDelete).del();
      await trx('folhas').whereIn('id', idsToDelete).del();
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

    // 2. Fetch all saved sheets belonging to any of the target courses for this month/year
    const savedFolhas = await db('folhas as f')
      .select('f.*')
      .where({ 'f.mes': parseInt(mes), 'f.ano': parseInt(ano) })
      .whereIn('f.curso_id', targetCursoIds);

    const savedDocenteIds = savedFolhas.map(f => f.docente_id);

    // 1. Fetch all docentes and filter to keep those assigned in profile OR who have saved sheets
    const docentes = await db('docentes').select('*').orderBy('nome', 'asc');
    const courseDocentes = docentes.filter(doc => {
      if (savedDocenteIds.includes(doc.id)) return true;
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

      // Find saved sheets for this teacher
      const teacherFolhas = savedFolhas.filter(f => f.docente_id === doc.id);
      const savedCursoIds = teacherFolhas.map(f => f.curso_id);

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

      // Loop through course IDs that are either active in their profile or they have saved sheets for
      const queryActiveCursos = Array.from(new Set([
        ...targetCursoIds.filter(cid => activeCursoIds.includes(cid)),
        ...savedCursoIds
      ]));

      queryActiveCursos.forEach(cid => {
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

        const f = teacherFolhas.find(fol => fol.curso_id === cid);
        if (f) {
          retificada = retificada || f.retificada || 0;
          if (f.observacoes) observacoes.push(f.observacoes);

          const f_detalhes = detalhes.filter(d => d.folha_id === f.id);
          if (f_detalhes.length > 0) {
            f_detalhes.forEach(d => {
              const idx = d.semana - 1;
              if (idx >= 0 && idx < 5) {
                semanas[idx].ap += defaultAp;
                semanas[idx].ad += parseFloat(d.ad) || 0;
                semanas[idx].vp += parseFloat(d.vp) || 0;
                semanas[idx].vd += parseFloat(d.vd) || 0;
              }
            });
          } else {
            for (let i = 0; i < 5; i++) {
              semanas[i].ap += defaultAp;
            }
          }
        } else {
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
      .where({ 'f.mes': parseInt(mes), 'f.ano': parseInt(ano) });

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

      // Find all saved sheets for this teacher
      const teacherFolhas = savedFolhas.filter(f => f.docente_id === doc.id);
      const savedCursoIds = teacherFolhas.map(f => f.curso_id);
      
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

      // Loop through all course IDs that the teacher teaches in the active semester or has saved sheets for
      const queryActiveCursos = Array.from(new Set([
        ...activeCursoIds,
        ...savedCursoIds
      ]));

      queryActiveCursos.forEach(cid => {
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

        const f = teacherFolhas.find(fol => fol.curso_id === cid);
        if (f) {
          retificada = retificada || f.retificada || 0;
          if (f.observacoes) observacoes.push(f.observacoes);

          const f_detalhes = detalhes.filter(d => d.folha_id === f.id);
          if (f_detalhes.length > 0) {
            f_detalhes.forEach(d => {
              const idx = d.semana - 1;
              if (idx >= 0 && idx < 5) {
                semanas[idx].ap += defaultAp;
                semanas[idx].ad += parseFloat(d.ad) || 0;
                semanas[idx].vp += parseFloat(d.vp) || 0;
                semanas[idx].vd += parseFloat(d.vd) || 0;
              }
            });
          } else {
            for (let i = 0; i < 5; i++) {
              semanas[i].ap += defaultAp;
            }
          }
        } else {
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

  if (req.user.role !== 'ADMIN') {
    const hasException = await checkHasActiveException(curso_id, mes, ano);
    if (!hasException && !isLaunchWindowOpen(mes, ano)) {
      return res.status(403).json({ error: 'Erro de permissão: O período de modificação/exclusão para este mês de referência está fechado para diretores de curso (permitido apenas de 1 a 15 do mês seguinte).' });
    }
  }

  const trx = await db.transaction();
  try {
    const trimmedNome = docente_nome.trim();
    const docente = await trx('docentes')
      .whereRaw('LOWER(nome) = ?', [trimmedNome.toLowerCase()])
      .first();

    if (docente) {
      const folha = await trx('folhas')
        .where({
          docente_id: docente.id,
          mes: parseInt(mes),
          ano: parseInt(ano),
          curso_id: parseInt(curso_id)
        })
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
        evolutionByMonth[monthIndex].total_ap += (f.total_ap || 0) + (f.total_vp || 0);
        evolutionByMonth[monthIndex].total_ad += (f.total_ad || 0) + (f.total_vd || 0);
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

const getExcecaoAtiva = async (req, res, next) => {
  const { curso_id, mes, ano } = req.query;
  try {
    const exception = await db('excecoes_prazos')
      .where({
        curso_id: parseInt(curso_id),
        mes: parseInt(mes),
        ano: parseInt(ano)
      })
      .andWhere('data_limite', '>=', new Date().toISOString())
      .first();

    res.json({ ativa: !!exception, excecao: exception || null });
  } catch (error) {
    next(error);
  }
};

module.exports = { importar, getByCurso, getGeral, deletarDocenteFolha, getAnalytics, getExcecaoAtiva };
