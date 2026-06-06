// Receptionist Appointments Logic

let allAppointments = [];
let allDoctors = [];
let allPatients = [];
let currentEditId = null;

document.addEventListener('DOMContentLoaded', async () => {
  syncReceptionistProfile();

  const isWorkingHours = applyShiftLockdown();

  // Logout handler
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  // Filter Listeners
  document.getElementById('filterDate')?.addEventListener('change', renderAppointments);
  document.getElementById('filterDoctor')?.addEventListener('change', renderAppointments);

  // Form Submit
  document.getElementById('appointmentForm')?.addEventListener('submit', handleAppointmentSubmit);

  // Clear modal on close
  const modalEl = document.getElementById('appointmentModal');
  if (modalEl) {
    modalEl.addEventListener('hidden.bs.modal', () => {
      document.getElementById('appointmentForm').reset();
      currentEditId = null;
    });
  }

  // Load Data
  await fetchDoctors();
  await fetchPatients();
  await fetchAppointments();
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

// API FETCHES
async function fetchDoctors() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:8000/api/doctors', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.status === 'success') {
      allDoctors = data.data.doctors;
      const select1 = document.getElementById('filterDoctor');
      const select2 = document.getElementById('doctorId');
      allDoctors.forEach(doc => {
        const option = `<option value="${doc.id}">Dr. ${doc.User.firstName} ${doc.User.lastName}</option>`;
        if(select1) select1.insertAdjacentHTML('beforeend', option);
        if(select2) select2.insertAdjacentHTML('beforeend', option);
      });
    }
  } catch (err) {
    console.error("Error fetching doctors", err);
  }
}

async function fetchPatients() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:8000/api/patients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.status === 'success') {
      allPatients = data.data.patients;
      const select = document.getElementById('patientId');
      if (select) {
        allPatients.forEach(pat => {
          const option = `<option value="${pat.id}">${pat.User.firstName} ${pat.User.lastName}</option>`;
          select.insertAdjacentHTML('beforeend', option);
        });
      }
    }
  } catch (err) {
    console.error("Error fetching patients", err);
  }
}

async function fetchAppointments() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:8000/api/receptionist/appointments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.status === 'success') {
      allAppointments = data.data.appointments;
      renderAppointments();
    }
  } catch (err) {
    console.error("Error fetching appointments", err);
  }
}

function renderAppointments() {
  const tbody = document.getElementById('appointmentsTableBody');
  if (!tbody) return;

  const dateFilter = document.getElementById('filterDate')?.value;
  const doctorFilter = document.getElementById('filterDoctor')?.value;

  let filtered = allAppointments;

  if (dateFilter) {
    filtered = filtered.filter(app => app.date && app.date.startsWith(dateFilter));
  }
  if (doctorFilter && doctorFilter !== 'all') {
    filtered = filtered.filter(app => app.doctorId === doctorFilter);
  }

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary py-4">No appointments found.</td></tr>`;
    return;
  }

  filtered.forEach(app => {
    const apptDate = new Date(app.date);
    const dateStr = apptDate.toLocaleDateString();
    const timeStr = apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let statusBadge = '';
    if (app.status === 'Scheduled') statusBadge = '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary">Scheduled</span>';
    else if (app.status === 'Completed') statusBadge = '<span class="badge bg-success bg-opacity-10 text-success border border-success">Completed</span>';
    else if (app.status === 'Cancelled') statusBadge = '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger">Cancelled</span>';
    else if (app.status === 'No Show') statusBadge = '<span class="badge bg-warning bg-opacity-10 text-warning border border-warning">No Show</span>';

    const patName = app.Patient?.User ? `${app.Patient.User.firstName} ${app.Patient.User.lastName}` : 'Unknown Patient';
    const docName = app.Doctor?.User ? `Dr. ${app.Doctor.User.firstName} ${app.Doctor.User.lastName}` : 'Unknown Doctor';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="text-light fw-bold">${dateStr}</div>
        <div class="text-secondary small">${timeStr}</div>
      </td>
      <td class="text-light">${patName}</td>
      <td class="text-light">${docName}</td>
      <td class="text-light">${app.reason || '-'}</td>
      <td>${statusBadge}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-info me-2 action-button" onclick="editAppointment('${app.id}')" title="Edit">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger action-button" onclick="deleteAppointment('${app.id}')" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Re-apply lockdown on new buttons if needed
  applyShiftLockdown();
}

async function handleAppointmentSubmit(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  
  const payload = {
    patientId: document.getElementById('patientId').value,
    doctorId: document.getElementById('doctorId').value,
    date: document.getElementById('appointmentDate').value,
    status: document.getElementById('appointmentStatus').value,
    reason: document.getElementById('appointmentReason').value,
    notes: document.getElementById('appointmentNotes').value,
  };

  try {
    let url = 'http://localhost:8000/api/receptionist/appointments';
    let method = 'POST';

    if (currentEditId) {
      url += `/${currentEditId}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.status === 'success') {
      const modalInstance = bootstrap.Modal.getInstance(document.getElementById('appointmentModal'));
      modalInstance.hide();
      await fetchAppointments();
    } else {
      showNotification(data.message || 'Error saving appointment');
    }
  } catch (err) {
    console.error('Submit error:', err);
  }
}

window.editAppointment = (id) => {
  const app = allAppointments.find(a => a.id === id);
  if (!app) return;

  currentEditId = id;
  document.getElementById('patientId').value = app.patientId;
  document.getElementById('doctorId').value = app.doctorId;
  
  // Format datetime for local input type
  const localDate = new Date(app.date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  document.getElementById('appointmentDate').value = localDate.toISOString().slice(0, 16);
  
  document.getElementById('appointmentStatus').value = app.status;
  document.getElementById('appointmentReason').value = app.reason;
  document.getElementById('appointmentNotes').value = app.notes || '';

  const modal = new bootstrap.Modal(document.getElementById('appointmentModal'));
  modal.show();
};

window.deleteAppointment = async (id) => {
  if (!confirm('Are you sure you want to delete this appointment?')) return;
  
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:8000/api/receptionist/appointments/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      await fetchAppointments();
    } else {
      const data = await res.json();
      showNotification(data.message || 'Error deleting appointment');
    }
  } catch (err) {
    console.error('Delete error:', err);
  }
};
