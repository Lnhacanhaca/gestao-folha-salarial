const db = require('../../config/database');

const getAll = async (req, res, next) => {
  try {
    const docentes = await db('docentes').select('*').orderBy('nome', 'asc');
    res.json(docentes);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { nome, categoria } = req.body;
    const [docente] = await db('docentes').insert({ nome, categoria }).returning('*');
    res.status(201).json(docente);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, categoria } = req.body;
    await db('docentes').where({ id }).update({ nome, categoria });
    res.json({ message: 'Docente atualizado com sucesso' });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db('docentes').where({ id }).del();
    res.json({ message: 'Docente removido com sucesso' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
