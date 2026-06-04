const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/controllers/doctorController.js');

const appendContent = `
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
`;

fs.appendFileSync(file, appendContent, 'utf8');
console.log('Appended getDoctorAppointments to doctorController.js!');
