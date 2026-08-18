const { loadTaskForUser, POPULATE } = require('./taskController');
const logActivity = require('../utils/activity');
const { getIO } = require('../socket/socketManager');

const broadcast = async (task) => {
  await task.populate(POPULATE);
  getIO()?.to(`project:${task.project._id}`).emit('task:updated', { task });
};

const isValidUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

// @route POST /api/tasks/:taskId/links
const addLink = async (req, res, next) => {
  try {
    const { task, error, status } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });

    const { title, url } = req.body;
    if (!title || !url) return res.status(400).json({ message: 'Link title and URL are required' });
    if (!isValidUrl(url)) return res.status(400).json({ message: 'Please provide a valid URL (including https://)' });

    task.links.push({ title: title.trim(), url: url.trim(), addedBy: req.user._id });
    await task.save();
    await broadcast(task);

    await logActivity({
      projectId: task.project._id,
      actorId: req.user._id,
      type: 'link-added',
      message: `${req.user.name} added a link to "${task.title}"`,
      taskId: task._id,
    });

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/tasks/:taskId/links/:linkId
const deleteLink = async (req, res, next) => {
  try {
    const { task, error, status } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });

    const link = task.links.id(req.params.linkId);
    if (!link) return res.status(404).json({ message: 'Link not found' });

    const isAdder = link.addedBy.toString() === req.user._id.toString();
    const isCreator = (task.createdBy._id || task.createdBy).toString() === req.user._id.toString();
    if (!isAdder && !isCreator) {
      return res.status(403).json({ message: 'Only the person who added this link or the task creator can remove it' });
    }

    link.deleteOne();
    await task.save();
    await broadcast(task);

    await logActivity({
      projectId: task.project._id,
      actorId: req.user._id,
      type: 'link-removed',
      message: `${req.user.name} removed a link from "${task.title}"`,
      taskId: task._id,
    });

    res.json({ task });
  } catch (err) {
    next(err);
  }
};

module.exports = { addLink, deleteLink };
