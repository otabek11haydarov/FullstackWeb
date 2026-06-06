const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);
let currentModal = null;
let allAppointments = [];

document.addEventListener('DOMContentLoaded', () => {
  // Populate User Info in Sidebar
  const userInitial = document.getElementById('userInitial');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userRoleDisplay = document.getElementById('userRoleDisplay');
  
  if (userInitial && user.firstName) {
  }
  if (userNameDisplay) {
  }
  if (userRoleDisplay) {
  }

  // Logout Logic
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  currentModal = new bootstrap.Modal(document.getElementById('adminAppointmentModal'));
  
  // Set default dates to current month
  const today = new Date();
  document.getElementById('filterStart').value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  document.getElementById('filterEnd').value = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  document.getElementById('filterBtn').addEventListener('click', loadAppointments);
  document.getElementById('appointmentForm').addEventListener('submit', handleFormSubmit);

  document.getElementById('searchAppointment').addEventListener('input', applyFilters);
  document.getElementById('filterApptDoctor').addEventListener('change', applyFilters);
  document.getElementById('filterApptStatus').addEventListener('change', applyFilters);

  loadAppointments();
  populateDropdowns();
});

// Fetch & Filter
async function loadAppointments() {
  const start = document.getElementById('filterStart').value;
  const end = document.getElementById('filterEnd').value;
  
  try {
    const res = await fetch(`${API_URL}/admins/appointments?startDate=${start}&endDate=${end}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      allAppointments = data.data.appointments;
      applyFilters();
    } else {
      console.error(data.message);
    }
  } catch (err) {
    console.error("Failed to fetch appointments:", err);
  }
}

function applyFilters() {
  const query = document.getElementById('searchAppointment').value.toLowerCase();
  const docId = document.getElementById('filterApptDoctor').value;
  const status = document.getElementById('filterApptStatus').value;

  const filtered = allAppointments.filter(app => {
    const pFirst = app.Patient?.User?.firstName?.toLowerCase() || '';
    const pLast = app.Patient?.User?.lastName?.toLowerCase() || '';
    const reason = app.reason?.toLowerCase() || '';

    const matchesSearch = pFirst.includes(query) || pLast.includes(query) || reason.includes(query);
    const matchesDoc = docId === 'all' || String(app.doctorId) === docId;
    const matchesStatus = status === 'all' || app.status === status;

    return matchesSearch && matchesDoc && matchesStatus;
  });

  renderTable(filtered);
}

// Render Table
function renderTable(appointments = allAppointments) {
  const tbody = document.getElementById('appointmentsTableBody');
  tbody.innerHTML = '';

  if (appointments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-white-50">No appointments found in this date range.</td></tr>`;
    return;
  }

  appointments.forEach(app => {
    const date = new Date(app.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    const patName = app.Patient?.User ? `${app.Patient.User.firstName} ${app.Patient.User.lastName}` : 'Unknown Patient';
    const docName = app.Doctor?.User ? `Dr. ${app.Doctor.User.firstName} ${app.Doctor.User.lastName}` : 'Unknown Doctor';
    
    // Status Badge Color
    let badgeClass = 'bg-secondary';
    if(app.status === 'Scheduled') badgeClass = 'bg-info bg-opacity-10 text-info border border-info border-opacity-25';
    if(app.status === 'Completed') badgeClass = 'bg-success bg-opacity-10 text-success border border-success border-opacity-25';
    if(app.status === 'Cancelled') badgeClass = 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25';
    if(app.status === 'No Show') badgeClass = 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25';

    tbody.innerHTML += `
      <tr>
        <td class="text-white-50">${date}</td>
        <td class="fw-bold" style="color: var(--text-primary);">${patName}</td>
        <td class="text-info">${docName}</td>
        <td><span class="badge rounded-pill px-3 py-2 ${badgeClass}">${app.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-warning me-2" onclick='editAppointment(${JSON.stringify(app).replace(/'/g, "&apos;")})'><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteAppointment('${app.id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  });
}

// Load Dropdowns
async function populateDropdowns() {
  try {
    // Fetch Doctors
    const docRes = await fetch(`${API_URL}/admins/doctors`, { headers: { 'Authorization': `Bearer ${token}` } });
    const docData = await docRes.json();
    if (docRes.ok) {
      const docSelect = document.getElementById('doctorSelect');
      const filterApptDoc = document.getElementById('filterApptDoctor');
      docSelect.innerHTML = '<option value="">Select Doctor...</option>';
      filterApptDoc.innerHTML = '<option value="all">All Doctors</option>';
      docData.data.doctors.forEach(doc => {
        docSelect.innerHTML += `<option value="${doc.id}">Dr. ${doc.User.firstName} ${doc.User.lastName}</option>`;
        filterApptDoc.innerHTML += `<option value="${doc.id}">Dr. ${doc.User.firstName} ${doc.User.lastName}</option>`;
      });
    }

    // Fetch Patients
    const patRes = await fetch(`${API_URL}/admins/patients`, { headers: { 'Authorization': `Bearer ${token}` } });
    const patData = await patRes.json();
    if (patRes.ok) {
      const patSelect = document.getElementById('patientSelect');
      patSelect.innerHTML = '<option value="">Select Patient...</option>';
      patData.data.patients.forEach(pat => {
        patSelect.innerHTML += `<option value="${pat.id}">${pat.User.firstName} ${pat.User.lastName}</option>`;
      });
    }
  } catch (err) {
    console.error("Failed to fetch dropdown data:", err);
  }
}

// Modal Actions
window.openModal = function() {
  document.getElementById('appointmentForm').reset();
  document.getElementById('appointmentId').value = '';
  document.getElementById('modalTitle').innerText = "Add Emergency Override";
  currentModal.show();
}

window.editAppointment = function(app) {
  document.getElementById('appointmentId').value = app.id;
  document.getElementById('patientSelect').value = app.patientId;
  document.getElementById('doctorSelect').value = app.doctorId;
  
  // Convert ISO string to format accepted by datetime-local (YYYY-MM-DDThh:mm)
  const dt = new Date(app.date);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  document.getElementById('appointmentDate').value = dt.toISOString().slice(0,16);
  
  document.getElementById('appointmentStatus').value = app.status;
  document.getElementById('appointmentReason').value = app.reason;
  document.getElementById('modalTitle').innerText = "Edit Override";
  currentModal.show();
}

// Create & Update
async function handleFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('appointmentId').value;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `${API_URL}/admins/appointments/${id}` : `${API_URL}/admins/appointments`;

  const payload = {
    patientId: document.getElementById('patientSelect').value,
    doctorId: document.getElementById('doctorSelect').value,
    date: document.getElementById('appointmentDate').value,
    status: document.getElementById('appointmentStatus').value,
    reason: document.getElementById('appointmentReason').value
  };

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      currentModal.hide();
      loadAppointments(); // Instantly refresh
    } else {
      const errorData = await res.json();
      showNotification("Error: " + errorData.message);
    }
  } catch (err) {
    console.error("Failed to submit appointment:", err);
    showNotification("System error saving appointment.");
  }
}

// Delete
window.deleteAppointment = async function(id) {
  if(!confirm("DANGER: Are you sure you want to permanently delete this appointment?")) return;
  
  try {
    const res = await fetch(`${API_URL}/admins/appointments/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      loadAppointments(); // Instantly refresh
    } else {
      const errorData = await res.json();
      showNotification("Error deleting: " + errorData.message);
    }
  } catch (err) {
    console.error("Failed to delete appointment:", err);
  }
}
