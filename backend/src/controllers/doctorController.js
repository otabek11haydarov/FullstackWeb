const { Doctor, User, Disease, Appointment, Patient, Diagnosis } = require('../models');
const bcrypt = require('bcryptjs');

exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }]
    });

    res.status(200).json({
      status: 'success',
      results: doctors.length,
      data: {
        doctors
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.getDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }]
    });

    if (!doctor) {
      return res.status(404).json({
        status: 'fail',
        message: 'Doctor not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        doctor
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.createDoctor = async (req, res) => {
  try {
    // Check if user exists
    const user = await User.findByPk(req.body.userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    const newDoctor = await Doctor.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        doctor: newDoctor
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        status: 'fail',
        message: 'Doctor not found'
      });
    }

    await doctor.update(req.body);

    res.status(200).json({
      status: 'success',
      data: {
        doctor
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        status: 'fail',
        message: 'Doctor not found'
      });
    }

    await doctor.destroy();

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

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const doctor = await Doctor.findOne({ where: { userId } });

    if (!doctor) {
      return res.status(404).json({
        status: 'fail',
        message: 'Doctor profile not found.'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const totalAssignedPatients = await Patient.count({ where: { doctorId: doctor.id } });
    
    // Fallback to JS filtering if Op operators aren't set up perfectly
    const allAppointments = await Appointment.findAll({
      where: { doctorId: doctor.id },
      include: [{ model: Patient, include: [User] }],
      order: [['date', 'ASC']]
    });
    
    const todayAppointments = allAppointments.filter(app => {
      const d = new Date(app.date);
      return d >= today && d < tomorrow;
    });

    const anonymousFeedback = [
      { comment: "Dr. Smith is wonderful and very patient.", rating: 5, date: "2023-10-25" },
      { comment: "Great experience, took the time to explain everything.", rating: 5, date: "2023-10-24" }
    ];

    const patientCards = await Patient.findAll({
      where: { doctorId: doctor.id },
      include: [User],
      limit: 4
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalAssignedPatients,
        todayAppointments: todayAppointments.length,
        anonymousFeedback,
        patientCards,
        upcomingAppointments: todayAppointments,
        weeklySchedule: allAppointments
      }
    });

  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getPatientHistory = async (req, res) => {
  try {
    const { doctorId, patientId } = req.params;
    
    // Verify association
    const patient = await Patient.findOne({ where: { id: patientId, doctorId } });
    if (!patient) {
      return res.status(404).json({ status: 'fail', message: 'Patient not found or not assigned to this doctor.' });
    }

    const [appointments, diagnoses] = await Promise.all([
      Appointment.findAll({ where: { patientId }, order: [['date', 'DESC']] }),
      Diagnosis.findAll({ where: { patientId }, order: [['createdAt', 'DESC']] })
    ]);

    res.status(200).json({
      status: 'success',
      data: { appointments, diagnoses }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getMyPatients = async (req, res) => {
  try {
    const userId = req.user.id;
    const doctor = await Doctor.findOne({ where: { userId } });
    if (!doctor) {
      return res.status(404).json({ status: 'fail', message: 'Doctor profile not found.' });
    }

    const patients = await Patient.findAll({
      where: { doctorId: doctor.id },
      include: [
        { model: User, attributes: ['firstName', 'lastName', 'email'] },
        { model: Diagnosis, attributes: ['id', 'condition', 'severity', 'createdAt'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      status: 'success',
      data: { patients }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getDoctorProfileForAdmin = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const doctor = await Doctor.findByPk(doctorId, {
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }]
    });

    if (!doctor) {
      return res.status(404).json({ status: 'fail', message: 'Doctor not found.' });
    }

    const [patients, appointments] = await Promise.all([
      Patient.findAll({
        where: { doctorId: doctor.id },
        include: [
          { model: User, attributes: ['firstName', 'lastName'] },
          { model: Diagnosis, attributes: ['id', 'condition', 'severity', 'createdAt'] }
        ]
      }),
      Appointment.findAll({
        where: { doctorId: doctor.id },
        order: [['date', 'ASC']]
      })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        doctor,
        patients,
        appointments
      }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getDoctorDiagnoses = async (req, res) => {
  try {
    let whereClause = {};

    if (req.user.role === 'Doctor') {
      const doctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!doctor) {
        return res.status(404).json({ status: 'fail', message: 'Doctor profile not found.' });
      }
      whereClause.doctorId = doctor.id;
    }

    const diagnoses = await Diagnosis.findAll({
      where: whereClause,
      include: [
        { 
          model: Patient, 
          include: [{ model: User, attributes: ['firstName', 'lastName'] }] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      status: 'success',
      data: { diagnoses }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getPatientProfile = async (req, res) => {
  try {
    const patientId = req.params.id;
    const userId = req.user.id;
    
    // Allow Super Admin to view any patient, but if Doctor, must check ownership
    let whereClause = { id: patientId };
    if (req.user.role === 'Doctor') {
      const doctor = await Doctor.findOne({ where: { userId } });
      if (!doctor) {
        return res.status(404).json({ status: 'fail', message: 'Doctor profile not found.' });
      }
      whereClause.doctorId = doctor.id;
    }

    const patient = await Patient.findOne({
      where: whereClause,
      include: [
        { model: User, attributes: ['firstName', 'lastName', 'email'] },
        { model: Diagnosis, attributes: ['id', 'condition', 'severity', 'prescription', 'createdAt'] },
        { model: Appointment, attributes: ['id', 'date', 'status', 'reason', 'notes'] }
      ],
      order: [
        [Diagnosis, 'createdAt', 'DESC'],
        [Appointment, 'date', 'DESC']
      ]
    });

    if (!patient) {
      return res.status(404).json({ status: 'fail', message: 'Patient not found or not assigned to you.' });
    }

    res.status(200).json({
      status: 'success',
      data: { patient }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getDoctorAppointments = async (req, res) => {
  try {
    let whereClause = {};

    if (req.user.role === 'Doctor') {
      const doctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!doctor) {
        return res.status(404).json({ status: 'fail', message: 'Doctor profile not found.' });
      }
      whereClause.doctorId = doctor.id;
    }

    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        { 
          model: Patient, 
          include: [{ model: User, attributes: ['firstName', 'lastName'] }] 
        }
      ],
      order: [['date', 'ASC']]
    });

    res.status(200).json({
      status: 'success',
      data: { appointments }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};
