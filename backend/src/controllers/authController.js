const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Helper to sign JWT
const generateToken = (id, role = 'user') => {
  const secret = process.env.JWT_SECRET || 'fallback_jwt_secret_dev_key';
  return jwt.sign({ id, role }, secret, { expiresIn: '7d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { name, username, email, phone, password, role } = req.body;

    if (!name || !username || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }],
    });

    if (existingUser) {
      const field = existingUser.email === cleanEmail ? 'Email' : 'Username';
      return res.status(409).json({ message: `${field} is already in use.` });
    }

    // Create user (password is hashed in User pre-save hook)
    const user = await User.create({
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phone: phone.trim(),
      password,
      role: role || 'user'
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      message: 'Account registered successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    // Handle duplicate key error code from MongoDB (11000) for race conditions
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || 'Field';
      return res.status(409).json({
        message: `${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} is already in use.`,
      });
    }

    console.error('Register error:', error.message || error);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = username || email;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/email and password are required.' });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();

    // Query user by username or email with password field explicitly selected
    const user = await User.findOne({
      $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }]
    }).select('+password');

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Compare plain password with stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT
    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('🔥 Login Crash Error:', error.message);
    console.error(error.stack);
    return res.status(500).json({
      message: error.message || 'Internal server error during login.'
    });
  }
};

// @desc    Get current logged-in user profile
// @route   GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get profile error:', error.message || error);
    return res.status(500).json({ message: 'Error retrieving profile.' });
  }
};

// @desc    Change password for logged-in user
// @route   PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    // Select password to verify current password
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Safely check password directly with bcrypt
    const isMatch = typeof user.comparePassword === 'function'
      ? await user.comparePassword(currentPassword)
      : await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    // If pre-save hook hashes password, set directly; otherwise hash manually
    user.password = newPassword;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Password update error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  changePassword
};