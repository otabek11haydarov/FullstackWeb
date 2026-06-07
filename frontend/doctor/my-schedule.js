const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);

let currentDate = new Date();
let allAppointments = [];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  const datePicker = document.getElementById('scheduleDatePicker');
  if (datePicker) {
    datePicker.value = currentDate.toISOString().split('T')[0];
    datePicker.addEventListener('change', (e) => {
      currentDate = new Date(e.target.value);
      updateDateDisplay();
      renderTimeline(allAppointments);
    });
  }
  updateDateDisplay();

  fetchAndRenderSchedule();
});

window.changeDate = function(offset) {
  currentDate.setDate(currentDate.getDate() + offset);
  const datePicker = document.getElementById('scheduleDatePicker');
  if (datePicker) {
    datePicker.value = currentDate.toISOString().split('T')[0];
  }
  updateDateDisplay();
  renderTimeline(allAppointments);
};

function updateDateDisplay() {
  const display = document.getElementById('currentDateDisplay');
  if (display) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    display.textContent = currentDate.toLocaleDateString(undefined, options);
  }
}

async function fetchAndRenderSchedule() {
  try {
    const res = await fetch(`${API_URL}/doctor/appointments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      allAppointments = data.data.appointments;
      renderTimeline(allAppointments);
    } else {
      window.showNotification(data.message || 'Error fetching appointments', 'error');
    }
  } catch (err) {
    window.showNotification('Failed to connect to server', 'error');
  }
}

function renderTimeline(appointments) {
  const container = document.getElementById('dailyTimeline');
  container.innerHTML = '';
  
  const targetDateStr = currentDate.toISOString().split('T')[0];

  const todaysAppts = appointments.filter(app => {
    return app.date && app.date.startsWith(targetDateStr);
  });

  // Working hours 08:00 to 20:00
  for (let hour = 8; hour <= 20; hour++) {
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
    
    // Group appointments that fall into this hour
    const hourAppts = todaysAppts.filter(app => {
      const appHour = new Date(app.date).getHours();
      return appHour === hour;
    });

    // Check if it's lunch break (12:00 - 14:00, which means hour 12 and 13)
    let contentHtml = '';
    
    if (hour === 12 || hour === 13) {
      contentHtml = `<div class="bg-secondary bg-opacity-25 p-3 rounded-3 flex-grow-1 text-center text-uppercase tracking-wider fw-bold">Lunch Break</div>`;
    } else {
      if (hourAppts.length === 0) {
        contentHtml = `<div class="border border-secondary border-dashed p-3 rounded-3 flex-grow-1 text-white-50">No appointments</div>`;
      } else {
        const apptsHtml = hourAppts.map(app => {
          console.log("Appointment Data:", app);
          const patName = app.Patient && app.Patient.User ? `${app.Patient.User.firstName} ${app.Patient.User.lastName}` : 'Unknown';
          const correctPatientId = app.Patient?.id || app.patientId;
          return `
            <a href="patient-profile.html?id=${correctPatientId}" class="glass-card text-decoration-none text-white d-block p-3 rounded-3 flex-grow-1 border-start border-info border-4 mb-2">
              <h6 class="fw-bold mb-1">${patName}</h6>
              <p class="text-secondary mb-0 small">${app.reason || 'Routine Checkup'}</p>
            </a>
          `;
        }).join('');
        contentHtml = `<div class="flex-grow-1">${apptsHtml}</div>`;
      }
    }

    const slotHtml = `
      <div class="d-flex mb-3 align-items-stretch">
        <div class="text-info fw-bold me-4 time-col-min">${timeLabel}</div>
        ${contentHtml}
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', slotHtml);
  }
}

