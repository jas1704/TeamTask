const Activity = require('../models/Activity');

// @route GET /api/projects/:id/activity
const getActivity = async (req, res, next) => {
  try {
    const activities = await Activity.find({ project: req.project._id })
      .populate('actor', 'name avatarColor')
      .populate('task', 'title')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ activities });
  } catch (err) {
    next(err);
  }
};

module.exports = { getActivity };
