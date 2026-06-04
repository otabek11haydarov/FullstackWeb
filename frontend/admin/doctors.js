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

  // Event Delegation for Edit and Delete buttons
  document.getElementById('doctorsTableBody').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      openEditModal(id);
    } else if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      deleteDoctor(id);
    } else if (e.target.closest('.view-btn')) {
      const id = e.target.closest('.view-btn').getAttribute('data-id');
      window.location.href = `doctor-profile.html?id=${id}`;
    }
  });

  document.getElementById('submitAddDoctorBtn').addEventListener('click', createDoctor);
  document.getElementById('submitEditDoctorBtn').addEventListener('click', updateDoctor);

  fetchDoctors();
});

let doctorsData = [];
const doctorModal = new bootstrap.Modal(document.getElementById('doctorModal'));
const addDoctorModalInstance = new bootstrap.Modal(document.getElementById('addDoctorModal'));
const editDoctorModalInstance = new bootstrap.Modal(document.getElementById('editDoctorModal'));

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

async function fetchDoctors() {
  try {
    const res = await fetch(`${API_URL}/doctors`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      doctorsData = data.data.doctors;
      renderDoctors();
    } else {
      showToast(data.message, 'danger');
    }
  } catch (err) {
    showToast('Error fetching doctors', 'danger');
  }
}

