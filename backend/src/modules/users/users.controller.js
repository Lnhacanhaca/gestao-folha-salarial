const db = require('../../config/database');
const bcrypt = require('bcryptjs');
const { logAction } = require('../../shared/utils/auditLogger');

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
    
    const [inserted] = await db('users').insert({
      username,
      password: hashedPassword,
      role,
      curso_id
    });
    
    // Fetch newly created user because sqlite returning behavior varies
    const user = await db('users').where({ id: inserted || null }).orWhere({ username }).first();

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'CREATE_USER',
      targetType: 'users',
      targetId: user?.id,
      details: `Criado utilizador "${username}" com função "${role}".`
    });
    
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, role, curso_id, password } = req.body;
    
    const oldUser = await db('users').where({ id }).first();
    const data = { username, role, curso_id };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    await db('users').where({ id }).update(data);

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'UPDATE_USER',
      targetType: 'users',
      targetId: id,
      details: `Atualizado utilizador "${oldUser?.username}" -> "${username}" (Função: ${role}).`
    });

    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldUser = await db('users').where({ id }).first();
    
    await db('users').where({ id }).del();

    await logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'DELETE_USER',
      targetType: 'users',
      targetId: id,
      details: `Removido utilizador "${oldUser?.username}" (ID: ${id}, Função: ${oldUser?.role}).`
    });

    res.json({ message: 'Usuário removido com sucesso' });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { username, password } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: { message: "O nome de utilizador é obrigatório" }});
    }

    const data = { username };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    await db('users').where({ id: userId }).update(data);

    await logAction({
      userId: req.user.id,
      username: username,
      action: 'UPDATE_PROFILE',
      targetType: 'users',
      targetId: userId,
      details: `O utilizador "${req.user.username}" atualizou o seu próprio perfil (Novo nome: ${username}).`
    });

    res.json({ message: 'Perfil atualizado com sucesso', username });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE')) {
       return res.status(400).json({ error: { message: 'Este nome de utilizador já está em uso.' } });
    }
    next(error);
  }
};

module.exports = { getAll, create, update, remove, updateProfile };
