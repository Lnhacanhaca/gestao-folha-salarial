const userService = require('./users.service');

const getAll = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.user, req.body);
    res.status(201).json(user);
  } catch (error) {
    // Custom error translation for database constraints
    if (error.code === 'SQLITE_CONSTRAINT' || (error.message && error.message.includes('UNIQUE'))) {
      return res.status(400).json({ error: { message: 'Este nome de utilizador já está em uso.' } });
    }
    // Handle standard service errors
    if (error.status) {
      return res.status(error.status).json({ error: { message: error.message } });
    }
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await userService.updateUser(req.user, id, req.body);
    res.json(result);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT' || (error.message && error.message.includes('UNIQUE'))) {
      return res.status(400).json({ error: { message: 'Este nome de utilizador já está em uso.' } });
    }
    if (error.status) {
      return res.status(error.status).json({ error: { message: error.message } });
    }
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await userService.deleteUser(req.user, id);
    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: { message: error.message } });
    }
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const result = await userService.updateProfile(req.user, req.body);
    res.json(result);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT' || (error.message && error.message.includes('UNIQUE'))) {
      return res.status(400).json({ error: { message: 'Este nome de utilizador já está em uso.' } });
    }
    if (error.status) {
      return res.status(error.status).json({ error: { message: error.message } });
    }
    next(error);
  }
};

module.exports = { getAll, create, update, remove, updateProfile };

