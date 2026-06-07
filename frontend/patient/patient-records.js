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

    const recordsTimeline = document.getElementById('recordsTimeline');
    const reviewModal = new bootstrap.Modal(document.getElementById('reviewModal'));
    const reviewForm = document.getElementById('reviewForm');
    const stars = document.querySelectorAll('.rating-star');
    const ratingInput = document.getElementById('reviewRating');
    
    let globalRecords = { appointments: [], diagnoses: [] };

    // Sidebar Logout
    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../auth/login.html';
    });

    async function fetchRecords() {
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
                globalRecords = data.data;
                renderTimeline(data.data.appointments, data.data.diagnoses);
            } else {
                window.showNotification(data.message || 'Failed to load records', 'error');
            }
        } catch (error) {
            console.error("Fetch Execution Error:", error);
            window.showNotification("Failed to load data. " + error.message, "error");
        }
    }

    function renderTimeline(appointments, diagnoses) {
        recordsTimeline.innerHTML = '';
        if (appointments.length === 0 && diagnoses.length === 0) {
            recordsTimeline.innerHTML = `<p class="text-white-50 text-center py-4">No medical records found.</p>`;
            return;
        }

        // We will just render appointments for the timeline to match mockup 
        appointments.forEach((appt, index) => {
            // Find diagnoses related to this appt's date roughly, or just show general
            const relatedDiag = diagnoses.filter(d => d.date === appt.date);
            const diagList = relatedDiag.length > 0 
                ? relatedDiag.map(d => `<li>${d.condition} - <span class="text-white-50">${d.severity}</span></li>`).join('') 
                : '<li class="text-white-50">No new diagnoses recorded during this visit.</li>';

            const docName = appt.Doctor && appt.Doctor.User ? `Dr. ${appt.Doctor.User.firstName} ${appt.Doctor.User.lastName}` : 'Unknown Doctor';
            const statusColor = appt.status === 'Completed' ? '#8a2be2' : (appt.status === 'Cancelled' ? '#ff4d4d' : '#0dcaf0');
            const icon = appt.status === 'Completed' ? 'fa-check' : 'fa-calendar';

            // Only allow review if appointment is completed
            const reviewBtnHtml = appt.status === 'Completed' 
                ? `<button class="btn btn-sm btn-outline-light mt-3" onclick="openReviewModal('${appt.id}')">
                    <i class="fa-solid fa-star text-warning me-1"></i> Leave Anonymous Review
                   </button>`
                : '';

            const liHtml = `
            <li class="timeline-item">
                <div class="timeline-icon" style="border-color: ${statusColor}; color: ${statusColor}">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <h5 class="fw-bold mb-0">${appt.status === 'Completed' ? 'Completed Visit' : 'Scheduled Visit'} | <span class="text-neon-cyan">${docName}</span></h5>
                        <div class="text-white-50 small">
                            <i class="fa-regular fa-calendar me-1"></i> ${appt.date} <br>
                            <i class="fa-regular fa-clock me-1"></i> ${appt.time}
                        </div>
                    </div>
                    
                    <div class="grid-2-col">
                        <div>
                            <h6 class="text-white-50 fw-bold mb-2">Diagnoses</h6>
                            <ul class="mb-0 ps-3 small" style="list-style-type: circle;">
                                ${diagList}
                            </ul>
                        </div>
                        <div>
                            <h6 class="text-white-50 fw-bold mb-2">Status & Notes</h6>
                            <div class="small">
                                Status: <span style="color: ${statusColor}">${appt.status}</span><br>
                                ${appt.reason ? `Reason: ${appt.reason}` : ''}
                            </div>
                        </div>
                    </div>
                    ${reviewBtnHtml}
                </div>
            </li>`;

            recordsTimeline.insertAdjacentHTML('beforeend', liHtml);
        });
    }

    // Star Rating Logic
    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            const val = parseInt(e.target.dataset.val);
            ratingInput.value = val;
            stars.forEach(s => {
                if(parseInt(s.dataset.val) <= val) {
                    s.classList.remove('inactive');
                } else {
                    s.classList.add('inactive');
                }
            });
        });
    });

    window.openReviewModal = function(apptId) {
        document.getElementById('reviewApptId').value = apptId;
        document.getElementById('reviewComment').value = '';
        ratingInput.value = '0';
        stars.forEach(s => s.classList.add('inactive'));
        reviewModal.show();
    };

    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const apptId = document.getElementById('reviewApptId').value;
        const rating = parseInt(ratingInput.value);
        const comment = document.getElementById('reviewComment').value;

        if (rating === 0) {
            window.showNotification('Please select a star rating', 'error');
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/api/patients/portal/reviews', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ appointmentId: apptId, rating, comment })
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                console.error("Server returned non-JSON. Probably a 404 or 500 HTML page.");
                throw new TypeError("Server connection error: Expected JSON but got HTML/Text.");
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error submitting review');
            }

            if (data.success) {
                window.showNotification('Anonymous review submitted successfully!', 'success');
                reviewModal.hide();
                fetchRecords();
            } else {
                window.showNotification(data.message || 'Failed to submit review', 'error');
            }
        } catch (error) {
            console.error("Fetch Execution Error:", error);
            window.showNotification("Failed to submit review. " + error.message, "error");
        }
    });

    window.downloadReport = function() {
        if (!globalRecords || (!globalRecords.appointments.length && !globalRecords.diagnoses.length)) {
            window.showNotification('No medical records available to download.', 'error');
            return;
        }

        window.showNotification('Generating PDF report...', 'info');
        
        // Build the HTML template
        let htmlStr = `
            <div style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
                <div style="text-align: center; border-bottom: 2px solid #0dcaf0; padding-bottom: 20px; margin-bottom: 30px;">
                    <h1 style="margin: 0; color: #0f172a;">CareTrack Clinic</h1>
                    <h3 style="margin: 5px 0 0 0; color: #666;">Official Medical Report</h3>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <p><strong>Patient Name:</strong> ${userObj.firstName || 'Unknown'} ${userObj.lastName || ''}</p>
                    <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                
                <h4 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #0dcaf0;">Diagnoses Summary</h4>
                <ul style="margin-bottom: 30px;">
        `;

        if (globalRecords.diagnoses.length > 0) {
            globalRecords.diagnoses.forEach(d => {
                const dateStr = new Date(d.date || d.createdAt).toLocaleDateString();
                htmlStr += `<li style="margin-bottom: 10px;"><strong>${dateStr}</strong>: ${d.condition} (Severity: ${d.severity || 'N/A'}) - ${d.notes || 'No additional notes'}</li>`;
            });
        } else {
            htmlStr += `<li>No diagnoses on record.</li>`;
        }

        htmlStr += `
                </ul>
                <h4 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #0dcaf0;">Appointment History</h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="background-color: #f1f5f9; text-align: left;">
                            <th style="padding: 10px; border: 1px solid #ddd;">Date</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">Doctor</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">Status</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">Reason</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (globalRecords.appointments.length > 0) {
            globalRecords.appointments.forEach(a => {
                const dateStr = new Date(a.date).toLocaleDateString();
                const docName = a.Doctor && a.Doctor.User ? `Dr. ${a.Doctor.User.firstName} ${a.Doctor.User.lastName}` : 'Unknown';
                htmlStr += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">${dateStr}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${docName}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${a.status}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${a.reason || 'N/A'}</td>
                    </tr>
                `;
            });
        } else {
            htmlStr += `<tr><td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: center;">No appointments on record.</td></tr>`;
        }

        htmlStr += `
                    </tbody>
                </table>
                <div style="text-align: center; font-size: 0.8rem; color: #999; margin-top: 50px;">
                    <p>This is a system-generated report. If you have any questions, please contact the CareTrack Clinic administration.</p>
                </div>
            </div>
        `;

        const opt = {
            margin:       0.5,
            filename:     'CareTrack_Medical_Report.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Create a temporary element to hold the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlStr;
        
        // Use html2pdf
        html2pdf().set(opt).from(tempDiv).save().then(() => {
            window.showNotification('Medical Report downloaded successfully!', 'success');
        }).catch(err => {
            console.error('PDF Generation Error:', err);
            window.showNotification('Failed to generate PDF.', 'error');
        });
    };

    fetchRecords();
});
