document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');

    let userObj = {};
    try { userObj = JSON.parse(userJson); } catch(e){}

    const userRole = (userObj.role || '').toLowerCase();

    if (!token || !userObj || userRole !== 'patient') {
        window.location.href = '../auth/login.html';
        return;
    }

    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName && userObj.firstName) {
        welcomeName.textContent = `${userObj.firstName} ${userObj.lastName}`;
    }

    // Sidebar Logout
    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../auth/login.html';
    });

    // Fetch brief overview metrics (Appointments & Diagnoses)
    async function fetchOverview() {
        try {
            const response = await fetch('http://localhost:8000/api/patients/portal/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                console.error("Server returned non-JSON. Probably a 404 or 500 HTML page.");
                throw new TypeError("Server connection error: Expected JSON but got HTML/Text.");
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error fetching data');
            }

            if (data.success) {
                const dashData = data.data;
                
                // Update Metric Cards
                const hEl = document.getElementById('healthStatus');
                const upEl = document.getElementById('upcomingCount');
                const dEl = document.getElementById('diagnosisCount');
                
                if (hEl) {
                    hEl.textContent = dashData.healthStatus || 'Excellent';
                    hEl.className = dashData.healthStatus === 'Needs Attention' ? 'text-warning mb-0' : 'text-success mb-0';
                }
                if (upEl) upEl.textContent = dashData.upcomingAppointments || 0;
                if (dEl) dEl.textContent = dashData.recentDiagnoses || 0;
                
                // Render Timeline
                renderTimeline(dashData.activities || []);
            }
        } catch (error) {
            console.error("Fetch Execution Error:", error);
            window.showNotification("Failed to load dashboard overview. " + error.message, "error");
        }
    }

    function renderTimeline(activities) {
        const timeline = document.getElementById('recentActivityTimeline');
        if (!timeline) return;

        timeline.innerHTML = '';
        if (activities.length === 0) {
            timeline.innerHTML = `<div class="text-white-50 small ms-3">No recent activities found.</div>`;
            return;
        }

        activities.forEach(act => {
            const dateStr = new Date(act.date || act.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const docName = act.Doctor && act.Doctor.User ? `Dr. ${act.Doctor.User.firstName} ${act.Doctor.User.lastName}` : 'CareTrack Clinic';
            
            let iconClass = 'fa-file-medical';
            let iconColor = 'text-info';

            if (act.actionType === 'Diagnosis') { iconClass = 'fa-stethoscope'; iconColor = 'text-warning'; }
            if (act.actionType === 'Referral') { iconClass = 'fa-hospital-user'; iconColor = 'text-success'; }
            if (act.actionType === 'Diagnostics') { iconClass = 'fa-x-ray'; iconColor = 'text-danger'; }

            const itemHtml = `
            <div class="position-relative mb-4 ps-4">
                <div class="position-absolute top-0 start-0 translate-middle-x bg-dark rounded-circle border border-2 border-secondary" style="width: 14px; height: 14px; margin-top: 5px; z-index: 2;"></div>
                <div class="glass-card p-3" style="margin-left: -5px;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-dark border border-secondary text-white-50"><i class="fa-solid fa-calendar me-1"></i>${dateStr}</span>
                        <span class="badge bg-dark text-light border border-info border-opacity-50"><i class="fa-solid fa-user-md me-1"></i>${docName}</span>
                    </div>
                    <div class="d-flex align-items-center mb-2">
                        <i class="fa-solid ${iconClass} ${iconColor} fa-lg me-2"></i>
                        <h6 class="fw-bold mb-0">${act.actionType || 'Update'}</h6>
                    </div>
                    <p class="text-white-50 small mb-0">${act.description}</p>
                </div>
            </div>`;
            
            timeline.insertAdjacentHTML('beforeend', itemHtml);
        });
    }

    fetchOverview();
});
