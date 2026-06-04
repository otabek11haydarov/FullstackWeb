const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);

document.addEventListener('DOMContentLoaded', () => {
  // Populate User Avatar
  const avatar = document.getElementById('user-avatar');
  if (avatar && user.firstName) {
    avatar.textContent = user.firstName.charAt(0).toUpperCase();
  }

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  fetchMyPatients();
});

async function fetchMyPatients() {
  const container = document.getElementById('patientsContainer');
  try {
    const res = await fetch(`${API_URL}/doctor/patients`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await res.json();
    if (res.ok) {
      renderPatients(data.data.patients);
    } else {
      container.innerHTML = `<div class="col-12"><div class="alert alert-danger">${data.message}</div></div>`;
    }
  } catch (err) {
    container.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error loading patients.</div></div>`;
  }
}

function renderPatients(patients) {
  const container = document.getElementById('patientsContainer');
  container.innerHTML = '';

  if (patients.length === 0) {
    container.innerHTML = '<div class="col-12"><p class="text-muted">No assigned patients found.</p></div>';
    return;
  }

  patients.forEach(patient => {
    const name = `${patient.User.firstName} ${patient.User.lastName}`;
    const initial = patient.User.firstName.charAt(0).toUpperCase();
    
    // Render Diagnoses tags
    let diagnosesHtml = '<p class="text-muted" style="font-size: 0.85rem; margin-bottom: 5px;">No active diagnoses</p>';
    if (patient.Diagnoses && patient.Diagnoses.length > 0) {
      diagnosesHtml = patient.Diagnoses.map(d => {
        const severityClass = (d.severity && d.severity.toLowerCase() === 'high' || d.severity === 'critical') ? 'severe' : '';
        return `<span class="disease-tag ${severityClass}">${d.condition}</span>`;
      }).join('');
    }

    container.innerHTML += `
      <div class="col-md-6 col-lg-4">
        <div class="patient-card">
          <div class="d-flex align-items-center mb-3">
            <div class="patient-avatar-lg me-3">${initial}</div>
            <div>
              <h5 class="mb-1 fw-bold text-white">${name}</h5>
              <div class="text-white-50" style="font-size: 0.85rem;"><i class="fa-regular fa-calendar me-1"></i> DOB: ${new Date(patient.dateOfBirth).toLocaleDateString()}</div>
            </div>
          </div>
          
          <div class="mb-4 flex-grow-1">
            <h6 class="text-white-50" style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Active Conditions</h6>
            <div class="mt-2">
              ${diagnosesHtml}
            </div>
          </div>
          
          <div class="mt-auto">
            <a href="patient-profile.html?id=${patient.id}" class="btn-neon-glow w-100">View Profile</a>
          </div>
        </div>
      </div>
    `;
  });
}
