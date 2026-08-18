const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getTask, updateTask, deleteTask } = require('../controllers/taskController');
const { getComments, createComment } = require('../controllers/commentController');
const { addLink, deleteLink } = require('../controllers/linkController');
const { upload, uploadAttachments, deleteAttachment } = require('../controllers/attachmentController');
const { createQuery, replyToQuery, resolveQuery } = require('../controllers/queryController');
const { requestReassignment, resolveReassignment, directReassign } = require('../controllers/reassignController');

// mounted at /api/tasks
router.use(protect);

router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);

router.route('/:taskId/comments').get(getComments).post(createComment);

// Links (#2)
router.post('/:taskId/links', addLink);
router.delete('/:taskId/links/:linkId', deleteLink);

// Attachments (#3)
router.post('/:taskId/attachments', upload.array('files', 5), uploadAttachments);
router.delete('/:taskId/attachments/:attachmentId', deleteAttachment);

// Queries (#11)
router.post('/:taskId/queries', createQuery);
router.post('/:taskId/queries/:queryId/replies', replyToQuery);
router.put('/:taskId/queries/:queryId/resolve', resolveQuery);

// Reassignment (#8, #9)
router.post('/:taskId/reassignment/request', requestReassignment);
router.put('/:taskId/reassignment/resolve', resolveReassignment);
router.put('/:taskId/reassign', directReassign);

module.exports = router;
