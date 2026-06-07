const { Patient, User, Doctor, Disease, Activity, Appointment, Review, Diagnosis, ClinicalHistory } = require('../models');
const { Sequelize, Op } = require('sequelize');
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
    const { firstName, lastName, email, password, gender, age, doctorId, bloodType, allergies, chronicConditions, medicalHistory } = req.body;

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
      bloodType,
      allergies,
      chronicConditions,
      medicalHistory,
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

    const io = req.app.get('io');
    if (io) {
      const msg = `Admin registered patient: ${newPatient.User.firstName} ${newPatient.User.lastName}`;
      const activity = await Activity.create({ message: msg, userInitial: 'A' });
      io.emit('newActivity', {
        id: activity.id,
        message: msg,
        timestamp: activity.createdAt,
        userInitial: 'A'
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

    const { firstName, lastName, email, password, gender, age, doctorId, bloodType, allergies, chronicConditions, medicalHistory } = req.body;

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
    if (bloodType !== undefined) patUpdates.bloodType = bloodType;
    if (allergies !== undefined) patUpdates.allergies = allergies;
    if (chronicConditions !== undefined) patUpdates.chronicConditions = chronicConditions;
    if (medicalHistory !== undefined) patUpdates.medicalHistory = medicalHistory;
    
    if (age) {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
      patUpdates.dateOfBirth = dateOfBirth;
    }

    if (Object.keys(patUpdates).length > 0) {
      await patient.update(patUpdates);
    }

    const io = req.app.get('io');
    if (io) {
      const msg = `Admin updated patient: ${patient.User.firstName} ${patient.User.lastName}`;
      const activity = await Activity.create({ message: msg, userInitial: 'A' });
      io.emit('newActivity', {
        id: activity.id,
        message: msg,
        timestamp: activity.createdAt,
        userInitial: 'A'
      });
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

// --- Patient Portal Endpoints ---

exports.getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      include: [
        {
          model: User,
          attributes: ['firstName', 'lastName', 'email']
        },
        {
          model: Review,
          attributes: ['rating']
        }
      ]
    });

    // Manually map to avoid dialect-specific GROUP BY issues
    const formattedDoctors = doctors.map(doc => {
      const docJSON = doc.toJSON();
      const reviews = docJSON.Reviews || [];
      const reviewCount = reviews.length;
      let averageRating = 0;
      
      if (reviewCount > 0) {
        const sum = reviews.reduce((acc, rev) => acc + rev.rating, 0);
        averageRating = sum / reviewCount;
      }
      
      docJSON.reviewCount = reviewCount;
      docJSON.averageRating = averageRating;
      
      // Clean up the raw reviews array from the payload to keep it light
      delete docJSON.Reviews;
      
      return docJSON;
    });

    res.status(200).json({ success: true, data: formattedDoctors });
  } catch (err) {
    console.error('Error fetching doctors:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors' });
  }
};

exports.getRecords = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const appointments = await Appointment.findAll({
      where: { patientId: patient.id },
      include: [
        {
          model: Doctor,
          include: [{ model: User, attributes: ['firstName', 'lastName'] }]
        }
      ],
      order: [['date', 'DESC']]
    });

    const diagnoses = await Diagnosis.findAll({
      where: { patientId: patient.id },
      order: [['date', 'DESC']]
    });

    res.status(200).json({ success: true, data: { appointments, diagnoses } });
  } catch (err) {
    console.error('Error fetching patient records:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch records' });
  }
};

exports.submitReview = async (req, res) => {
  try {
    const { appointmentId, rating, comment } = req.body;

    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (appointment.patientId !== patient.id) {
      return res.status(403).json({ success: false, message: 'You can only review your own appointments' });
    }

    const existingReview = await Review.findOne({ where: { appointmentId } });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Review already submitted for this appointment' });
    }

    const review = await Review.create({
      rating,
      comment,
      appointmentId,
      doctorId: appointment.doctorId
    });

    res.status(201).json({ success: true, message: 'Review submitted successfully', data: review });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
};

exports.getPatientDashboard = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const patientId = patient.id;

    // 1. Count Upcoming Appointments
    const upcomingCount = await Appointment.count({
      where: { 
        patientId, 
        status: 'Scheduled', 
        date: { [Op.gte]: new Date() } 
      }
    });

    // 2. Count Recent Diagnoses (e.g., within last 30 days)
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
    const diagnosesCount = await Diagnosis.count({
      where: { 
        patientId, 
        date: { [Op.gte]: thirtyDaysAgo } 
      }
    });

    // 3. Fetch Recent Activities (ClinicalHistory + Appointments context if needed, but ClinicalHistory alone is best)
    const activities = await ClinicalHistory.findAll({
      where: { patientId },
      order: [['date', 'DESC']],
      limit: 10,
      include: [
        { 
          model: Doctor, 
          include: [{ model: User, attributes: ['firstName', 'lastName'] }] 
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        healthStatus: diagnosesCount > 2 ? 'Needs Attention' : 'Excellent',
        upcomingAppointments: upcomingCount,
        recentDiagnoses: diagnosesCount,
        activities: activities
      }
    });

  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Error loading dashboard data' });
  }
};

