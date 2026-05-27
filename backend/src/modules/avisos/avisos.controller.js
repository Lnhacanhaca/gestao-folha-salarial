const db = require('../../config/database');
const { logAction } = require('../../shared/utils/auditLogger');

const getActive = async (req, res, next) => {
  try {
    const avisos = await db('avisos').where({ ativo: true }).orderBy('created_at', 'desc');
    res.json(avisos);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { mensagem, ativo = true } = req.body;
    
    const isPostgres = db.client.config.client === 'pg';
    let aviso;
    
    if (isPostgres) {
      const [inserted] = await db('avisos').insert({
        mensagem,
        ativo
      }).returning('*');
      aviso = inserted;
    } else {
      const [insertedId] = await db('avisos').insert({
        mensagem,
        ativo
      });
      aviso = await db('avisos').where({ id: insertedId || null }).first();
    }

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'CREATE_AVISO',
      targetType: 'avisos',
      targetId: aviso?.id,
      details: `Adicionou um novo aviso: "${mensagem.substring(0, 50)}..."`
    });

    res.status(201).json(aviso);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mensagem, ativo } = req.body;
    
    await db('avisos').where({ id }).update({ mensagem, ativo });

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'UPDATE_AVISO',
      targetType: 'avisos',
      targetId: id,
      details: `Atualizou o aviso ID ${id}. Ativo: ${ativo}.`
    });

    res.json({ message: 'Aviso atualizado com sucesso' });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await db('avisos').where({ id }).del();

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'DELETE_AVISO',
      targetType: 'avisos',
      targetId: id,
      details: `Removeu o aviso ID ${id}.`
    });

    res.json({ message: 'Aviso removido com sucesso' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getActive, create, update, remove };
