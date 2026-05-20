const db = require('../../config/database');

class UserRepository {
  async findAll() {
    return db('users').select('id', 'username', 'role', 'curso_id', 'created_at');
  }

  async findById(id) {
    return db('users').where({ id }).first();
  }

  async findByUsername(username) {
    return db('users').where({ username }).first();
  }

  async create(userData) {
    // In PostgreSQL, .returning('*') or .returning('id') works flawlessly and returns an array.
    // In SQLite, it might not support full returning syntax or return an array depending on version.
    // We make this compatible with both SQLite (local) and PostgreSQL (VPS/production).
    const isPostgres = db.client.config.client === 'pg';
    
    if (isPostgres) {
      const [inserted] = await db('users').insert(userData).returning('*');
      return inserted;
    } else {
      const [id] = await db('users').insert(userData);
      return this.findById(id || null);
    }
  }

  async update(id, userData) {
    return db('users').where({ id }).update(userData);
  }

  async delete(id) {
    return db('users').where({ id }).del();
  }
}

module.exports = new UserRepository();
