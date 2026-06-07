const { User } = require('./src/models');
const http = require('http');

async function test() {
  const docUser = await User.findOne({ where: { role: 'Doctor' } });
  if (!docUser) return console.log("No doctor found");
  
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  const req = http.request(options, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      const data = JSON.parse(body);
      const token = data.token;
      
      const req2 = http.request({
        hostname: 'localhost',
        port: 8000,
        path: '/api/doctor/dashboard/stats',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }, res2 => {
        let body2 = '';
        res2.on('data', d => body2 += d);
        res2.on('end', () => {
          const stats = JSON.parse(body2);
          console.log("Stats Status:", stats.status);
          if (stats.data) {
            console.log("Upcoming length:", stats.data.upcomingAppointments?.length);
            console.log("Weekly length:", stats.data.weeklySchedule?.length);
          } else {
             console.log(stats);
          }
        });
      });
      req2.end();
    });
  });

  // assuming password is 'password123' based on seeds
  req.write(JSON.stringify({ email: docUser.email, password: 'password123' }));
  req.end();
}

test().catch(console.error);
