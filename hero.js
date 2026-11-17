(() => {
  'use strict';
  const section = document.querySelector('.split-scroll');
  const panels = [...document.querySelectorAll('.intro-panel')];
  const gallery = document.querySelector('.after-intro');
  const counter = document.querySelector('#scroll-percent');
  const cue = document.querySelector('.scroll-cue');
  const nav = [...document.querySelectorAll('.site-header nav a')];
  const staticIntro = matchMedia('(max-width: 900px), (prefers-reduced-motion: reduce)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const landmarks = nav.map(link => document.querySelector(link.hash));
  let frame = 0;

  function render() {
    frame = 0;
    const progress = Math.max(0, Math.min(1, scrollY / section.offsetHeight));
    const open = !staticIntro.matches && progress >= .995;
    const eased = progress * progress * (3 - 2 * progress);
    section.style.setProperty('--unfold', progress);
    section.classList.toggle('is-open', open);
    panels.forEach((panel, index) => {
      panel.style.transform = staticIntro.matches ? '' : `translateX(${(index ? 1 : -1) * eased * 61}%)`;
      panel.inert = open;
      panel.setAttribute('aria-hidden', String(open));
    });
    gallery.inert = !staticIntro.matches && progress < .75;
    gallery.style.opacity = staticIntro.matches ? '1' : String(.2 + .8 * Math.min(1, progress * 1.4));
    gallery.style.transform = staticIntro.matches ? '' : `translateY(${Math.min(0, scrollY - section.offsetHeight)}px)`;
    cue.style.opacity = String(1 - Math.min(1, progress * 3));
    counter.textContent = String(Math.round(progress * 100)).padStart(2, '0');
    document.body.classList.toggle('is-gallery', staticIntro.matches ? progress > .92 : progress > .55);
    let active = 0;
    for (let i = 1; i < landmarks.length; i++) {
      if ((staticIntro.matches || progress > .9) && landmarks[i].getBoundingClientRect().top < innerHeight * .42) active = i;
    }
    nav.forEach((link, index) => {
      link.classList.toggle('active', index === active);
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function requestRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function targetTop(target) {
    let top = 0;
    for (let node = target; node; node = node.offsetParent) top += node.offsetTop;
    return top - (target.id === 'intro' || target.id === 'categories' ? 0 : innerWidth <= 600 ? 122 : 110);
  }
  addEventListener('scroll', requestRender, { passive: true });
  addEventListener('resize', requestRender);
  staticIntro.addEventListener('change', requestRender);
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const target = document.querySelector(link.hash);
      if (!target) return;
      event.preventDefault();
      scrollTo({ top: targetTop(target), behavior: reduced.matches ? 'instant' : 'smooth' });
      history.replaceState(null, '', link.hash);
    });
  });
  function scrollToHash() {
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target) scrollTo({ top: targetTop(target), behavior: 'instant' });
  }
  addEventListener('load', scrollToHash, { once: true });
  addEventListener('hashchange', scrollToHash);
  render();
})();
