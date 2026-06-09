const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../../config/database');

class AuthService {
  async login(username, password) {
    const user = await db('users').where({ username }).first();
    
    if (!user) {
      throw { status: 401, message: 'Credenciais inválidas' };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw { status: 401, message: 'Credenciais inválidas' };
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, curso_id: user.curso_id },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '8h' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        curso_id: user.curso_id,
        first_login: !!user.first_login
      }
    };
  }
}

module.exports = new AuthService();
