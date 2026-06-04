const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

let doctorId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  doctorId = urlParams.get('id');
  if (!doctorId) {
    alert('No doctor selected.');
    window.location.href = 'doctors.html';
    return;
  }

  await fetchDoctorProfile();
});

async function fetchDoctorProfile() {
  try {
    const res = await fetch(`${API_URL}/doctors/${doctorId}/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (res.ok) {
      renderDoctorInfo(data.data.doctor);
      renderPatients(data.data.patients);
      renderWorkSchedule(data.data.appointments);
    } else {
      alert(data.message || 'Error loading profile');
    }
  } catch (err) {
    console.error('Failed to fetch profile', err);
  }
}

function renderDoctorInfo(doctor) {
  document.getElementById('docName').textContent = `Dr. ${doctor.User.firstName} ${doctor.User.lastName}`;
  document.getElementById('docAvatar').textContent = doctor.User.firstName.charAt(0).toUpperCase();
  document.getElementById('docSpec').textContent = doctor.specialization;
  document.getElementById('docEmail').textContent = doctor.User.email;
  document.getElementById('docLicense').textContent = doctor.licenseNumber || 'N/A';
  document.getElementById('docExperience').textContent = `${doctor.experienceYears} Years`;
}

function renderPatients(patients) {
  const container = document.getElementById('assignedPatientsList');
  container.innerHTML = '';
  
  if (!patients || patients.length === 0) {
    container.innerHTML = '<div class="col-12"><p class="text-muted">No assigned patients.</p></div>';
    return;
  }
  
  patients.forEach(pat => {
    let diagnosesText = 'No diagnoses';
    if (pat.Diagnoses && pat.Diagnoses.length > 0) {
      diagnosesText = pat.Diagnoses.map(d => d.condition).join(', ');
    }
    
    const html = `
      <div class="col-md-6">
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px;">
          <div class="d-flex align-items-center mb-2">
            <div class="avatar rounded-circle d-flex align-items-center justify-content-center me-3 text-white" style="width: 35px; height: 35px; background: rgba(255,255,255,0.1); border: 1px solid var(--neon-cyan);">
              ${pat.User.firstName.charAt(0)}
            </div>
            <div>
              <h6 class="mb-0 fw-bold">${pat.User.firstName} ${pat.User.lastName}</h6>
              <small class="text-muted">Age: ${pat.dateOfBirth ? Math.floor((new Date() - new Date(pat.dateOfBirth))/(1000*60*60*24*365)) : '--'}</small>
            </div>
          </div>
          <div class="text-muted" style="font-size: 0.8rem;">
            <strong>History:</strong> ${diagnosesText}
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
  });
}

function renderWorkSchedule(appointments) {
  const grid = document.getElementById('scheduleGrid');
  grid.innerHTML = '';
  
  // Headers
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  grid.innerHTML += `<div></div>`; // Top left empty
  days.forEach(d => {
    grid.innerHTML += `<div class="schedule-header">${d}</div>`;
  });
  
  // strict hours 08:00 to 20:00
  for (let hour = 8; hour <= 20; hour++) {
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
    let rowHtml = `<div class="schedule-row"><div class="schedule-time">${timeLabel}</div>`;
    
    for (let d = 1; d <= 7; d++) {
      let extraClass = '';
      let content = '';
      
      // LUNCH BREAK LOGIC (Strictly blocked)
      if (hour === 12 || hour === 13) {
        extraClass = 'lunch-break';
        content = 'Lunch Break';
      }
      
      rowHtml += `<div class="schedule-cell ${extraClass}" id="cell-${d}-${hour}">${content}</div>`;
    }
    
    rowHtml += `</div>`;
    grid.innerHTML += rowHtml;
  }
  
  // Plot Appointments
  if (appointments) {
    appointments.forEach(appt => {
      const date = new Date(appt.date);
      let dayIndex = date.getDay(); // 0 is Sun, 1 is Mon
      if (dayIndex === 0) dayIndex = 7; // Map Sun to 7
      
      const hour = date.getHours();
      
      if (hour >= 8 && hour <= 20 && hour !== 12 && hour !== 13) {
        const cell = document.getElementById(`cell-${dayIndex}-${hour}`);
        if (cell) {
          const pill = `<div class="pill scheduled">${appt.reason || 'Appointment'}</div>`;
          cell.insertAdjacentHTML('beforeend', pill);
        }
      }
    });
  }
}
