const userRepository = require('./users.repository');
const bcrypt = require('bcryptjs');
const { logAction } = require('../../shared/utils/auditLogger');

class UserService {
  async getAllUsers() {
    return userRepository.findAll();
  }

  async createUser(actor, { username, password, role, curso_id }) {
    if (!username) {
      throw { status: 400, message: 'O nome de utilizador é obrigatório.' };
    }
    if (!password) {
      throw { status: 400, message: 'A palavra-passe é obrigatória.' };
    }

    const existing = await userRepository.findByUsername(username);
    if (existing) {
      throw { status: 400, message: 'Este nome de utilizador já está em uso.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepository.create({
      username,
      password: hashedPassword,
      role,
      curso_id: role === 'ADMIN' ? null : parseInt(curso_id)
    });

    await logAction({
      userId: actor.id,
      username: actor.username,
      action: 'CREATE_USER',
      targetType: 'users',
      targetId: user?.id,
      details: `Criado utilizador "${username}" com função "${role}".`
    });

    return user;
  }

  async updateUser(actor, id, { username, role, curso_id, password }) {
    const oldUser = await userRepository.findById(id);
    if (!oldUser) {
      throw { status: 404, message: 'Utilizador não encontrado.' };
    }

    // Uniqueness validation if username is changing
    if (username && username !== oldUser.username) {
      const existing = await userRepository.findByUsername(username);
      if (existing) {
        throw { status: 400, message: 'Este nome de utilizador já está em uso.' };
      }
    }

    const data = {
      username: username || oldUser.username,
      role: role || oldUser.role,
      curso_id: role === 'ADMIN' ? null : (curso_id !== undefined ? parseInt(curso_id) : oldUser.curso_id)
    };

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    await userRepository.update(id, data);

    await logAction({
      userId: actor.id,
      username: actor.username,
      action: 'UPDATE_USER',
      targetType: 'users',
      targetId: id,
      details: `Atualizado utilizador "${oldUser.username}" -> "${data.username}" (Função: ${data.role}).`
    });

    return { message: 'Usuário atualizado com sucesso' };
  }

  async deleteUser(actor, id) {
    const oldUser = await userRepository.findById(id);
    if (!oldUser) {
      throw { status: 404, message: 'Utilizador não encontrado.' };
    }

    await userRepository.delete(id);

    await logAction({
      userId: actor.id,
      username: actor.username,
      action: 'DELETE_USER',
      targetType: 'users',
      targetId: id,
      details: `Removido utilizador "${oldUser.username}" (ID: ${id}, Função: ${oldUser.role}).`
    });

    return { message: 'Usuário removido com sucesso' };
  }

  async updateProfile(actor, { username, password }) {
    const userId = actor.id;
    if (!username) {
      throw { status: 400, message: 'O nome de utilizador é obrigatório.' };
    }

    const existing = await userRepository.findByUsername(username);
    if (existing && existing.id !== userId) {
      throw { status: 400, message: 'Este nome de utilizador já está em uso.' };
    }

    const data = { username };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    await userRepository.update(userId, data);

    await logAction({
      userId: actor.id,
      username: username,
      action: 'UPDATE_PROFILE',
      targetType: 'users',
      targetId: userId,
      details: `O utilizador "${actor.username}" atualizou o seu próprio perfil (Novo nome: ${username}).`
    });

    return { message: 'Perfil atualizado com sucesso', username };
  }
}

module.exports = new UserService();
