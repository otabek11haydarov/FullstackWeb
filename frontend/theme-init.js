(function() {
  const theme = localStorage.getItem('theme') || 'light';
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

window.toggleTheme = function() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
  window.dispatchEvent(new Event('themeChanged'));
};

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
    } catch (e) {
      console.error('Error parsing user data', e);
    }
  }
});
