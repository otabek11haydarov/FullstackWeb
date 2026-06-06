const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);

// Security Check
if (user.role !== 'Doctor' && user.role !== 'Super_Admin') {
  showNotification('Access Denied. You must be a Doctor to view this page.');
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
  initCalendar();
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

let calendar;

function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;
  
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    weekends: false,
    slotDuration: '00:30:00',
    slotMinTime: '08:00:00',
    slotMaxTime: '19:00:00',
    headerToolbar: false,
    allDaySlot: false,
    events: [],
    eventClick: function(info) {
      if (info.event.extendedProps.patientId) {
        window.location.href = `patient-profile.html?id=${info.event.extendedProps.patientId}`;
      }
    }
  });
  calendar.render();
}

function renderSchedule(appointments, filter = 'upcoming') {
  if (!calendar) return;

  if (!appointments || appointments.length === 0) {
    calendar.removeAllEvents();
    return;
  }

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

  const events = filteredAppointments.map(appt => {
    const status = (appt.status || '').toLowerCase();
    let color = 'var(--neon-cyan)';
    
    // Status colors
    if (status === 'completed') color = 'var(--success)';
    else if (status === 'cancelled' || status === 'rejected') color = 'var(--danger)';
    else if (appt.reason && appt.reason.toLowerCase().includes('consultation')) color = 'var(--neon-purple)';

    const startDate = new Date(appt.date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default to 1 hour
    
    const correctPatientId = appt.Patient?.id || appt.patientId;
    const patName = appt.Patient ? `${appt.Patient.User.firstName} ${appt.Patient.User.lastName}` : 'Appointment';

    return {
      id: appt.id,
      title: patName,
      start: startDate,
      end: endDate,
      backgroundColor: color,
      extendedProps: { patientId: correctPatientId }
    };
  });

  calendar.removeAllEvents();
  calendar.addEventSource(events);
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
          <p class="mb-0 fw-semibold text-white" style="font-size:0.85rem;">Anonymous</p>
          <p class="text-white-50 mb-0" style="font-size:0.75rem;">${fb.comment}</p>
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
    container.innerHTML = '<p class="text-white-50">No assigned patients.</p>';
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
            <p class="text-white-50 mb-0" style="font-size:0.75rem;">Age</p>
            <h5 class="mb-0">${age}</h5>
          </div>
          <div class="ms-auto">
            <i class="fa-solid fa-circle-check" style="color: var(--neon-cyan);"></i>
          </div>
        </div>
        <div class="d-flex justify-content-between">
          <div>
            <p class="text-white-50 mb-0" style="font-size:0.75rem;">Next scheduled</p>
            <p class="mb-0 fw-semibold" style="font-size:0.85rem;">Oct 28</p>
          </div>
          <div class="text-end">
            <p class="text-white-50 mb-0" style="font-size:0.75rem;">Visit</p>
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
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-white-50">No appointments today.</td></tr>';
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

// ==========================================
// REAL-TIME AUDIT FEED & SYNC
// ==========================================
if (typeof io !== 'undefined') {
  const socket = io('http://localhost:8000');
  
  // Listen for global activity to auto-refresh the dashboard/calendar
  socket.on('globalActivity', (activity) => {
    console.log('Real-Time Update Received:', activity);
    // Refresh schedule quietly without full page reload
    if (typeof fetchDashboardData === 'function') {
      fetchDashboardData();
    }
  });
}

