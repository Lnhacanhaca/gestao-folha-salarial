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
    const { nome, categoria, cursos } = req.body;
    const cursosStr = Array.isArray(cursos) ? JSON.stringify(cursos) : JSON.stringify([1]);
    
    const existing = await db('docentes')
      .whereRaw('LOWER(nome) = ?', [nome.trim().toLowerCase()])
      .first();

    if (existing) {
      const [updated] = await db('docentes')
        .where({ id: existing.id })
        .update({ categoria, cursos: cursosStr })
        .returning('*');
      return res.status(200).json(updated);
    }

    const [docente] = await db('docentes').insert({ nome: nome.trim(), categoria, cursos: cursosStr }).returning('*');
    res.status(201).json(docente);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, categoria, cursos } = req.body;
    const updateData = { nome, categoria };
    if (cursos) {
      updateData.cursos = Array.isArray(cursos) ? JSON.stringify(cursos) : cursos;
    }
    await db('docentes').where({ id }).update(updateData);
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

const removeAll = async (req, res, next) => {
  try {
    await db('docentes').del();
    res.json({ message: 'Todos os docentes foram removidos com sucesso' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove, removeAll };
