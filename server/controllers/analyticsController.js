const Task = require('../models/Task');
const Activity = require('../models/Activity');

// @route GET /api/projects/:id/analytics
// Owner/co-owner (gated by requirePermission('projectAnalytics') in routes).
const getProjectAnalytics = async (req, res, next) => {
  try {
    const projectId = req.project._id;
    const tasks = await Task.find({ project: projectId, parentTask: null }).populate('assignees', 'name email avatarColor');
    const now = new Date();

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const overdue = tasks.filter((t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < now).length;
    const blocked = tasks.filter((t) => (t.queries || []).some((q) => q.status === 'open')).length;
    const openQueries = tasks.reduce((sum, t) => sum + (t.queries || []).filter((q) => q.status === 'open').length, 0);

    // On-time completion: completed tasks that had a due date, finished
    // before/at that due date (using updatedAt as a proxy for completion time).
    const completedWithDueDate = tasks.filter((t) => t.status === 'completed' && t.dueDate);
    const onTime = completedWithDueDate.filter((t) => new Date(t.updatedAt) <= new Date(t.dueDate)).length;
    const onTimePercent = completedWithDueDate.length === 0 ? null : Math.round((onTime / completedWithDueDate.length) * 100);

    const reassignmentCount = await Activity.countDocuments({
      project: projectId,
      type: { $in: ['task-reassigned', 'reassignment-resolved'] },
    });

    // Per-member breakdown.
    const memberStats = {};
    for (const m of req.project.members) {
      memberStats[m.user.toString()] = {
        userId: m.user,
        role: m.role,
        assigned: 0,
        completed: 0,
        inProgress: 0,
        todo: 0,
        overdue: 0,
      };
    }
    for (const t of tasks) {
      for (const a of t.assignees) {
        const key = (a._id || a).toString();
        if (!memberStats[key]) continue; // e.g. removed member
        memberStats[key].assigned += 1;
        if (t.status === 'completed') memberStats[key].completed += 1;
        else if (t.status === 'in-progress') memberStats[key].inProgress += 1;
        else memberStats[key].todo += 1;
        if (t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < now) memberStats[key].overdue += 1;
      }
    }

    const populatedProject = await req.project.populate('members.user', 'name email avatarColor');
    const perMember = populatedProject.members.map((m) => {
      const s = memberStats[m.user._id.toString()];
      return {
        user: m.user,
        role: m.role,
        assigned: s.assigned,
        completed: s.completed,
        inProgress: s.inProgress,
        todo: s.todo,
        overdue: s.overdue,
        completionPercent: s.assigned === 0 ? 0 : Math.round((s.completed / s.assigned) * 100),
      };
    });

    res.json({
      overall: {
        total,
        completed,
        inProgress,
        todo,
        overdue,
        completionPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
        onTimeCompletionPercent: onTimePercent,
        reassignmentCount,
        openQueries,
        blockedTasks: blocked,
      },
      perMember,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProjectAnalytics };
