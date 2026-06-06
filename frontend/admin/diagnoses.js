const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  document.getElementById('submitAddDiagnosisBtn').addEventListener('click', createDiagnosis);
  document.getElementById('submitEditDiagnosisBtn').addEventListener('click', updateDiagnosis);

  document.getElementById('searchDiagnosis').addEventListener('input', applyFilters);
  document.getElementById('filterDiagDoctor').addEventListener('change', applyFilters);

  // Set Profile Footer
  document.getElementById('userNameDisplay').textContent = `${user.firstName} ${user.lastName}`;
  document.getElementById('userInitial').textContent = user.firstName.charAt(0).toUpperCase();
  document.getElementById('userRoleDisplay').textContent = user.role.replace('_', ' ');

  // Set default date for Add Modal
  document.getElementById('addDate').valueAsDate = new Date();

  fetchRelationalData();
});

let diagnosesData = [];
let patientsData = [];
let doctorsData = [];

const addDiagnosisModalInstance = new bootstrap.Modal(document.getElementById('addDiagnosisModal'));
const editDiagnosisModalInstance = new bootstrap.Modal(document.getElementById('editDiagnosisModal'));
const viewDiagnosisModalInstance = new bootstrap.Modal(document.getElementById('viewDiagnosisModal'));

// --- Custom UI Helpers ---
let confirmCallback = null;
const confirmModalEl = document.getElementById('customConfirmModal');
let confirmModal = null;
if (confirmModalEl) {
  confirmModal = new bootstrap.Modal(confirmModalEl);
  document.getElementById('confirmModalBtn').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    confirmModal.hide();
  });
}

function showConfirm(message, callback) {
  const textEl = document.getElementById('confirmModalText');
  if (textEl) textEl.textContent = message;
  confirmCallback = callback;
  if (confirmModal) confirmModal.show();
}



