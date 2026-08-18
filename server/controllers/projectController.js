const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const notify = require('../utils/notify');
const logActivity = require('../utils/activity');
const { getIO } = require('../socket/socketManager');
const { ROLES, CONFIGURABLE_ACTIONS } = require('../utils/permissions');

// @route GET /api/projects
const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ 'members.user': req.user._id })
      .populate('owner', 'name email avatarColor')
      .populate('members.user', 'name email avatarColor')
      .sort({ updatedAt: -1 });
    res.json({ projects });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/projects
const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Project name is required' });

    const project = await Project.create({
      name,
      description,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
    });

    const populated = await project.populate('members.user', 'name email avatarColor');
    res.status(201).json({ project: populated });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/projects/:id
const getProject = async (req, res) => {
  const project = await req.project.populate('members.user', 'name email avatarColor');
  res.json({ project, role: req.membership.role });
};

// @route PUT /api/projects/:id
const updateProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (name) req.project.name = name;
    if (description !== undefined) req.project.description = description;
    await req.project.save();

    getIO()?.to(`project:${req.project._id}`).emit('project:updated', { project: req.project });

    res.json({ project: req.project });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/projects/:id
const deleteProject = async (req, res, next) => {
  try {
    await Task.deleteMany({ project: req.project._id });
    await req.project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/projects/:id/invite
const inviteMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (role && !ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });
    if (role === 'owner') return res.status(400).json({ message: 'A project can only have one owner' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No user found with that email. They need an account first.' });

    const alreadyMember = req.project.members.some((m) => m.user.toString() === user._id.toString());
    if (alreadyMember) return res.status(409).json({ message: 'This user is already a member of the project' });

    req.project.members.push({ user: user._id, role: role || 'member' });
    await req.project.save();

    await notify({
      userId: user._id,
      actorId: req.user._id,
      type: 'project-invite',
      message: `${req.user.name} added you to project "${req.project.name}"`,
      project: req.project._id,
    });

    const populated = await req.project.populate('members.user', 'name email avatarColor');

    getIO()?.to(`project:${req.project._id}`).emit('member:added', { project: populated });
    await logActivity({
      projectId: req.project._id,
      actorId: req.user._id,
      type: 'member-invited',
      message: `${req.user.name} added ${user.name} to the project`,
    });

    res.status(201).json({ project: populated });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/projects/:id/members/:userId
const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (userId === req.project.owner.toString()) {
      return res.status(400).json({ message: 'Cannot remove the project owner' });
    }
    const removedUser = await User.findById(userId).select('name');
    req.project.members = req.project.members.filter((m) => m.user.toString() !== userId);
    await req.project.save();
    const populated = await req.project.populate('members.user', 'name email avatarColor');

    getIO()?.to(`project:${req.project._id}`).emit('member:removed', { projectId: req.project._id, userId });
    await logActivity({
      projectId: req.project._id,
      actorId: req.user._id,
      type: 'member-removed',
      message: `${req.user.name} removed ${removedUser?.name || 'a member'} from the project`,
    });

    res.json({ project: populated });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/projects/:id/stats
const { visibilityFilter } = require('../utils/taskAccess');

const getProjectStats = async (req, res, next) => {
  try {
    const tasks = await Task.find({
      project: req.project._id,
      parentTask: null,
      ...visibilityFilter(req.user._id, req.membership.role),
    });
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const todo = tasks.filter((t) => t.status === 'todo').length;

    const now = new Date();
    const upcoming = tasks
      .filter((t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5)
      .map((t) => ({ _id: t._id, title: t.title, dueDate: t.dueDate, priority: t.priority }));

    const overdue = tasks.filter((t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < now).length;

    res.json({
      total,
      completed,
      inProgress,
      todo,
      overdue,
      progressPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
      upcoming,
    });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/projects/:id/members/:userId/role
// Feature #7 — changeRoles. Only owner (and co-owner, marked "maybe" in the
// spec) may change roles; enforced via requirePermission('changeRoles') in
// routes. The owner role itself can never be reassigned here — transferring
// ownership is a separate, more deliberate action this endpoint refuses.
const changeMemberRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });
    if (role === 'owner' || userId === req.project.owner.toString()) {
      return res.status(400).json({ message: "The project owner's role can't be changed here" });
    }

    const member = req.project.members.find((m) => m.user.toString() === userId);
    if (!member) return res.status(404).json({ message: 'Member not found in this project' });

    const previousRole = member.role;
    member.role = role;
    await req.project.save();

    const populated = await req.project.populate('members.user', 'name email avatarColor');
    getIO()?.to(`project:${req.project._id}`).emit('member:role-changed', { project: populated, userId, role });

    await logActivity({
      projectId: req.project._id,
      actorId: req.user._id,
      type: 'member-role-changed',
      message: `${req.user.name} changed a member's role from ${previousRole} to ${role}`,
    });

    res.json({ project: populated });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/projects/:id/permissions
// Feature #7 — lets owner/co-owner tune the 'configurable' actions
// (createTask, assignTask, changeTaskStatus) per role.
const updateRolePermissions = async (req, res, next) => {
  try {
    const { rolePermissions } = req.body; // { member: { createTask: false }, contributor: { assignTask: true } }
    if (!rolePermissions || typeof rolePermissions !== 'object') {
      return res.status(400).json({ message: 'rolePermissions object is required' });
    }
    for (const [role, overrides] of Object.entries(rolePermissions)) {
      if (!ROLES.includes(role)) continue;
      const clean = {};
      for (const action of CONFIGURABLE_ACTIONS) {
        if (typeof overrides[action] === 'boolean') clean[action] = overrides[action];
      }
      req.project.rolePermissions.set(role, clean);
    }
    await req.project.save();
    res.json({ project: req.project });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  inviteMember,
  removeMember,
  getProjectStats,
  changeMemberRole,
  updateRolePermissions,
};
