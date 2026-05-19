const db = require('../../config/database');

/**
 * Log an action to the database.
 * 
 * @param {Object} params
 * @param {number|null} params.userId - The ID of the user performing the action.
 * @param {string} params.username - The name of the user performing the action.
 * @param {string} params.action - The type of action (e.g. 'LOGIN', 'CREATE_USER', 'UPDATE_FOLHA', etc.)
 * @param {string} params.targetType - The entity type ('users', 'docentes', 'folhas')
 * @param {string|number} params.targetId - The specific target ID
 * @param {Object|string} [params.details] - Any extra description or JSON payload changes
 */
const logAction = async ({ userId, username, action, targetType, targetId, details }) => {
  try {
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;
    await db('audit_logs').insert({
      user_id: userId || null,
      username: username || 'SISTEMA',
      action,
      target_type: targetType,
      target_id: targetId ? String(targetId) : null,
      details: detailsStr || null
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

module.exports = { logAction };
