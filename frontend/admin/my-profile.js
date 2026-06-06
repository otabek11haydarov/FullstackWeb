const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
let userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

let user = JSON.parse(userStr);

document.addEventListener('DOMContentLoaded', () => {
  // Setup Sidebar User Info
  document.getElementById('userNameDisplay').textContent = `${user.firstName} ${user.lastName}`;
  document.getElementById('userInitial').textContent = user.firstName.charAt(0).toUpperCase();
  document.getElementById('userRoleDisplay').textContent = user.role.replace('_', ' ');

  // Setup Left Column Profile Info
  document.getElementById('profileAvatar').textContent = user.firstName.charAt(0).toUpperCase();
  document.getElementById('profileName').textContent = `${user.firstName} ${user.lastName}`;
  document.getElementById('profileRoleBadge').textContent = user.role.replace('_', ' ');
  document.getElementById('profileEmailDisplay').textContent = user.email;

  // Setup Form Fields
  document.getElementById('profileFirstName').value = user.firstName;
  document.getElementById('profileLastName').value = user.lastName;
  document.getElementById('profileEmail').value = user.email;

  // Logout Logic
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  // Profile Form Submission
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('saveProfileBtn');
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
    submitBtn.disabled = true;

    const payload = {
      firstName: document.getElementById('profileFirstName').value,
      lastName: document.getElementById('profileLastName').value,
      email: document.getElementById('profileEmail').value
    };

    const newPassword = document.getElementById('profilePassword').value;
    if (newPassword.trim() !== '') {
      payload.password = newPassword;
    }

    try {
      // Using existing /api/users/profile which hits userController.updateProfile
      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (res.ok) {
        showToast('Profile Updated Successfully!', 'success');
        
        // Update local storage
        user.firstName = data.data.user.firstName;
        user.lastName = data.data.user.lastName;
        user.email = data.data.user.email;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update UI dynamically
        document.getElementById('userNameDisplay').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('userInitial').textContent = user.firstName.charAt(0).toUpperCase();
        document.getElementById('profileAvatar').textContent = user.firstName.charAt(0).toUpperCase();
        document.getElementById('profileName').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('profileEmailDisplay').textContent = user.email;
        
        document.getElementById('profilePassword').value = '';
        
        if (newPassword.trim() !== '') {
           setTimeout(() => {
             alert('Password changed. Please log in again.');
             document.getElementById('logoutBtn').click();
           }, 1500);
        }
      } else {
        showToast(data.message || 'Error updating profile', 'danger');
      }
    } catch (err) {
      showToast('Network error while updating profile', 'danger');
    } finally {
      submitBtn.innerHTML = 'Save Changes <i class="fa-solid fa-save ms-2"></i>';
      submitBtn.disabled = false;
    }
  });
});

function showToast(message, type = 'success') {
  const container = document.querySelector('.toast-container');
  if (!container) return;
  
  const icon = type === 'success' 
    ? '<i class="fa-solid fa-circle-check text-success fs-4 me-2"></i>' 
    : '<i class="fa-solid fa-circle-exclamation text-danger fs-4 me-2"></i>';
  
  const bg = type === 'success' ? 'rgba(40, 167, 69, 0.15)' : 'rgba(220, 53, 69, 0.15)';
  const border = type === 'success' ? 'border-success' : 'border-danger';

  const toastHtml = `
    <div class="toast glass-card align-items-center ${border} mb-3 border border-opacity-25 shadow-lg" style="background: ${bg}; backdrop-filter: blur(15px);" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex p-1">
        <div class="toast-body d-flex align-items-center fw-semibold text-light fs-6">
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
