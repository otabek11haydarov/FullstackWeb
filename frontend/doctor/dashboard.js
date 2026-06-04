const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);

// Security Check
if (user.role !== 'Doctor' && user.role !== 'Super_Admin') {
  alert('Access Denied. You must be a Doctor to view this page.');
  window.location.href = '../auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  // Theme Setup
  const savedTheme = localStorage.getItem('doctorTheme');
  const themeCheckbox = document.getElementById('theme-checkbox');
  
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    if (themeCheckbox) themeCheckbox.checked = true;
  } else {
    if (themeCheckbox) themeCheckbox.checked = false;
  }

  // Theme Toggle Listener
  if (themeCheckbox) {
    themeCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        document.body.classList.add('light-mode');
        localStorage.setItem('doctorTheme', 'light');
      } else {
        document.body.classList.remove('light-mode');
        localStorage.setItem('doctorTheme', 'dark');
      }
    });
  }

  // Segmented Control Logic
  const segBtns = document.querySelectorAll('.seg-btn');
  segBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Remove active from all
      segBtns.forEach(b => b.classList.remove('active'));
      // Add active to clicked
      e.target.classList.add('active');
      
      const filter = e.target.getAttribute('data-filter');
      renderSchedule(window.fullWeeklySchedule, filter);
    });
  });

  // Populate User Avatar
  const avatar = document.querySelector('.user-avatar');
  if (avatar && user.firstName) {
    avatar.textContent = user.firstName.charAt(0).toUpperCase();
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.style.fontWeight = 'bold';
    avatar.style.fontSize = '1.2rem';
  }

  // Logout Logic
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  fetchDashboardData();
});

