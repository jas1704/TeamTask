const { can } = require('../utils/permissions');

/**
 * Generic project-level permission gate. Must run after requireProjectMember
 * (it needs req.project and req.membership).
 *
 *   router.post('/:id/invite', requireProjectMember, requirePermission('manageMembers'), inviteMember)
 */
const requirePermission = (action) => (req, res, next) => {
  if (!req.membership) return res.status(403).json({ message: 'Not a project member' });
  if (!can(req.membership.role, action, req.project)) {
    return res.status(403).json({ message: `Your role (${req.membership.role}) cannot perform this action` });
  }
  next();
};

module.exports = { requirePermission };
