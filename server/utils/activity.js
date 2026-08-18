const Activity = require('../models/Activity');
const { getIO } = require('../socket/socketManager');

/**
 * Persists one activity-feed entry for a project and broadcasts it live to
 * everyone currently in that project's room. This is the single choke point
 * both the REST controllers and the socket layer rely on, so the feed a user
 * sees on page load (fetched from Mongo) and the feed they see update live
 * (pushed over the socket) are always built from the same records.
 */
const logActivity = async ({ projectId, actorId, type, message, taskId }) => {
  try {
    const activity = await Activity.create({ project: projectId, actor: actorId, type, message, task: taskId });
    const populated = await activity.populate('actor', 'name avatarColor');

    const io = getIO();
    if (io) io.to(`project:${projectId}`).emit('activity:new', { activity: populated });

    return populated;
  } catch (err) {
    console.error('Failed to log activity:', err.message);
    return null;
  }
};

module.exports = logActivity;
