const db = require('../../config/database');
const { logAction } = require('../../shared/utils/auditLogger');

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
      await db('docentes')
        .where({ id: existing.id })
        .update({ categoria, cursos: cursosStr });
      
      const updated = await db('docentes').where({ id: existing.id }).first();
      
      await logAction({
        userId: req.user.id,
        username: req.user.username,
        action: 'UPDATE_DOCENTE_IMPORT',
        targetType: 'docentes',
        targetId: existing.id,
        details: `Docente "${nome}" atualizado via importação de CSV.`
      });

      return res.status(200).json(updated);
    }

    const [insertedId] = await db('docentes').insert({ nome: nome.trim(), categoria, cursos: cursosStr });
    const docente = await db('docentes').where({ id: insertedId || null }).orWhere({ nome: nome.trim() }).first();

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'CREATE_DOCENTE',
      targetType: 'docentes',
      targetId: docente?.id,
      details: `Cadastrado novo docente "${nome}" (Categoria: ${categoria}).`
    });

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
    
    const oldDocente = await db('docentes').where({ id }).first();
    await db('docentes').where({ id }).update(updateData);

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'UPDATE_DOCENTE',
      targetType: 'docentes',
      targetId: id,
      details: `Atualizado docente "${oldDocente?.nome}" -> "${nome}" (Categoria: ${categoria}).`
    });

    res.json({ message: 'Docente atualizado com sucesso' });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldDocente = await db('docentes').where({ id }).first();
    
    await db('docentes').where({ id }).del();

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'DELETE_DOCENTE',
      targetType: 'docentes',
      targetId: id,
      details: `Removido docente "${oldDocente?.nome}" (ID: ${id}).`
    });

    res.json({ message: 'Docente removido com sucesso' });
  } catch (error) {
    next(error);
  }
};

const removeAll = async (req, res, next) => {
  try {
    await db('docentes').del();

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'CLEAR_DOCENTES',
      targetType: 'docentes',
      targetId: null,
      details: 'Eliminados TODOS os docentes do sistema.'
    });

    res.json({ message: 'Todos os docentes foram removidos com sucesso' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove, removeAll };
