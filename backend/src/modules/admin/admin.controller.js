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

module.exports = { backup, restore };
