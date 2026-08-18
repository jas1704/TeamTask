const { loadTaskForUser } = require('./taskController');
const notify = require('../utils/notify');
const logActivity = require('../utils/activity');
const { getIO } = require('../socket/socketManager');

const broadcastTask = async (task) => {
  await task.populate(require('./taskController').POPULATE);
  getIO()?.to(`project:${task.project._id}`).emit('task:updated', { task });
};

// @route POST /api/tasks/:taskId/queries
const createQuery = async (req, res, next) => {
  try {
    const { task, error, status } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });

    const { question } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ message: 'Question text is required' });

    task.queries.push({ question: question.trim(), raisedBy: req.user._id, replies: [], status: 'open' });
    await task.save();
    await broadcastTask(task);

    await logActivity({
      projectId: task.project._id,
      actorId: req.user._id,
      type: 'query-raised',
      message: `${req.user.name} raised a query on "${task.title}"`,
      taskId: task._id,
    });

    const notifyTargets = new Set([
      (task.createdBy._id || task.createdBy).toString(),
      ...task.assignees.map((a) => (a._id || a).toString()),
    ]);
    notifyTargets.delete(req.user._id.toString());
    for (const userId of notifyTargets) {
      await notify({
        userId,
        actorId: req.user._id,
        type: 'query-raised',
        message: `${req.user.name} raised a query on "${task.title}"`,
        project: task.project._id,
        task: task._id,
      });
    }

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/tasks/:taskId/queries/:queryId/replies
const replyToQuery = async (req, res, next) => {
  try {
    const { task, error, status } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });

    const query = task.queries.id(req.params.queryId);
    if (!query) return res.status(404).json({ message: 'Query not found' });

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Reply text is required' });

    query.replies.push({ text: text.trim(), author: req.user._id });
    await task.save();
    await broadcastTask(task);

    const notifyTargets = new Set([query.raisedBy.toString()]);
    notifyTargets.delete(req.user._id.toString());
    for (const userId of notifyTargets) {
      await notify({
        userId,
        actorId: req.user._id,
        type: 'query-raised',
        message: `${req.user.name} replied to your query on "${task.title}"`,
        project: task.project._id,
        task: task._id,
      });
    }

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/tasks/:taskId/queries/:queryId/resolve
const resolveQuery = async (req, res, next) => {
  try {
    const { task, error, status } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });

    const query = task.queries.id(req.params.queryId);
    if (!query) return res.status(404).json({ message: 'Query not found' });
    if (query.status === 'resolved') return res.status(400).json({ message: 'Query is already resolved' });

    query.status = 'resolved';
    query.resolvedBy = req.user._id;
    query.resolvedAt = new Date();
    await task.save();
    await broadcastTask(task);

    await logActivity({
      projectId: task.project._id,
      actorId: req.user._id,
      type: 'query-resolved',
      message: `${req.user.name} resolved a query on "${task.title}"`,
      taskId: task._id,
    });

    await notify({
      userId: query.raisedBy,
      actorId: req.user._id,
      type: 'query-resolved',
      message: `${req.user.name} resolved your query on "${task.title}"`,
      project: task.project._id,
      task: task._id,
    });

    res.json({ task });
  } catch (err) {
    next(err);
  }
};

module.exports = { createQuery, replyToQuery, resolveQuery };
