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

let allPatients = [];

async function fetchMyPatients() {
  const container = document.getElementById('patientsContainer');
  try {
    const res = await fetch(`${API_URL}/doctor/patients`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await res.json();
    if (res.ok) {
      allPatients = data.data.patients;
      renderPatients(allPatients);
    } else {
      container.innerHTML = `<div class="col-12"><div class="alert alert-danger">${data.message}</div></div>`;
    }
  } catch (err) {
    container.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error loading patients.</div></div>`;
  }
}

// Live Search Listener
document.getElementById('patientSearch')?.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = allPatients.filter(patient => {
    const fn = (patient.User && patient.User.firstName) ? patient.User.firstName.toLowerCase() : '';
    const ln = (patient.User && patient.User.lastName) ? patient.User.lastName.toLowerCase() : '';
    return fn.includes(term) || ln.includes(term);
  });
  renderPatients(filtered);
});

function renderPatients(patients) {
  const container = document.getElementById('patientsContainer');
  container.innerHTML = '';

  if (patients.length === 0) {
    container.innerHTML = '<div class="col-12"><p class="text-white-50 text-center py-5">No patients found matching your search.</p></div>';
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
        <div class="glass-card p-4 rounded-4 h-100 d-flex flex-column border border-info border-opacity-25 bg-dark bg-opacity-50">
          <div class="d-flex align-items-center mb-3">
            <div class="patient-avatar-lg me-3 rounded-circle bg-primary bg-gradient d-flex justify-content-center align-items-center text-white fw-bold fs-4">${initial}</div>
            <div>
              <h5 class="mb-1 fw-bold text-white">${name}</h5>
              <div class="text-white-50 small"><i class="fa-regular fa-calendar me-1"></i> DOB: ${new Date(patient.dateOfBirth).toLocaleDateString()}</div>
            </div>
          </div>
          
          <div class="mb-4 flex-grow-1">
            <h6 class="text-white-50 small text-uppercase tracking-wider">Active Conditions</h6>
            <div class="mt-2">
              ${diagnosesHtml}
            </div>
          </div>
          
          <div class="mt-auto">
            <a href="patient-profile.html?id=${patient.id}" class="btn btn-outline-info w-100 mt-3 text-decoration-none rounded-pill fw-bold">View Profile</a>
          </div>
        </div>
      </div>
    `;
  });
}
