const { Patient, User, Doctor, Disease } = require('../models');
const bcrypt = require('bcryptjs');

exports.getAllPatients = async (req, res) => {
  try {
    // If clinician is requesting, maybe only show their patients
    const filter = {};
    if (req.user && req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (doctor) {
        filter.doctorId = doctor.id;
      }
    }

    const patients = await Patient.findAll({
      where: filter,
      include: [
        { model: User, attributes: ['firstName', 'lastName', 'email'] },
        { model: Disease },
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
      ]
    });

    res.status(200).json({
      status: 'success',
      results: patients.length,
      data: {
        patients
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.createPatient = async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender, age, doctorId } = req.body;

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
      role: 'Patient'
    }, { hooks: false });

    // Calculate approximate DOB from Age
    const dateOfBirth = new Date();
    dateOfBirth.setFullYear(dateOfBirth.getFullYear() - (age || 30));

    // Create Patient Profile
    const patient = await Patient.create({
      dateOfBirth,
      gender: gender || 'Other',
      doctorId: doctorId || null,
      userId: user.id
    });

    // Fetch full patient to return
    const newPatient = await Patient.findByPk(patient.id, {
      include: [
        { model: User, attributes: ['firstName', 'lastName', 'email'] },
        { model: Doctor, include: [User] }
      ]
    });

    res.status(201).json({
      status: 'success',
      data: { patient: newPatient }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['firstName', 'lastName', 'email'] },
        { model: Doctor, include: [User] },
        { model: Disease }
      ]
    });

    if (!patient) {
      return res.status(404).json({ status: 'fail', message: 'No patient found with that ID' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        patient
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id, {
      include: [{ model: User }]
    });

    if (!patient) {
      return res.status(404).json({ status: 'fail', message: 'No patient found with that ID' });
    }

    const { firstName, lastName, email, password, gender, age, doctorId } = req.body;

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
      await patient.User.update(userUpdates, { hooks: false });
    }

    // Update Patient details
    const patUpdates = {};
    if (gender) patUpdates.gender = gender;
    if (doctorId !== undefined) patUpdates.doctorId = doctorId || null;
    
    if (age) {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
      patUpdates.dateOfBirth = dateOfBirth;
    }

    if (Object.keys(patUpdates).length > 0) {
      await patient.update(patUpdates);
    }

    res.status(200).json({
      status: 'success',
      data: { patient }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);

    if (!patient) {
      return res.status(404).json({ status: 'fail', message: 'No patient found with that ID' });
    }

    await User.destroy({ where: { id: patient.userId } });

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