async function fetchRelationalData() {
  try {
    const [diagRes, patRes, docRes] = await Promise.all([
      fetch(`${API_URL}/diagnoses`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_URL}/patients`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_URL}/doctors`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const diagData = await diagRes.json();
    const patData = await patRes.json();
    const docData = await docRes.json();

    if (diagRes.ok) diagnosesData = diagData.data.diagnoses;
    if (patRes.ok) patientsData = patData.data.patients;
    if (docRes.ok) doctorsData = docData.data.doctors;

    populateDropdowns();
    renderDiagnoses();
  } catch (err) {
    showNotification('Error loading directory data', 'danger');
  }
}

function populateDropdowns() {
  const addPatSel = document.getElementById('addPatient');
  const editPatSel = document.getElementById('editPatient');
  
  patientsData.forEach(p => {
    const txt = `${p.User.firstName} ${p.User.lastName}`;
    addPatSel.options.add(new Option(txt, p.id));
    editPatSel.options.add(new Option(txt, p.id));
  });

  const addDocSel = document.getElementById('addDoctor');
  const editDocSel = document.getElementById('editDoctor');
  const filterDiagDoctor = document.getElementById('filterDiagDoctor');
  filterDiagDoctor.innerHTML = '<option value="all">All Doctors</option>';

  doctorsData.forEach(d => {
    const txt = `Dr. ${d.User.lastName} (${d.specialization})`;
    addDocSel.options.add(new Option(txt, d.id));
    editDocSel.options.add(new Option(txt, d.id));
    filterDiagDoctor.options.add(new Option(`Dr. ${d.User.firstName} ${d.User.lastName}`, d.id));
  });
}

function getSeverityBadge(severity) {
  switch(severity) {
    case 'Critical': return '<span class="badge bg-danger">Critical</span>';
    case 'Moderate': return '<span class="badge bg-warning text-dark">Moderate</span>';
    case 'Mild': return '<span class="badge bg-info text-dark">Mild</span>';
    default: return `<span class="badge bg-secondary">${severity}</span>`;
  }
}

function applyFilters() {
  const query = document.getElementById('searchDiagnosis').value.toLowerCase();
  const docId = document.getElementById('filterDiagDoctor').value;

  const filtered = diagnosesData.filter(diag => {
    const pFirst = diag.Patient?.User?.firstName?.toLowerCase() || '';
    const pLast = diag.Patient?.User?.lastName?.toLowerCase() || '';
    const cond = diag.condition?.toLowerCase() || '';
    const pres = diag.prescription?.toLowerCase() || '';

    const matchesSearch = pFirst.includes(query) || pLast.includes(query) || cond.includes(query) || pres.includes(query);
    const matchesDoc = docId === 'all' || String(diag.doctorId) === docId;

    return matchesSearch && matchesDoc;
  });

  renderDiagnoses(filtered);
}

function renderDiagnoses(filteredArray = diagnosesData) {
  const tbody = document.getElementById('diagnosesTableBody');
  tbody.innerHTML = '';

  filteredArray.forEach(diagnosis => {
    const tr = document.createElement('tr');
    tr.id = `diagnosis-row-${diagnosis.id}`;
    
    const patName = diagnosis.Patient ? `${diagnosis.Patient.User.firstName} ${diagnosis.Patient.User.lastName}` : 'Unknown Patient';
    const docName = diagnosis.Doctor ? `Dr. ${diagnosis.Doctor.User.lastName}` : 'Unknown Doctor';

    tr.innerHTML = `
      <td class="fw-bold pat-col">${patName}</td>
      <td class="doc-col" style="color: var(--text-secondary);">${docName}</td>
      <td class="cond-col">${diagnosis.condition}</td>
      <td class="sev-col">${getSeverityBadge(diagnosis.severity)}</td>
      <td class="date-col">${diagnosis.date}</td>
      <td class="text-end">
        <div class="d-flex gap-2 align-items-center justify-content-end">
          <button class="btn btn-sm text-info view-btn" data-id="${diagnosis.id}" title="View" style="background: rgba(0, 245, 255, 0.1); border: 1px solid rgba(0, 245, 255, 0.3);">
              <i class="fa-solid fa-eye"></i>
          </button>
          <button class="btn btn-sm text-primary edit-btn" data-id="${diagnosis.id}" title="Edit" style="background: rgba(123, 47, 247, 0.1); border: 1px solid rgba(123, 47, 247, 0.3);">
              <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm text-danger delete-btn" data-id="${diagnosis.id}" title="Delete" style="background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3);">
              <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    
    const id = target.getAttribute('data-id');
    
    if (target.classList.contains('delete-btn')) {
      deleteDiagnosis(id);
    } else if (target.classList.contains('edit-btn')) {
      openEditDiagnosisModal(id);
    } else if (target.classList.contains('view-btn')) {
      viewDiagnosis(id);
    }
  });
}

async function createDiagnosis() {
  const payload = {
    patientId: document.getElementById('addPatient').value,
    doctorId: document.getElementById('addDoctor').value,
    condition: document.getElementById('addCondition').value,
    severity: document.getElementById('addSeverity').value,
    prescription: document.getElementById('addPrescription').value,
    date: document.getElementById('addDate').value
  };

  if (!payload.patientId || !payload.doctorId || !payload.condition || !payload.date) {
    showNotification('Please fill all required fields.', 'danger');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/diagnoses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (res.ok || res.status === 201) {
      addDiagnosisModalInstance.hide();
      showNotification('Successfully added diagnosis!', 'success');
      document.getElementById('addDiagnosisForm').reset();
      
      const newDiag = data.data.diagnosis;
      diagnosesData.unshift(newDiag);
      renderDiagnoses(); // Re-render to ensure top placement and correct event listeners
    } else {
      showNotification(data.message || 'Error adding diagnosis', 'danger');
    }
  } catch (err) {
    showNotification('Network error while adding diagnosis', 'danger');
  }
}

async function deleteDiagnosis(id) {
  showConfirm('Are you sure you want to delete this diagnosis?', async () => {
    try {
      const res = await fetch(`${API_URL}/diagnoses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok || res.status === 204) {
        showNotification('Diagnosis deleted', 'success');
        
        const row = document.getElementById(`diagnosis-row-${id}`);
        if (row) row.remove();
        
        diagnosesData = diagnosesData.filter(d => d.id !== id);
      } else {
        const data = await res.json();
        showNotification(data.message, 'danger');
      }
    } catch (err) {
      showNotification('Error deleting diagnosis', 'danger');
    }
  });
}

