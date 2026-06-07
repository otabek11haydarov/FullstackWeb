const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
    window.location.href = '../auth/login.html';
}

const userObj = JSON.parse(userStr);

if (userObj.role !== 'Patient') {
    window.location.href = '../auth/login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Logout button
    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../auth/login.html';
    });

    // Save buttons (both header + bottom)
    document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);
    document.getElementById('saveProfileBtn2')?.addEventListener('click', saveProfile);

    await fetchProfile();
});

async function fetchProfile() {
    try {
        const res = await fetch(`${API_URL}/patients/portal/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        if (data.success) {
            renderProfile(data.data.patient);
        } else {
            window.showNotification(data.message || 'Failed to load profile', 'error');
        }
    } catch (err) {
        console.error('Profile fetch error:', err);
        window.showNotification('Network error. Please try again.', 'error');
    }
}

function renderProfile(patient) {
    const user = patient.User || {};
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();

    // Update avatar
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.firstName || 'P')}&backgroundColor=10b981&textColor=ffffff&fontWeight=700`;
    document.getElementById('profileAvatar').src = avatarUrl;

    // Hero section
    document.getElementById('heroName').textContent = name || 'Unknown';
    document.getElementById('heroEmail').textContent = user.email || '—';
    document.getElementById('statBlood').textContent = patient.bloodType || '—';

    // Doctor stat
    if (patient.Doctor && patient.Doctor.User) {
        const doc = patient.Doctor;
        document.getElementById('statDoctor').textContent = `Dr. ${doc.User.lastName}`;
        document.getElementById('doctorCard').style.display = '';
        document.getElementById('doctorName').textContent = `Dr. ${doc.User.firstName} ${doc.User.lastName}`;
        document.getElementById('doctorSpec').textContent = doc.specialization || 'General Practice';
        document.getElementById('doctorInitial').textContent = doc.User.firstName.charAt(0);
    }

    // Form fields
    document.getElementById('editFirstName').value = user.firstName || '';
    document.getElementById('editLastName').value = user.lastName || '';
    document.getElementById('editEmail').value = user.email || '';
    document.getElementById('editGender').value = patient.gender || '';
    document.getElementById('editDob').value = patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '';
    document.getElementById('editContact').value = patient.contactNumber || '';
    document.getElementById('editAddress').value = patient.address || '';
    document.getElementById('editAllergies').value = patient.allergies || '';
    document.getElementById('editConditions').value = patient.chronicConditions || '';

    // Blood type select
    const btSelect = document.getElementById('editBloodType');
    for (let opt of btSelect.options) {
        if (opt.value === patient.bloodType) { opt.selected = true; break; }
    }
}

async function saveProfile() {
    const payload = {
        firstName:          document.getElementById('editFirstName').value.trim(),
        lastName:           document.getElementById('editLastName').value.trim(),
        contactNumber:      document.getElementById('editContact').value.trim(),
        address:            document.getElementById('editAddress').value.trim(),
        allergies:          document.getElementById('editAllergies').value.trim(),
        chronicConditions:  document.getElementById('editConditions').value.trim(),
        bloodType:          document.getElementById('editBloodType').value
    };

    if (!payload.firstName || !payload.lastName) {
        window.showNotification('First and last name are required.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/patients/portal/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            // Update localStorage so the avatar updates
            const updatedUser = { ...userObj, firstName: payload.firstName, lastName: payload.lastName };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            window.showNotification('Profile updated successfully!', 'success');
            await fetchProfile();
        } else {
            window.showNotification(data.message || 'Update failed', 'error');
        }
    } catch (err) {
        console.error('Profile update error:', err);
        window.showNotification('Network error. Please try again.', 'error');
    }
}
