const { User, Appointment, Patient, Doctor } = require('../models');
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

// ==========================================
// EMERGENCY APPOINTMENT OVERRIDE (CRUD)
// ==========================================
exports.getAllAppointments = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let whereClause = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.date = { [Op.between]: [start, end] };
    }
    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        { model: Patient, include: [{ model: User, attributes: ['firstName', 'lastName'] }] },
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
      ],
      order: [['date', 'ASC']]
    });
    res.status(200).json({ status: 'success', results: appointments.length, data: { appointments } });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const newAppointment = await Appointment.create({
      date: req.body.date,
      status: req.body.status || 'Scheduled',
      reason: req.body.reason,
      notes: req.body.notes,
      patientId: req.body.patientId,
      doctorId: req.body.doctorId
    });
    res.status(201).json({ status: 'success', data: { appointment: newAppointment } });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
    await appointment.update(req.body);
    res.status(200).json({ status: 'success', data: { appointment } });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
    await appointment.destroy();
    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// ==========================================
// DROPDOWN DATA FOR ADMIN
// ==========================================
exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({ include: [{ model: User, attributes: ['firstName', 'lastName'] }] });
    res.status(200).json({ status: 'success', data: { doctors } });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.findAll({ include: [{ model: User, attributes: ['firstName', 'lastName'] }] });
    res.status(200).json({ status: 'success', data: { patients } });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};
