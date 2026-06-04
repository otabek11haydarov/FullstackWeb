const { User } = require('../models');
const bcrypt = require('bcryptjs');

// Get all users (Admins/Super Admins)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get single user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'No user found with that ID' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Create user (e.g., admin creating another admin)
exports.createUser = async (req, res) => {
  try {
    // Prevent regular admins from creating super_admins
    if (req.user.role === 'Admin' && req.body.role === 'Super Admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'You cannot create a Super Admin account.'
      });
    }

    const newUser = await User.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role || 'Admin'
    });

    newUser.password = undefined;

    res.status(201).json({
      status: 'success',
      data: {
        user: newUser
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'No user found with that ID' });
    }

    // Hash password if it is being updated
    if (req.body.password) {
      req.body.password = await bcrypt.hash(req.body.password, 12);
    }

    // Prevent regular admins from making someone a super_admin
    if (req.user.role === 'Admin' && req.body.role === 'Super Admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'You cannot promote a user to Super Admin.'
      });
    }

    await user.update(req.body);
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'No user found with that ID' });
    }

    await user.destroy();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
