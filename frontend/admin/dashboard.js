// Configuration
const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);

// Elements
const userNameDisplay = document.getElementById('userNameDisplay');
const userRoleDisplay = document.getElementById('userRoleDisplay');
const userInitial = document.getElementById('userInitial');
const welcomeGreeting = document.getElementById('welcomeGreeting');
const currentDateDisplay = document.getElementById('currentDateDisplay');

// Global Theme Logic
let chartInstances = [];

function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    primary: '#7b2ff7',
    secondary: '#f107a3',
    tertiary: '#00d2ff',
    text: isDark ? '#e2e8f0' : '#212529',
    bg: isDark ? '#1e1e2d' : '#ffffff'
  };
}

function initDashboard() {
  // Set User Profile UI
  userNameDisplay.textContent = `${user.firstName} ${user.lastName}`;
  userInitial.textContent = user.firstName.charAt(0).toUpperCase();
  
  let roleFormatted = user.role.replace('_', ' ');
  roleFormatted = roleFormatted.charAt(0).toUpperCase() + roleFormatted.slice(1);
  userRoleDisplay.textContent = roleFormatted;
  
  welcomeGreeting.textContent = `Welcome back, ${user.firstName}! Here's what's happening in your clinic today.`;

  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  currentDateDisplay.textContent = new Date().toLocaleDateString('en-US', options);

  // RBAC Enforcement is now handled globally in theme-init.js

  // Highlight active link based on current path
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href !== '#' && currentPath === href) {
      document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
  });

  // Logout Logic
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  // Initialize Charts & Data
  fetchAnalytics();
  fetchStats();
}

// Listen for global theme toggle to re-render charts
window.addEventListener('themeChanged', () => {
  chartInstances.forEach(chart => chart.destroy());
  chartInstances = [];
  fetchAnalytics();
});

async function fetchAnalytics() {
  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    const res = await fetch(`${API_URL}/dashboard/analytics`, { headers });
    const data = await res.json();
    
    if (data.status === 'success') {
      const { departments, genders, severities, alerts } = data.data;
      
      document.getElementById('alert-high-priority').textContent = alerts.highPriority;
      document.getElementById('alert-critical-diagnoses').textContent = alerts.critical;
      
      initCharts(departments, genders, severities);
    }
  } catch (error) {
    console.error('Error fetching analytics:', error);
  }
}

function initCharts(departments, genders, severities) {
  const colors = getThemeColors();
  const neonPalette = ['#00f5ff', '#7b2ff7', '#f107a3', '#ffc107', '#00ff9d', '#ff3366'];
  
  Chart.defaults.color = colors.text;

  // 1. Departments Chart
  const ctxDept = document.getElementById('chartDepartments').getContext('2d');
  const chartDept = new Chart(ctxDept, {
    type: 'doughnut',
    data: {
      labels: departments.map(d => d.specialization || 'General'),
      datasets: [{
        data: departments.map(d => parseInt(d.count)),
        backgroundColor: neonPalette.slice(0, departments.length),
        borderWidth: 0,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '80%' }
  });

  // 2. Gender Chart
  const ctxGender = document.getElementById('chartGender').getContext('2d');
  const chartGender = new Chart(ctxGender, {
    type: 'doughnut',
    data: {
      labels: genders.map(g => g.gender),
      datasets: [{
        data: genders.map(g => parseInt(g.count)),
        backgroundColor: [neonPalette[2], neonPalette[0], neonPalette[3]],
        borderWidth: 0,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '80%' }
  });

  // 3. Severity Chart
  const ctxSeverity = document.getElementById('chartSeverity').getContext('2d');
  const chartSeverity = new Chart(ctxSeverity, {
    type: 'doughnut',
    data: {
      labels: severities.map(s => s.severity),
      datasets: [{
        data: severities.map(s => parseInt(s.count)),
        backgroundColor: [neonPalette[1], neonPalette[3], neonPalette[5]],
        borderWidth: 0,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '80%' }
  });
  
  chartInstances.push(chartDept, chartGender, chartSeverity);
}

async function fetchStats() {
  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const res = await fetch(`${API_URL}/dashboard/stats`, { headers });
    const data = await res.json();

    if (data.status === 'success') {
      const stats = data.data;
      
      // Update Stat Cards
      document.getElementById('statDoctors').textContent = stats.totalDoctors;
      document.getElementById('statPatients').textContent = stats.totalPatients;
      document.getElementById('statDiagnoses').textContent = stats.totalDiagnoses;
      document.getElementById('statAppointments').textContent = stats.todayAppointments;

      // Update Recent Activity
      const activityContainer = document.getElementById('recent-activity-container');
      activityContainer.innerHTML = '';
      
      if (stats.recentActivity.length === 0) {
        activityContainer.innerHTML = '<p class="text-muted">No recent activity.</p>';
      } else {
        stats.recentActivity.forEach(activity => {
          const colorClass = activity.type === 'patient' ? 'var(--primary-solid)' : 'var(--secondary-solid)';
          
          // Calculate relative time (e.g. "10 min ago")
          const diffMs = Date.now() - new Date(activity.createdAt).getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          let timeAgo = '';
          if (diffMins < 60) timeAgo = `${diffMins} min ago`;
          else if (diffHours < 24) timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
          else timeAgo = new Date(activity.createdAt).toLocaleDateString();

          const itemHTML = `
            <div class="timeline-item d-flex mb-4">
              <div class="timeline-dot mt-1 me-3 rounded-circle" style="width:10px; height:10px; background: ${colorClass};"></div>
              <div class="flex-grow-1">
                <p class="mb-0 fw-semibold" style="color: var(--text-primary);">${activity.message}</p>
                <small style="color: var(--text-secondary);">${activity.user} · ${timeAgo}</small>
              </div>
            </div>
          `;
          activityContainer.insertAdjacentHTML('beforeend', itemHTML);
        });
      }

      // Update Upcoming Appointments
      const appointmentsBody = document.getElementById('upcoming-appointments-body');
      appointmentsBody.innerHTML = '';
      
      if (stats.upcomingAppointments.length === 0) {
        appointmentsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No upcoming appointments today.</td></tr>';
      } else {
        stats.upcomingAppointments.forEach(appt => {
          const patName = appt.Patient ? `${appt.Patient.User.firstName} ${appt.Patient.User.lastName}` : 'Unknown';
          const docName = appt.Doctor ? `Dr. ${appt.Doctor.User.lastName}` : 'Unknown';
          
          // Determine badge color based on reason mapping
          let badgeColor = 'rgba(123,47,247,0.1)';
          let textColor = 'var(--primary-solid)';
          if (appt.reason && appt.reason.toLowerCase().includes('follow')) {
             badgeColor = 'rgba(241,7,163,0.1)';
             textColor = 'var(--secondary-solid)';
          }

          const timeString = new Date(appt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

          const trHTML = `
            <tr>
              <td class="fw-semibold" style="color: var(--text-muted);">${timeString}</td>
              <td class="fw-bold text-main">${patName}</td>
              <td style="color: var(--text-muted);">${docName}</td>
              <td><span class="badge rounded-pill" style="background: ${badgeColor}; color: ${textColor};">${appt.reason || 'Consultation'}</span></td>
            </tr>
          `;
          appointmentsBody.insertAdjacentHTML('beforeend', trHTML);
        });
      }
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
  }
}

document.addEventListener('DOMContentLoaded', initDashboard);
