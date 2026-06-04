const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  fetchAndRenderSchedule();
});

async function fetchAndRenderSchedule() {
  try {
    const res = await fetch(`${API_URL}/doctor/appointments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      renderTimeline(data.data.appointments);
    } else {
      showToast(data.message || 'Error fetching appointments', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server', 'error');
  }
}

function renderTimeline(appointments) {
  const container = document.getElementById('timelineContainer');
  container.innerHTML = '';
  
  // Working hours 08:00 to 20:00
  for (let hour = 8; hour <= 20; hour++) {
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
    
    // Group appointments that fall into this hour
    const hourAppts = appointments.filter(app => {
      const appHour = new Date(app.date).getHours();
      return appHour === hour;
    });

    // Check if it's lunch break (12:00 - 14:00, which means hour 12 and 13)
    let contentHtml = '';
    
    if (hour === 12 || hour === 13) {
      contentHtml = `<div class="bg-secondary bg-opacity-25 p-3 rounded-3 flex-grow-1 text-center text-uppercase tracking-wider fw-bold">Lunch Break</div>`;
    } else {
      if (hourAppts.length === 0) {
        contentHtml = `<div class="border border-secondary border-dashed p-3 rounded-3 flex-grow-1 text-muted">No appointments</div>`;
      } else {
        const apptsHtml = hourAppts.map(app => {
          const patName = app.Patient && app.Patient.User ? `${app.Patient.User.firstName} ${app.Patient.User.lastName}` : 'Unknown';
          const patientId = app.Patient ? app.Patient.id : '';
          return `
            <a href="patient-profile.html?id=${patientId}" class="glass-card text-decoration-none text-white d-block p-3 rounded-3 flex-grow-1 border-start border-info border-4 mb-2">
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

function showToast(message, type = 'success') {
  const container = document.querySelector('.toast-container');
  if (!container) return;
  const toastHtml = `
    <div class="toast align-items-center border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true" style="background: var(--glass-panel); backdrop-filter: blur(10px); border: 1px solid var(--glass-border); color: #fff;">
      <div class="d-flex">
        <div class="toast-body fw-medium">
          ${type === 'success' ? '<i class="fa-solid fa-circle-check" style="color: var(--neon-cyan);"></i>' : '<i class="fa-solid fa-triangle-exclamation" style="color: #f107a3;"></i>'} 
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', toastHtml);
  const toastEl = container.lastElementChild;
  const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}