exports.getDoctorsWithSlots = async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    if (!date) return res.status(400).json({ success: false, message: "Date is required" });

    // Ensure timezone doesn't shift the day
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const doctors = await Doctor.findAll({
      include: [
        { model: User, attributes: ['firstName', 'lastName', 'email'] },
        { model: Review, attributes: ['rating'] }
      ]
    });

    const existingAppointments = await Appointment.findAll({
      where: {
        date: { [Op.between]: [startOfDay, endOfDay] },
        status: { [Op.not]: 'Cancelled' }
      }
    });

    const standardSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

    const formattedDoctors = doctors.map(doc => {
      const docJSON = doc.toJSON();
      const reviews = docJSON.Reviews || [];
      const reviewCount = reviews.length;
      let averageRating = 0;
      
      if (reviewCount > 0) {
        const sum = reviews.reduce((acc, rev) => acc + rev.rating, 0);
        averageRating = (sum / reviewCount).toFixed(1);
      }
      
      docJSON.reviewCount = reviewCount;
      docJSON.averageRating = averageRating;

      // Extract booked times "HH:MM"
      const bookedTimes = existingAppointments
        .filter(app => app.doctorId === doc.id)
        .map(app => {
            const h = new Date(app.date).getUTCHours().toString().padStart(2, '0');
            const m = new Date(app.date).getUTCMinutes().toString().padStart(2, '0');
            return `${h}:${m}`;
        });

      // Find available slots
      docJSON.availableSlots = standardSlots.filter(slot => !bookedTimes.includes(slot));

      return docJSON;
    });

    res.status(200).json({ success: true, data: formattedDoctors });
  } catch (error) {
    console.error("Slot fetch error:", error);
    res.status(500).json({ success: false, message: "Error calculating available slots" });
  }
};

exports.bookAppointment = async (req, res) => {
  try {
    console.log("Booking attempt:", req.body);
    const { doctorId, date, time, reason } = req.body;
    if (!doctorId || !date || !time) return res.status(400).json({ success: false, message: "Missing booking details" });

    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) return res.status(404).json({ success: false, message: "Patient profile not found" });

    // Assign the doctor to the patient if they don't have a primary doctor yet
    if (!patient.doctorId) {
      await patient.update({ doctorId });
    }

    // Construct the full DateTime object (UTC)
    const [hours, minutes] = time.split(':');
    const appointmentDate = new Date(`${date}T00:00:00.000Z`);
    appointmentDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Double check if slot is already booked
    const existing = await Appointment.findOne({
      where: {
        doctorId,
        date: appointmentDate,
        status: { [Op.not]: 'Cancelled' }
      }
    });

    if (existing) {
      return res.status(409).json({ success: false, message: "This time slot has already been booked" });
    }

    const newAppointment = await Appointment.create({
      patientId: patient.id,
      doctorId,
      date: appointmentDate,
      reason: reason || 'General Consultation',
      status: 'Scheduled'
    });

    res.status(201).json({ success: true, message: "Appointment booked successfully", data: newAppointment });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ success: false, message: "Failed to book appointment" });
  }
};

// ==========================================
// PATIENT SELF-SERVICE PROFILE
// ==========================================
exports.getMyProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { userId: req.user.id },
      include: [
        { model: User, attributes: { exclude: ['password'] } },
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }] }
      ]
    });

    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found.' });

    res.status(200).json({ success: true, data: { patient } });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, address, allergies, chronicConditions, bloodType } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Update User
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    await user.save({ hooks: false });

    // Update Patient
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (patient) {
      if (contactNumber !== undefined) patient.contactNumber = contactNumber;
      if (address !== undefined) patient.address = address;
      if (allergies !== undefined) patient.allergies = allergies;
      if (chronicConditions !== undefined) patient.chronicConditions = chronicConditions;
      if (bloodType !== undefined) patient.bloodType = bloodType;
      await patient.save();
    }

    // Refresh localStorage user data on client side
    const updatedUser = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });

    res.status(200).json({ success: true, message: 'Profile updated successfully!', data: { user: updatedUser } });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};
