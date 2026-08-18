const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { deleteComment } = require('../controllers/commentController');

// mounted at /api/comments
router.use(protect);
router.delete('/:id', deleteComment);

module.exports = router;
