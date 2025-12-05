export function initScrollSpy() {
  const sections = document.querySelectorAll('[data-section]');
  const navLinks = document.querySelectorAll('[data-nav-link]');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.getAttribute('id');
        if (!id) return;

        const link = document.querySelector(`[data-nav-link][href="#${id}"]`);
        if (!link) return;

        if (entry.isIntersecting) {
          navLinks.forEach((anchor) => anchor.classList.remove('active'));
          link.classList.add('active');
        }
      });
    },
    { threshold: 0.5 },
  );

  sections.forEach((section) => observer.observe(section));
}
