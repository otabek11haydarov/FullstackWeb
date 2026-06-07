document.addEventListener('DOMContentLoaded', async () => {
  // Apply page-fade-in class for smooth transition if not already handled by transitions.js
  document.body.classList.add('page-fade-in');
  
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '../auth/login.html';
    return;
  }

  // Handle Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      window.location.href = '../auth/login.html';
    });
  }

  // Setup Avatar initials
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const userObj = JSON.parse(userStr);
      const avatar = document.getElementById('user-avatar');
      if (avatar) {
        avatar.style.display = 'flex';
        avatar.innerHTML = `<span style="color: white; font-weight: bold; font-size: 1.1rem;">
          ${userObj.firstName.charAt(0)}${userObj.lastName.charAt(0)}
        </span>`;
      }
    } catch(e) { console.error(e); window.showNotification("An error occurred. Please try again.", "error"); }
  }

  // Fetch Stats Data
  await fetchReportsStats(token);
});

async function fetchReportsStats(token) {
  try {
    const response = await fetch('http://localhost:8000/api/doctor/reports/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (data.status === 'success') {
      renderStats(data.data);
    } else {
      console.error('Failed to fetch stats:', data.message);
      showEmptyState();
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    showEmptyState();
  }
}

function renderStats(stats) {
  // Update Counters with animation
  animateCounter('totalPatientsCounter', stats.totalPatients);
  animateCounter('totalAppointmentsCounter', stats.totalAppointments);
  animateCounter('totalDiagnosesCounter', stats.totalDiagnoses);

  // Render Anonymous Feedback
  const feedbackContainer = document.getElementById('feedbackList');
  if (feedbackContainer) {
    feedbackContainer.innerHTML = ''; // Clear spinner
    
    if (!stats.anonymousFeedback || stats.anonymousFeedback.length === 0) {
      feedbackContainer.innerHTML = `
        <li class="list-group-item bg-transparent text-center py-4 text-white-50 border-0">
          <i class="fa-solid fa-comment-slash fs-3 mb-2 opacity-50"></i>
          <p class="mb-0">No feedback available yet.</p>
        </li>
      `;
    } else {
      stats.anonymousFeedback.forEach(fb => {
        let starsHtml = '';
        for (let i = 0; i < 5; i++) {
          if (i < fb.rating) {
            starsHtml += '<i class="fa-solid fa-star text-info"></i>';
          } else {
            starsHtml += '<i class="fa-regular fa-star text-secondary opacity-50"></i>';
          }
        }
        
        const fbDate = new Date(fb.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        
        const li = document.createElement('li');
        li.className = 'list-group-item bg-transparent border-bottom border-secondary border-opacity-25 py-3';
        li.innerHTML = `
          <div class="d-flex justify-content-between mb-2 align-items-center">
            <div>
              <div class="fw-bold text-white"><i class="fa-solid fa-mask me-2 text-white-50"></i>Anonymous Patient</div>
              <small class="text-white-50">${fbDate}</small>
            </div>
            <div>${starsHtml}</div>
          </div>
          <p class="text-white-50 mb-0 font-italic">"${fb.comment}"</p>
        `;
        feedbackContainer.appendChild(li);
      });
    }
  }
}

function showEmptyState() {
  document.getElementById('totalPatientsCounter').innerText = '0';
  document.getElementById('totalAppointmentsCounter').innerText = '0';
  document.getElementById('totalDiagnosesCounter').innerText = '0';
  
  const listContainer = document.getElementById('feedbackList');
  if (listContainer) {
    listContainer.innerHTML = `
      <li class="list-group-item bg-transparent text-center py-4 text-white-50 border-0">
        <i class="fa-solid fa-triangle-exclamation fs-3 mb-2 text-warning opacity-75"></i>
        <p class="mb-0">Failed to load statistics.</p>
      </li>
    `;
  }
}

// Helper function to animate numbers counting up
function animateCounter(elementId, targetValue, duration = 1000) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  if (targetValue === 0) {
    element.innerText = '0';
    return;
  }

  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    // Use ease-out cubic function for smoother animation
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    element.innerText = Math.floor(easeProgress * targetValue);
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.innerText = targetValue;
    }
  };
  window.requestAnimationFrame(step);
}
