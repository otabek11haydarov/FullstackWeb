require('dotenv').config();
const { sequelize, User } = require('./src/models/index');

async function syncAndSeed() {
  try {
    console.log('Forcing database sync (dropping tables)...');
    await sequelize.sync({ force: true });
    console.log('✅ Tables dropped and recreated successfully.');

    const adminEmail = process.env.SUPER_ADMIN_EMAIL;
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      console.log('Seeding Super Admin...');
      const admin = await User.create({
        firstName: 'Super',
        lastName: 'Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'Super Admin'
      });
      console.log(`✅ Super Admin created with email: ${adminEmail}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    process.exit(1);
  }
}

syncAndSeed();
