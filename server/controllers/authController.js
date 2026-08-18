const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/email');

// @route POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists' });

    const colors = ['#14B8A6', '#F59E0B', '#6366F1', '#EC4899', '#10B981', '#3B82F6'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const user = await User.create({ name, email, password, avatarColor });

    res.status(201).json({
      user: user.toSafeObject(),
      token: generateToken(user._id),
    });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      user: user.toSafeObject(),
      token: generateToken(user._id),
    });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
};

// @route PUT /api/auth/me
const updateMe = async (req, res, next) => {
  try {
    const { name, avatarColor } = req.body;
    if (name) req.user.name = name;
    if (avatarColor) req.user.avatarColor = avatarColor;
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/auth/password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await require('../models/User').findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/auth/forgot-password
// Always responds with a generic success message, whether or not the email
// exists, so the endpoint can't be used to enumerate registered accounts.
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const genericResponse = { message: 'If an account exists for that email, a reset link has been sent.' };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json(genericResponse);

    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset your TeamTask password',
        text: `You requested a password reset. Click the link below to set a new password (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
        html: `<p>You requested a password reset. Click the link below to set a new password (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      });
    } catch (mailErr) {
      // Roll back the token so a broken mail server doesn't leave a
      // dangling, unusable reset token on the account.
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error('Failed to send reset email:', mailErr.message);
      return res.status(500).json({ message: 'Could not send reset email. Please try again later.' });
    }

    res.json(genericResponse);
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/auth/reset-password/:token
const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+password +resetPasswordToken +resetPasswordExpires');

    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      message: 'Password has been reset successfully',
      user: user.toSafeObject(),
      token: generateToken(user._id),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateMe, changePassword, forgotPassword, resetPassword };
