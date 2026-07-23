document.documentElement.className = 'js';

const reveals = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  reveals.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 4, 3) * 90}ms`;
    revealObserver.observe(element);
  });
} else {
  reveals.forEach((element) => element.classList.add('is-visible'));
}

const glow = document.querySelector('.cursor-glow');
if (window.matchMedia('(pointer: fine)').matches) {
  window.addEventListener('pointermove', ({ clientX, clientY }) => {
    glow.style.left = `${clientX}px`;
    glow.style.top = `${clientY}px`;
  }, { passive: true });
} else {
  glow.remove();
}

const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

if (menuToggle && mobileMenu) {
  const mobileMenuLinks = [...mobileMenu.querySelectorAll('a')];

  const setMenuOpen = (isOpen, restoreFocus = false) => {
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    document.body.classList.toggle('menu-open', isOpen);

    if (isOpen) {
      mobileMenu.hidden = false;
      mobileMenu.classList.add('is-open');
      mobileMenuLinks[0]?.focus();
    } else {
      mobileMenu.classList.remove('is-open');
      mobileMenu.hidden = true;
      if (restoreFocus) menuToggle.focus();
    }
  };

  menuToggle.addEventListener('click', () => {
    setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
  });

  mobileMenuLinks.forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (menuToggle.getAttribute('aria-expanded') !== 'true') return;

    if (event.key === 'Escape') {
      event.preventDefault();
      setMenuOpen(false, true);
      return;
    }

    if (event.key === 'Tab') {
      const focusable = [menuToggle, ...mobileMenuLinks];
      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);

      event.preventDefault();
      focusable[nextIndex].focus();
    }
  });

  window.matchMedia('(min-width: 901px)').addEventListener('change', ({ matches }) => {
    if (matches) setMenuOpen(false);
  });
}
