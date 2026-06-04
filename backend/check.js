const { sequelize } = require('./src/models');

async function check() {
  try {
    await sequelize.authenticate();
    const rows = await sequelize.query('SELECT * FROM "Diagnoses"');
    console.log('ROWS IN DIAGNOSES:', rows[0].length);
    console.log(rows[0]);
    if (rows[0].length > 0) {
        await sequelize.query('DELETE FROM "Diagnoses"');
        console.log('DELETED ALL ROWS');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
