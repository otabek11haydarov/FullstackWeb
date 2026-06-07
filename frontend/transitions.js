document.addEventListener('DOMContentLoaded', () => {
  // Add fade-in to body
  document.body.classList.add('page-fade-in');

  // Intercept links for fade-out
  const links = document.querySelectorAll('a');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      
      // Ignore if no href, or if it's just a hash, or opens in new tab, or javascript:
      if (!href || href === '#' || href.startsWith('#') || link.target === '_blank' || href.startsWith('javascript:')) {
        return;
      }
      
      e.preventDefault();
      document.body.classList.remove('page-fade-in');
      document.body.classList.add('page-fade-out');
      
      setTimeout(() => {
        window.location.href = href;
      }, 300);
    });
  });
});

/**
 * Global Toastify Notification Helper
 * @param {string} message - The message to display
 * @param {string} type - 'info', 'success', 'error'
 */
window.showNotification = function(message, type = 'success') {
    if (typeof Toastify === 'undefined') {
        console.error("Toastify is missing!");
        return alert(message);
    }

    const icons = {
        success: '<i class="fas fa-check-circle fs-4"></i>',
        error: '<i class="fas fa-times-circle fs-4"></i>',
        info: '<i class="fas fa-info-circle fs-4"></i>'
    };

    Toastify({
        // The inline styles here prevent the close button from overlapping the text
        text: `
            <div style="display: flex; align-items: center; gap: 12px; padding-right: 25px;">
                ${icons[type]} 
                <span style="font-size: 15px; letter-spacing: 0.5px;">${message}</span>
            </div>
        `,
        duration: 3000,
        close: true,
        gravity: "top", // top or bottom
        position: "center", // ENFORCES CENTER ALIGNMENT
        stopOnFocus: true, // Prevents dismissing of toast on hover
        escapeMarkup: false, // Allows HTML inside text
        className: `premium-toast toast-${type}` // Triggers our custom CSS and colors
    }).showToast();
};

/**
 * Universal Avatar Component Logic
 */
function initializeGlobalAvatar() {
    const targets = document.querySelectorAll('.userProfileTarget');
    if (targets.length === 0) return;

    // Retrieve user. Fallback to 'User' if missing.
    const user = JSON.parse(localStorage.getItem('user')) || { firstName: 'User', role: 'Unknown' };
    
    // Generate DiceBear Avatar SVG URL (Initials style with specific background based on role)
    const bgColors = { admin: 'ff4b2b', doctor: '0dcaf0', receptionist: '38ef7d' };
    const roleKey = (user.role || '').toLowerCase();
    const bgColor = bgColors[roleKey] || '7b2ff7';
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.firstName || 'U')}&backgroundColor=${bgColor}&textColor=ffffff&fontWeight=700`;

    // The Menu HTML
    const menuHTML = `
        <div class="d-flex flex-column gap-2 p-2" style="min-width: 150px;">
            <div class="text-center mb-2 border-bottom border-secondary pb-2">
                <span class="d-block fw-bold text-light">${user.firstName || 'User'}</span>
                <span class="badge bg-secondary text-uppercase" style="font-size: 10px;">${user.role || 'Unknown'}</span>
            </div>
            <a href="my-profile.html" class="btn btn-sm btn-outline-info text-start border-0"><i class="fa-solid fa-user-cog me-2"></i> My Profile</a>
            <button onclick="logout()" class="btn btn-sm btn-outline-danger text-start border-0"><i class="fa-solid fa-sign-out-alt me-2"></i> Logout</button>
        </div>
    `;

    targets.forEach(target => {
        // Inject Avatar
        target.innerHTML = `
            <div class="global-avatar-wrapper" id="globalAvatarBtn">
                <img src="${avatarUrl}" alt="${user.firstName}'s Avatar">
            </div>
        `;

        // Initialize Tippy Dropdown
        const avatarBtn = target.querySelector('#globalAvatarBtn');
        if (typeof tippy !== 'undefined') {
            tippy(avatarBtn, {
                content: menuHTML,
                allowHTML: true,
                interactive: true,
                trigger: 'click',
                theme: 'glass',
                animation: 'scale-subtle',
                placement: 'bottom-end',
                offset: [0, 10]
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeGlobalAvatar);

window.logout = function() {
    localStorage.clear();
    if (typeof window.showNotification === 'function') {
        window.showNotification("You have been logged out.", "info");
    }
    
    setTimeout(() => {
        const path = window.location.pathname;
        if (path.includes('/admin/') || path.includes('/doctor/') || path.includes('/receptionist/')) {
            window.location.href = '../auth/login.html';
        } else {
            window.location.href = 'auth/login.html';
        }
    }, 1000); // Allow time for toast to show
};
