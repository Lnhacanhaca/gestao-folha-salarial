const db = require('../../config/database');
const bcrypt = require('bcryptjs');

const getAll = async (req, res, next) => {
  try {
    const users = await db('users').select('id', 'username', 'role', 'curso_id', 'created_at');
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { username, password, role, curso_id } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [user] = await db('users').insert({
      username,
      password: hashedPassword,
      role,
      curso_id
    }).returning(['id', 'username', 'role', 'curso_id']);
    
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, role, curso_id, password } = req.body;
    
    const data = { username, role, curso_id };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    await db('users').where({ id }).update(data);
    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db('users').where({ id }).del();
    res.json({ message: 'Usuário removido com sucesso' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
