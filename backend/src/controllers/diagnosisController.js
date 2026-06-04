const { Diagnosis, Patient, Doctor, User } = require('../models');

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
    const { patientId, doctorId, condition, severity, prescription, date } = req.body;

    const diagnosis = await Diagnosis.create({
      patientId,
      doctorId,
      condition,
      severity,
      prescription,
      date: date || new Date()
    });

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