function viewDiagnosis(id) {
  const diagnosis = diagnosesData.find(d => String(d.id) === String(id));
  if (!diagnosis) return;

  const patName = diagnosis.Patient ? `${diagnosis.Patient.User.firstName} ${diagnosis.Patient.User.lastName}` : 'Unknown';
  const docName = diagnosis.Doctor ? `Dr. ${diagnosis.Doctor.User.lastName}` : 'Unknown';

  document.getElementById('viewPatientName').textContent = patName;
  document.getElementById('viewDoctorName').textContent = docName;
  document.getElementById('viewCondition').textContent = diagnosis.condition;
  document.getElementById('viewSeverityBadge').innerHTML = getSeverityBadge(diagnosis.severity);
  document.getElementById('viewDate').textContent = diagnosis.date;
  document.getElementById('viewPrescription').textContent = diagnosis.prescription || 'No prescription notes provided.';

  viewDiagnosisModalInstance.show();
}

function openEditDiagnosisModal(id) {
  const diagnosis = diagnosesData.find(d => String(d.id) === String(id));
  if (!diagnosis) return;

  document.getElementById('editDiagnosisId').value = diagnosis.id;
  document.getElementById('editPatient').value = diagnosis.patientId;
  document.getElementById('editDoctor').value = diagnosis.doctorId;
  document.getElementById('editCondition').value = diagnosis.condition;
  document.getElementById('editSeverity').value = diagnosis.severity;
  document.getElementById('editPrescription').value = diagnosis.prescription || '';
  document.getElementById('editDate').value = diagnosis.date;

  editDiagnosisModalInstance.show();
}

async function updateDiagnosis() {
  const id = document.getElementById('editDiagnosisId').value;
  const payload = {
    patientId: document.getElementById('editPatient').value,
    doctorId: document.getElementById('editDoctor').value,
    condition: document.getElementById('editCondition').value,
    severity: document.getElementById('editSeverity').value,
    prescription: document.getElementById('editPrescription').value,
    date: document.getElementById('editDate').value
  };

  try {
    const res = await fetch(`${API_URL}/diagnoses/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok || res.status === 200) {
      editDiagnosisModalInstance.hide();
      showNotification('Diagnosis updated successfully', 'success');

      // Update local data
      const updatedDiag = data.data.diagnosis;
      const index = diagnosesData.findIndex(d => String(d.id) === String(id));
      if (index !== -1) {
        diagnosesData[index] = updatedDiag;
      }

      // Re-render the specific row
      const tr = document.getElementById(`diagnosis-row-${id}`);
      if (tr) {
        const patName = updatedDiag.Patient ? `${updatedDiag.Patient.User.firstName} ${updatedDiag.Patient.User.lastName}` : 'Unknown Patient';
        const docName = updatedDiag.Doctor ? `Dr. ${updatedDiag.Doctor.User.lastName}` : 'Unknown Doctor';
        
        tr.querySelector('.pat-col').textContent = patName;
        tr.querySelector('.doc-col').textContent = docName;
        tr.querySelector('.cond-col').textContent = updatedDiag.condition;
        tr.querySelector('.sev-col').innerHTML = getSeverityBadge(updatedDiag.severity);
        tr.querySelector('.date-col').textContent = updatedDiag.date;
      }
    } else {
      showNotification(data.message || 'Error updating diagnosis', 'danger');
    }
  } catch (err) {
    showNotification('Network error while updating diagnosis', 'danger');
  }
}
