const { loadTaskForUser, POPULATE } = require('./taskController');
const notify = require('../utils/notify');
const logActivity = require('../utils/activity');
const { getIO } = require('../socket/socketManager');
const { can } = require('../utils/permissions');

const broadcast = async (task) => {
  await task.populate(POPULATE);
  getIO()?.to(`project:${task.project._id}`).emit('task:updated', { task });
};

// @route POST /api/tasks/:taskId/reassignment/request
// A current assignee asks to be reassigned, optionally suggesting who
// should take over. Goes to owner/co-owner/product-owner for approval.
const requestReassignment = async (req, res, next) => {
  try {
    const { task, error, status, isAssignee } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });
    if (!isAssignee) return res.status(403).json({ message: 'Only a current assignee can request reassignment' });
    if (task.reassignment?.status === 'pending') {
      return res.status(409).json({ message: 'A reassignment request is already pending for this task' });
    }

    const { suggestedUserId, reason } = req.body;
    if (suggestedUserId) {
      const isMember = task.project.members.some((m) => m.user.toString() === suggestedUserId);
      if (!isMember) return res.status(400).json({ message: 'Suggested user must be a project member' });
    }

    task.reassignment = {
      status: 'pending',
      requestedBy: req.user._id,
      fromUser: req.user._id,
      suggestedUser: suggestedUserId || null,
      reason: reason || '',
      requestedAt: new Date(),
    };
    await task.save();
    await broadcast(task);

    await logActivity({
      projectId: task.project._id,
      actorId: req.user._id,
      type: 'reassignment-requested',
      message: `${req.user.name} requested reassignment of "${task.title}"`,
      taskId: task._id,
    });

    const approvers = task.project.members.filter((m) => can(m.role, 'approveReassignment', task.project));
    for (const m of approvers) {
      await notify({
        userId: m.user,
        actorId: req.user._id,
        type: 'reassignment-requested',
        message: `${req.user.name} requested reassignment of "${task.title}"`,
        project: task.project._id,
        task: task._id,
      });
    }

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/tasks/:taskId/reassignment/resolve
// body: { action: 'approve' | 'reject', newAssigneeId? }
const resolveReassignment = async (req, res, next) => {
  try {
    const { task, error, status, role } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });
    if (!can(role, 'approveReassignment', task.project)) {
      return res.status(403).json({ message: 'You are not authorized to resolve reassignment requests' });
    }
    if (task.reassignment?.status !== 'pending') {
      return res.status(400).json({ message: 'There is no pending reassignment request on this task' });
    }

    const { action, newAssigneeId } = req.body;
    const fromUser = task.reassignment.fromUser;

    if (action === 'reject') {
      task.reassignment.status = 'rejected';
      task.reassignment.resolvedBy = req.user._id;
      task.reassignment.resolvedAt = new Date();
      await task.save();
      await broadcast(task);

      await notify({
        userId: fromUser,
        actorId: req.user._id,
        type: 'reassignment-resolved',
        message: `${req.user.name} declined your reassignment request for "${task.title}"`,
        project: task.project._id,
        task: task._id,
      });
      return res.json({ task });
    }

    if (action === 'approve') {
      const targetUser = newAssigneeId || task.reassignment.suggestedUser;
      if (!targetUser) return res.status(400).json({ message: 'newAssigneeId is required to approve' });
      const isMember = task.project.members.some((m) => m.user.toString() === targetUser.toString());
      if (!isMember) return res.status(400).json({ message: 'New assignee must be a project member' });

      task.assignees = task.assignees
        .map((a) => (a._id || a).toString())
        .filter((id) => id !== fromUser.toString())
        .concat([targetUser.toString()]);
      task.reassignment.status = 'approved';
      task.reassignment.resolvedBy = req.user._id;
      task.reassignment.resolvedAt = new Date();
      await task.save();
      await broadcast(task);

      await logActivity({
        projectId: task.project._id,
        actorId: req.user._id,
        type: 'reassignment-resolved',
        message: `${req.user.name} reassigned "${task.title}"`,
        taskId: task._id,
      });

      for (const userId of new Set([fromUser.toString(), targetUser.toString()])) {
        await notify({
          userId,
          actorId: req.user._id,
          type: 'task-reassigned',
          message: `${req.user.name} reassigned "${task.title}"`,
          project: task.project._id,
          task: task._id,
        });
      }
      return res.json({ task });
    }

    return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/tasks/:taskId/reassign
// Direct reassignment by an authorized user, no request/approval cycle.
const directReassign = async (req, res, next) => {
  try {
    const { task, error, status, role } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });
    if (!can(role, 'directReassign', task.project)) {
      return res.status(403).json({ message: 'You are not authorized to directly reassign tasks' });
    }

    const { fromUserId, toUserId } = req.body;
    if (!toUserId) return res.status(400).json({ message: 'toUserId is required' });
    const isMember = task.project.members.some((m) => m.user.toString() === toUserId);
    if (!isMember) return res.status(400).json({ message: 'New assignee must be a project member' });

    const before = task.assignees.map((a) => (a._id || a).toString());
    let after;
    if (fromUserId) {
      after = before.filter((id) => id !== fromUserId).concat([toUserId]);
    } else {
      after = [...new Set([...before, toUserId])];
    }
    task.assignees = [...new Set(after)];
    task.reassignment = { status: 'none' };
    await task.save();
    await broadcast(task);

    const fromName = fromUserId
      ? task.project.members.find((m) => m.user.toString() === fromUserId)
      : null;

    await logActivity({
      projectId: task.project._id,
      actorId: req.user._id,
      type: 'task-reassigned',
      message: fromUserId
        ? `${req.user.name} reassigned "${task.title}"`
        : `${req.user.name} assigned "${task.title}" to a new member`,
      taskId: task._id,
    });

    const targets = new Set([toUserId]);
    if (fromUserId) targets.add(fromUserId);
    for (const userId of targets) {
      await notify({
        userId,
        actorId: req.user._id,
        type: 'task-reassigned',
        message: `${req.user.name} reassigned "${task.title}"`,
        project: task.project._id,
        task: task._id,
      });
    }

    res.json({ task });
  } catch (err) {
    next(err);
  }
};

module.exports = { requestReassignment, resolveReassignment, directReassign };
