const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/controllers/doctorController.js');
let content = fs.readFileSync(file, 'utf8');

// The last good line before the corruption was `res.status(200).json({` inside `getDoctorProfileForAdmin`.
// Wait, no. The corruption is starting around `getDoctorProfileForAdmin`. Let's just find the `getAllDoctors` and manually reconstruct the file.
// Or wait, `doctorController.js` is only 441 lines. Let's just output the entire correct content!

const goodContent = `const { Doctor, User, Disease, Appointment, Patient, Diagnosis } = require('../models');
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

    const [totalPatients, todayAppointments, recentFeedback] = await Promise.all([
      Patient.count({ where: { doctorId: doctor.id } }),
      Appointment.count({
        where: {
          doctorId: doctor.id,
          date: {
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      }),
      // We don't have a feedback model yet, so we return a placeholder array
      Promise.resolve([
        { text: "Dr. Smith is wonderful and very patient.", rating: 5, date: "2023-10-25" },
        { text: "Great experience, took the time to explain everything.", rating: 5, date: "2023-10-24" }
      ])
    ]);

    // Format schedule for today
    const weeklySchedule = await Appointment.findAll({
      where: { doctorId: doctor.id },
      include: [{ model: Patient, include: [User] }],
      order: [['date', 'ASC']]
    });

    const formattedSchedule = weeklySchedule.map(app => {
      return {
        id: app.id,
        time: new Date(app.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        patientName: app.Patient && app.Patient.User ? \`\${app.Patient.User.firstName} \${app.Patient.User.lastName}\` : 'Unknown',
        type: app.reason || 'Checkup',
        status: app.status || 'Scheduled'
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalPatients,
        todayAppointments,
        recentFeedback,
        weeklySchedule: formattedSchedule
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
`;

fs.writeFileSync(file, goodContent, 'utf8');
console.log('Fixed doctorController.js!');
