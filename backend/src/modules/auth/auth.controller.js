const authService = require('./auth.service');
const { logAction } = require('../../shared/utils/auditLogger');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    
    await logAction({
      userId: result.user.id,
      username: result.user.username,
      action: 'LOGIN',
      targetType: 'users',
      targetId: result.user.id,
      details: `Utilizador "${result.user.username}" autenticou-se com sucesso.`
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { login };
