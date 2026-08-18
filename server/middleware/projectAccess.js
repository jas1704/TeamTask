const Project = require('../models/Project');

// Loads project by :projectId (or :id) and verifies the current user is a member.
// Attaches req.project and req.membership.
const requireProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const membership = project.members.find((m) => m.user.toString() === req.user._id.toString());
    if (!membership) return res.status(403).json({ message: 'You are not a member of this project' });

    req.project = project;
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

// Strictly the project owner (not co-owner) — used for irreversible actions
// like deleting the project outright.
const requireProjectOwner = (req, res, next) => {
  if (!req.membership || req.membership.role !== 'owner') {
    return res.status(403).json({ message: 'Only the project owner can perform this action' });
  }
  next();
};

// Owner or co-owner — the two roles with full management authority.
const requireOwnerOrCoOwner = (req, res, next) => {
  if (!req.membership || !['owner', 'co-owner'].includes(req.membership.role)) {
    return res.status(403).json({ message: 'Only the owner or co-owner can perform this action' });
  }
  next();
};

module.exports = { requireProjectMember, requireProjectOwner, requireOwnerOrCoOwner };
