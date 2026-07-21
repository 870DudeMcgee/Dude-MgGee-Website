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
