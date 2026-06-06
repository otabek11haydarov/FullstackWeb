// Receptionist Doctors Logic

let allDoctors = [];

document.addEventListener('DOMContentLoaded', async () => {
  syncReceptionistProfile();

  // Shift Lockdown limits interaction
  const isWorkingHours = applyShiftLockdown();

  // Logout handler
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  // Filter Listeners
  document.getElementById('searchDoctor')?.addEventListener('input', applyFilters);
  document.getElementById('filterSpecialization')?.addEventListener('change', applyFilters);

  // Load Data
  await fetchDoctors();
});

function syncReceptionistProfile() {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = '../auth/login.html';
    return;
  }
  try {
    const user = JSON.parse(userStr);
    const nameEl = document.getElementById('receptionistName');
    const initEl = document.getElementById('headerInitial');
    if (nameEl && user.firstName && user.lastName) {
      nameEl.innerHTML = `${user.firstName} ${user.lastName} <span class="badge ms-1" style="background: rgba(123, 47, 247, 0.2); border: 1px solid rgba(123, 47, 247, 0.5); color: var(--neon-cyan); font-weight: normal; font-size: 0.75rem;">Receptionist</span>`;
    }
    if (initEl && user.firstName) {
      initEl.textContent = user.firstName.charAt(0).toUpperCase();
    }
  } catch (err) {
    console.error("Error parsing user data:", err);
  }
}

function checkShiftHours(shift) {
  const hour = new Date().getHours();
  if (shift === 'Morning') return hour >= 8 && hour < 16;
  if (shift === 'Evening') return hour >= 16 && hour <= 23;
  if (shift === 'Night') return hour >= 0 && hour < 8;
  return true;
}

function applyShiftLockdown() {
  const userStr = localStorage.getItem('user');
  let isWorkingHours = true;
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.shift) isWorkingHours = checkShiftHours(user.shift);
    } catch (e) {}
  }

  const banner = document.getElementById('shiftWarningBanner');
  const actionButtons = document.querySelectorAll('.action-button');

  if (!isWorkingHours) {
    if (banner) banner.classList.remove('d-none');
    actionButtons.forEach(btn => {
      btn.setAttribute('disabled', 'true');
      btn.classList.add('locked-action');
    });
  } else {
    if (banner) banner.classList.add('d-none');
    actionButtons.forEach(btn => {
      btn.removeAttribute('disabled');
      btn.classList.remove('locked-action');
    });
  }
  return isWorkingHours;
}

// API FETCH
async function fetchDoctors() {
  try {
    const token = localStorage.getItem('token');
    // Calling the newly created receptionist doctors endpoint
    const res = await fetch('http://localhost:8000/api/receptionists/doctors', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.status === 'success') {
      allDoctors = data.data.doctors;
      populateSpecializations();
      renderDoctors(allDoctors);
    }
  } catch (err) {
    console.error("Error fetching doctors", err);
  }
}

function populateSpecializations() {
  const select = document.getElementById('filterSpecialization');
  if (!select) return;

  const specializations = new Set();
  allDoctors.forEach(doc => {
    if (doc.specialization) specializations.add(doc.specialization);
  });

  specializations.forEach(spec => {
    select.insertAdjacentHTML('beforeend', `<option value="${spec}">${spec}</option>`);
  });
}

function applyFilters() {
  const searchTerm = document.getElementById('searchDoctor')?.value.toLowerCase() || '';
  const specFilter = document.getElementById('filterSpecialization')?.value;

  const filtered = allDoctors.filter(doc => {
    const fullName = `${doc.User?.firstName} ${doc.User?.lastName}`.toLowerCase();
    const spec = (doc.specialization || '').toLowerCase();
    
    const matchesSearch = fullName.includes(searchTerm) || spec.includes(searchTerm);
    const matchesSpec = (specFilter === 'all' || doc.specialization === specFilter);

    return matchesSearch && matchesSpec;
  });

  renderDoctors(filtered);
}

function renderDoctors(doctorsList) {
  const tbody = document.getElementById('doctorsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (doctorsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-4">No doctors found.</td></tr>`;
    return;
  }

  doctorsList.forEach(doc => {
    const fullName = doc.User ? `Dr. ${doc.User.firstName} ${doc.User.lastName}` : 'Unknown Doctor';
    const email = doc.User ? doc.User.email : 'N/A';
    
    // Determine status (mocked or retrieved if available)
    const isActive = true; // Assuming active by default unless specified
    const statusBadge = isActive 
      ? '<span class="badge bg-success bg-opacity-10 text-success border border-success">Active</span>'
      : '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger">On Leave</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="rounded-circle d-flex justify-content-center align-items-center bg-secondary" style="width: 40px; height: 40px;">
          <i class="fa-solid fa-user-md text-white"></i>
        </div>
      </td>
      <td class="text-light fw-bold">${fullName}</td>
      <td class="text-info">${doc.specialization || '-'}</td>
      <td class="text-secondary">${email}</td>
      <td class="text-secondary">${doc.licenseNumber || '-'}</td>
      <td>${statusBadge}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-info rounded-pill px-3 action-button" onclick="viewProfile('${doc.id}')">
          View
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Apply lockdown so buttons are disabled if off-shift
  applyShiftLockdown();
}

window.viewProfile = (id) => {
  // Read-only directory: alert for demonstration
  showNotification("Viewing profile for Doctor ID: " + id);
};
