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

    const tbody = document.getElementById('appointmentsTableBody');

    // Sidebar Logout
    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../auth/login.html';
    });

    async function fetchAppointments() {
        try {
            const response = await fetch('http://localhost:8000/api/patients/portal/records', {
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
                const appointments = data.data.appointments || [];
                renderAppointments(appointments);
            } else {
                window.showNotification(data.message || 'Failed to load appointments', 'error');
            }
        } catch (error) {
            console.error("Fetch Execution Error:", error);
            window.showNotification("Failed to load appointments. " + error.message, "error");
        }
    }

    function renderAppointments(appointments) {
        tbody.innerHTML = '';
        if (appointments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-white-50 py-4">No appointments found.</td></tr>`;
            return;
        }

        appointments.forEach(appt => {
            const docName = appt.Doctor && appt.Doctor.User ? `Dr. ${appt.Doctor.User.firstName} ${appt.Doctor.User.lastName}` : 'Unknown';
            const statusBadge = appt.status === 'Completed' ? '<span class="badge bg-success">Completed</span>' : 
                               (appt.status === 'Scheduled' ? '<span class="badge bg-info text-dark">Scheduled</span>' : 
                               `<span class="badge bg-secondary">${appt.status}</span>`);

            const dateStr = new Date(appt.date).toLocaleString();

            const actionBtn = appt.status === 'Scheduled' ? 
                `<button class="btn btn-sm btn-outline-danger" onclick="cancelAppointment('${appt.id}')">Cancel</button>` : 
                `<span class="text-white-50 small">N/A</span>`;

            const tr = `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="global-avatar-wrapper me-2" style="width: 30px!important; height: 30px!important;">
                            <img src="https://api.dicebear.com/7.x/initials/svg?seed=${docName}" alt="Doctor Avatar">
                        </div>
                        <span class="fw-bold">${docName}</span>
                    </div>
                </td>
                <td>${dateStr}</td>
                <td>${appt.reason || '-'}</td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', tr);
        });
    }

    // Mock Cancel Function
    window.cancelAppointment = function(id) {
        window.showNotification('Appointment cancelled successfully (Demo).', 'success');
        // fetchAppointments(); // normally you'd reload from backend
    };

    fetchAppointments();
});
