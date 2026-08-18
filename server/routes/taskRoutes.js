const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { requireProjectMember } = require('../middleware/projectAccess');
const { getTasks, createTask } = require('../controllers/taskController');

// mounted at /api/projects/:projectId/tasks
router.use(protect);
router.use((req, res, next) => {
  req.params.id = req.params.projectId;
  next();
});
router.use(requireProjectMember);

router.route('/').get(getTasks).post(createTask);

module.exports = router;
