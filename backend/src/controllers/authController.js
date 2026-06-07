const jwt = require('jsonwebtoken');
const { User, Doctor, Patient } = require('../models');

const signToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id, user.role);

  const cookieOptions = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_EXPIRE) * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  
  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, ...otherData } = req.body;

    // Create User First
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || 'Patient'
    });

    // Handle Role Specific Profiles
    if (newUser.role === 'Doctor') {
      await Doctor.create({
        specialization: otherData.specialization,
        licenseNumber: otherData.licenseNumber,
        userId: newUser.id
      });
    } else if (newUser.role === 'Patient') {
      await Patient.create({
        dateOfBirth: otherData.dateOfBirth,
        gender: otherData.gender,
        address: otherData.address,
        contactNumber: otherData.contactNumber,
        userId: newUser.id
      });
    }

    createSendToken(newUser, 201, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password!'
      });
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ where: { email } });

    if (!user || !(await user.correctPassword(password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    // 3) If everything ok, send token to client
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    
    // Remove password from output
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
