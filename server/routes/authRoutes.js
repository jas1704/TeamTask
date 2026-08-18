const express = require('express');
const router = express.Router();
const { register, login, getMe, updateMe, changePassword, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/password', protect, changePassword);

module.exports = router;
