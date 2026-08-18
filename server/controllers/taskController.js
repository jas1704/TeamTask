const Task = require('../models/Task');
const Comment = require('../models/Comment');
const notify = require('../utils/notify');
const logActivity = require('../utils/activity');
const { getIO } = require('../socket/socketManager');
const { can, canChangeTaskStatus } = require('../utils/permissions');
const { canViewTask, visibilityFilter } = require('../utils/taskAccess');

const STATUS_LABELS = { todo: 'To do', 'in-progress': 'In progress', completed: 'Completed' };

const POPULATE = [
  { path: 'assignees', select: 'name email avatarColor' },
  { path: 'createdBy', select: 'name email avatarColor' },
  { path: 'visibility.users', select: 'name email avatarColor' },
  { path: 'links.addedBy', select: 'name email avatarColor' },
  { path: 'attachments.uploadedBy', select: 'name email avatarColor' },
  { path: 'queries.raisedBy', select: 'name email avatarColor' },
  { path: 'queries.replies.author', select: 'name email avatarColor' },
  { path: 'queries.resolvedBy', select: 'name email avatarColor' },
  { path: 'reassignment.requestedBy', select: 'name email avatarColor' },
  { path: 'reassignment.fromUser', select: 'name email avatarColor' },
  { path: 'reassignment.suggestedUser', select: 'name email avatarColor' },
];

// Attaches `subtaskSummary: { total, completed }` to a task object for the
// "2 / 4 subtasks completed" UI. Cheap enough to do per-request; a project's
// task list is small.
const attachSubtaskSummary = async (tasks) => {
  const list = Array.isArray(tasks) ? tasks : [tasks];
  const parentIds = list.map((t) => t._id);
  if (!parentIds.length) return tasks;
  const subtasks = await Task.find({ parentTask: { $in: parentIds } }).select('parentTask status');
  const byParent = {};
  for (const st of subtasks) {
    const key = st.parentTask.toString();
    byParent[key] = byParent[key] || { total: 0, completed: 0 };
    byParent[key].total += 1;
    if (st.status === 'completed') byParent[key].completed += 1;
  }
  for (const t of list) {
    const summary = byParent[t._id.toString()] || { total: 0, completed: 0 };
    if (t._doc) t._doc.subtaskSummary = summary;
    else t.subtaskSummary = summary;
  }
  return tasks;
};

