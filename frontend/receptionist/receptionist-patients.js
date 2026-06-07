// Receptionist Patients Logic

let allPatients = [];
let currentEditId = null;

document.addEventListener('DOMContentLoaded', async () => {
  syncReceptionistProfile();

  // Shift Lockdown limits interaction
  const isWorkingHours = applyShiftLockdown();

  // Logout handler
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  // Filter Listeners
  document.getElementById('searchPatient')?.addEventListener('input', applyFilters);
  document.getElementById('filterDoctor')?.addEventListener('change', applyFilters);

  // Form Submission
  document.getElementById('patientForm')?.addEventListener('submit', savePatient);

  // Clear modal on close
  const modalEl = document.getElementById('patientModal');
  if (modalEl) {
    modalEl.addEventListener('hidden.bs.modal', () => {
      document.getElementById('patientForm').reset();
      currentEditId = null;
      document.getElementById('patientPassword').removeAttribute('required');
    });
  }

  // Load Data
  await fetchDoctors();
  await fetchPatients();
});

function syncReceptionistProfile() {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = '../auth/login.html';
    return;
  }
  try {
    const user = JSON.parse(userStr);
    const nameEl = document.getElementById('receptionistName');
    const initEl = document.getElementById('headerInitial');
    if (nameEl && user.firstName && user.lastName) {
      nameEl.innerHTML = `${user.firstName} ${user.lastName} <span class="badge ms-1" style="background: rgba(123, 47, 247, 0.2); border: 1px solid rgba(123, 47, 247, 0.5); color: var(--neon-cyan); font-weight: normal; font-size: 0.75rem;">Receptionist</span>`;
    }
    if (initEl && user.firstName) {
      initEl.textContent = user.firstName.charAt(0).toUpperCase();
    }
  } catch(err) { console.error(err); window.showNotification("An error occurred. Please try again.", "error"); }
}

function checkShiftHours(shift) {
  const hour = new Date().getHours();
  if (shift === 'Morning') return hour >= 8 && hour < 16;
  if (shift === 'Evening') return hour >= 16 && hour <= 23;
  if (shift === 'Night') return hour >= 0 && hour < 8;
  return true; // default
}

function applyShiftLockdown() {
  const userStr = localStorage.getItem('user');
  let isWorkingHours = true;
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.shift) isWorkingHours = checkShiftHours(user.shift);
    } catch (e) {}
  }

  const banner = document.getElementById('shiftWarningBanner');
  const actionButtons = document.querySelectorAll('.action-button');

  if (!isWorkingHours) {
    if (banner) banner.classList.remove('d-none');
    actionButtons.forEach(btn => {
      btn.setAttribute('disabled', 'true');
      btn.classList.add('locked-action');
    });
  } else {
    if (banner) banner.classList.add('d-none');
    actionButtons.forEach(btn => {
      btn.removeAttribute('disabled');
      btn.classList.remove('locked-action');
    });
  }
  return isWorkingHours;
}

// API FETCHES
async function fetchDoctors() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:8000/api/receptionists/doctors', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.status === 'success') {
      const doctors = data.data.doctors;
      const select1 = document.getElementById('filterDoctor');
      const select2 = document.getElementById('patientDoctorId');
      doctors.forEach(doc => {
        const option = `<option value="${doc.id}">Dr. ${doc.User.firstName} ${doc.User.lastName}</option>`;
        if(select1) select1.insertAdjacentHTML('beforeend', option);
        if(select2) select2.insertAdjacentHTML('beforeend', option);
      });
    }
  } catch(err) { console.error(err); window.showNotification("An error occurred. Please try again.", "error"); }
}

async function fetchPatients() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:8000/api/receptionists/patients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.status === 'success') {
      allPatients = data.data.patients;
      renderPatients(allPatients);
    }
  } catch(err) { console.error(err); window.showNotification("An error occurred. Please try again.", "error"); }
}

function applyFilters() {
  const searchTerm = document.getElementById('searchPatient')?.value.toLowerCase() || '';
  const doctorFilter = document.getElementById('filterDoctor')?.value;

  const filtered = allPatients.filter(pat => {
    const fullName = `${pat.User?.firstName} ${pat.User?.lastName}`.toLowerCase();
    const email = (pat.User?.email || '').toLowerCase();
    const phone = (pat.contactNumber || '').toLowerCase();
    
    const matchesSearch = fullName.includes(searchTerm) || email.includes(searchTerm) || phone.includes(searchTerm);
    const matchesDoc = (doctorFilter === 'all' || pat.doctorId === doctorFilter);

    return matchesSearch && matchesDoc;
  });

  renderPatients(filtered);
}

