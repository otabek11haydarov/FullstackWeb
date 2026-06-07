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
    
    // We fetch specialization separately if needed, but for now we'll display what's in localstorage if it exists or fetch it
    fetchDoctorDetails(user);

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
            email: document.getElementById('profileEmail').value
        };



        try {
            const token = localStorage.getItem('token');
            const baseUrl = typeof window.API_URL !== 'undefined' ? window.API_URL.replace('/api/doctor', '/api/doctors') : 'http://localhost:8000/api/doctors';
            
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

async function fetchDoctorDetails(user) {
    try {
        const token = localStorage.getItem('token');
        const baseUrl = typeof window.API_URL !== 'undefined' ? window.API_URL.replace('/api/doctor', '/api/doctors') : 'http://localhost:8000/api/doctors';
        
        const res = await fetch(`${baseUrl}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (res.ok && data.data && data.data.doctors) {
            const myDocRecord = data.data.doctors.find(d => d.userId === user.id);
            if (myDocRecord && myDocRecord.specialization) {
                document.getElementById('docSpecialization').textContent = myDocRecord.specialization;
                
                // Also pre-fill phone number if available (Doctor table has no phone, but if there's a way, put it here)
            }
        }
    } catch(err) { console.error(err); window.showNotification("An error occurred. Please try again.", "error"); }
}

function updateUIElements(user) {
    // Left column
    const fullName = `Dr. ${user.firstName} ${user.lastName}`;
    document.getElementById('profileName').textContent = fullName;
    document.getElementById('profileEmailDisplay').textContent = user.email;
    
    // Avatar Initial
    const initial = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'D';
    document.getElementById('profileAvatar').textContent = initial;
    
    // Top header
    const headerNameEl = document.getElementById('headerName');
    if (headerNameEl) {
        headerNameEl.innerHTML = `${fullName} <span class="badge ms-1" style="background: rgba(13, 110, 253, 0.2); border: 1px solid rgba(13, 110, 253, 0.5); color: var(--neon-cyan); font-weight: normal; font-size: 0.75rem;">Doctor</span>`;
    }
    const headerInitialEl = document.getElementById('headerInitial');
    if (headerInitialEl) {
    }
}

