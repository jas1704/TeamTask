const Task = require('../models/Task');

// @route GET /api/projects/:id/search?q=
const searchInProject = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ tasks: [], members: [] });

    const { visibilityFilter } = require('../utils/taskAccess');
    const tasks = await Task.find({
      project: req.project._id,
      $text: { $search: q },
      ...visibilityFilter(req.user._id, req.membership.role),
    })
      .populate('assignees', 'name email avatarColor')
      .limit(20);

    const lowerQ = q.toLowerCase();
    const populatedProject = await req.project.populate('members.user', 'name email avatarColor');
    const members = populatedProject.members
      .map((m) => m.user)
      .filter((u) => u.name.toLowerCase().includes(lowerQ) || u.email.toLowerCase().includes(lowerQ));

    res.json({ tasks, members });
  } catch (err) {
    next(err);
  }
};

module.exports = { searchInProject };
