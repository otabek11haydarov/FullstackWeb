const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);

// STRICT SECURITY CHECK
if (user.role !== 'Super Admin') {
  window.location.href = 'index.html';
}

// User Profile UI setup
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('userNameDisplay').textContent = `${user.firstName} ${user.lastName}`;
  document.getElementById('userInitial').textContent = user.firstName.charAt(0).toUpperCase();
  document.getElementById('userRoleDisplay').textContent = 'Super Admin';
  
  // Setup logout
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  // Event Delegation for Edit and Delete buttons
  document.getElementById('adminsTableBody').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      openEditModal(id);
    } else if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      deleteAdmin(id);
    }
  });

  fetchAdmins();
});

let adminsData = [];
const adminModal = new bootstrap.Modal(document.getElementById('adminModal'));

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

async function fetchAdmins() {
  try {
    const res = await fetch(`${API_URL}/admins`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      adminsData = data.data.admins;
      renderAdmins();
    } else {
      showToast(data.message, 'danger');
    }
  } catch (err) {
    showToast('Error fetching admins', 'danger');
  }
}

function renderAdmins() {
  const tbody = document.getElementById('adminsTableBody');
  tbody.innerHTML = '';

  adminsData.forEach(admin => {
    const badgeClass = admin.role === 'Super Admin' ? 'badge-super-admin' : 'badge-admin';
    const roleText = admin.role;
    const joined = new Date(admin.createdAt).toLocaleDateString();
    
    // Prevent deleting oneself
    const deleteBtn = admin.id !== user.id 
      ? `<button class="btn btn-sm btn-outline-danger border-0 rounded-circle delete-btn" data-id="${admin.id}" title="Delete"><i class="fa-regular fa-trash-can" style="pointer-events: none;"></i></button>`
      : `<span class="text-muted" style="font-size:0.8rem">Current</span>`;

    const tr = document.createElement('tr');
    tr.id = `admin-row-${admin.id}`;
    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="avatar text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px; background: var(--primary-gradient);">
            ${admin.firstName.charAt(0)}
          </div>
          <div class="fw-bold name-col">${admin.firstName} ${admin.lastName}</div>
        </div>
      </td>
      <td style="color: var(--text-secondary);" class="email-col">${admin.email}</td>
      <td><span class="${badgeClass} role-col">${roleText}</span></td>
      <td style="color: var(--text-secondary);">${joined}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary border-0 rounded-circle me-1 edit-btn" data-id="${admin.id}" title="Edit"><i class="fa-regular fa-pen-to-square" style="pointer-events: none;"></i></button>
        ${deleteBtn}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddModal() {
  document.getElementById('adminForm').reset();
  document.getElementById('adminId').value = '';
  document.getElementById('modalTitle').textContent = 'Add New Admin';
  document.getElementById('password').required = true;
  document.getElementById('passwordHelp').textContent = '';
  adminModal.show();
}

function openEditModal(id) {
  const admin = adminsData.find(a => a.id === id);
  if (!admin) return;

  document.getElementById('adminId').value = admin.id;
  document.getElementById('firstName').value = admin.firstName;
  document.getElementById('lastName').value = admin.lastName;
  document.getElementById('email').value = admin.email;
  document.getElementById('role').value = admin.role;
  
  document.getElementById('password').value = '';
  document.getElementById('password').required = false;
  document.getElementById('passwordHelp').textContent = '(Leave blank to keep current password)';
  
  document.getElementById('modalTitle').textContent = 'Edit Admin';
  adminModal.show();
}

async function saveAdmin() {
  const id = document.getElementById('adminId').value;
  const payload = {
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    email: document.getElementById('email').value,
    role: document.getElementById('role').value
  };

  const password = document.getElementById('password').value;
  if (password) {
    payload.password = password;
  }

  const method = id ? 'PUT' : 'POST';
  const url = id ? `${API_URL}/admins/${id}` : `${API_URL}/admins`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (res.ok) {
      adminModal.hide();
      showToast(`Admin successfully ${id ? 'updated' : 'created'}!`, 'success');
      
      if (id) {
        // Update DOM dynamically
        const adminIndex = adminsData.findIndex(a => a.id == id);
        if (adminIndex !== -1) {
          adminsData[adminIndex] = data.data.admin;
          const admin = data.data.admin;
          const row = document.getElementById(`admin-row-${id}`);
          if (row) {
            row.querySelector('.name-col').textContent = `${admin.firstName} ${admin.lastName}`;
            row.querySelector('.avatar').textContent = admin.firstName.charAt(0);
            row.querySelector('.email-col').textContent = admin.email;
            const badgeClass = admin.role === 'Super Admin' ? 'badge-super-admin' : 'badge-admin';
            row.querySelector('.role-col').className = `${badgeClass} role-col`;
            row.querySelector('.role-col').textContent = admin.role;
          }
        }
      } else {
        fetchAdmins();
      }
    } else {
      showToast(data.message, 'danger');
    }
  } catch (err) {
    showToast('Error saving admin', 'danger');
  }
}

async function deleteAdmin(id) {
  showConfirm('Are you sure you want to delete this admin? This action cannot be undone.', async () => {
    try {
      const res = await fetch(`${API_URL}/admins/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok || res.status === 204) {
        showToast('Admin successfully deleted!', 'success');
        
        // Dynamically remove the row from the DOM
        const row = document.getElementById(`admin-row-${id}`);
        if (row) row.remove();
        
        // Update local array
        adminsData = adminsData.filter(a => a.id !== id);
      } else {
        const data = await res.json();
        showToast(data.message, 'danger');
      }
    } catch (err) {
      showToast('Error deleting admin', 'danger');
    }
  });
}
