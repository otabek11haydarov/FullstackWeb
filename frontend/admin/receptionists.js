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

  document.getElementById('submitAddReceptionistBtn').addEventListener('click', createReceptionist);
  document.getElementById('submitEditReceptionistBtn').addEventListener('click', updateReceptionist);

  // Set Profile Footer
  document.getElementById('userNameDisplay').textContent = `${user.firstName} ${user.lastName}`;
  document.getElementById('userInitial').textContent = user.firstName.charAt(0).toUpperCase();
  document.getElementById('userRoleDisplay').textContent = user.role.replace('_', ' ');

  fetchReceptionists();
});

let receptionistsData = [];
const addReceptionistModalInstance = new bootstrap.Modal(document.getElementById('addReceptionistModal'));
const editReceptionistModalInstance = new bootstrap.Modal(document.getElementById('editReceptionistModal'));

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



async function fetchReceptionists() {
  try {
    const res = await fetch(`${API_URL}/receptionists`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      receptionistsData = data.data.receptionists;
      renderReceptionists();
    } else {
      showNotification(data.message, 'danger');
    }
  } catch (err) {
    showNotification('Error fetching receptionists', 'danger');
  }
}

function renderReceptionists() {
  const tbody = document.getElementById('receptionistsTableBody');
  tbody.innerHTML = '';

  receptionistsData.forEach(receptionist => {
    const tr = document.createElement('tr');
    tr.id = `receptionist-row-${receptionist.id}`;
    const statusColor = receptionist.status === 'Active' ? 'text-success' : 'text-danger';
    
    // Fallback extraction
    const fName = receptionist.User?.firstName || 'Unknown';
    const lName = receptionist.User?.lastName || 'User';
    const email = receptionist.User?.email || 'N/A';
    const phone = receptionist.phoneNumber || 'N/A';
    
    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="avatar text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px; background: var(--secondary-gradient);">
            ${fName.charAt(0).toUpperCase()}
          </div>
          <div class="fw-bold name-col">${fName} ${lName}</div>
        </div>
      </td>
      <td style="color: var(--text-secondary);" class="email-col">${email}</td>
      <td class="phone-col">${phone}</td>
      <td class="shift-col">${receptionist.shift}</td>
      <td class="status-col fw-semibold ${statusColor}">${receptionist.status}</td>
      <td class="text-end">
        <div class="d-flex gap-2 align-items-center justify-content-end">
          <button class="btn btn-sm text-primary edit-btn" data-id="${receptionist.id}" title="Edit" style="background: rgba(123, 47, 247, 0.1); border: 1px solid rgba(123, 47, 247, 0.3);">
              <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm text-danger delete-btn" data-id="${receptionist.id}" title="Delete" style="background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3);">
              <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Event Delegation for Edit, Delete buttons
  tbody.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    
    const id = target.getAttribute('data-id');
    
    if (target.classList.contains('delete-btn')) {
      deleteReceptionist(id);
    } else if (target.classList.contains('edit-btn')) {
      openEditReceptionistModal(id);
    }
  });
}

async function createReceptionist() {
  const payload = {
    firstName: document.getElementById('addFirstName').value,
    lastName: document.getElementById('addLastName').value,
    email: document.getElementById('addEmail').value,
    password: document.getElementById('addPassword').value,
    phoneNumber: document.getElementById('addPhone').value,
    shift: document.getElementById('addShift').value
  };

  if (!payload.firstName || !payload.lastName || !payload.email || !payload.password || !payload.phoneNumber) {
    showNotification('Please fill all required fields.', 'danger');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/receptionists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (res.ok || res.status === 201) {
      addReceptionistModalInstance.hide();
      showNotification('Successfully added receptionist!', 'success');
      document.getElementById('addReceptionistForm').reset();
      
      const newRec = data.data.receptionist;
      receptionistsData.unshift(newRec);
      renderReceptionists();
    } else {
      showNotification(data.message || 'Error adding receptionist', 'danger');
    }
  } catch (err) {
    showNotification('Network error while adding receptionist', 'danger');
  }
}

async function deleteReceptionist(id) {
  showConfirm('Are you sure you want to remove this receptionist?', async () => {
    try {
      const res = await fetch(`${API_URL}/receptionists/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok || res.status === 204) {
        showNotification('Receptionist removed', 'success');
        
        const row = document.getElementById(`receptionist-row-${id}`);
        if (row) row.remove();
        
        receptionistsData = receptionistsData.filter(r => r.id !== id);
      } else {
        const data = await res.json();
        showNotification(data.message, 'danger');
      }
    } catch (err) {
      showNotification('Error deleting receptionist', 'danger');
    }
  });
}

function openEditReceptionistModal(id) {
  const receptionist = receptionistsData.find(r => String(r.id) === String(id));
  if (!receptionist) return;

  document.getElementById('editReceptionistId').value = receptionist.id;
  document.getElementById('editFirstName').value = receptionist.User.firstName;
  document.getElementById('editLastName').value = receptionist.User.lastName;
  document.getElementById('editEmail').value = receptionist.User.email;
  document.getElementById('editPassword').value = '';
  document.getElementById('editPhone').value = receptionist.phoneNumber || '';
  document.getElementById('editShift').value = receptionist.shift;
  document.getElementById('editStatus').value = receptionist.status;

  editReceptionistModalInstance.show();
}

async function updateReceptionist() {
  const id = document.getElementById('editReceptionistId').value;
  const payload = {
    firstName: document.getElementById('editFirstName').value,
    lastName: document.getElementById('editLastName').value,
    email: document.getElementById('editEmail').value,
    phoneNumber: document.getElementById('editPhone').value,
    shift: document.getElementById('editShift').value,
    status: document.getElementById('editStatus').value
  };

  const password = document.getElementById('editPassword').value;
  if (password.trim() !== '') {
    payload.password = password;
  }

  try {
    const res = await fetch(`${API_URL}/receptionists/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok || res.status === 200) {
      editReceptionistModalInstance.hide();
      showNotification('Updated successfully', 'success');

      // Update local data
      const updatedRec = data.data.receptionist;
      const index = receptionistsData.findIndex(r => String(r.id) === String(id));
      if (index !== -1) {
        if (!updatedRec.User) {
           updatedRec.User = receptionistsData[index].User;
           updatedRec.User.firstName = payload.firstName;
           updatedRec.User.lastName = payload.lastName;
           updatedRec.User.email = payload.email;
        }
        receptionistsData[index] = updatedRec;
      }

      // Re-render the specific row
      const tr = document.getElementById(`receptionist-row-${id}`);
      if (tr) {
        const statusColor = updatedRec.status === 'Active' ? 'text-success' : 'text-danger';
        
        tr.querySelector('.name-col').textContent = `${updatedRec.User.firstName} ${updatedRec.User.lastName}`;
        tr.querySelector('.email-col').textContent = updatedRec.User.email;
        tr.querySelector('.phone-col').textContent = updatedRec.phoneNumber || 'N/A';
        tr.querySelector('.shift-col').textContent = updatedRec.shift;
        tr.querySelector('.status-col').textContent = updatedRec.status;
        tr.querySelector('.status-col').className = `status-col fw-semibold ${statusColor}`;
        tr.querySelector('.avatar').textContent = updatedRec.User.firstName.charAt(0);
      }
    } else {
      showNotification(data.message || 'Error updating receptionist', 'danger');
    }
  } catch (err) {
    showNotification('Network error while updating receptionist', 'danger');
  }
}
