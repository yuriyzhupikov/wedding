export function initNavLogoVisibility() {
  const logo = document.getElementById('fh5co-logo');
  if (!logo) return;

  const updateLogoVisibility = () => {
    if (window.scrollY > 30) {
      logo.classList.add('is-scrolled-out');
      return;
    }

    logo.classList.remove('is-scrolled-out');
  };

  updateLogoVisibility();
  window.addEventListener('scroll', updateLogoVisibility, { passive: true });
}
