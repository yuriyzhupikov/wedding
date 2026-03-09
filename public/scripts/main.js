import { initRsvpForm } from './components/rsvpForm.js';
import { initSmoothScroll } from './components/smoothScroll.js';
import { initScrollSpy } from './components/scrollSpy.js';
import { initNavLogoVisibility } from './components/navLogoVisibility.js';

document.addEventListener('DOMContentLoaded', () => {
  initRsvpForm();
  initSmoothScroll();
  initScrollSpy();
  initNavLogoVisibility();
});