function calculateAge(dobString) {
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function renderPatients(patientsList) {
  const tbody = document.getElementById('patientsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (patientsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-4">No patients found.</td></tr>`;
    return;
  }

  patientsList.forEach(pat => {
    const firstName = pat.User?.firstName || 'Unknown';
    const lastName = pat.User?.lastName || '';
    const initial = firstName.charAt(0).toUpperCase();
    const email = pat.User?.email || 'N/A';
    
    const age = pat.dateOfBirth ? `${calculateAge(pat.dateOfBirth)} y/o` : 'N/A';
    const dobStr = pat.dateOfBirth || '';

    const docName = pat.Doctor?.User ? `Dr. ${pat.Doctor.User.firstName} ${pat.Doctor.User.lastName}` : '<span class="text-secondary fst-italic">Unassigned</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center gap-3">
          <div class="rounded-circle d-flex justify-content-center align-items-center" style="width: 35px; height: 35px; background: linear-gradient(135deg, #00d2ff, #3a7bd5);">
            <span class="text-white fw-bold small">${initial}</span>
          </div>
          <span class="text-light fw-bold">${firstName} ${lastName}</span>
        </div>
      </td>
      <td class="text-secondary">${email}</td>
      <td class="text-light">${pat.contactNumber || '-'}</td>
      <td>
        <div class="text-light">${age}</div>
        <div class="text-secondary small">${dobStr}</div>
      </td>
      <td class="text-light">${pat.gender}</td>
      <td>${docName}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-info me-2 action-button" onclick="editPatient('${pat.id}')" title="Edit">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger action-button" onclick="deletePatient('${pat.id}', this)" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Re-apply lockdown so buttons are disabled if off-shift
  applyShiftLockdown();
}

async function savePatient(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  
  const payload = {
    firstName: document.getElementById('patientFirstName').value,
    lastName: document.getElementById('patientLastName').value,
    email: document.getElementById('patientEmail').value,
    dateOfBirth: document.getElementById('patientDOB').value,
    gender: document.getElementById('patientGender').value,
    contactNumber: document.getElementById('patientPhone').value,
    bloodType: document.getElementById('patientBloodType').value || null,
    allergies: document.getElementById('patientAllergies').value,
    chronicConditions: document.getElementById('patientChronic').value,
    medicalHistory: document.getElementById('patientHistory').value,
  };

  const pwd = document.getElementById('patientPassword').value;
  if (pwd) payload.password = pwd;

  const docId = document.getElementById('patientDoctorId').value;
  if (docId) payload.doctorId = docId;
  else payload.doctorId = null; // Unassigned

  try {
    let url = 'http://localhost:8000/api/receptionists/patients';
    let method = 'POST';

    if (currentEditId) {
      url += `/${currentEditId}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.status === 'success') {
      const modalInstance = bootstrap.Modal.getInstance(document.getElementById('patientModal'));
      modalInstance.hide();
      await fetchPatients();
    } else {
      window.showNotification(data.message || 'Error saving patient');
    }
  } catch(err) { console.error(err); window.showNotification("An error occurred. Please try again.", "error"); }
}

window.editPatient = (id) => {
  const pat = allPatients.find(p => p.id === id);
  if (!pat) return;

  currentEditId = id;
  document.getElementById('patientFirstName').value = pat.User?.firstName || '';
  document.getElementById('patientLastName').value = pat.User?.lastName || '';
  document.getElementById('patientEmail').value = pat.User?.email || '';
  
  document.getElementById('patientPassword').removeAttribute('required');
  document.getElementById('patientPassword').value = '';

  document.getElementById('patientDOB').value = pat.dateOfBirth || '';
  document.getElementById('patientGender').value = pat.gender || 'Male';
  document.getElementById('patientPhone').value = pat.contactNumber || '';
  document.getElementById('patientDoctorId').value = pat.doctorId || '';
  
  document.getElementById('patientBloodType').value = pat.bloodType || '';
  document.getElementById('patientAllergies').value = pat.allergies || '';
  document.getElementById('patientChronic').value = pat.chronicConditions || '';
  document.getElementById('patientHistory').value = pat.medicalHistory || '';

  const modal = new bootstrap.Modal(document.getElementById('patientModal'));
  modal.show();
};

window.deletePatient = async (id, btn) => {
  if (!confirm('Are you sure you want to delete this patient record?')) return;
  
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:8000/api/receptionists/patients/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      window.showNotification('Patient deleted successfully', 'success');
      
      // Smooth DOM removal without page reload
      if (btn) {
        const row = btn.closest('tr');
        if (row) {
          row.classList.add('fade-out');
          setTimeout(() => row.remove(), 300);
        }
      } else {
        await fetchPatients();
      }
    } else {
      const data = await res.json();
      window.showNotification(data.message || 'Error deleting patient', 'error');
    }
  } catch (err) {
    console.error('Delete error:', err);
    window.showNotification('Network error while deleting', 'error');
  }
};
