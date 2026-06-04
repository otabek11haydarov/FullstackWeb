
exports.getDoctorDiagnoses = async (req, res) => {
  try {
    const userId = req.user.id;
    const doctor = await Doctor.findOne({ where: { userId } });
    if (!doctor) {
      return res.status(404).json({ status: 'fail', message: 'Doctor profile not found.' });
    }

    const diagnoses = await Diagnosis.findAll({
      where: { doctorId: doctor.id },
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