// @route GET /api/projects/:projectId/tasks
// Query params: status, priority, assignedTo, q, mine=true, parentTask=<id|null>
const getTasks = async (req, res, next) => {
  try {
    const { status, priority, assignedTo, q, mine, parentTask } = req.query;
    const filter = { project: req.project._id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignees = assignedTo;
    if (mine === 'true') filter.assignees = req.user._id;
    if (q) filter.$text = { $search: q };

    // Default: top-level tasks only (exclude subtasks) unless a
    // parentTask filter is explicitly requested.
    if (parentTask !== undefined) {
      filter.parentTask = parentTask === 'null' || parentTask === '' ? null : parentTask;
    } else {
      filter.parentTask = null;
    }

    Object.assign(filter, visibilityFilter(req.user._id, req.membership.role));

    let tasks = await Task.find(filter).populate(POPULATE).sort({ createdAt: -1 });
    tasks = await attachSubtaskSummary(tasks);

    const myTasksCount = await Task.countDocuments({
      project: req.project._id,
      assignees: req.user._id,
      parentTask: filter.parentTask,
    });

    res.json({ tasks, myTasksCount });
  } catch (err) {
    next(err);
  }
};

const validateAssignees = (assignees, project) => {
  if (!assignees || !assignees.length) return null;
  const memberIds = new Set(project.members.map((m) => m.user.toString()));
  const invalid = assignees.find((id) => !memberIds.has(id.toString()));
  return invalid ? 'All assignees must be project members' : null;
};

// @route POST /api/projects/:projectId/tasks
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, assignees, visibility, parentTask, links } = req.body;
    if (!title) return res.status(400).json({ message: 'Task title is required' });

    const role = req.membership.role;
    if (!can(role, 'createTask', req.project)) {
      return res.status(403).json({ message: 'Your role cannot create tasks in this project' });
    }

    const assigneeList = Array.isArray(assignees) ? assignees : assignees ? [assignees] : [];
    if (assigneeList.length && !can(role, 'assignTask', req.project) && role !== 'owner' && role !== 'co-owner') {
      // Members/contributors without assign rights may still create a task
      // assigned only to themselves.
      const onlySelf = assigneeList.length === 1 && assigneeList[0] === req.user._id.toString();
      if (!onlySelf) return res.status(403).json({ message: 'Your role cannot assign tasks to others' });
    }
    const assigneeError = validateAssignees(assigneeList, req.project);
    if (assigneeError) return res.status(400).json({ message: assigneeError });

    let parent = null;
    if (parentTask) {
      parent = await Task.findOne({ _id: parentTask, project: req.project._id });
      if (!parent) return res.status(404).json({ message: 'Parent task not found in this project' });
      // Subtasks intentionally do NOT need to share the parent's assignees.
    }

    const task = await Task.create({
      project: req.project._id,
      title,
      description,
      status,
      priority,
      dueDate,
      assignees: assigneeList,
      createdBy: req.user._id,
      parentTask: parent ? parent._id : null,
      visibility: visibility || { type: 'project', users: [] },
      links: Array.isArray(links)
        ? links.filter((l) => l?.title && l?.url).map((l) => ({ title: l.title, url: l.url, addedBy: req.user._id }))
        : [],
    });

    for (const userId of assigneeList) {
      await notify({
        userId,
        actorId: req.user._id,
        type: 'task-assigned',
        message: `${req.user.name} assigned you to "${task.title}"`,
        project: req.project._id,
        task: task._id,
      });
    }

    const populated = await task.populate(POPULATE);

    getIO()?.to(`project:${req.project._id}`).emit(parent ? 'subtask:created' : 'task:created', {
      task: populated,
      parentTaskId: parent ? parent._id : undefined,
    });
    await logActivity({
      projectId: req.project._id,
      actorId: req.user._id,
      type: parent ? 'subtask-created' : 'task-created',
      message: parent
        ? `${req.user.name} added subtask "${task.title}" under "${parent.title}"`
        : `${req.user.name} created "${task.title}"`,
      taskId: task._id,
    });

    res.status(201).json({ task: populated });
  } catch (err) {
    next(err);
  }
};

// Helper: load task, verify project membership AND visibility. Returns
// { task, role, isAssignee } or { error, status }.
const loadTaskForUser = async (req) => {
  const idParam = req.params.id || req.params.taskId;
  const task = await Task.findById(idParam).populate('project').populate(POPULATE);
  if (!task) return { error: 'Task not found', status: 404 };

  const membership = task.project.members.find((m) => m.user.toString() === req.user._id.toString());
  if (!membership) return { error: 'Not authorized to access this task', status: 403 };

  if (!canViewTask(task, req.user._id, membership.role)) {
    return { error: 'You do not have access to this task', status: 403 };
  }

  const isAssignee = task.assignees.some((a) => (a._id || a).toString() === req.user._id.toString());
  return { task, role: membership.role, isAssignee };
};

