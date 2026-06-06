const { sequelize } = require('./src/config/database');

async function alterEnums() {
  try {
    await sequelize.query(`ALTER TYPE "enum_Appointments_status" ADD VALUE 'Pending';`);
    console.log('Added Pending to enum');
  } catch (err) { console.log(err.message); }
  
  try {
    await sequelize.query(`ALTER TYPE "enum_Appointments_status" ADD VALUE 'Rejected';`);
    console.log('Added Rejected to enum');
  } catch (err) { console.log(err.message); }

  process.exit();
}

alterEnums();
