const { Appointment, Patient, Doctor, User, ClinicalHistory, sequelize } = require('./src/models');

async function test() {
  try {
    const appointmentId = '3812a80a-bdd8-47b9-8cc8-f59a247db4e9';
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        { model: Patient, include: [{ model: User }] },
        { model: Doctor, include: [{ model: User }] }
      ]
    });

    const t = await sequelize.transaction();

    try {
      let nextTime = new Date(Date.now() + 2 * 60 * 60 * 1000); 
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
      
      await t.commit();
      console.log('Success');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch(err) {
    console.log('ERROR MESSAGE:', err.message);
  }
  process.exit();
}
test();
