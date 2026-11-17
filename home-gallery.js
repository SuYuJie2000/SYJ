(() => {
  'use strict';
  const data = window.PORTFOLIO_DATA;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const graphicsOrder = ['04', '05', '06', '07', '09', '10', '08', '12', '13', '14', '11', '15', '16'];
  const graphics = graphicsOrder.map(id => data.graphics.find(item => item.id === `graphics-${id}`)).filter(Boolean);
  const groups = { graphics, model: data.model.filter(item => !item.placeholder), integrated: data.integrated.filter(item => !item.placeholder) };
  const groupNames = { graphics: '平面作品', model: '建模作品', integrated: '综合作品' };
  const dialog = document.querySelector('#home-work-dialog');
  const dialogImage = dialog.querySelector('.dialog-image img');
  const zoomButton = dialog.querySelector('.dialog-zoom');
  let currentGroup = 'graphics', currentIndex = 0, opener = null;

  function makeCard(item, index, group) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'portfolio-card';
    button.dataset.group = group;
    button.dataset.index = index;
    button.setAttribute('aria-label', `${item.title}，查看大图`);
    button.setAttribute('aria-haspopup', 'dialog');
    const mat = document.createElement('span');
    mat.className = 'art-mat';
    const image = new Image();
    image.src = item.asset;
    image.alt = item.title;
    image.loading = 'lazy';
    image.decoding = 'async';
    mat.append(image);
    const caption = document.createElement('span');
    caption.className = 'art-caption';
    const number = document.createElement('small');
    number.textContent = String(index + 1).padStart(2, '0');
    const title = document.createElement('strong');
    title.textContent = item.title;
    caption.append(number, title);
    button.append(mat, caption);
    if (group === 'graphics') {
      if (['graphics-08', 'graphics-12'].includes(item.id)) button.classList.add('is-wide');
      if (index >= 8) button.classList.add('is-secondary');
      if (item.id === 'graphics-11') button.classList.add('is-feature');
    }
    return button;
  }
  for (const [group, selector] of Object.entries({ graphics: '.graphic-wall', model: '#model-track', integrated: '#integrated-track' })) {
    const container = document.querySelector(selector);
    container.append(...groups[group].map((item, index) => makeCard(item, index, group)));
    document.querySelector(`#${group === 'model' ? 'model' : group}-count`).textContent = `${groups[group].length} 件作品`;
    container.addEventListener('click', event => {
      const card = event.target.closest('.portfolio-card');
      if (card) openWork(group, Number(card.dataset.index), card);
    });
  }

  function resetZoom() {
    dialog.classList.remove('is-zoomed');
    zoomButton.setAttribute('aria-pressed', 'false');
    zoomButton.textContent = '查看原尺寸';
    dialog.querySelector('.dialog-image').scrollTo(0, 0);
  }
  function showWork() {
    const item = groups[currentGroup][currentIndex];
    dialogImage.src = item.asset;
    dialogImage.alt = item.title;
    document.querySelector('#home-dialog-title').textContent = item.title;
    document.querySelector('#home-dialog-kind').textContent = `${groupNames[currentGroup]} / ${item.kind}`;
    dialog.querySelector('.dialog-counter').textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${groups[currentGroup].length}`;
    resetZoom();
  }
  function openWork(group, index, source) {
    currentGroup = group;
    currentIndex = index;
    opener = source;
    showWork();
    dialog.showModal();
    document.body.classList.add('dialog-open');
    syncPreviewTimer();
  }
  function stepWork(direction) {
    currentIndex = (currentIndex + direction + groups[currentGroup].length) % groups[currentGroup].length;
    showWork();
  }
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.dialog-prev').addEventListener('click', () => stepWork(-1));
  dialog.querySelector('.dialog-next').addEventListener('click', () => stepWork(1));
  zoomButton.addEventListener('click', () => {
    const zoomed = dialog.classList.toggle('is-zoomed');
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.textContent = zoomed ? '适应窗口' : '查看原尺寸';
  });
  dialog.addEventListener('keydown', event => {
    if (dialog.classList.contains('is-zoomed')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      stepWork(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    opener?.focus({ preventScroll: true });
    syncPreviewTimer();
  });

  const tracks = [...document.querySelectorAll('.gallery-track')];
  function updateTrackControls(track) {
    const end = track.scrollWidth - track.clientWidth;
    document.querySelector(`[data-track="${track.id}"][data-direction="-1"]`).disabled = track.scrollLeft < 2;
    document.querySelector(`[data-track="${track.id}"][data-direction="1"]`).disabled = track.scrollLeft > end - 2;
  }
  function moveTrack(track, direction) {
    const column = track.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
    const count = Math.max(1, Math.floor(track.clientWidth / column));
    track.scrollBy({ left: column * count * direction, behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  document.querySelectorAll('[data-track]').forEach(button => {
    button.addEventListener('click', () => moveTrack(document.getElementById(button.dataset.track), Number(button.dataset.direction)));
  });
  tracks.forEach(track => {
    track.addEventListener('scroll', () => updateTrackControls(track), { passive: true });
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      moveTrack(track, event.key === 'ArrowLeft' ? -1 : 1);
    });
    new ResizeObserver(() => updateTrackControls(track)).observe(track);
  });
  const integratedTrack = document.querySelector('#integrated-track');
  integratedTrack.addEventListener('wheel', event => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const end = integratedTrack.scrollWidth - integratedTrack.clientWidth;
    const delta = event.deltaY * (event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? integratedTrack.clientWidth : 1);
    if ((delta > 0 && integratedTrack.scrollLeft < end - 2) || (delta < 0 && integratedTrack.scrollLeft > 2)) {
      event.preventDefault();
      integratedTrack.scrollLeft += delta;
    }
  }, { passive: false });

  const preview = document.querySelector('.hero-preview');
  const previewArt = preview.querySelector('.preview-art');
  const previewImage = previewArt.querySelector('img');
  const playButton = preview.querySelector('[data-preview="play"]');
  const selected = [
    ['integrated', 'integrated-45'], ['model', 'model-39'], ['graphics', 'graphics-11'],
    ['integrated', 'integrated-55'], ['model', 'model-24'], ['graphics', 'graphics-04']
  ].map(([group, id]) => ({ group, index: groups[group].findIndex(item => item.id === id) })).filter(item => item.index >= 0);
  let previewIndex = 0, playing = !reduced.matches, inView = false, hovering = false, focused = false, timer = 0;
  function showPreview() {
    const selection = selected[previewIndex];
    const item = groups[selection.group][selection.index];
    previewImage.src = item.asset;
    previewImage.alt = item.title;
    previewArt.setAttribute('aria-label', `查看${item.title}大图`);
    document.querySelector('#preview-title').textContent = item.title;
    document.querySelector('#preview-kind').textContent = groupNames[selection.group];
    document.querySelector('#preview-count').textContent = `${String(previewIndex + 1).padStart(2, '0')} / ${String(selected.length).padStart(2, '0')}`;
  }
  function syncPreviewTimer() {
    clearTimeout(timer);
    playButton.textContent = playing ? '暂停轮播' : '播放轮播';
    playButton.setAttribute('aria-label', playing ? '暂停作品轮播' : '播放作品轮播');
    if (!playing || !inView || hovering || focused || document.hidden || dialog.open) return;
    timer = setTimeout(() => {
      previewIndex = (previewIndex + 1) % selected.length;
      showPreview();
      syncPreviewTimer();
    }, 5000);
  }
  preview.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.preview;
    if (action === 'play') {
      playing = !playing;
      // An explicit play request resumes even while its button retains focus.
      if (playing) { hovering = false; focused = false; }
    }
    else {
      playing = false;
      previewIndex = (previewIndex + (action === 'next' ? 1 : -1) + selected.length) % selected.length;
      showPreview();
    }
    syncPreviewTimer();
  }));
  previewArt.addEventListener('click', () => {
    const selection = selected[previewIndex];
    openWork(selection.group, selection.index, previewArt);
  });
  preview.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    hovering = true;
    syncPreviewTimer();
  });
  preview.addEventListener('pointerleave', () => { hovering = false; syncPreviewTimer(); });
  preview.addEventListener('focusin', () => { focused = true; syncPreviewTimer(); });
  preview.addEventListener('focusout', () => queueMicrotask(() => {
    focused = preview.contains(document.activeElement);
    syncPreviewTimer();
  }));
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    syncPreviewTimer();
  }, { threshold: .2 }).observe(preview);
  document.addEventListener('visibilitychange', syncPreviewTimer);
  reduced.addEventListener('change', () => { playing = !reduced.matches; syncPreviewTimer(); });
  showPreview();
  syncPreviewTimer();
})();
