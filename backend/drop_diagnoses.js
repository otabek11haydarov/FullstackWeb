const { sequelize } = require('./src/models');

async function dropTable() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');
    await sequelize.query('DROP TABLE IF EXISTS "Diagnoses" CASCADE;');
    console.log('Dropped Diagnoses table');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

dropTable();
