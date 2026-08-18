const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireProjectMember, requireProjectOwner, requireOwnerOrCoOwner } = require('../middleware/projectAccess');
const { requirePermission } = require('../middleware/permissions');
const {
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
} = require('../controllers/projectController');
const { searchInProject } = require('../controllers/searchController');
const { getActivity } = require('../controllers/activityController');
const { getProjectAnalytics } = require('../controllers/analyticsController');
const taskRoutes = require('./taskRoutes');

router.use(protect);

router.route('/').get(getProjects).post(createProject);

router
  .route('/:id')
  .get(requireProjectMember, getProject)
  .put(requireProjectMember, requirePermission('manageProjectSettings'), updateProject)
  .delete(requireProjectMember, requireProjectOwner, deleteProject);

router.post('/:id/invite', requireProjectMember, requirePermission('manageMembers'), inviteMember);
router.delete('/:id/members/:userId', requireProjectMember, requirePermission('manageMembers'), removeMember);
router.put('/:id/members/:userId/role', requireProjectMember, requirePermission('changeRoles'), changeMemberRole);
router.put('/:id/permissions', requireProjectMember, requireOwnerOrCoOwner, updateRolePermissions);

router.get('/:id/stats', requireProjectMember, getProjectStats);
router.get('/:id/analytics', requireProjectMember, requirePermission('projectAnalytics'), getProjectAnalytics);
router.get('/:id/search', requireProjectMember, searchInProject);
router.get('/:id/activity', requireProjectMember, getActivity);

// Nested task routes: /api/projects/:projectId/tasks
router.use('/:projectId/tasks', taskRoutes);

module.exports = router;