function renderDoctors() {
  const tbody = document.getElementById('doctorsTableBody');
  tbody.innerHTML = '';

  doctorsData.forEach(doctor => {
    const tr = document.createElement('tr');
    tr.id = `doctor-row-${doctor.id}`;
    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="avatar text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px; background: var(--primary-gradient);">
            ${doctor.User.firstName.charAt(0)}
          </div>
          <div class="fw-bold name-col">${doctor.User.firstName} ${doctor.User.lastName}</div>
        </div>
      </td>
      <td style="color: var(--text-secondary);" class="email-col">${doctor.User.email}</td>
      <td class="spec-col">${doctor.specialization}</td>
      <td style="color: var(--text-secondary);">${doctor.licenseNumber}</td>
      <td class="exp-col">${doctor.experienceYears} Yrs</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-info border-0 rounded-circle me-1 view-btn" data-id="${doctor.id}" title="View Profile"><i class="fa-solid fa-eye" style="pointer-events: none;"></i></button>
        <button class="btn btn-sm btn-outline-primary border-0 rounded-circle me-1 edit-btn" data-id="${doctor.id}" title="Edit"><i class="fa-regular fa-pen-to-square" style="pointer-events: none;"></i></button>
        <button class="btn btn-sm btn-outline-danger border-0 rounded-circle delete-btn" data-id="${doctor.id}" title="Delete"><i class="fa-regular fa-trash-can" style="pointer-events: none;"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openEditModal(id) {
  const doctor = doctorsData.find(d => d.id === id);
  if (!doctor) return;

  document.getElementById('doctorId').value = doctor.id;
  document.getElementById('firstName').value = doctor.User.firstName;
  document.getElementById('lastName').value = doctor.User.lastName;
  document.getElementById('email').value = doctor.User.email;
  document.getElementById('specialization').value = doctor.specialization;
  document.getElementById('experienceYears').value = doctor.experienceYears || 0;
  
  document.getElementById('password').value = '';
  doctorModal.show();
}

async function saveDoctor() {
  const id = document.getElementById('doctorId').value;
  if (!id) return;

  const payload = {
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    email: document.getElementById('email').value,
    specialization: document.getElementById('specialization').value,
    experienceYears: document.getElementById('experienceYears').value
  };

  const password = document.getElementById('password').value;
  if (password) {
    payload.password = password;
  }

  try {
    const res = await fetch(`${API_URL}/doctors/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (res.ok) {
      doctorModal.hide();
      showToast('Doctor updated successfully', 'success');
      
      const docIndex = doctorsData.findIndex(d => d.id === id);
      if (docIndex !== -1) {
        doctorsData[docIndex] = data.data.doctor;
        const updatedDoc = data.data.doctor;
        const row = document.getElementById(`doctor-row-${id}`);
        if (row) {
          row.querySelector('.name-col').textContent = `${updatedDoc.User.firstName} ${updatedDoc.User.lastName}`;
          row.querySelector('.avatar').textContent = updatedDoc.User.firstName.charAt(0);
          row.querySelector('.email-col').textContent = updatedDoc.User.email;
          row.querySelector('.spec-col').textContent = updatedDoc.specialization;
          row.querySelector('.exp-col').textContent = `${updatedDoc.experienceYears} Yrs`;
        }
      }
    } else {
      showToast(data.message, 'danger');
    }
  } catch (err) {
    showToast('Error saving doctor', 'danger');
  }
}

async function deleteDoctor(id) {
  showConfirm('Are you sure you want to remove this doctor?', async () => {
    try {
      const res = await fetch(`${API_URL}/doctors/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok || res.status === 204) {
        showToast('Doctor removed', 'success');
        
        const row = document.getElementById(`doctor-row-${id}`);
        if (row) row.remove();
        
        doctorsData = doctorsData.filter(d => d.id !== id);
      } else {
        const data = await res.json();
        showToast(data.message, 'danger');
      }
    } catch (err) {
      showToast('Error deleting doctor', 'danger');
    }
  });
}

async function createDoctor() {
  const payload = {
    firstName: document.getElementById('addFirstName').value,
    lastName: document.getElementById('addLastName').value,
    email: document.getElementById('addEmail').value,
    password: document.getElementById('addPassword').value,
    specialization: document.getElementById('addSpecialization').value,
    experienceYears: document.getElementById('addExperienceYears').value || 0
  };

  if (!payload.firstName || !payload.lastName || !payload.email || !payload.password || !payload.specialization) {
    showToast('Please fill all required fields.', 'danger');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/doctors`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (res.ok || res.status === 201) {
      addDoctorModalInstance.hide();
      showToast('Successfully added!', 'success');
      document.getElementById('addDoctorForm').reset();
      
      const newDoc = data.data.doctor;
      doctorsData.push(newDoc);
      
      const tbody = document.getElementById('doctorsTableBody');
      const tr = document.createElement('tr');
      tr.id = `doctor-row-${newDoc.id}`;
      tr.innerHTML = `
        <td>
          <div class="d-flex align-items-center">
            <div class="avatar text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px; background: var(--primary-gradient);">
              ${newDoc.User.firstName.charAt(0)}
            </div>
            <div class="fw-bold name-col">${newDoc.User.firstName} ${newDoc.User.lastName}</div>
          </div>
        </td>
        <td style="color: var(--text-secondary);" class="email-col">${newDoc.User.email}</td>
        <td class="spec-col">${newDoc.specialization}</td>
        <td style="color: var(--text-secondary);">${newDoc.licenseNumber}</td>
        <td class="exp-col">${newDoc.experienceYears} Yrs</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-info border-0 rounded-circle me-1 view-btn" data-id="${newDoc.id}" title="View Profile"><i class="fa-solid fa-eye" style="pointer-events: none;"></i></button>
          <button class="btn btn-sm btn-outline-primary border-0 rounded-circle me-1 edit-btn" data-id="${newDoc.id}" title="Edit"><i class="fa-regular fa-pen-to-square" style="pointer-events: none;"></i></button>
          <button class="btn btn-sm btn-outline-danger border-0 rounded-circle delete-btn" data-id="${newDoc.id}" title="Delete"><i class="fa-regular fa-trash-can" style="pointer-events: none;"></i></button>
        </td>
      `;
      tbody.prepend(tr); // Add to the top of the table
    } else {
      showToast(data.message || 'Error adding doctor', 'danger');
    }
  } catch (err) {
    showToast('Network error while adding doctor', 'danger');
  }
}

function openEditDoctorModal(id) {
  const doc = doctorsData.find(d => String(d.id) === String(id));
  if (!doc) return;

  document.getElementById('editDoctorId').value = doc.id;
  document.getElementById('editFirstName').value = doc.User.firstName;
  document.getElementById('editLastName').value = doc.User.lastName;
  document.getElementById('editEmail').value = doc.User.email;
  document.getElementById('editPassword').value = '';
  document.getElementById('editSpecialization').value = doc.specialization;
  document.getElementById('editExperienceYears').value = doc.experienceYears;

  editDoctorModalInstance.show();
}

async function updateDoctor() {
  const id = document.getElementById('editDoctorId').value;
  const payload = {
    firstName: document.getElementById('editFirstName').value,
    lastName: document.getElementById('editLastName').value,
    email: document.getElementById('editEmail').value,
    specialization: document.getElementById('editSpecialization').value,
    experienceYears: document.getElementById('editExperienceYears').value
  };

  const password = document.getElementById('editPassword').value;
  if (password.trim() !== '') {
    payload.password = password;
  }

  try {
    const res = await fetch(`${API_URL}/doctors/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok || res.status === 200) {
      editDoctorModalInstance.hide();
      showToast('Updated successfully', 'success');

      // Update local data
      const updatedDoc = data.data.doctor;
      const index = doctorsData.findIndex(d => String(d.id) === String(id));
      if (index !== -1) {
        // preserve the user object if update didn't return it deeply populated
        if (!updatedDoc.User) {
           updatedDoc.User = doctorsData[index].User;
           updatedDoc.User.firstName = payload.firstName;
           updatedDoc.User.lastName = payload.lastName;
           updatedDoc.User.email = payload.email;
        }
        doctorsData[index] = updatedDoc;
      }

      // Re-render the specific row
      const tr = document.getElementById(`doctor-row-${id}`);
      if (tr) {
        tr.querySelector('.name-col').textContent = `${updatedDoc.User.firstName} ${updatedDoc.User.lastName}`;
        tr.querySelector('.email-col').textContent = updatedDoc.User.email;
        tr.querySelector('.spec-col').textContent = updatedDoc.specialization;
        tr.querySelector('.exp-col').textContent = `${updatedDoc.experienceYears} Yrs`;
        
        // Update initial
        tr.querySelector('.avatar').textContent = updatedDoc.User.firstName.charAt(0);
      }
    } else {
      showToast(data.message || 'Error updating doctor', 'danger');
    }
  } catch (err) {
    showToast('Network error while updating doctor', 'danger');
  }
}
