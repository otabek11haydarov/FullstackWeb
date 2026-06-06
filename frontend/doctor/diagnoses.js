const API_URL = 'http://localhost:8000/api';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

if (!token || !userStr) {
  window.location.href = '../auth/login.html';
}

const user = JSON.parse(userStr);

document.addEventListener('DOMContentLoaded', () => {


  // User Avatar
  const avatar = document.getElementById('user-avatar');
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

  fetchDiagnoses();
});


async function fetchDiagnoses() {
  const tbody = document.getElementById('diagnosesTableBody');
  try {
    const res = await fetch(`${API_URL}/doctor/diagnoses`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await res.json();
    if (res.ok) {
      renderDiagnoses(data.data.diagnoses);
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${data.message}</td></tr>`;
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading diagnoses.</td></tr>`;
  }
}

function renderDiagnoses(diagnoses) {
  const tbody = document.getElementById('diagnosesTableBody');
  tbody.innerHTML = '';
  
  if (!diagnoses || diagnoses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-muted">
          <i class="fa-solid fa-folder-open fs-2 mb-3 d-block" style="opacity: 0.5;"></i>
          No diagnoses found.
        </td>
      </tr>`;
    return;
  }
  
  diagnoses.forEach(diag => {
    const dateStr = new Date(diag.createdAt).toLocaleDateString();
    const patName = diag.Patient && diag.Patient.User ? `${diag.Patient.User.firstName} ${diag.Patient.User.lastName}` : 'Unknown Patient';
    const patientId = diag.Patient ? diag.Patient.id : '';
    
    // Determine Severity Badge
    let sevBadge = '';
    const sev = (diag.severity || 'low').toLowerCase();
    if (sev === 'critical') sevBadge = '<span class="badge badge-critical px-2 py-1 rounded-pill">Critical</span>';
    else if (sev === 'high') sevBadge = '<span class="badge badge-high px-2 py-1 rounded-pill">High</span>';
    else if (sev === 'medium' || sev === 'moderate') sevBadge = '<span class="badge badge-medium px-2 py-1 rounded-pill">Medium</span>';
    else sevBadge = '<span class="badge badge-low px-2 py-1 rounded-pill">Low</span>';

    const tr = `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td class="text-white-50">${dateStr}</td>
        <td class="fw-medium">${patName}</td>
        <td style="color: var(--neon-cyan);">${diag.condition}</td>
        <td>${sevBadge}</td>
        <td class="text-white-50 text-truncate" style="max-width: 200px;" title="${diag.prescription || 'No notes'}">
          ${diag.prescription || 'No additional notes'}
        </td>
        <td class="text-end">
          <a href="patient-profile.html?id=${patientId}" class="btn btn-sm" style="background: rgba(123, 47, 247, 0.1); color: var(--neon-purple); border: 1px solid var(--neon-purple); border-radius: 20px;">
            View Patient
          </a>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', tr);
  });
}
