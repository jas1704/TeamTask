const Comment = require('../models/Comment');
const { loadTaskForUser } = require('./taskController');
const notify = require('../utils/notify');
const logActivity = require('../utils/activity');
const { getIO } = require('../socket/socketManager');

// @route GET /api/tasks/:taskId/comments
const getComments = async (req, res, next) => {
  try {
    req.params.id = req.params.taskId;
    const { task, error, status } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });

    const comments = await Comment.find({ task: task._id })
      .populate('author', 'name email avatarColor')
      .sort({ createdAt: 1 });
    res.json({ comments });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/tasks/:taskId/comments
const createComment = async (req, res, next) => {
  try {
    req.params.id = req.params.taskId;
    const { task, error, status } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text is required' });

    const comment = await Comment.create({ task: task._id, author: req.user._id, text: text.trim() });
    const populated = await comment.populate('author', 'name email avatarColor');

    // Live comments: every open tab viewing this task (via the project room —
    // see the client-side dedupe-by-id note in CommentSection) sees it appear
    // immediately, including the sender's own other tabs.
    getIO()?.to(`project:${task.project._id}`).emit('comment:created', {
      taskId: task._id,
      comment: populated,
    });

    await logActivity({
      projectId: task.project._id,
      actorId: req.user._id,
      type: 'comment-added',
      message: `${req.user.name} commented on "${task.title}"`,
      taskId: task._id,
    });

    const notifyTargets = new Set();
    for (const a of task.assignees || []) notifyTargets.add((a._id || a).toString());
    notifyTargets.add((task.createdBy._id || task.createdBy).toString());
    notifyTargets.delete(req.user._id.toString());

    for (const userId of notifyTargets) {
      await notify({
        userId,
        actorId: req.user._id,
        type: 'new-comment',
        message: `${req.user.name} commented on "${task.title}"`,
        project: task.project._id,
        task: task._id,
      });
    }

    res.status(201).json({ comment: populated });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/comments/:id
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id).populate({
      path: 'task',
      select: 'project',
    });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    const taskId = comment.task._id;
    const projectId = comment.task.project;
    await comment.deleteOne();

    getIO()?.to(`project:${projectId}`).emit('comment:deleted', { taskId, commentId: req.params.id });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getComments, createComment, deleteComment };
