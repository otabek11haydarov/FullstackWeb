const { Receptionist, User, Appointment, Patient, Doctor, Activity, sequelize } = require('../models');
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

// ==========================================
// SELF-SERVICE: PROFILE UPDATE
// ==========================================
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, contactNumber } = req.body;
    
    // Find the user from the JWT payload
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    
    // Phone number belongs to the Receptionist model, not User!
    if (contactNumber) {
      await Receptionist.update({ phoneNumber: contactNumber }, { where: { userId: user.id } });
    }


    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          contactNumber: user.contactNumber,
          role: user.role
        }
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// --- APPOINTMENTS MANAGEMENT ---

exports.getAllAppointments = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    let whereClause = {};
    
    if (doctorId && doctorId !== 'all') {
      whereClause.doctorId = doctorId;
    }
    if (date) {
      whereClause.date = date; // Note: strict match, may need to handle date ranges if needed later
    }

    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        { model: Patient, include: [{ model: User, attributes: ['firstName', 'lastName'] }] },
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
      ],
      order: [['date', 'ASC']]
    });

    res.status(200).json({
      status: 'success',
      results: appointments.length,
      data: { appointments }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.createAppointment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { patientId, doctorId, date, reason, status, notes } = req.body;
    
    // Create Appointment
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      date,
      reason,
      status: status || 'Scheduled',
      notes
    }, { transaction: t });

    // Auto-assign Patient to the Doctor
    await Patient.update(
      { doctorId: doctorId },
      { where: { id: patientId }, transaction: t }
    );

    // Commit the transaction
    await t.commit();

    const populatedAppointment = await Appointment.findByPk(appointment.id, {
      include: [
        { model: Patient, include: [{ model: User, attributes: ['firstName', 'lastName'] }] },
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
      ]
    });

    const io = req.app.get('io');
    if (io) {
      const msg = `New appointment scheduled for ${populatedAppointment.Patient.User.firstName}`;
      const initial = req.user && req.user.firstName ? req.user.firstName.charAt(0) : 'R';
      const activity = await Activity.create({ message: msg, userInitial: initial });
      io.emit('newActivity', {
        id: activity.id,
        message: msg,
        timestamp: activity.createdAt,
        userInitial: initial
      });
    }

    res.status(201).json({
      status: 'success',
      data: { appointment: populatedAppointment }
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ status: 'fail', message: 'No appointment found with that ID' });
    }

    await appointment.update(req.body);

    const updatedAppointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: Patient, include: [{ model: User, attributes: ['firstName', 'lastName'] }] },
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
      ]
    });

    const io = req.app.get('io');
    if (io) {
      const msg = `Appointment updated for ${updatedAppointment.Patient.User.firstName}`;
      const initial = req.user ? req.user.firstName.charAt(0) : 'R';
      const activity = await Activity.create({ message: msg, userInitial: initial });
      io.emit('newActivity', {
        id: activity.id,
        message: msg,
        timestamp: activity.createdAt,
        userInitial: initial
      });
    }

    res.status(200).json({
      status: 'success',
      data: { appointment: updatedAppointment }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ status: 'fail', message: 'No appointment found with that ID' });
    }

    await appointment.destroy();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// --- DOCTORS MANAGEMENT FOR RECEPTIONIST ---

exports.getReceptionistDoctors = async (req, res) => {
  try {
    const { specialization } = req.query;
    let whereClause = {};

    if (specialization && specialization !== 'all') {
      whereClause.specialization = specialization;
    }

    const doctors = await Doctor.findAll({
      where: whereClause,
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email', 'id'] }]
    });

    res.status(200).json({
      status: 'success',
      results: doctors.length,
      data: { doctors }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// --- PATIENTS MANAGEMENT FOR RECEPTIONIST ---

exports.getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.findAll({
      include: [
        { model: User, attributes: ['firstName', 'lastName', 'email', 'id'] },
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
      ]
    });

    res.status(200).json({
      status: 'success',
      results: patients.length,
      data: { patients }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.createPatient = async (req, res) => {
  try {
    const { firstName, lastName, email, password, dateOfBirth, gender, contactNumber, doctorId, bloodType, allergies, chronicConditions, medicalHistory } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ status: 'fail', message: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'Patient'
    }, { hooks: false });

    const patient = await Patient.create({
      dateOfBirth,
      gender,
      contactNumber,
      bloodType,
      allergies,
      chronicConditions,
      medicalHistory,
      doctorId: doctorId || null,
      userId: user.id
    });

    const newPatient = await Patient.findByPk(patient.id, {
      include: [
        { model: User, attributes: ['firstName', 'lastName', 'email'] },
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
      ]
    });

    const io = req.app.get('io');
    if (io) {
      const msg = `Registered new patient: ${newPatient.User.firstName} ${newPatient.User.lastName}`;
      const initial = req.user ? req.user.firstName.charAt(0) : 'R';
      const activity = await Activity.create({ message: msg, userInitial: initial });
      io.emit('newActivity', {
        id: activity.id,
        message: msg,
        timestamp: activity.createdAt,
        userInitial: initial
      });
    }

    res.status(201).json({
      status: 'success',
      data: { patient: newPatient }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id, {
      include: [{ model: User }]
    });

    if (!patient) {
      return res.status(404).json({ status: 'fail', message: 'Patient not found' });
    }

    const { firstName, lastName, email, password, dateOfBirth, gender, contactNumber, doctorId, bloodType, allergies, chronicConditions, medicalHistory } = req.body;

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

    const patientUpdates = {};
    if (dateOfBirth) patientUpdates.dateOfBirth = dateOfBirth;
    if (gender) patientUpdates.gender = gender;
    if (contactNumber !== undefined) patientUpdates.contactNumber = contactNumber;
    if (doctorId !== undefined) patientUpdates.doctorId = doctorId;
    if (bloodType !== undefined) patientUpdates.bloodType = bloodType;
    if (allergies !== undefined) patientUpdates.allergies = allergies;
    if (chronicConditions !== undefined) patientUpdates.chronicConditions = chronicConditions;
    if (medicalHistory !== undefined) patientUpdates.medicalHistory = medicalHistory;
    if (Object.keys(patientUpdates).length > 0) {
      await patient.update(patientUpdates);
    }

    const updatedPatient = await Patient.findByPk(patient.id, {
      include: [
        { model: User, attributes: ['firstName', 'lastName', 'email'] },
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
      ]
    });

    const io = req.app.get('io');
    if (io) {
      const msg = `Updated profile for ${updatedPatient.User.firstName} ${updatedPatient.User.lastName}`;
      const initial = req.user ? req.user.firstName.charAt(0) : 'R';
      const activity = await Activity.create({ message: msg, userInitial: initial });
      io.emit('newActivity', {
        id: activity.id,
        message: msg,
        timestamp: activity.createdAt,
        userInitial: initial
      });
    }

    res.status(200).json({
      status: 'success',
      data: { patient: updatedPatient }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) {
      return res.status(404).json({ status: 'fail', message: 'Patient not found' });
    }

    // Since cascade is set or we manually delete user:
    await User.destroy({ where: { id: patient.userId } });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};
