const { Receptionist, User } = require('../models');
const bcrypt = require('bcryptjs');

exports.getAllReceptionists = async (req, res) => {
  try {
    const receptionists = await Receptionist.findAll({
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }]
    });

    res.status(200).json({
      status: 'success',
      results: receptionists.length,
      data: {
        receptionists
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.createReceptionist = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber, shift } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ status: 'fail', message: 'Email already in use' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'Receptionist'
    }, { hooks: false });

    // Create Receptionist Profile
    const receptionist = await Receptionist.create({
      phoneNumber,
      shift,
      userId: user.id
    });

    // Fetch full receptionist to return
    const newReceptionist = await Receptionist.findByPk(receptionist.id, {
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }]
    });

    res.status(201).json({
      status: 'success',
      data: { receptionist: newReceptionist }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getReceptionist = async (req, res) => {
  try {
    const receptionist = await Receptionist.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }]
    });

    if (!receptionist) {
      return res.status(404).json({ status: 'fail', message: 'No receptionist found with that ID' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        receptionist
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.updateReceptionist = async (req, res) => {
  try {
    const receptionist = await Receptionist.findByPk(req.params.id, {
      include: [{ model: User }]
    });

    if (!receptionist) {
      return res.status(404).json({ status: 'fail', message: 'No receptionist found with that ID' });
    }

    const { firstName, lastName, email, password, phoneNumber, shift, status } = req.body;

    // Update User details
    const userUpdates = {};
    if (firstName) userUpdates.firstName = firstName;
    if (lastName) userUpdates.lastName = lastName;
    if (email) userUpdates.email = email;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      userUpdates.password = await bcrypt.hash(password, salt);
    }

    if (Object.keys(userUpdates).length > 0) {
      await receptionist.User.update(userUpdates, { hooks: false });
    }

    // Update Receptionist details
    const recUpdates = {};
    if (phoneNumber !== undefined) recUpdates.phoneNumber = phoneNumber;
    if (shift) recUpdates.shift = shift;
    if (status) recUpdates.status = status;

    if (Object.keys(recUpdates).length > 0) {
      await receptionist.update(recUpdates);
    }

    res.status(200).json({
      status: 'success',
      data: { receptionist }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deleteReceptionist = async (req, res) => {
  try {
    const receptionist = await Receptionist.findByPk(req.params.id);

    if (!receptionist) {
      return res.status(404).json({ status: 'fail', message: 'No receptionist found with that ID' });
    }

    // Since cascade is set, deleting the user also deletes the receptionist profile
    await User.destroy({ where: { id: receptionist.userId } });

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
