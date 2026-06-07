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
    window.showNotification('No patient selected.');
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
          window.showNotification("No patient selected."); 
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
          window.showNotification('Diagnosis added successfully!', 'success');
          diagForm.reset();
        } else {
          window.showNotification(data.message || 'Error adding diagnosis', 'error');
        }
      } catch (err) {
        window.showNotification('Network error while adding diagnosis', 'error');
      }
    });
  }

  // Appointment Actions
  document.getElementById('btnMarkCompleted')?.addEventListener('click', async () => {
    if (!activeAppointmentId) return window.showNotification('No active appointment to manage.');
    await updateAppointmentStatus(activeAppointmentId, 'Completed');
  });
  
  document.getElementById('btnSendToDiagnostics')?.addEventListener('click', async () => {
    if (!activeAppointmentId) return window.showNotification('No active appointment to manage.');
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
        window.showNotification(`Appointment marked as ${status}`, 'success');
        setTimeout(() => location.reload(), 1500);
      } else {
        window.showNotification('Failed to update status', 'error');
      }
    } catch(err) {
      window.showNotification('Network error', 'error');
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
    } catch(err) { console.error(err); window.showNotification("An error occurred. Please try again.", "error"); }
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
    } catch(err) { console.error(err); window.showNotification("An error occurred. Please try again.", "error"); }
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
      if (!newDoctorId || !reason) return window.showNotification('Please fill in all fields.');

      try {
        const res = await fetch(`${API_URL}/doctor/patients/${patientId}/refer`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ newDoctorId, reason })
        });
        if (res.ok) {
          window.showNotification('Patient referred successfully', 'success');
          setTimeout(() => window.location.href = 'my-patients.html', 1500);
        } else {
          window.showNotification('Failed to refer patient', 'error');
        }
      } catch(err) { window.showNotification('Network error', 'error'); }
    });
  }

  // PDF Download
  document.getElementById('btnDownloadPDF')?.addEventListener('click', async () => {
    try {
      const resPat = await fetch(`${API_URL}/doctor/patients/${patientId}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const patData = await resPat.json();
      if (!resPat.ok) throw new Error(patData.message || 'Error loading patient');
      const patient = patData.data.patient;

      // Calculate age dynamically
      const dob = new Date(patient.dateOfBirth);
      const ageDiffMs = Date.now() - dob.getTime();
      const ageDate = new Date(ageDiffMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);

      const currentDate = new Date().toLocaleDateString('en-GB');

      // Build Diagnoses & Treatments HTML
      let diagnosesHTML = '';
      if (patient.Diagnoses && patient.Diagnoses.length > 0) {
          patient.Diagnoses.forEach(diag => {
              diagnosesHTML += `
              <div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #2980b9;">
                  <p style="margin: 0 0 5px 0;"><strong>Condition:</strong> ${diag.condition} <span style="color: #e74c3c;">(${diag.severity})</span></p>
                  <p style="margin: 0 0 5px 0;"><strong>Date:</strong> ${new Date(diag.createdAt).toLocaleDateString('en-GB')}</p>
                  <p style="margin: 0;"><strong>Treatment/Prescription:</strong> ${diag.prescription || 'No specific prescription recorded.'}</p>
              </div>`;
          });
      } else {
          diagnosesHTML = '<p style="color: #7f8c8d; font-style: italic;">No diagnoses recorded.</p>';
      }

      // Construct the Master PDF HTML
      const pdfElement = document.createElement('div');
      pdfElement.innerHTML = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: auto; font-size: 14px; line-height: 1.6;">
          
          <div style="text-align: center; border-bottom: 3px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 28px; letter-spacing: 1px;">CareTrack Clinic</h1>
              <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 16px;">Comprehensive Medical Record</p>
              <p style="color: #95a5a6; margin: 5px 0 0 0; font-size: 12px;">Generated on: ${currentDate}</p>
          </div>

          <h3 style="color: #2980b9; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; margin-bottom: 15px; font-size: 18px;">1. Patient Demographics</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <tr>
                  <td style="padding: 8px 0; width: 50%;"><strong>Full Name:</strong> ${patient.User?.firstName} ${patient.User?.lastName}</td>
                  <td style="padding: 8px 0; width: 50%;"><strong>Gender:</strong> ${patient.gender || 'Not specified'}</td>
              </tr>
              <tr>
                  <td style="padding: 8px 0;"><strong>Date of Birth:</strong> ${dob.toLocaleDateString('en-GB')}</td>
                  <td style="padding: 8px 0;"><strong>Age:</strong> ${age} years</td>
              </tr>
              <tr>
                  <td style="padding: 8px 0;"><strong>Blood Type:</strong> <span style="color: #c0392b; font-weight: bold;">${patient.bloodType || 'Unknown'}</span></td>
                  <td style="padding: 8px 0;"><strong>Contact:</strong> ${patient.contactNumber || 'N/A'}</td>
              </tr>
          </table>

          <h3 style="color: #2980b9; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; margin-bottom: 15px; font-size: 18px;">2. Baseline Medical Information</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <tr>
                  <td style="padding: 8px 0; vertical-align: top; width: 30%;"><strong>Allergies:</strong></td>
                  <td style="padding: 8px 0; color: #e74c3c;">${patient.allergies || 'None reported'}</td>
              </tr>
              <tr>
                  <td style="padding: 8px 0; vertical-align: top;"><strong>Chronic Conditions:</strong></td>
                  <td style="padding: 8px 0;">${patient.chronicConditions || 'None reported'}</td>
              </tr>
              <tr>
                  <td style="padding: 8px 0; vertical-align: top;"><strong>Past Medical History:</strong></td>
                  <td style="padding: 8px 0;">${patient.medicalHistory || 'No significant prior history.'}</td>
              </tr>
          </table>

          <h3 style="color: #2980b9; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; margin-bottom: 15px; font-size: 18px;">3. Clinical Diagnoses & Treatments</h3>
          <div style="margin-bottom: 30px;">
              ${diagnosesHTML}
          </div>

          <div style="margin-top: 50px; padding-top: 20px; border-top: 1px dashed #bdc3c7; font-size: 11px; color: #7f8c8d; text-align: center;">
              <p>This is an official electronic medical record generated by CareTrack Clinic MRMS. Information contained herein is strictly confidential.</p>
              <p><strong>Authorized Signature:</strong> ___________________________</p>
          </div>
      </div>`;

      // Trigger html2pdf
      const opt = {
          margin:       [10, 10, 10, 10],
          filename:     `${patient.User?.firstName}_${patient.User?.lastName}_Medical_Report.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(pdfElement).save();

    } catch(err) {
      window.showNotification('Failed to generate PDF', 'error');
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
      window.showNotification(patData.message || 'Error loading patient', 'error');
    }
  } catch (err) {
    window.showNotification('Failed to load data.', 'error');
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

