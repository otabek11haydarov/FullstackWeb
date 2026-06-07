const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);

if (user.role !== 'Admin' && user.role !== 'Super Admin') {
  window.showNotification('Access Denied.', 'error');
  window.location.href = '../auth/login.html';
}

const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');

if (!patientId) {
    window.location.href = 'patients.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // Logout Logic
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../auth/login.html';
    });

    fetchPatientProfile();
});

async function fetchPatientProfile() {
    try {
        const res = await fetch(`${API_URL}/admins/patients/${patientId}/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();
        if (data.status === 'success') {
            renderProfile(data.data);
        } else {
            window.showNotification(data.message || 'Error fetching profile', 'error');
        }
    } catch (error) {
        console.error("Profile Fetch Error:", error);
        window.showNotification("Network error occurred.", "error");
    }
}

function renderProfile(data) {
    const { patient, diagnoses, appointments, clinicalHistory } = data;

    // Header Demographics
    document.getElementById('patientName').textContent = `${patient.User.firstName} ${patient.User.lastName}`;
    document.getElementById('patientEmail').textContent = patient.User.email;
    document.getElementById('patientAvatar').textContent = patient.User.firstName.charAt(0).toUpperCase();
    
    // Calculate Age
    let age = '--';
    if (patient.dateOfBirth) {
        const dob = new Date(patient.dateOfBirth);
        const diff = Date.now() - dob.getTime();
        const ageDate = new Date(diff);
        age = Math.abs(ageDate.getUTCFullYear() - 1970);
    }
    
    document.getElementById('patientDob').textContent = `${patient.dateOfBirth || '--'} (${age} yo)`;
    document.getElementById('patientGender').textContent = patient.gender || '--';
    document.getElementById('patientBloodType').textContent = patient.bloodType || 'Unknown';
    
    const assignedDoc = patient.Doctor ? `Dr. ${patient.Doctor.User.firstName} ${patient.Doctor.User.lastName}` : 'None';
    document.getElementById('patientDoctor').textContent = assignedDoc;

    // Medical History Text
    document.getElementById('patientAllergies').textContent = patient.allergies || 'None reported';
    document.getElementById('patientConditions').textContent = patient.chronicConditions || 'None reported';

    // Appointments Table
    const apptsTbody = document.getElementById('appointmentsList');
    apptsTbody.innerHTML = '';
    if (appointments && appointments.length > 0) {
        appointments.slice(0, 5).forEach(appt => {
            const dateStr = new Date(appt.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            const docName = appt.Doctor ? `Dr. ${appt.Doctor.User.lastName}` : 'Unassigned';
            
            let badgeClass = 'bg-secondary';
            if (appt.status === 'Scheduled') badgeClass = 'bg-info text-dark';
            else if (appt.status === 'Completed') badgeClass = 'bg-success';
            else if (appt.status === 'Pending') badgeClass = 'bg-warning text-dark';
            
            apptsTbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${dateStr}</td>
                    <td>${docName}</td>
                    <td><span class="badge ${badgeClass}">${appt.status}</span></td>
                </tr>
            `);
        });
    } else {
        apptsTbody.innerHTML = '<tr><td colspan="3" class="text-muted text-center py-3">No appointments found.</td></tr>';
    }

    // Clinical Activities Timeline
    const timeline = document.getElementById('activitiesTimeline');
    timeline.innerHTML = '';
    
    if (clinicalHistory && clinicalHistory.length > 0) {
        clinicalHistory.forEach(activity => {
            const dateObj = new Date(activity.date || activity.createdAt);
            const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const docName = activity.Doctor ? `Dr. ${activity.Doctor.User.lastName}` : 'System';

            let iconClass = 'fa-solid fa-notes-medical text-cyan';
            if (activity.actionType === 'Referral') iconClass = 'fa-solid fa-share text-purple';
            else if (activity.actionType === 'StatusChange') iconClass = 'fa-solid fa-clock-rotate-left text-warning';

            timeline.insertAdjacentHTML('beforeend', `
                <div class="timeline-item">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="badge bg-dark border border-secondary text-light"><i class="fa-regular fa-calendar me-1"></i>${dateStr} at ${timeStr}</span>
                        <small class="text-info fw-semibold"><i class="${iconClass} me-1"></i>${activity.actionType || 'Update'}</small>
                    </div>
                    <div class="p-3 mt-2 rounded" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">
                        <p class="mb-1 text-white-50 small">${activity.description}</p>
                        <small class="text-secondary">By: ${docName}</small>
                    </div>
                </div>
            `);
        });
    } else {
        timeline.innerHTML = '<p class="text-muted">No clinical activities found.</p>';
    }
}
