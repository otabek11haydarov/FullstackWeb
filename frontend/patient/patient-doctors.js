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

    const doctorsGrid = document.getElementById('doctorsGrid');
    const searchInput = document.getElementById('doctorSearchInput');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const appointmentDateInput = document.getElementById('appointmentDatePicker');
    
    // Sidebar Logout
    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../auth/login.html';
    });
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    if (appointmentDateInput) {
        appointmentDateInput.value = today;
        appointmentDateInput.addEventListener('change', fetchDoctors);
    }
    
    let allDoctors = [];

    async function fetchDoctors() {
        try {
            const selectedDate = appointmentDateInput ? appointmentDateInput.value : new Date().toISOString().split('T')[0];
            const response = await fetch(`http://localhost:8000/api/patients/portal/doctors-with-slots?date=${selectedDate}`, {
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
                allDoctors = data.data;
                renderFilters(allDoctors);
                renderDoctors(allDoctors);
            } else {
                window.showNotification(data.message || 'Failed to load doctors', 'error');
            }
        } catch (error) {
            console.error("Fetch Execution Error:", error);
            window.showNotification("Failed to load data. " + error.message, "error");
        }
    }

    function renderDoctors(doctors) {
        doctorsGrid.innerHTML = '';
        if (doctors.length === 0) {
            doctorsGrid.innerHTML = `<div class="col-12 text-center text-white-50 py-5">No doctors found.</div>`;
            return;
        }

        doctors.forEach(doc => {
            const avgRating = parseFloat(doc.averageRating || 0).toFixed(1);
            const reviewCount = doc.reviewCount || 0;
            const specialty = doc.specialization || 'General Practice';
            
            // Generate dynamic slots
            let timeSlotsHtml = '<div class="d-flex flex-wrap gap-2 mt-3">';
            if (doc.availableSlots && doc.availableSlots.length > 0) {
                doc.availableSlots.forEach(slot => {
                    // Convert HH:MM to 12-hour format for display
                    const [h, m] = slot.split(':');
                    const hour = parseInt(h);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour % 12 || 12;
                    const displayTime = `${displayHour}:${m} ${ampm}`;

                    // Properly escape arguments
                    const docName = `Dr. ${doc.User.firstName} ${doc.User.lastName}`;
                    timeSlotsHtml += `<button class="time-slot" onclick="openBookingModal('${doc.id}', '${docName}', '${slot}', '${displayTime}')">${displayTime}</button>`;
                });
            } else {
                timeSlotsHtml += `<span class="text-white-50 small">No available slots for this date.</span>`;
            }
            timeSlotsHtml += '</div>';

            const cardHtml = `
            <div class="col-md-6 col-lg-4">
                <div class="doctor-card h-100 d-flex flex-column">
                    <div class="d-flex align-items-center mb-3">
                        <div class="global-avatar-wrapper me-3" style="width: 50px!important; height: 50px!important;">
                            <img src="https://api.dicebear.com/7.x/initials/svg?seed=${doc.User.firstName} ${doc.User.lastName}" alt="Doctor Avatar">
                        </div>
                        <div>
                            <h5 class="fw-bold mb-0 text-light">Dr. ${doc.User.firstName} ${doc.User.lastName}</h5>
                            <div class="text-neon-cyan" style="font-size: 0.85rem;">${specialty}</div>
                            <div class="mt-1" style="font-size: 0.8rem;">
                                <i class="fa-solid fa-star rating-star"></i> <span class="fw-bold">${avgRating}/5</span>
                                <span class="text-white-50 ms-1">${reviewCount} Reviews</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-white-50 small mb-2"><i class="fa-solid fa-location-dot me-1"></i> CareTrack Main Clinic</div>
                    
                    <div class="mt-auto">
                        <hr class="border-secondary opacity-25">
                        <div class="text-light small fw-bold">Available Today</div>
                        ${timeSlotsHtml}
                    </div>
                </div>
            </div>`;
            
            doctorsGrid.insertAdjacentHTML('beforeend', cardHtml);
        });
    }

    let currentBookingData = null;
    const bookingModalEl = document.getElementById('bookingModal');
    let bookingModal = null;
    if (bookingModalEl) bookingModal = new bootstrap.Modal(bookingModalEl);

    window.openBookingModal = function(doctorId, doctorName, rawTime, displayTime) {
        currentBookingData = { doctorId, time: rawTime };
        
        document.getElementById('modalDoctorName').textContent = doctorName;
        document.getElementById('modalDateTime').textContent = displayTime;
        document.getElementById('bookingReason').value = '';
        
        if (bookingModal) bookingModal.show();
    };

    const confirmBookingBtn = document.getElementById('confirmBookingBtn');
    if (confirmBookingBtn) {
        confirmBookingBtn.addEventListener('click', async () => {
            if (!currentBookingData) return;
            
            const reason = document.getElementById('bookingReason').value.trim();
            if (!reason) {
                window.showNotification("Please provide a reason for visit.", "error");
                return;
            }

            const selectedDate = appointmentDateInput ? appointmentDateInput.value : new Date().toISOString().split('T')[0];
            
            try {
                confirmBookingBtn.disabled = true;
                confirmBookingBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Booking...';

                const response = await fetch('http://localhost:8000/api/patients/portal/book-appointment', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({
                        doctorId: currentBookingData.doctorId,
                        date: selectedDate,
                        time: currentBookingData.time,
                        reason
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    window.showNotification('Appointment booked successfully!', 'success');
                    if (bookingModal) bookingModal.hide();
                    fetchDoctors(); // Refresh slots
                } else {
                    window.showNotification(data.message || 'Failed to book appointment', 'error');
                }
            } catch (err) {
                console.error(err);
                window.showNotification('Network error while booking appointment', 'error');
            } finally {
                confirmBookingBtn.disabled = false;
                confirmBookingBtn.textContent = 'Confirm Booking';
            }
        });
    }

    function renderFilters(doctors) {
        const filtersContainer = document.getElementById('specialtyFilters');
        if (!filtersContainer) return;

        // Extract unique specialties from the dataset
        const specialties = new Set();
        doctors.forEach(doc => {
            if (doc.specialization) {
                specialties.add(doc.specialization);
            }
        });

        // Generate Buttons
        let html = `<button class="filter-btn active" data-specialty="All">All Specialties</button>`;
        specialties.forEach(spec => {
            html += `<button class="filter-btn" data-specialty="${spec}">${spec}</button>`;
        });

        filtersContainer.innerHTML = html;

        // Attach Event Listeners
        const filterBtns = filtersContainer.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                const specialty = e.currentTarget.dataset.specialty;
                if (specialty === 'All') {
                    renderDoctors(allDoctors);
                } else {
                    const filtered = allDoctors.filter(doc => doc.specialization === specialty);
                    renderDoctors(filtered);
                }
            });
        });
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        // Check currently active filter
        const activeFilter = document.querySelector('#specialtyFilters .filter-btn.active');
        const activeSpecialty = activeFilter ? activeFilter.dataset.specialty : 'All';

        let baseList = allDoctors;
        if (activeSpecialty !== 'All') {
            baseList = allDoctors.filter(doc => doc.specialization === activeSpecialty);
        }

        const filtered = baseList.filter(doc => {
            const fullName = `dr. ${doc.User.firstName} ${doc.User.lastName}`.toLowerCase();
            return fullName.includes(query);
        });
        renderDoctors(filtered);
    });

    fetchDoctors();
});
