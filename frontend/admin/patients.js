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

  document.getElementById('submitAddPatientBtn').addEventListener('click', createPatient);
  document.getElementById('submitEditPatientBtn').addEventListener('click', updatePatient);

  // Set Profile Footer
  document.getElementById('userNameDisplay').textContent = `${user.firstName} ${user.lastName}`;
  document.getElementById('userInitial').textContent = user.firstName.charAt(0).toUpperCase();
  document.getElementById('userRoleDisplay').textContent = user.role.replace('_', ' ');

  fetchPatients();
  fetchDoctorsForDropdown();
});

let patientsData = [];
const addPatientModalInstance = new bootstrap.Modal(document.getElementById('addPatientModal'));
const editPatientModalInstance = new bootstrap.Modal(document.getElementById('editPatientModal'));

// --- Custom UI Helpers ---
let confirmCallback = null;
const confirmModalEl = document.getElementById('customConfirmModal');
let confirmModal = null;
if (confirmModalEl) {
  confirmModal = new bootstrap.Modal(confirmModalEl);
  document.getElementById('confirmModalBtn').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    confirmModal.hide();
  });
}

function showConfirm(message, callback) {
  const textEl = document.getElementById('confirmModalText');
  if (textEl) textEl.textContent = message;
  confirmCallback = callback;
  if (confirmModal) confirmModal.show();
}

function showToast(message, type = 'success') {
  const container = document.querySelector('.toast-container');
  if (!container) return;
  
  const icon = type === 'success' 
    ? '<i class="fa-solid fa-circle-check toast-success-icon me-2"></i>' 
    : '<i class="fa-solid fa-circle-exclamation toast-error-icon me-2"></i>';
  
  const toastHtml = `
    <div class="toast glass-toast align-items-center border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center fw-medium">
          ${icon} ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', toastHtml);
  const toastEl = container.lastElementChild;
  const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
  toast.show();
  
  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

async function fetchPatients() {
  try {
    const res = await fetch(`${API_URL}/patients`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      patientsData = data.data.patients;
      renderPatients();
    } else {
      showToast(data.message, 'danger');
    }
  } catch (err) {
    showToast('Error fetching patients', 'danger');
  }
}

async function fetchDoctorsForDropdown() {
  try {
    const res = await fetch(`${API_URL}/doctors`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      const doctors = data.data.doctors;
      const addSelect = document.getElementById('addAssignedDoctor');
      const editSelect = document.getElementById('editAssignedDoctor');
      doctors.forEach(doc => {
        const option1 = document.createElement('option');
        option1.value = doc.id;
        option1.textContent = `Dr. ${doc.User.lastName} (${doc.specialization})`;
        addSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = doc.id;
        option2.textContent = `Dr. ${doc.User.lastName} (${doc.specialization})`;
        editSelect.appendChild(option2);
      });
    }
  } catch (err) {
    console.error('Failed to load doctors for dropdown', err);
  }
}

function calculateAge(dobStr) {
  const dob = new Date(dobStr);
  const ageDifMs = Date.now() - dob.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function renderPatients() {
  const tbody = document.getElementById('patientsTableBody');
  tbody.innerHTML = '';

  patientsData.forEach(patient => {
    const age = calculateAge(patient.dateOfBirth);
    const assignedDoc = patient.Doctor ? `Dr. ${patient.Doctor.User.firstName} ${patient.Doctor.User.lastName}` : '<span class="text-muted">Unassigned</span>';
    
    const tr = document.createElement('tr');
    tr.id = `patient-row-${patient.id}`;
    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="avatar text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px; background: var(--secondary-gradient);">
            ${patient.User.firstName.charAt(0)}
          </div>
          <div class="fw-bold name-col">${patient.User.firstName} ${patient.User.lastName}</div>
        </div>
      </td>
      <td style="color: var(--text-secondary);" class="email-col">${patient.User.email}</td>
      <td class="dob-col">${patient.dateOfBirth} <small class="text-muted">(${age} yo)</small></td>
      <td class="gender-col">${patient.gender}</td>
      <td class="doc-col">${assignedDoc}</td>
      <td class="text-end">
        <div class="d-flex gap-2 align-items-center justify-content-end">
          <button class="btn btn-sm text-info view-btn" data-id="${patient.id}" title="View Profile" style="background: rgba(0, 245, 255, 0.1); border: 1px solid rgba(0, 245, 255, 0.3);">
              <i class="fa-solid fa-eye"></i>
          </button>
          <button class="btn btn-sm text-primary edit-btn" data-id="${patient.id}" title="Edit Patient" style="background: rgba(123, 47, 247, 0.1); border: 1px solid rgba(123, 47, 247, 0.3);">
              <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm text-danger delete-btn" onclick="deletePatient('${patient.id}')" title="Delete Patient" style="background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3);">
              <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Event Delegation for View, Edit, Delete buttons
  tbody.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    
    const id = target.getAttribute('data-id');
    
    if (target.classList.contains('delete-btn')) {
      deletePatient(id);
    } else if (target.classList.contains('view-btn')) {
      window.location.href = `patient-profile.html?id=${id}`;
    } else if (target.classList.contains('edit-btn')) {
      openEditPatientModal(id);
    }
  });
}

async function createPatient() {
  const payload = {
    firstName: document.getElementById('addFirstName').value,
    lastName: document.getElementById('addLastName').value,
    email: document.getElementById('addEmail').value,
    password: document.getElementById('addPassword').value,
    age: document.getElementById('addAge').value,
    gender: document.getElementById('addGender').value,
    doctorId: document.getElementById('addAssignedDoctor').value || null
  };

  if (!payload.firstName || !payload.lastName || !payload.email || !payload.password || !payload.age) {
    showToast('Please fill all required fields.', 'danger');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/patients`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (res.ok || res.status === 201) {
      addPatientModalInstance.hide();
      showToast('Successfully added patient!', 'success');
      document.getElementById('addPatientForm').reset();
      
      const newPat = data.data.patient;
      patientsData.unshift(newPat);
      renderPatients();
    } else {
      showToast(data.message || 'Error adding patient', 'danger');
    }
  } catch (err) {
    showToast('Network error while adding patient', 'danger');
  }
}

