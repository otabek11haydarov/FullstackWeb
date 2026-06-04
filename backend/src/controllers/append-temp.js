
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
        { model: User, attributes: ['firstName', 'lastName', 'email', 'profileImage'] },
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
