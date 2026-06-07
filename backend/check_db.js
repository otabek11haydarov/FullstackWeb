const { Appointment, Patient, Doctor, User } = require('./src/models');

async function check() {
  const apps = await Appointment.findAll({
    include: [{ model: Patient, include: [User] }, { model: Doctor, include: [User] }]
  });
  console.log("Total Appointments:", apps.length);
  for (let a of apps) {
    console.log(`ID: ${a.id}, Date: ${a.date}, Doc: ${a.Doctor?.User?.lastName}, Patient: ${a.Patient?.User?.lastName}, Status: ${a.status}`);
  }
}
check().catch(console.error).finally(() => process.exit(0));
