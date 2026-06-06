// Receptionist Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
  // 1. Profile Sync Logic
  syncReceptionistProfile();

  // 2. Shift Lockdown Logic
  applyShiftLockdown();
  
  // Logout handler
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  // Load appointments
  loadUpcomingAppointments();

  // Socket.io Real-Time Activities & Persistent Fetch Integration
  fetchAndRenderActivities();
  initSocketListener();
});

// Track rendered activity IDs to prevent duplicates between initial fetch and live sockets
const renderedActivityIds = new Set();

/**
 * Helper to safely format relative time
 */
function getRelativeTime(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Shared helper to render a single activity object to the DOM
 */
function renderActivity(activity, prepend = true) {
  const activityList = document.querySelector('.timeline-container');
  if (!activityList) return;

  // Prevent duplicate rendering
  if (renderedActivityIds.has(activity.id)) return;
  renderedActivityIds.add(activity.id);

  // Safely escape values
  const safeMessage = activity.message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeInitial = (activity.userInitial || 'U').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const timeText = getRelativeTime(activity.createdAt || activity.timestamp || Date.now());

  const newActivity = document.createElement('div');
  newActivity.className = 'timeline-item fade-in';
  newActivity.innerHTML = `
      <div class="position-relative mb-4">
          <div class="position-absolute rounded-circle bg-info" style="width: 12px; height: 12px; left: -31px; top: 4px; box-shadow: 0 0 10px var(--neon-cyan);"></div>
          <div class="d-flex gap-3">
              <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold" style="width: 35px; height: 35px; background: linear-gradient(135deg, var(--neon-purple), var(--neon-cyan)); color: white;">
                ${safeInitial}
              </div>
              <div>
                  <p class="mb-0 text-light fw-semibold">${safeMessage}</p>
                  <small class="text-white-50">${timeText}</small>
              </div>
          </div>
      </div>
  `;

  if (prepend) {
    activityList.prepend(newActivity);
  } else {
    activityList.appendChild(newActivity);
  }

  // Keep list clean
  if (activityList.children.length > 10) {
    activityList.removeChild(activityList.lastChild);
  }
}

/**
 * Fetches recent database-backed activities on initial load
 */
async function fetchAndRenderActivities() {
  const container = document.querySelector('.timeline-container');
  if (!container) return;

  container.innerHTML = `<div class="text-center text-secondary py-3"><div class="spinner-border text-info spinner-border-sm mb-2" role="status"></div><p class="small mb-0">Loading activities...</p></div>`;

  try {
    const token = localStorage.getItem('token');
    const baseUrl = typeof window.API_URL !== 'undefined' ? window.API_URL : 'http://localhost:8000/api';
    
    // Fallback if API_URL includes /receptionist
    const fetchUrl = baseUrl.includes('/receptionist') ? baseUrl.replace('/receptionist', '') + '/activities' : baseUrl + '/activities';

    const res = await fetch(fetchUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (res.ok) {
      container.innerHTML = ''; // Clear loading state
      const activities = data.data.activities || [];
      
      if (activities.length === 0) {
        container.innerHTML = `<div class="text-center text-secondary py-3"><p class="small mb-0">No recent activities.</p></div>`;
        return;
      }

      // Reverse so oldest renders first, pushing newest to top when prepend=true
      activities.reverse().forEach(act => renderActivity(act, true));
    } else {
      container.innerHTML = `<div class="text-center text-danger py-3"><p class="small mb-0">Failed to load activities.</p></div>`;
    }
  } catch (err) {
    console.error('Error fetching activities:', err);
    container.innerHTML = `<div class="text-center text-danger py-3"><p class="small mb-0">Network error.</p></div>`;
  }
}

/**
 * Initializes Socket.io connection and listens for real-time activities
 */
function initSocketListener() {
  const baseUrl = typeof window.API_URL !== 'undefined' ? window.API_URL.replace('/api/receptionist', '') : 'http://localhost:8000';
  const socket = io(baseUrl);

  socket.on('newActivity', (activity) => {
    // If the timeline shows "No recent activities", clear it first
    const container = document.querySelector('.timeline-container');
    if (container && container.innerHTML.includes('No recent activities')) {
        container.innerHTML = '';
    }
    renderActivity(activity, true);
  });
}

/**
 * Fetches user profile from localStorage and displays it in the header
 */
function syncReceptionistProfile() {
  const userStr = localStorage.getItem('user');
  
  if (!userStr) {
    console.warn("No user found in localStorage. Redirecting to login...");
    return;
  }
  
  try {
    const user = JSON.parse(userStr);
    const closeBanner = document.getElementById('closeShiftBanner');
    if (closeBanner) {
      closeBanner.addEventListener('click', () => {
        document.getElementById('shiftWarningBanner').classList.add('d-none');
      });
    }
  
    // Setup Real-Time Socket Listener
    const socket = io('http://localhost:8000');
    socket.on('globalActivity', (activity) => {
      const activityContainer = document.getElementById('recent-activity-container');
      if (!activityContainer) return;

      const firstChild = activityContainer.firstElementChild;
      if (firstChild && firstChild.textContent.trim() === 'No recent activity.') {
        activityContainer.innerHTML = '';
      }

      const userInitial = activity.userInitial || 'SYS';
      
      // Create element dynamically
      const newDiv = document.createElement('div');
      newDiv.className = 'timeline-item';
      
      newDiv.innerHTML = `
        <div class="timeline-icon" style="border-color: ${userInitial === 'SYS' ? 'var(--neon-purple)' : 'var(--neon-cyan)'};">
          <img src="https://ui-avatars.com/api/?name=${userInitial}&background=random" alt="${userInitial}" class="rounded-circle" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <div>
          <div class="d-flex justify-content-between">
            <h6 class="mb-1 text-light fw-semibold">${activity.message}</h6>
            <button class="btn btn-sm text-muted border-0 p-0"><i class="fa-solid fa-ellipsis"></i></button>
          </div>
          <small class="text-secondary">Just now</small>
        </div>
      `;
      
      activityContainer.prepend(newDiv);
      
      // Quick animation using anime.js if available, or just CSS
      if (typeof anime !== 'undefined') {
        anime({
          targets: newDiv,
          opacity: [0, 1],
          translateY: [-20, 0],
          easing: 'easeOutExpo',
          duration: 500
        });
      }

      if (activityContainer.children.length > 50) {
        activityContainer.lastElementChild.remove();
      }
    });

    const receptionistNameEl = document.getElementById('receptionistName');
    const headerInitialEl = document.getElementById('headerInitial');
    
    if (receptionistNameEl && user.firstName && user.lastName) {
      // Add a nice badge identifying them as Receptionist alongside the name
      receptionistNameEl.innerHTML = `${user.firstName} ${user.lastName} <span class="badge ms-1" style="background: rgba(123, 47, 247, 0.2); border: 1px solid rgba(123, 47, 247, 0.5); color: var(--neon-cyan); font-weight: normal; font-size: 0.75rem;">Receptionist</span>`;
    }
    
    if (headerInitialEl && user.firstName) {
    }
    
  } catch (err) {
    console.error("Error parsing user data:", err);
  }
}

/**
 * Evaluates whether it's currently working hours based on the assigned shift.
 * @param {string} shift - "Morning", "Evening", or "Night"
 * @returns {boolean}
 */
function checkShiftHours(shift) {
  const hour = new Date().getHours();
  
  if (shift === 'Morning') {
    return hour >= 8 && hour < 16;
  } else if (shift === 'Evening') {
    return hour >= 16 && hour <= 23;
  } else if (shift === 'Night') {
    return hour >= 0 && hour < 8;
  }
  
  // Default to allowing access if shift is unrecognized or missing
  return true; 
}

/**
 * Applies or removes the Read-Only UI constraints across the dashboard based on shift.
 */
function applyShiftLockdown() {
  const userStr = localStorage.getItem('user');
  let isWorkingHours = true;
  
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      // Retrieve the user's shift. If they have one, evaluate it against the current time.
      if (user.shift) {
        isWorkingHours = checkShiftHours(user.shift);
      }
    } catch (err) {
      console.error("Failed to parse user for shift check:", err);
    }
  }

  const banner = document.getElementById('shiftWarningBanner');
  const actionButtons = document.querySelectorAll('.action-button');

  if (!isWorkingHours) {
    // OUTSIDE WORKING HOURS: LOCKDOWN
    if (banner) banner.classList.remove('d-none');
    
    actionButtons.forEach(btn => {
      btn.setAttribute('disabled', 'true');
      btn.classList.add('locked-action');
      
      // Make buttons look disabled/generic
      btn.classList.remove('btn-outline-info');
      btn.classList.add('btn-outline-secondary');
      
      const lockIcon = btn.querySelector('.lock-overlay');
      if (lockIcon) lockIcon.classList.remove('d-none');
    });
  } else {
    // INSIDE WORKING HOURS: UNLOCK
    if (banner) banner.classList.add('d-none');
    
    actionButtons.forEach(btn => {
      btn.removeAttribute('disabled');
      btn.classList.remove('locked-action');
      
      // Restore bright interactive colors
      btn.classList.remove('btn-outline-secondary');
      btn.classList.add('btn-outline-info');
      
      const lockIcon = btn.querySelector('.lock-overlay');
      if (lockIcon) lockIcon.classList.add('d-none');
    });
  }
}

