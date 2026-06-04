const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/controllers/doctorController.js');

const appendContent = `
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
        { model: User, attributes: ['firstName', 'lastName', 'email', 'phone'] },
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
`;

fs.appendFileSync(file, appendContent, 'utf8');
console.log('Appended getPatientProfile to doctorController.js!');
