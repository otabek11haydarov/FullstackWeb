const { User } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.findAll({
      where: {
        role: {
          [Op.in]: ['Admin', 'Super Admin']
        }
      },
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({
      status: 'success',
      results: admins.length,
      data: {
        admins
      }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const newAdmin = await User.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role || 'Admin'
    });

    newAdmin.password = undefined;

    res.status(201).json({
      status: 'success',
      data: { admin: newAdmin }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const admin = await User.findByPk(req.params.id);

    if (!admin) {
      return res.status(404).json({ status: 'fail', message: 'No admin found with that ID' });
    }

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }

    await admin.update(req.body, { hooks: false });
    admin.password = undefined;

    res.status(200).json({
      status: 'success',
      data: { admin }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await User.findByPk(req.params.id);

    if (!admin) {
      return res.status(404).json({ status: 'fail', message: 'No admin found with that ID' });
    }

    await admin.destroy();

    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};