/**
 * Loads upcoming appointments for the next 5 hours
 */
async function loadUpcomingAppointments() {
  const container = document.getElementById('upcomingAppointmentsList');
  if (!container) return;

  try {
    const token = localStorage.getItem('token');
    const API_URL = 'http://localhost:8000/api/receptionist'; // Fallback hardcoded for now, though should use global config if available
    
    // Attempt to use global API_URL if defined in scope
    const baseUrl = typeof window.API_URL !== 'undefined' ? window.API_URL : 'http://localhost:8000/api/receptionist';

    const res = await fetch(`${baseUrl}/appointments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (res.ok) {
      const appointments = data.data.appointments || [];
      const now = new Date();
      const fiveHoursFromNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);

      // Filter: only appointments from NOW up to 5 hours in the future
      const upcoming = appointments.filter(appt => {
        const apptDate = new Date(appt.date);
        return apptDate >= now && apptDate <= fiveHoursFromNow;
      });

      // Sort: chronological
      upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Clear container completely to prevent duplicates
      container.innerHTML = '';

      if (upcoming.length === 0) {
        container.innerHTML = `<div class="text-center text-secondary py-3"><p class="small mb-0">No upcoming appointments in the next 5 hours.</p></div>`;
        return;
      }

      // Track rendered IDs to explicitly prevent duplicates as requested
      const renderedIds = new Set();

      upcoming.forEach(appt => {
        if (renderedIds.has(appt.id)) return;
        renderedIds.add(appt.id);

        const apptDate = new Date(appt.date);
        const timeStr = apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const patientName = appt.Patient?.User ? `${appt.Patient.User.firstName} ${appt.Patient.User.lastName}` : 'Unknown Patient';
        const docName = appt.Doctor?.User ? `Dr. ${appt.Doctor.User.lastName}` : 'Unknown Doctor';

        const item = document.createElement('div');
        item.className = 'd-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25 pb-2 custom-hover-effect px-2 rounded';
        item.innerHTML = `
          <div class="d-flex align-items-center gap-3">
            <div class="bg-primary bg-opacity-10 text-info fw-bold rounded px-2 py-1" style="font-size: 0.85rem; border: 1px solid rgba(13, 202, 240, 0.3);">
              ${timeStr}
            </div>
            <div>
              <p class="mb-0 text-light fw-semibold" style="font-size: 0.9rem;">${patientName}</p>
              <p class="mb-0 text-secondary" style="font-size: 0.75rem;"><i class="fa-solid fa-user-doctor me-1"></i>${docName}</p>
            </div>
          </div>
          <div>
            <span class="badge" style="background: rgba(123, 47, 247, 0.2); color: var(--neon-purple); border: 1px solid rgba(123, 47, 247, 0.3);">Upcoming</span>
          </div>
        `;
        container.appendChild(item);
      });

    } else {
      container.innerHTML = `<div class="text-center text-danger py-3"><p class="small mb-0">Failed to load schedule.</p></div>`;
    }
  } catch (err) {
    console.error('Error fetching appointments:', err);
    container.innerHTML = `<div class="text-center text-danger py-3"><p class="small mb-0">Network error.</p></div>`;
  }
}
