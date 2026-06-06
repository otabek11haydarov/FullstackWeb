const { Doctor, User, Disease, Appointment, Patient, Diagnosis, ClinicalHistory, Activity, sequelize } = require('../models');
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
    const { firstName, lastName, email, password, specialization, experienceYears, licenseNumber } = req.body;

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
      role: 'Doctor'
    }, { hooks: false });

    // Create Doctor Profile
    const newDoctor = await Doctor.create({
      specialization,
      experienceYears: experienceYears || 0,
      licenseNumber: licenseNumber || `LIC-${Date.now()}`,
      userId: user.id
    });

    const populatedDoctor = await Doctor.findByPk(newDoctor.id, {
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }]
    });

    res.status(201).json({
      status: 'success',
      data: {
        doctor: populatedDoctor
      }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, {
      include: [{ model: User }]
    });

    if (!doctor) {
      return res.status(404).json({ status: 'fail', message: 'Doctor not found' });
    }

    const { firstName, lastName, email, password, specialization, experienceYears, licenseNumber } = req.body;

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
      await doctor.User.update(userUpdates, { hooks: false });
    }

    // Update Doctor details
    const docUpdates = {};
    if (specialization) docUpdates.specialization = specialization;
    if (experienceYears !== undefined) docUpdates.experienceYears = experienceYears;
    if (licenseNumber) docUpdates.licenseNumber = licenseNumber;

    if (Object.keys(docUpdates).length > 0) {
      await doctor.update(docUpdates);
    }

    res.status(200).json({
      status: 'success',
      data: {
        doctor
      }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);

    if (!doctor) {
      return res.status(404).json({ status: 'fail', message: 'Doctor not found' });
    }

    // Delete the underlying User. Cascades to Doctor.
    await User.destroy({ where: { id: doctor.userId } });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
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
      Appointment.findAll({ where: { patientId, doctorId: req.user.role === 'Doctor' ? doctor.id : doctorId }, order: [['date', 'DESC']] }),
      Diagnosis.findAll({ where: { patientId, doctorId: req.user.role === 'Doctor' ? doctor.id : doctorId }, order: [['createdAt', 'DESC']] })
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
        { model: Diagnosis, attributes: ['id', 'condition', 'severity', 'createdAt'], where: { doctorId: doctor.id }, required: false }
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
    
    let doctor = null;
    
    if (req.user.role === 'Doctor') {
      doctor = await Doctor.findOne({ where: { userId } });
      if (!doctor) {
        return res.status(404).json({ status: 'fail', message: 'Doctor profile not found.' });
      }
    }

    console.log("--- DEBUGGING 404 ERROR ---");
    console.log("Requested Patient ID:", patientId);
    console.log("Current Doctor ID:", doctor ? doctor.id : 'N/A (Super Admin)');

    const includeArray = [
      { model: User, attributes: ['firstName', 'lastName', 'email'] }
    ];

    if (doctor) {
      includeArray.push({ model: Diagnosis, attributes: ['id', 'condition', 'severity', 'prescription', 'createdAt'], where: { doctorId: doctor.id }, required: false });
      includeArray.push({ model: Appointment, attributes: ['id', 'date', 'status', 'reason', 'notes'], where: { doctorId: doctor.id }, required: false });
    } else {
      includeArray.push({ model: Diagnosis, attributes: ['id', 'condition', 'severity', 'prescription', 'createdAt'] });
      includeArray.push({ model: Appointment, attributes: ['id', 'date', 'status', 'reason', 'notes'] });
    }

    const patient = await Patient.findOne({
      where: { id: patientId },
      include: includeArray,
      order: [
        [Diagnosis, 'createdAt', 'DESC'],
        [Appointment, 'date', 'DESC']
      ]
    });

    if (!patient) {
      return res.status(404).json({ status: 'fail', message: 'Patient not found in the system.' });
    }

    // Check strict isolation permissions for Doctor
    if (doctor) {
      const isPrimaryDoctor = patient.doctorId === doctor.id;
      // Check if there is an appointment history between them
      const hasAppointment = await Appointment.findOne({ where: { doctorId: doctor.id, patientId: patient.id } });
      
      if (!isPrimaryDoctor && !hasAppointment) {
        return res.status(403).json({ status: 'fail', message: 'Access denied: Patient not assigned to you and no appointment history exists.' });
      }
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

exports.getReportsStats = async (req, res) => {
  try {
    let doctorId = null;

    if (req.user.role === 'Doctor') {
      const doctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!doctor) {
        return res.status(404).json({ status: 'fail', message: 'Doctor profile not found.' });
      }
      doctorId = doctor.id;
    }

    const whereClause = doctorId ? { doctorId } : {};

    const totalPatients = await Patient.count({ where: whereClause });
    const totalAppointments = await Appointment.count({ where: whereClause });
    const totalDiagnoses = await Diagnosis.count({ where: whereClause });

    const recentAppointments = await Appointment.findAll({
      where: whereClause,
      include: [{ model: Patient, include: [User] }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    const recentDiagnoses = await Diagnosis.findAll({
      where: whereClause,
      include: [{ model: Patient, include: [User] }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    const recentActivity = [];
    recentAppointments.forEach(app => {
      recentActivity.push({
        type: 'Appointment',
        date: app.createdAt,
        description: `Appointment scheduled for patient ${app.Patient?.User?.firstName || 'Unknown'} ${app.Patient?.User?.lastName || ''}`
      });
    });

    recentDiagnoses.forEach(diag => {
      recentActivity.push({
        type: 'Diagnosis',
        date: diag.createdAt,
        description: `Diagnosis "${diag.condition}" written for patient ${diag.Patient?.User?.firstName || 'Unknown'} ${diag.Patient?.User?.lastName || ''}`
      });
    });

    recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
    const topRecentActivity = recentActivity.slice(0, 5);

    const anonymousFeedback = [
      { comment: "Dr. Smith is wonderful and very patient. I feel heard and understood.", rating: 5, date: "2023-10-25" },
      { comment: "Great experience, took the time to explain everything thoroughly.", rating: 5, date: "2023-10-24" },
      { comment: "Very professional and friendly staff. Highly recommend.", rating: 4, date: "2023-10-20" }
    ];

    res.status(200).json({
      status: 'success',
      data: {
        totalPatients,
        totalAppointments,
        totalDiagnoses,
        recentActivity: topRecentActivity,
        anonymousFeedback
      }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// ==========================================
// SELF-SERVICE: PROFILE UPDATE
// ==========================================
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    
    // Find the user from the JWT payload
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    


    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
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

// ==========================================
// APPOINTMENT STATUS MANAGEMENT
// ==========================================
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { status } = req.body;
    
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        { model: Patient, include: [{ model: User }] },
        { model: Doctor, include: [{ model: User }] }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
    }

    const t = await sequelize.transaction();

    try {
      if (status === 'Completed') {
        await appointment.update({ status: 'Completed' }, { transaction: t });
        
        await ClinicalHistory.create({
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          actionType: 'StatusChange',
          description: `Appointment marked as Completed.`
        }, { transaction: t });

    } else if (status === 'Pending') {
      let nextTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2 hours
      
      const hour = nextTime.getHours();
      if (hour >= 17) {
        nextTime.setDate(nextTime.getDate() + 1);
        nextTime.setHours(9, 0, 0, 0);
      } else if (hour < 9) {
        nextTime.setHours(9, 0, 0, 0);
      }

      await appointment.update({ status: 'Pending', date: nextTime }, { transaction: t });
      
      await ClinicalHistory.create({
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        actionType: 'StatusChange',
        description: `Appointment rescheduled for Diagnostics to ${nextTime.toLocaleString()}.`
      }, { transaction: t });

    } else if (status === 'Rejected') {
      await appointment.update({ status: 'Rejected' }, { transaction: t });

      await ClinicalHistory.create({
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        actionType: 'StatusChange',
        description: `Appointment rejected.`
      }, { transaction: t });

      // Notify Receptionists via Activity feed
      const patientName = appointment.Patient?.User ? `${appointment.Patient.User.firstName} ${appointment.Patient.User.lastName}` : 'Unknown';
      const doctorName = appointment.Doctor?.User ? `${appointment.Doctor.User.firstName} ${appointment.Doctor.User.lastName}` : 'Unknown';
      const msg = `Dr. ${doctorName} rejected patient ${patientName}. Reassignment needed.`;
      
      const initial = req.user && req.user.firstName ? req.user.firstName.charAt(0) : 'D';
      
      const activity = await Activity.create({ message: msg, userInitial: initial });
      
      const io = req.app.get('io');
      if (io) {
        io.emit('newActivity', {
          id: activity.id,
          message: msg,
          timestamp: activity.createdAt,
          userInitial: initial
        });
      }
    } else {
      await t.rollback();
      return res.status(400).json({ status: 'fail', message: 'Invalid status' });
    }

    await t.commit();

    res.status(200).json({
      status: 'success',
      data: { appointment }
    });
    } catch (txErr) {
      await t.rollback();
      throw txErr;
    }
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// ==========================================
// REFERRALS
// ==========================================
exports.referPatient = async (req, res) => {
  try {
    const patientId = req.params.id;
    const { newDoctorId, reason } = req.body;

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ status: 'fail', message: 'Patient not found' });
    }

    let currentDoctorId = null;
    if (req.user && req.user.role === 'Doctor') {
      const doctorProfile = await Doctor.findOne({ where: { userId: req.user.id } });
      if (doctorProfile) currentDoctorId = doctorProfile.id;
    }

    const t = await sequelize.transaction();

    try {
      await patient.update({ doctorId: newDoctorId }, { transaction: t });

      await ClinicalHistory.create({
        patientId,
        doctorId: currentDoctorId,
        actionType: 'Referral',
        description: `Referred to another doctor. Reason: ${reason || 'Not provided'}`
      }, { transaction: t });

      await t.commit();

      res.status(200).json({
        status: 'success',
        data: { patient }
      });
    } catch (txErr) {
      await t.rollback();
      throw txErr;
    }
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// ==========================================
// CLINICAL HISTORY LEDGER
// ==========================================
exports.getClinicalHistory = async (req, res) => {
  try {
    const history = await ClinicalHistory.findAll({
      where: { patientId: req.params.id },
      include: [
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
      ],
      order: [['date', 'DESC']]
    });

    res.status(200).json({
      status: 'success',
      data: { history }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

