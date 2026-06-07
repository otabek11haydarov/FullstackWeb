const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
let userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

let user = JSON.parse(userStr);

document.addEventListener('DOMContentLoaded', () => {
  // Setup Sidebar User Info

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
        window.showNotification('Profile Updated Successfully!', 'success');
        
        // Update local storage
        user.firstName = data.data.user.firstName;
        user.lastName = data.data.user.lastName;
        user.email = data.data.user.email;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update UI dynamically
        document.getElementById('profileAvatar').textContent = user.firstName.charAt(0).toUpperCase();
        document.getElementById('profileName').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('profileEmailDisplay').textContent = user.email;
        
        document.getElementById('profilePassword').value = '';
        
        if (newPassword.trim() !== '') {
           setTimeout(() => {
             window.showNotification('Password changed. Please log in again.');
             document.getElementById('logoutBtn').click();
           }, 1500);
        }
      } else {
        window.showNotification(data.message || 'Error updating profile', 'error');
      }
    } catch (err) {
      window.showNotification('Network error while updating profile', 'error');
    } finally {
      submitBtn.innerHTML = 'Save Changes <i class="fa-solid fa-save ms-2"></i>';
      submitBtn.disabled = false;
    }
  });
});