async function fetchDashboardData() {
  try {
    const res = await fetch(`${API_URL}/doctor/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await res.json();
    
    if (data.status === 'success') {
      const stats = data.data;
      
      // Update Top Stats
      document.getElementById('stat-total-patients').textContent = stats.totalAssignedPatients;
      document.getElementById('stat-today-appointments').textContent = stats.todayAppointments;
      
      // Update Anonymous Feedback
      renderFeedback(stats.anonymousFeedback);
      
      // Update Patient Cards
      renderPatientCards(stats.patientCards);
      
      // Update Upcoming Appointments
      renderUpcomingAppointments(stats.upcomingAppointments);
      
      // Update Weekly Schedule
      window.fullWeeklySchedule = stats.weeklySchedule || [];
      renderSchedule(window.fullWeeklySchedule, 'upcoming');
    }
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
  }
}

function renderSchedule(appointments, filter = 'upcoming') {
  // First clear all existing pills in case of re-render
  for (let d = 1; d <= 5; d++) {
    for (let h = 9; h <= 12; h++) {
      const cell = document.getElementById(`cell-${d}-${h}`);
      if (cell) cell.innerHTML = '';
    }
  }

  if (!appointments || appointments.length === 0) return;

  const filteredAppointments = appointments.filter(appt => {
    const status = (appt.status || '').toLowerCase();
    if (filter === 'upcoming') {
      return status === 'scheduled' || status === 'upcoming';
    } else if (filter === 'completed') {
      return status === 'completed';
    } else if (filter === 'rejected') {
      return status === 'cancelled' || status === 'rejected';
    }
    return true;
  });

  filteredAppointments.forEach(appt => {
    const d = new Date(appt.date);
    const day = d.getDay(); // 1=Mon, 5=Fri
    const hour = d.getHours();

    // Only render if it falls in our 09:00-12:00 Mon-Fri grid
    if (day >= 1 && day <= 5 && hour >= 9 && hour <= 12) {
      const cell = document.getElementById(`cell-${day}-${hour}`);
      if (cell) {
        // Decide pill color dynamically
        const isPurple = appt.reason && appt.reason.toLowerCase().includes('consultation');
        const colorClass = isPurple ? 'purple' : 'cyan';
        const width = Math.floor(Math.random() * 40 + 40); // Random width 40-80% for visual variety
        
        // Ensure overlaps stack if there are multiple appointments in the same slot
        const existingPills = cell.querySelectorAll('.pill').length;
        const topOffset = 50 + (existingPills * 15); // Shift down if overlapping

        const patientId = appt.Patient ? appt.Patient.id : (appt.patientId || '');
        const hoverBoxShadow = isPurple ? 'rgba(123, 47, 247, 0.5)' : 'rgba(0, 245, 255, 0.5)';
        const pillHTML = `<a href="patient-profile.html?id=${patientId}" class="pill ${colorClass}" style="width: ${width}%; top: ${topOffset}%; transform: translateY(-50%); display: block; cursor: pointer; transition: transform 0.2s; box-shadow: 0 0 10px ${hoverBoxShadow};" title="View Patient Profile" onmouseover="this.style.transform='translateY(-50%) scale(1.05)'" onmouseout="this.style.transform='translateY(-50%) scale(1)'"></a>`;
        cell.insertAdjacentHTML('beforeend', pillHTML);
      }
    }
  });
}

function renderFeedback(feedbacks) {
  const starsContainer = document.getElementById('feedback-stars-container');
  const commentsContainer = document.getElementById('feedback-comments-container');
  
  starsContainer.innerHTML = '';
  commentsContainer.innerHTML = '';
  if (!feedbacks || !Array.isArray(feedbacks)) {
    starsContainer.innerHTML = '<div class="text-white-50 small">No feedback available.</div>';
    return;
  }

  feedbacks.forEach(fb => {
    // Generate Stars
    let starsHTML = '<div class="mb-3">';
    for (let i = 1; i <= 5; i++) {
      if (i <= fb.rating) {
        starsHTML += '<i class="fa-solid fa-star me-1" style="color: var(--neon-cyan); font-size: 0.8rem; text-shadow: 0 0 5px var(--neon-cyan);"></i>';
      } else {
        starsHTML += '<i class="fa-solid fa-star me-1" style="color: rgba(255,255,255,0.1); font-size: 0.8rem;"></i>';
      }
    }
    starsHTML += '</div>';
    starsContainer.insertAdjacentHTML('beforeend', starsHTML);
    
    // Generate Comment
    const commentHTML = `
      <div class="mb-3 d-flex gap-2">
        <div style="width:24px; height:24px; border-radius:50%; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <i class="fa-regular fa-user" style="font-size:0.6rem; color:var(--neon-cyan);"></i>
        </div>
        <div>
          <p class="mb-0 fw-semibold" style="font-size:0.85rem;">Anonymous</p>
          <p class="text-muted mb-0" style="font-size:0.75rem;">${fb.comment}</p>
        </div>
      </div>
    `;
    commentsContainer.insertAdjacentHTML('beforeend', commentHTML);
  });
}

function renderPatientCards(patients) {
  const container = document.getElementById('patient-cards-grid');
  container.innerHTML = '';
  
  if (!patients || patients.length === 0) {
    container.innerHTML = '<p class="text-muted">No assigned patients.</p>';
    return;
  }
  
  patients.forEach(patient => {
    // Mock calculate age or next visit
    const age = patient.dateOfBirth ? Math.floor((new Date() - new Date(patient.dateOfBirth).getTime()) / 3.15576e+10) : 42;
    const initial = patient.User ? patient.User.firstName.charAt(0) : 'P';
    
    // Create card
    const cardHTML = `
      <a href="patient-profile.html?id=${patient.id}" class="p-card">
        <div class="d-flex gap-3 align-items-center mb-3">
          <div style="width:40px; height:40px; border-radius:50%; background:rgba(123, 47, 247, 0.2); border: 1px solid var(--neon-purple); display:flex; align-items:center; justify-content:center; color: var(--neon-purple); font-weight:bold;">
            ${initial}
          </div>
          <div>
            <p class="text-muted mb-0" style="font-size:0.75rem;">Age</p>
            <h5 class="mb-0">${age}</h5>
          </div>
          <div class="ms-auto">
            <i class="fa-solid fa-circle-check" style="color: var(--neon-cyan);"></i>
          </div>
        </div>
        <div class="d-flex justify-content-between">
          <div>
            <p class="text-muted mb-0" style="font-size:0.75rem;">Next scheduled</p>
            <p class="mb-0 fw-semibold" style="font-size:0.85rem;">Oct 28</p>
          </div>
          <div class="text-end">
            <p class="text-muted mb-0" style="font-size:0.75rem;">Visit</p>
            <p class="mb-0 fw-semibold" style="font-size:0.85rem;">Oct 28</p>
          </div>
        </div>
      </a>
    `;
    container.insertAdjacentHTML('beforeend', cardHTML);
  });
}

function renderUpcomingAppointments(appointments) {
  const tbody = document.getElementById('upcoming-appointments-body');
  tbody.innerHTML = '';
  
  if (!appointments || appointments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No appointments today.</td></tr>';
    return;
  }
  
  appointments.forEach(appt => {
    const timeStr = new Date(appt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const patName = appt.Patient ? `${appt.Patient.User.firstName} ${appt.Patient.User.lastName}` : 'Unknown';
    const type = appt.reason || 'Appointment';
    
    const isDoctor = type.toLowerCase().includes('consultation');
    const btnClass = isDoctor ? 'btn-neon-purple' : 'btn-neon-cyan';
    const btnText = isDoctor ? 'Reschedule' : 'View Details';
    const linkAction = `onclick="window.location.href='patient-profile.html?id=${appt.patientId}'"`;
    
    const tr = `
      <tr>
        <td class="ps-3">${timeStr}</td>
        <td>${patName}</td>
        <td>${type}</td>
        <td><button class="btn ${btnClass}" ${linkAction}>${btnText}</button></td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', tr);
  });
}

/**
 * GLOBAL UTILITY: checkPatientEditAccess
 * Use this on doctor-patient-profile.html to enforce Read-Only logic.
 * 
 * Logic Explanation:
 * When the doctor opens a patient's profile, the frontend must check if the current Date.now() 
 * falls within the scheduled appointment.time block (e.g. +/- 1 hour).
 * If YES: Render the <form> to add Diagnoses/Prescriptions.
 * If NO: Hide forms, disable inputs, show "Read-only mode: No active appointment".
 */
window.checkPatientEditAccess = function(appointmentDateString) {
  if (!appointmentDateString) return false;
  
  const apptTime = new Date(appointmentDateString).getTime();
  const now = Date.now();
  
  // Example window: 30 minutes before, up to 2 hours after
  const ONE_HOUR = 60 * 60 * 1000;
  const THIRTY_MINS = 30 * 60 * 1000;
  
  const isEditable = (now >= apptTime - THIRTY_MINS) && (now <= apptTime + (2 * ONE_HOUR));
  
  return isEditable;
};
