document.addEventListener('DOMContentLoaded', () => {
    // 1. Fetch user from LocalStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = '../auth/login.html';
        return;
    }

    const user = JSON.parse(userStr);

    // 2. Pre-fill Form Fields
    document.getElementById('profileFirstName').value = user.firstName || '';
    document.getElementById('profileLastName').value = user.lastName || '';
    document.getElementById('profileEmail').value = user.email || '';
    
    const phoneInput = document.getElementById('profilePhone');
    if (phoneInput) phoneInput.value = user.contactNumber || user.phone || '';

    // 3. Update Left-Column Display Badges & Header
    updateUIElements(user);

    // 4. Handle Save Request
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveProfileBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        saveBtn.disabled = true;

        const updatedData = {
            firstName: document.getElementById('profileFirstName').value,
            lastName: document.getElementById('profileLastName').value,
            email: document.getElementById('profileEmail').value,
            contactNumber: phoneInput ? phoneInput.value : undefined
        };



        try {
            const token = localStorage.getItem('token');
            const baseUrl = typeof window.API_URL !== 'undefined' ? window.API_URL.replace('/api/receptionist', '/api/receptionists') : 'http://localhost:8000/api/receptionists';
            
            const res = await fetch(`${baseUrl}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            const data = await res.json();
            if (res.ok) {
                // Update LocalStorage to reflect changes immediately
                user.firstName = updatedData.firstName;
                user.lastName = updatedData.lastName;
                user.email = updatedData.email;
                if(updatedData.contactNumber) user.contactNumber = updatedData.contactNumber;
                localStorage.setItem('user', JSON.stringify(user));
                
                window.showNotification('Profile updated successfully!', 'success');
                updateUIElements(user);
            } else {
                window.showNotification(data.message || 'Failed to update profile', 'error');
            }
        } catch (err) {
            console.error(err);
            window.showNotification('A network error occurred.', 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    });

    // Handle Logout
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../auth/login.html';
    });
});

function updateUIElements(user) {
    // Left column
    const fullName = `${user.firstName} ${user.lastName}`;
    document.getElementById('profileName').textContent = fullName;
    document.getElementById('profileEmailDisplay').textContent = user.email;
    
    // Avatar Initial
    const initial = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'R';
    document.getElementById('profileAvatar').textContent = initial;
    
    // Top header
    const headerNameEl = document.getElementById('receptionistName');
    if (headerNameEl) {
        headerNameEl.innerHTML = `${fullName} <span class="badge ms-1" style="background: rgba(123, 47, 247, 0.2); border: 1px solid rgba(123, 47, 247, 0.5); color: var(--neon-cyan); font-weight: normal; font-size: 0.75rem;">Receptionist</span>`;
    }
    const headerInitialEl = document.getElementById('headerInitial');
    if (headerInitialEl) {
    }
}