async function deletePatient(id) {
  showConfirm('Are you sure you want to remove this patient?', async () => {
    try {
      const res = await fetch(`${API_URL}/patients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok || res.status === 204) {
        showToast('Patient removed', 'success');
        
        const row = document.getElementById(`patient-row-${id}`);
        if (row) row.remove();
        
        patientsData = patientsData.filter(p => p.id !== id);
      } else {
        const data = await res.json();
        showToast(data.message, 'danger');
      }
    } catch (err) {
      showToast('Error deleting patient', 'danger');
    }
  });
}

function openEditPatientModal(id) {
  const patient = patientsData.find(p => String(p.id) === String(id));
  if (!patient) return;

  document.getElementById('editPatientId').value = patient.id;
  document.getElementById('editFirstName').value = patient.User.firstName;
  document.getElementById('editLastName').value = patient.User.lastName;
  document.getElementById('editEmail').value = patient.User.email;
  document.getElementById('editPassword').value = '';
  document.getElementById('editAge').value = calculateAge(patient.dateOfBirth);
  document.getElementById('editGender').value = patient.gender;
  document.getElementById('editAssignedDoctor').value = patient.doctorId || '';

  editPatientModalInstance.show();
}

async function updatePatient() {
  const id = document.getElementById('editPatientId').value;
  const payload = {
    firstName: document.getElementById('editFirstName').value,
    lastName: document.getElementById('editLastName').value,
    email: document.getElementById('editEmail').value,
    age: document.getElementById('editAge').value,
    gender: document.getElementById('editGender').value,
    doctorId: document.getElementById('editAssignedDoctor').value || null
  };

  const password = document.getElementById('editPassword').value;
  if (password.trim() !== '') {
    payload.password = password;
  }

  try {
    const res = await fetch(`${API_URL}/patients/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok || res.status === 200) {
      editPatientModalInstance.hide();
      showToast('Updated successfully', 'success');

      // Update local data
      const updatedPat = data.data.patient;
      const index = patientsData.findIndex(p => String(p.id) === String(id));
      if (index !== -1) {
        if (!updatedPat.User) {
           updatedPat.User = patientsData[index].User;
           updatedPat.User.firstName = payload.firstName;
           updatedPat.User.lastName = payload.lastName;
           updatedPat.User.email = payload.email;
        }
        if (!updatedPat.Doctor && updatedPat.doctorId) {
           const doctorOption = document.getElementById('editAssignedDoctor').options[document.getElementById('editAssignedDoctor').selectedIndex];
             if (doctorOption) {
               const docName = doctorOption.textContent.replace('Dr. ', '').split(' (')[0];
               updatedPat.Doctor = { User: { firstName: '', lastName: docName } };
             }
        }
        patientsData[index] = updatedPat;
      }

      // Re-render the specific row
      const tr = document.getElementById(`patient-row-${id}`);
      if (tr) {
        const age = calculateAge(updatedPat.dateOfBirth);
        const assignedDoc = updatedPat.Doctor ? `Dr. ${updatedPat.Doctor.User.firstName} ${updatedPat.Doctor.User.lastName}` : '<span class="text-muted">Unassigned</span>';
        
        tr.querySelector('.name-col').textContent = `${updatedPat.User.firstName} ${updatedPat.User.lastName}`;
        tr.querySelector('.email-col').textContent = updatedPat.User.email;
        tr.querySelector('.dob-col').innerHTML = `${updatedPat.dateOfBirth.split('T')[0]} <small class="text-muted">(${age} yo)</small>`;
        tr.querySelector('.gender-col').textContent = updatedPat.gender;
        tr.querySelector('.doc-col').innerHTML = assignedDoc;
        tr.querySelector('.avatar').textContent = updatedPat.User.firstName.charAt(0);
      }
    } else {
      showToast(data.message || 'Error updating patient', 'danger');
    }
  } catch (err) {
    showToast('Network error while updating patient', 'danger');
  }
}
