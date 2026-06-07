
// Global RBAC Enforcement
document.addEventListener('DOMContentLoaded', () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      
      // Strict Check for Admins Directory
      if (user.role !== 'Super Admin') {
        // 1. Hide the Sidebar Item Dynamically
        const adminsNav = document.getElementById('nav-admins-link');
        if (adminsNav) {
          adminsNav.remove(); // Completely removes it from DOM
        }
        
        // 2. Prevent Direct URL Access
        if (window.location.pathname.includes('admins.html')) {
          window.location.href = 'index.html'; // Redirect unauthorized users
        }
      }
    } catch(e) { console.error(e); window.showNotification("An error occurred. Please try again.", "error"); }
  }
});
