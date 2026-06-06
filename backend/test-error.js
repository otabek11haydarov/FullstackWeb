const { Appointment, sequelize } = require('./src/models');

async function test() {
  try {
    const appt = await Appointment.findOne();
    if (!appt) { console.log('no appt'); return; }
    
    await appt.update({ status: 'Pending' });
    console.log('Success');
  } catch(err) {
    console.log('ERROR MESSAGE:', err.message);
  }
  process.exit();
}
test();
