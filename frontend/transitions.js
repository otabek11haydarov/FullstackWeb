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

  // Auto-Active Sidebar Script
  const currentPath = window.location.pathname.split('/').pop();
  const sidebarLinks = document.querySelectorAll('.glass-sidebar .nav-link, .sidebar .nav-link');
  
  sidebarLinks.forEach(link => {
      // Remove any pre-existing active classes
      link.classList.remove('active');
      
      const linkPath = link.getAttribute('href');
      // Set active if the href matches the current path, or if we are at root and link is dashboard
      if (linkPath === currentPath || (currentPath === '' && linkPath.includes('dashboard'))) {
          link.classList.add('active');
      }
  });

  // Mobile Sidebar Toggle Logic
  const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
  const mobileCloseSidebar = document.getElementById('mobileCloseSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const sidebar = document.querySelector('.sidebar, .glass-sidebar');

  if (mobileSidebarToggle && sidebar && sidebarBackdrop) {
      mobileSidebarToggle.addEventListener('click', () => {
          sidebar.classList.add('show');
          sidebarBackdrop.classList.add('show');
      });

      const closeSidebar = () => {
          sidebar.classList.remove('show');
          sidebarBackdrop.classList.remove('show');
      };

      sidebarBackdrop.addEventListener('click', closeSidebar);
      if (mobileCloseSidebar) {
          mobileCloseSidebar.addEventListener('click', closeSidebar);
      }
  }
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
    const name = `${user.firstName || 'U'} ${user.lastName || ''}`.trim();
    
    // Generate DiceBear Avatar SVG URL (Initials style with specific background based on role)
    const bgColors = { admin: 'ff4b2b', 'super admin': 'ff4b2b', doctor: '0dcaf0', receptionist: '38ef7d', patient: '10b981' };
    const roleKey = (user.role || '').toLowerCase();
    const bgColor = bgColors[roleKey] || '7b2ff7';
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.firstName || 'U')}&backgroundColor=${bgColor}&textColor=ffffff&fontWeight=700`;

    // Determine profile URL based on role and current path depth
    const path = window.location.pathname;
    const inSubfolder = path.includes('/admin/') || path.includes('/doctor/') || path.includes('/receptionist/') || path.includes('/patient/');
    const profilePage = inSubfolder ? 'my-profile.html' : 'my-profile.html';

    // The Dropdown Menu HTML
    const menuHTML = `
        <div class="d-flex flex-column gap-2 p-2" style="min-width: 160px;">
            <div class="text-center mb-2 border-bottom border-secondary pb-2">
                <img src="${avatarUrl}" alt="${name}" style="width:40px;height:40px;border-radius:50%;margin-bottom:6px;">
                <span class="d-block fw-bold text-light" style="font-size:0.9rem;">${name}</span>
                <span class="badge bg-secondary text-uppercase" style="font-size: 10px;">${user.role || 'Unknown'}</span>
            </div>
            <a href="${profilePage}" class="btn btn-sm btn-outline-info text-start border-0"><i class="fa-solid fa-user-cog me-2"></i> My Profile</a>
            <button onclick="logout()" class="btn btn-sm btn-outline-danger text-start border-0"><i class="fa-solid fa-sign-out-alt me-2"></i> Logout</button>
        </div>
    `;

    // Inject premium CSS for avatar hover effects (once)
    if (!document.getElementById('avatar-hover-styles')) {
        const style = document.createElement('style');
        style.id = 'avatar-hover-styles';
        style.textContent = `
            .global-avatar-link {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                text-decoration: none;
                padding: 4px 8px 4px 4px;
                border-radius: 50px;
                border: 1px solid rgba(255,255,255,0.08);
                background: rgba(255,255,255,0.04);
                transition: all 0.25s ease;
                cursor: pointer;
            }
            .global-avatar-link:hover {
                background: rgba(255,255,255,0.1);
                border-color: rgba(255,255,255,0.2);
                box-shadow: 0 0 18px rgba(0,245,255,0.2);
                transform: translateY(-1px);
            }
            .global-avatar-link img {
                width: 38px;
                height: 38px;
                border-radius: 50%;
                border: 2px solid rgba(255,255,255,0.15);
                box-shadow: 0 0 10px rgba(0,245,255,0.25);
                transition: box-shadow 0.25s ease, transform 0.25s ease;
            }
            .global-avatar-link:hover img {
                box-shadow: 0 0 18px rgba(0,245,255,0.5);
                transform: scale(1.05);
            }
            .global-avatar-link .avatar-name {
                font-size: 0.85rem;
                font-weight: 600;
                color: #f1f5f9;
                line-height: 1.2;
            }
            .global-avatar-link .avatar-role {
                font-size: 0.72rem;
                color: rgba(255,255,255,0.45);
                text-transform: capitalize;
            }
            .global-avatar-wrapper { display: inline-block; }
        `;
        document.head.appendChild(style);
    }

    targets.forEach(target => {
        // Inject Avatar wrapped in a clickable anchor with name+role
        target.innerHTML = `
            <div class="global-avatar-wrapper" id="globalAvatarBtn">
                <a href="${profilePage}" class="global-avatar-link">
                    <img src="${avatarUrl}" alt="${name}'s Avatar">
                    <div class="d-none d-md-block">
                        <div class="avatar-name">${name}</div>
                        <div class="avatar-role">${user.role || 'Unknown'}</div>
                    </div>
                </a>
            </div>
        `;

        // Initialize Tippy Dropdown on hover (right-click / long hover for menu)
        const avatarBtn = target.querySelector('#globalAvatarBtn');
        if (typeof tippy !== 'undefined') {
            tippy(avatarBtn, {
                content: menuHTML,
                allowHTML: true,
                interactive: true,
                trigger: 'mouseenter',
                hideOnClick: true,
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