// @route GET /api/tasks/:id
const getTask = async (req, res, next) => {
  try {
    const { task, error, status } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });
    const [withSummary] = await attachSubtaskSummary([task]);
    const subtasks = await Task.find({ parentTask: task._id }).populate(POPULATE).sort({ createdAt: 1 });
    res.json({ task: withSummary, subtasks: await attachSubtaskSummary(subtasks) });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const { task, error, status, role, isAssignee } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });

    const { title, description, status: newStatus, priority, dueDate, assignees, visibility } = req.body;
    const wasCompleted = task.status === 'completed';
    const prevAssignees = task.assignees.map((a) => (a._id || a).toString());
    const prevStatus = task.status;
    const statusChanged = newStatus !== undefined && newStatus !== prevStatus;

    if (statusChanged && !canChangeTaskStatus(role, task.project, { isAssignee })) {
      return res.status(403).json({ message: 'You do not have permission to change this task\'s status' });
    }

    const assigneesChanging = assignees !== undefined;
    if (assigneesChanging) {
      const isOwnerish = ['owner', 'co-owner', 'product-owner'].includes(role);
      if (!isOwnerish && !can(role, 'assignTask', task.project)) {
        return res.status(403).json({ message: 'Your role cannot reassign this task. Use "Request Reassignment" instead.' });
      }
      const assigneeError = validateAssignees(assignees, task.project);
      if (assigneeError) return res.status(400).json({ message: assigneeError });
    }

    const otherFieldsChanged =
      (title !== undefined && title !== task.title) ||
      (description !== undefined && description !== task.description) ||
      (priority !== undefined && priority !== task.priority) ||
      (dueDate !== undefined && String(dueDate) !== String(task.dueDate));

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (newStatus !== undefined) task.status = newStatus;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assigneesChanging) task.assignees = assignees;
    if (visibility !== undefined) task.visibility = visibility;

    await task.save();

    if (statusChanged) {
      await logActivity({
        projectId: task.project._id,
        actorId: req.user._id,
        type: 'task-status-changed',
        message: `${req.user.name} moved "${task.title}" to ${STATUS_LABELS[newStatus]}`,
        taskId: task._id,
      });
    } else if (otherFieldsChanged) {
      await logActivity({
        projectId: task.project._id,
        actorId: req.user._id,
        type: 'task-updated',
        message: `${req.user.name} updated "${task.title}"`,
        taskId: task._id,
      });
    }

    if (newStatus === 'completed' && !wasCompleted) {
      await notify({
        userId: task.createdBy._id || task.createdBy,
        actorId: req.user._id,
        type: 'task-completed',
        message: `${req.user.name} marked "${task.title}" as completed`,
        project: task.project._id,
        task: task._id,
      });
    }

    if (assigneesChanging) {
      const newAssignees = task.assignees.map((a) => (a._id || a).toString());
      const added = newAssignees.filter((id) => !prevAssignees.includes(id));
      for (const userId of added) {
        await notify({
          userId,
          actorId: req.user._id,
          type: 'task-assigned',
          message: `${req.user.name} assigned you to "${task.title}"`,
          project: task.project._id,
          task: task._id,
        });
      }
    }

    await task.populate(POPULATE);
    const [withSummary] = await attachSubtaskSummary([task]);

    getIO()?.to(`project:${task.project._id}`).emit('task:updated', { task: withSummary });

    res.json({ task: withSummary });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const { task, error, status, role } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });
    if (!can(role, 'deleteTask', task.project)) {
      return res.status(403).json({ message: 'Your role cannot delete tasks' });
    }
    const projectId = task.project._id;
    const taskId = task._id;
    const title = task.title;

    // Cascade delete subtasks and their comments too.
    const subtasks = await Task.find({ parentTask: taskId }).select('_id');
    const subtaskIds = subtasks.map((s) => s._id);
    await Comment.deleteMany({ task: { $in: [taskId, ...subtaskIds] } });
    await Task.deleteMany({ _id: { $in: subtaskIds } });
    await task.deleteOne();

    getIO()?.to(`project:${projectId}`).emit('task:deleted', { taskId, projectId, subtaskIds });
    await logActivity({
      projectId,
      actorId: req.user._id,
      type: 'task-deleted',
      message: `${req.user.name} deleted "${title}"`,
    });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTasks, createTask, getTask, updateTask, deleteTask, loadTaskForUser, POPULATE, attachSubtaskSummary };
