const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Create a new user by Admin
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const { name, username, email, phone, role, status, password } = req.body;

    if (!name || !username || !email || !phone || !password) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    // Standardize role casing: e.g., "admin" -> "Admin", "staff" -> "Staff", "customer" -> "Customer"
    let normalizedRole = 'Customer';
    if (role) {
      const lower = role.toLowerCase();
      if (lower === 'admin') normalizedRole = 'Admin';
      else if (lower === 'staff' || lower === 'operator') normalizedRole = 'Staff';
      else normalizedRole = 'Customer';
    }

    // Standardize status casing
    const normalizedStatus = status && status.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

    // Check duplicate email / username
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(409).json({ message: 'User with this email already exists.' });
      }
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: normalizedRole,
      status: normalizedStatus,
      password: hashedPassword,
      createdBy: req.user?.id
    });

    return res.status(201).json({
      message: 'User created successfully.',
      user: {
        id: newUser._id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error('Create user error:', error.message);
    return res.status(500).json({ message: error.message || 'Server error creating user account.' });
  }
};

// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const filter = {};

    if (role) filter.role = new RegExp(`^${role}$`, 'i');
    if (status) filter.status = new RegExp(`^${status}$`, 'i');
    if (search) {
      filter.$or = [
        { name: { $regex: search,$options: 'i' } },
        { username: { $regex: search,$options: 'i' } },
        { email: { $regex: search,$options: 'i' } },
        { phone: { $regex: search,$options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(users);
  } catch (error) {
    console.error('Get users error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving user accounts.' });
  }
};

// @desc    Update user details
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const { name, username, email, phone, role, status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check duplicate username if modified
    if (username && username.toLowerCase() !== user.username.toLowerCase()) {
      const existingUsername = await User.findOne({ username: username.toLowerCase() });
      if (existingUsername) {
        return res.status(409).json({ message: 'Username is already in use.' });
      }
      user.username = username.toLowerCase().trim();
    }

    // Check duplicate email if modified
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(409).json({ message: 'Email is already in use.' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();

    // Standardize role and status casing
    if (role) {
      const rLower = role.toLowerCase();
      user.role = rLower === 'admin' ? 'Admin' : rLower === 'staff' ? 'Staff' : 'Customer';
    }

    if (status) {
      user.status = status.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
    }

    await user.save();

    return res.status(200).json({
      message: 'User updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Update user error:', error.message);
    return res.status(500).json({ message: 'Server error updating user.' });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent deleting your own logged-in admin account
    if (req.user && req.user.id === user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    await User.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error.message);
    return res.status(500).json({ message: 'Server error deleting user.' });
  }
};

module.exports = {
     createUser,
  getUsers,
  updateUser,
  deleteUser
  // keep createUser exported as well
};
