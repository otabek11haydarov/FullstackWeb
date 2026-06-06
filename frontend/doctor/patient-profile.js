const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);
let doctorId = null;
let patientId = null;
let activeAppointmentId = null;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
  });

  const urlParams = new URLSearchParams(window.location.search);
  patientId = urlParams.get('id');
  if (!patientId) {
    showNotification('No patient selected.');
    window.location.href = 'my-patients.html';
    return;
  }

  await fetchDoctorAndPatient();

  // Step 1: Capture the ID into the hidden input
  document.getElementById('diagnosisPatientId').value = patientId;

  // Step 2: Submit event listener for Diagnosis Form
  const diagForm = document.getElementById('diagnosisForm');
  if (diagForm) {
    diagForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const patId = document.getElementById('diagnosisPatientId').value;
      if (!patId) {
          showNotification("No patient selected."); 
          return;
      }
      
      const payload = {
          patientId: patId,
          condition: document.getElementById('diagCondition').value,
          severity: document.getElementById('diagSeverity').value,
          prescription: document.getElementById('diagNotes').value 
      };

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
          showNotification('Diagnosis added successfully!', 'success');
          diagForm.reset();
        } else {
          showNotification(data.message || 'Error adding diagnosis', 'error');
        }
      } catch (err) {
        showNotification('Network error while adding diagnosis', 'error');
      }
    });
  }

  // Appointment Actions
  document.getElementById('btnMarkCompleted')?.addEventListener('click', async () => {
    if (!activeAppointmentId) return showNotification('No active appointment to manage.');
    await updateAppointmentStatus(activeAppointmentId, 'Completed');
  });
  
  document.getElementById('btnSendToDiagnostics')?.addEventListener('click', async () => {
    if (!activeAppointmentId) return showNotification('No active appointment to manage.');
    await updateAppointmentStatus(activeAppointmentId, 'Pending');
  });

  async function updateAppointmentStatus(id, status) {
    try {
      const res = await fetch(`${API_URL}/doctor/appointments/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showNotification(`Appointment marked as ${status}`, 'success');
        setTimeout(() => location.reload(), 1500);
      } else {
        showNotification('Failed to update status', 'error');
      }
    } catch(err) {
      showNotification('Network error', 'error');
    }
  }

  // Load Doctors for Referral
  async function loadDoctors() {
    try {
      const res = await fetch(`${API_URL}/doctor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const select = document.getElementById('referDoctorSelect');
      if (select && data.data && data.data.doctors) {
        select.innerHTML = '<option value="" disabled selected>Select a doctor...</option>';
        data.data.doctors.forEach(doc => {
          if (doc.User.id === user.id) {
            doctorId = doc.id;
          } else { // Don't refer to self
            select.innerHTML += `<option value="${doc.id}">Dr. ${doc.User.firstName} ${doc.User.lastName} (${doc.specialization})</option>`;
          }
        });
      }
    } catch(err) { console.error('Failed to load doctors'); }
  }

  // Load Clinical History
  async function loadClinicalHistory() {
    try {
      const res = await fetch(`${API_URL}/doctor/patients/${patientId}/clinical-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const container = document.getElementById('clinicalHistoryContainer');
      if (container && res.ok && data.data && data.data.history) {
        container.innerHTML = '';
        if (data.data.history.length === 0) {
          container.innerHTML = '<p class="text-white-50">No clinical history found.</p>';
          return;
        }
        
        data.data.history.forEach(record => {
          const docName = record.Doctor && record.Doctor.User ? record.Doctor.User.lastName : 'Unknown';
          const isOwner = record.doctorId === doctorId;
          
          let actionHtml = '';
          if (isOwner) {
            actionHtml = `
              <button class="btn btn-sm btn-outline-info me-2"><i class="fas fa-edit"></i> Edit</button>
              <button class="btn btn-sm btn-outline-danger"><i class="fas fa-trash"></i> Delete</button>
            `;
          } else {
            actionHtml = `
              <span class="badge bg-dark border border-secondary text-secondary">
                  <i class="fas fa-lock"></i> Read Only (Authored by Dr. ${docName})
              </span>
            `;
          }

          container.innerHTML += `
            <div class="card bg-dark border-secondary mb-3">
              <div class="card-body d-flex justify-content-between align-items-center">
                <div>
                  <h6 class="mb-1 text-white">${record.actionType} <span class="text-white-50 fw-normal ms-2">${new Date(record.date).toLocaleDateString()}</span></h6>
                  <p class="mb-0 text-white-50 small">${record.description}</p>
                </div>
                <div>
                  ${actionHtml}
                </div>
              </div>
            </div>
          `;
        });
      }
    } catch(err) {
      console.error(err);
    }
  }

  await loadDoctors();
  await loadClinicalHistory();

  // Referral Submit
  const referForm = document.getElementById('referralForm');
  if (referForm) {
    referForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newDoctorId = document.getElementById('referDoctorSelect').value;
      const reason = document.getElementById('referReason').value;
      if (!newDoctorId || !reason) return showNotification('Please fill in all fields.');

      try {
        const res = await fetch(`${API_URL}/doctor/patients/${patientId}/refer`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ newDoctorId, reason })
        });
        if (res.ok) {
          showNotification('Patient referred successfully', 'success');
          setTimeout(() => window.location.href = 'my-patients.html', 1500);
        } else {
          showNotification('Failed to refer patient', 'error');
        }
      } catch(err) { showNotification('Network error', 'error'); }
    });
  }

  // PDF Download
  document.getElementById('btnDownloadPDF')?.addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_URL}/doctor/patients/${patientId}/clinical-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error();

      const ledgerDiv = document.getElementById('pdfLedgerList');
      ledgerDiv.innerHTML = '';
      
      document.getElementById('pdfPatientInfo').innerHTML = `
        <strong>Patient Name:</strong> ${document.getElementById('patName').textContent} <br>
        <strong>DOB:</strong> ${document.getElementById('patDob').textContent} <br>
        <strong>Date Generated:</strong> ${new Date().toLocaleDateString()}
      `;

      if (data.data.history.length === 0) {
        ledgerDiv.innerHTML = '<p>No clinical history found.</p>';
      } else {
        data.data.history.forEach(item => {
          const docName = item.Doctor ? `Dr. ${item.Doctor.User.firstName} ${item.Doctor.User.lastName}` : 'Unknown';
          ledgerDiv.innerHTML += `
            <div style="margin-bottom: 15px; border-bottom: 1px dashed #eee; padding-bottom: 10px;">
              <strong>Date:</strong> ${new Date(item.date).toLocaleDateString()} | <strong>Action:</strong> ${item.actionType} <br>
              <strong>By:</strong> ${docName} <br>
              <p style="margin: 5px 0 0 0;">${item.description}</p>
            </div>
          `;
        });
      }

      const element = document.getElementById('pdfContent');
      element.style.display = 'block';
      await html2pdf().from(element).save('Patient_Medical_Record.pdf');
      element.style.display = 'none';
      
    } catch(err) {
      showNotification('Failed to generate PDF', 'error');
    }
  });

});

async function fetchDoctorAndPatient() {
  try {
    const resPat = await fetch(`${API_URL}/doctor/patients/${patientId}/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const patData = await resPat.json();
    if (resPat.ok) {
      renderPatientProfile(patData.data.patient);
    } else {
      showNotification(patData.message || 'Error loading patient', 'error');
    }
  } catch (err) {
    showNotification('Failed to load data.', 'error');
  }
}

function renderPatientProfile(patient) {
  const name = `${patient.User.firstName} ${patient.User.lastName}`;
  document.getElementById('patName').textContent = name;
  document.getElementById('patAvatar').textContent = patient.User.firstName.charAt(0).toUpperCase();
  document.getElementById('patEmail').textContent = patient.User.email || 'No email provided';
  document.getElementById('patDob').textContent = patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '--';
  document.getElementById('patGender').textContent = patient.gender || '--';
  document.getElementById('patContact').textContent = patient.contactNumber || '--';

  checkAppointmentAccess(patient.Appointments || []);
}

function checkAppointmentAccess(appointments) {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  let hasActiveAppointment = false;
  
  for (const appt of appointments) {
    // Treat "Scheduled" as valid for editing
    if (appt.status && appt.status.toLowerCase() === 'cancelled') continue;
    
    const apptTime = new Date(appt.date).getTime();
    // ±1 Hour Window
    if (now >= apptTime - ONE_HOUR && now <= apptTime + ONE_HOUR) {
      hasActiveAppointment = true;
      activeAppointmentId = appt.id;
      break;
    }
  }
  
  // If no active appointment, enforce Read-Only Mode
  if (!hasActiveAppointment) {
    document.getElementById('readOnlyBanner').style.display = 'block';
    
    // Disable inputs and buttons inside forms
    const inputs = document.querySelectorAll('input, select, textarea, button[type="submit"]');
    inputs.forEach(el => {
      el.disabled = true;
    });
  }
}

