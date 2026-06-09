const db = require('../../config/database');
const { logAction } = require('../../shared/utils/auditLogger');

const backup = async (req, res, next) => {
  try {
    const users = await db('users').select('*');
    const docentes = await db('docentes').select('*');
    const folhas = await db('folhas').select('*');
    const folha_detalhes = await db('folha_detalhes').select('*');
    const audit_logs = await db('audit_logs').select('*');
    const avisos = await db('avisos').select('*');

    const backupData = {
      users,
      docentes,
      folhas,
      folha_detalhes,
      audit_logs,
      avisos
    };

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'BACKUP_DATABASE',
      targetType: 'system',
      targetId: null,
      details: 'Realizou uma cópia de segurança (backup) da base de dados.'
    });

    res.json(backupData);
  } catch (error) {
    next(error);
  }
};

const restore = async (req, res, next) => {
  try {
    const { users, docentes, folhas, folha_detalhes, audit_logs, avisos } = req.body;

    if (!users || !docentes || !folhas || !folha_detalhes) {
      return res.status(400).json({ message: 'Formato de backup inválido.' });
    }

    await db.transaction(async (trx) => {
      // Deletes in order to respect potential relationships or dependencies
      await trx('folha_detalhes').del();
      await trx('folhas').del();
      await trx('docentes').del();
      await trx('audit_logs').del();
      await trx('avisos').del();
      await trx('users').del();

      if (users && users.length > 0) await trx('users').insert(users);
      if (docentes && docentes.length > 0) await trx('docentes').insert(docentes);
      if (folhas && folhas.length > 0) await trx('folhas').insert(folhas);
      if (folha_detalhes && folha_detalhes.length > 0) await trx('folha_detalhes').insert(folha_detalhes);
      if (audit_logs && audit_logs.length > 0) await trx('audit_logs').insert(audit_logs);
      if (avisos && avisos.length > 0) await trx('avisos').insert(avisos);
    });

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'RESTORE_DATABASE',
      targetType: 'system',
      targetId: null,
      details: 'Restaurou a base de dados a partir de um ficheiro de cópia de segurança.'
    });

    res.json({ message: 'Base de dados restaurada com sucesso!' });
  } catch (error) {
    next(error);
  }
};

const listarExcecoes = async (req, res, next) => {
  try {
    const list = await db('excecoes_prazos')
      .select('*')
      .orderBy('created_at', 'desc');
    res.json(list);
  } catch (error) {
    next(error);
  }
};

const criarExcecao = async (req, res, next) => {
  const { curso_id, mes, ano, data_limite, motivo } = req.body;
  try {
    if (!curso_id || !mes || !ano || !data_limite) {
      return res.status(400).json({ error: 'Os campos curso_id, mes, ano e data_limite são obrigatórios.' });
    }

    const isPostgres = db.client.config.client === 'pg';
    let id;
    if (isPostgres) {
      const [inserted] = await db('excecoes_prazos').insert({
        curso_id: parseInt(curso_id),
        mes: parseInt(mes),
        ano: parseInt(ano),
        data_limite,
        motivo: motivo || null
      }).returning('*');
      id = inserted.id;
    } else {
      const [insertedId] = await db('excecoes_prazos').insert({
        curso_id: parseInt(curso_id),
        mes: parseInt(mes),
        ano: parseInt(ano),
        data_limite,
        motivo: motivo || null
      });
      id = insertedId;
    }

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'CREATE_EXCECAO_PRAZO',
      targetType: 'excecoes_prazos',
      targetId: id.toString(),
      details: `Criou exceção de prazo para o curso ID ${curso_id} (mês ${mes}/${ano}) com limite até ${new Date(data_limite).toLocaleString('pt-PT')}.`
    });

    const criada = await db('excecoes_prazos').where({ id }).first();
    res.status(201).json(criada);
  } catch (error) {
    next(error);
  }
};

const deletarExcecao = async (req, res, next) => {
  const { id } = req.params;
  try {
    const exception = await db('excecoes_prazos').where({ id: parseInt(id) }).first();
    if (!exception) {
      return res.status(404).json({ error: 'Exceção não encontrada.' });
    }

    await db('excecoes_prazos').where({ id: parseInt(id) }).del();

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'DELETE_EXCECAO_PRAZO',
      targetType: 'excecoes_prazos',
      targetId: id,
      details: `Removeu a exceção de prazo para o curso ID ${exception.curso_id} (mês ${exception.mes}/${exception.ano}).`
    });

    res.json({ success: true, message: 'Exceção de prazo removida com sucesso!' });
  } catch (error) {
    next(error);
  }
};

const apagarLancamentos = async (req, res, next) => {
  const { curso_id, diretor_id, mes, ano } = req.body;
  try {
    if (!mes || !ano) {
      return res.status(400).json({ error: 'Mês e ano são obrigatórios.' });
    }

    let targetCursoIds = [];

    if (diretor_id) {
      // Find the user (director) to see their managed courses
      const user = await db('users').where({ id: parseInt(diretor_id) }).first();
      if (!user) {
        return res.status(404).json({ error: 'Diretor de curso não encontrado.' });
      }
      
      const cid = parseInt(user.curso_id);
      if (cid === 2 || cid === 3) targetCursoIds = [2, 3];
      else if (cid === 4 || cid === 5) targetCursoIds = [4, 5];
      else if (cid === 6) targetCursoIds = [6];
      else if (cid) targetCursoIds = [cid];
    } else if (curso_id) {
      if (parseInt(curso_id) === 1) {
        // Geral (Todos os cursos)
        targetCursoIds = [2, 3, 4, 5, 6];
      } else {
        targetCursoIds = [parseInt(curso_id)];
      }
    } else {
      return res.status(400).json({ error: 'Deve especificar um curso ou um diretor.' });
    }

    if (targetCursoIds.length === 0) {
      return res.status(400).json({ error: 'Nenhum curso selecionado para limpar.' });
    }

    const deletedCount = await db.transaction(async (trx) => {
      // Find matching folhas
      const matchingFolhas = await trx('folhas')
        .where({ mes: parseInt(mes), ano: parseInt(ano) })
        .whereIn('curso_id', targetCursoIds);

      if (matchingFolhas.length === 0) {
        return 0;
      }

      const folhaIds = matchingFolhas.map(f => f.id);

      // Delete details first
      await trx('folha_detalhes').whereIn('folha_id', folhaIds).del();
      // Delete folhas
      await trx('folhas').whereIn('id', folhaIds).del();

      return matchingFolhas.length;
    });

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'CLEAN_FOLHAS',
      targetType: 'folhas',
      targetId: null,
      details: `Apagou todos os lançamentos (${deletedCount} folhas) para o período ${mes}/${ano} do(s) curso(s) ${targetCursoIds.join(', ')}.`
    });

    res.json({ success: true, message: `Lançamentos apagados com sucesso! Foram removidos lançamentos de ${deletedCount} docentes.` });
  } catch (error) {
    next(error);
  }
};

module.exports = { backup, restore, listarExcecoes, criarExcecao, deletarExcecao, apagarLancamentos };
