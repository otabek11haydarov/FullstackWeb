const { Diagnosis, Patient, Doctor, User, ClinicalHistory, sequelize } = require('../models');

exports.getAllDiagnoses = async (req, res) => {
  try {
    const diagnoses = await Diagnosis.findAll({
      include: [
        { 
          model: Patient, 
          include: [{ model: User, attributes: ['firstName', 'lastName'] }] 
        },
        { 
          model: Doctor, 
          include: [{ model: User, attributes: ['firstName', 'lastName'] }] 
        }
      ],
      order: [['date', 'DESC']]
    });

    res.status(200).json({
      status: 'success',
      results: diagnoses.length,
      data: {
        diagnoses
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.createDiagnosis = async (req, res) => {
  try {
    let { patientId, doctorId, condition, severity, prescription, date } = req.body;

    // If the requester is a Doctor, map their User.id to their Doctor.id
    if (req.user && req.user.role === 'Doctor') {
      const doctorProfile = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!doctorProfile) {
        return res.status(403).json({ status: 'fail', message: 'Doctor profile not found for this user.' });
      }
      doctorId = doctorProfile.id; // Override to strictly enforce security
    }

    const t = await sequelize.transaction();

    try {
      const diagnosis = await Diagnosis.create({
        patientId,
        doctorId,
        condition,
        severity,
        prescription,
        date: date || new Date()
      }, { transaction: t });

      await ClinicalHistory.create({
        patientId,
        doctorId,
        actionType: 'Diagnosis',
        description: `Diagnosed with ${condition} (${severity}). Prescription: ${prescription || 'None'}`
      }, { transaction: t });

      await t.commit();

      // Fetch full diagnosis to return
    const newDiagnosis = await Diagnosis.findByPk(diagnosis.id, {
      include: [
        { model: Patient, include: [{ model: User, attributes: ['firstName', 'lastName'] }] },
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
      ]
    });

    res.status(201).json({
      status: 'success',
      data: { diagnosis: newDiagnosis }
    });
    } catch (txErr) {
      await t.rollback();
      throw txErr;
    }
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getDiagnosis = async (req, res) => {
  try {
    const diagnosis = await Diagnosis.findByPk(req.params.id, {
      include: [
        { model: Patient, include: [{ model: User, attributes: ['firstName', 'lastName'] }] },
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
      ]
    });

    if (!diagnosis) {
      return res.status(404).json({ status: 'fail', message: 'No diagnosis found with that ID' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        diagnosis
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.updateDiagnosis = async (req, res) => {
  try {
    const diagnosis = await Diagnosis.findByPk(req.params.id);

    if (!diagnosis) {
      return res.status(404).json({ status: 'fail', message: 'No diagnosis found with that ID' });
    }

    // CRITICAL: Ensure the logged-in doctor is the AUTHOR of the record
    if (req.user && req.user.role === 'Doctor') {
      const doctorProfile = await Doctor.findOne({ where: { userId: req.user.id } });
      if (doctorProfile && diagnosis.doctorId !== doctorProfile.id) {
        return res.status(403).json({ 
          message: 'Forbidden: You cannot edit medical records authored by another doctor.' 
        });
      }
    }

    await diagnosis.update(req.body);

    const updatedDiagnosis = await Diagnosis.findByPk(diagnosis.id, {
      include: [
        { model: Patient, include: [{ model: User, attributes: ['firstName', 'lastName'] }] },
        { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
      ]
    });

    res.status(200).json({
      status: 'success',
      data: { diagnosis: updatedDiagnosis }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deleteDiagnosis = async (req, res) => {
  try {
    const diagnosis = await Diagnosis.findByPk(req.params.id);

    if (!diagnosis) {
      return res.status(404).json({ status: 'fail', message: 'No diagnosis found with that ID' });
    }

    if (req.user && req.user.role === 'Doctor') {
      const doctorProfile = await Doctor.findOne({ where: { userId: req.user.id } });
      if (doctorProfile && diagnosis.doctorId !== doctorProfile.id) {
        return res.status(403).json({ 
          message: 'Forbidden: You cannot delete medical records authored by another doctor.' 
        });
      }
    }

    await diagnosis.destroy();

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
