const db = require('../../config/database');

const getAllLogs = async (req, res, next) => {
  try {
    const logs = await db('audit_logs')
      .select('*')
      .orderBy('created_at', 'desc');
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

const clearLogs = async (req, res, next) => {
  try {
    await db('audit_logs').truncate(); // or del() for sqlite compatibility
    
    // Log that we cleared the logs
    await db('audit_logs').insert({
      user_id: req.user.id,
      username: req.user.username,
      action: 'CLEAR_AUDIT_LOGS',
      target_type: 'audit_logs',
      target_id: null,
      details: 'Histórico de auditoria limpo pelo administrador.'
    });

    res.json({ message: 'Histórico de auditoria limpo com sucesso' });
  } catch (error) {
    // sqlite doesn't always support truncate, fallback to del
    try {
      await db('audit_logs').del();
      await db('audit_logs').insert({
        user_id: req.user.id,
        username: req.user.username,
        action: 'CLEAR_AUDIT_LOGS',
        target_type: 'audit_logs',
        target_id: null,
        details: 'Histórico de auditoria limpo pelo administrador.'
      });
      res.json({ message: 'Histórico de auditoria limpo com sucesso' });
    } catch (innerError) {
      next(innerError);
    }
  }
};

module.exports = { getAllLogs, clearLogs };
