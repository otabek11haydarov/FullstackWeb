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
