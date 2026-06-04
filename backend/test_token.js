const { User, Doctor } = require('./src/models');
const jwt = require('jsonwebtoken');

async function test() {
  const user = await User.findOne({ where: { role: 'Doctor' } });
  if (!user) return console.log('No doctor user found');
  
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'super-secret-jwt-key-for-mrms-2024-secure', { expiresIn: '1h' });
  
  console.log('Token:', token);
}
test();
