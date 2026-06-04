const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);
let doctorId = null;
let patientId = null;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  const urlParams = new URLSearchParams(window.location.search);
  patientId = urlParams.get('id');
  if (!patientId) {
    alert('No patient selected.');
    window.location.href = 'my-patients.html';
    return;
  }

  await fetchDoctorAndPatient();
});

async function fetchDoctorAndPatient() {
  try {
    // 1. Get Doctor ID from user ID
    const resDoc = await fetch(`${API_URL}/doctors`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const docData = await resDoc.json();
    if (resDoc.ok && docData.data.doctors) {
      const myDoctor = docData.data.doctors.find(d => d.userId === user.id);
      if (myDoctor) {
        doctorId = myDoctor.id;
        
        // 2. Get Patient History
        const resPat = await fetch(`${API_URL}/doctors/${doctorId}/patients/${patientId}/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const patData = await resPat.json();
        if (resPat.ok) {
          renderPatientProfile(patData.data.patient);
        } else {
          showToast(patData.message || 'Error loading patient', 'error');
        }
      } else {
        showToast('Doctor profile not found for current user.', 'error');
      }
    }
  } catch (err) {
    showToast('Failed to load data.', 'error');
  }
}

function renderPatientProfile(patient) {
  const name = `${patient.User.firstName} ${patient.User.lastName}`;
  document.getElementById('patName').textContent = name;
  document.getElementById('patAvatar').textContent = patient.User.firstName.charAt(0).toUpperCase();
  document.getElementById('patEmail').textContent = patient.User.email || 'No email provided';
  document.getElementById('patDob').textContent = patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '--';
  document.getElementById('patGender').textContent = patient.gender || '--';
  document.getElementById('patContact').textContent = patient.contactNumber || '--';

  checkAppointmentAccess(patient.Appointments || []);
}

function checkAppointmentAccess(appointments) {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  let hasActiveAppointment = false;
  
  for (const appt of appointments) {
    // Treat "Scheduled" as valid for editing
    if (appt.status && appt.status.toLowerCase() === 'cancelled') continue;
    
    const apptTime = new Date(appt.date).getTime();
    // ±1 Hour Window
    if (now >= apptTime - ONE_HOUR && now <= apptTime + ONE_HOUR) {
      hasActiveAppointment = true;
      break;
    }
  }
  
  // If no active appointment, enforce Read-Only Mode
  if (!hasActiveAppointment) {
    document.getElementById('readOnlyBanner').style.display = 'block';
    
    // Disable inputs and buttons inside forms
    const inputs = document.querySelectorAll('input, select, textarea, button[type="submit"]');
    inputs.forEach(el => {
      el.disabled = true;
    });
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
