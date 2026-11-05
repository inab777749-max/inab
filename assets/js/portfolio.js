/* Portfolio uses the original URLs without resizing or re-encoding media.
   The shared content loader owns data fetching; a failed request never becomes
   an empty or sample portfolio. */
(function (host) {
  'use strict';

  function text(value) { return typeof value === 'string' || typeof value === 'number' ? String(value) : ''; }
  function safeUrl(value) {
    const raw = text(value).trim();
    if (!raw || /[\u0000-\u001f]/.test(raw)) return '';
    if (/^data:(image\/(?:png|jpe?g|gif|webp|avif)|video\/(?:mp4|webm));base64,/i.test(raw)) return raw;
    try {
      const url = new URL(raw, 'https://inabshop.pages.dev/');
      return /^https?:$/.test(url.protocol) ? raw : '';
    } catch (_) { return ''; }
  }
  function mediaUrls(row) {
    let values = row && row.images;
    if (typeof values === 'string' && /^\s*\[/.test(values)) {
      try { values = JSON.parse(values); } catch (_) { /* Legacy newline list. */ }
    }
    const list = (Array.isArray(values) ? values : text(values).split(/\r?\n/))
      .map((item) => safeUrl(typeof item === 'object' && item ? item.url : item)).filter(Boolean);
    if (!list.length) { const single = safeUrl(row && row.image_url); if (single) list.push(single); }
    return [...new Set(list)];
  }
  function isVideo(url) { return /\.(mp4|webm|ogv|ogg|mov)(?:[?#]|$)/i.test(url) || /^data:video\//i.test(url); }
  function tags(row) {
    const raw = text(row && row.tag).trim();
    // Category labels can contain spaces, so only explicit separators split them.
    return raw.split(/[,;\n]/).map((part) => part.trim()).filter(Boolean);
  }
  function categories(rows, configured) {
    const result = [];
    const seen = new Set();
    const add = (key, label) => {
      if (!key || key === 'all' || seen.has(key)) return;
      seen.add(key);
      result.push({ key: key, label: label || key, count: rows.filter((row) => tags(row).includes(key)).length });
    };
    text(configured).split(/\r?\n/).forEach((line) => {
      const parts = line.split('|').map((part) => part.trim());
      add(parts[0], parts[1]);
    });
    rows.forEach((row) => tags(row).forEach((tag) => add(tag, tag)));
    return result;
  }
  function byCategory(rows, category) { return category === 'all' ? rows.slice() : rows.filter((row) => tags(row).includes(category)); }
  function publicDetails(row) {
    const lines = [];
    const credit = text(row.credit || row.credits).trim();
    const date = text(row.work_date).trim();
    const client = text(row.client_display).trim();
    if (credit) lines.push(credit);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) lines.push('작업일 ' + date.replace(/-/g, '. ') + '.');
    if (client) lines.push('의뢰자 ' + client);
    return lines.join('\n');
  }
  function normalizeRows(rows) {
    return rows.filter((row) => row && typeof row === 'object').map((row) => Object.assign({}, row, { _shots: mediaUrls(row) }));
  }

  const api = { safeUrl: safeUrl, mediaUrls: mediaUrls, isVideo: isVideo, categories: categories, byCategory: byCategory, publicDetails: publicDetails };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!host.document) return;
  const document = host.document;
  const root = document.querySelector('[data-inab-portfolio]');
  if (!root) return;
  const q = (selector) => root.querySelector(selector);
  const dialog = document.querySelector('[data-portfolio-dialog]');
  const dq = (selector) => dialog.querySelector(selector);
  const ui = {
    state: q('[data-portfolio-state]'), shell: q('[data-portfolio-shell]'), total: q('[data-portfolio-total]'),
    filters: q('[data-portfolio-filters]'), stage: q('[data-portfolio-stage]'), carousel: q('[data-portfolio-carousel]'),
    caption: q('[data-portfolio-caption]'), shots: q('[data-portfolio-shots]'), prev: q('[data-portfolio-prev]'),
    next: q('[data-portfolio-next]'), range: q('[data-portfolio-range]'), count: q('[data-portfolio-count]')
  };
  const state = { rows: [], filtered: [], content: {}, category: 'all', index: 0, shot: 0, dialogShot: 0, mounted: false };
  let returnFocus = null;
  let resizeFrame = 0;
  let renderVersion = 0;
  let lastSwipe = 0;
  let measureVersion = 0;
  const reducedMotion = host.matchMedia('(prefers-reduced-motion: reduce)');
  const el = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = value;
    return node;
  };
  function current() { return state.filtered[state.index]; }
  function stopMedia(parent) { parent.querySelectorAll('video').forEach((video) => video.pause()); }
  function caption(row, target) {
    target.replaceChildren();
    if (!row) return;
    if (text(row.meta).trim()) target.append(el('p', 'inab-carousel__meta', text(row.meta)));
    target.append(el('h2', '', text(row.title).trim() || '제목 없는 작품'));
    if (text(row.description).trim()) target.append(el('p', '', text(row.description)));
    if (publicDetails(row)) target.append(el('p', 'inab-carousel__credits', publicDetails(row)));
  }
  function measureCaption() {
    if (!state.filtered.length || !ui.shell.offsetWidth) return;
    const version = ++measureVersion;
    const probe = el('div', 'inab-carousel__caption inab-carousel__measure');
    probe.setAttribute('aria-hidden', 'true');
    ui.carousel.append(probe);
    let maximum = 88;
    // One shared caption size keeps all image bottoms and text baselines stable.
    state.filtered.forEach((row) => {
      caption(row, probe);
      maximum = Math.max(maximum, Math.ceil(probe.getBoundingClientRect().height));
    });
    probe.remove();
    if (version === measureVersion) ui.caption.style.minHeight = maximum + 'px';
  }
  function mediaNode(url, row, enlarge) {
    const video = isVideo(url);
    const wrap = el(video || !enlarge ? 'div' : 'button', 'inab-carousel__slide' + (video ? ' inab-carousel__video-wrap' : ''));
    if (wrap.tagName === 'BUTTON') {
      wrap.type = 'button';
      wrap.setAttribute('aria-label', (text(row.title) || '작품') + ' 사진 크게 보기');
      wrap.addEventListener('click', (event) => { if (Date.now() - lastSwipe < 350) { event.preventDefault(); return; } openDialog(wrap); });
    }
    if (!url) { wrap.textContent = '등록된 사진이 없습니다.'; wrap.classList.add('is-error'); return wrap; }
    const media = el(video ? 'video' : 'img');
    if (video) {
      media.controls = true;
      media.playsInline = true;
      media.preload = 'metadata';
      media.setAttribute('aria-label', text(row.title) || '작품 영상');
    } else {
      media.alt = text(row.title) || '포트폴리오 작품';
      media.decoding = 'async';
      media.draggable = false;
      media.referrerPolicy = 'no-referrer';
    }
    media.addEventListener('error', () => {
      if (!media.isConnected) return;
      media.remove();
      wrap.classList.add('is-error');
      const message = el('span', '', '사진·영상을 불러오지 못했습니다.');
      wrap.prepend(message);
    }, { once: true });
    media.src = url;
    wrap.append(media);
    if (video && enlarge) {
      const button = el('button', 'inab-carousel__expand', '크게 보기');
      button.type = 'button';
      button.addEventListener('click', () => openDialog(button));
      wrap.append(button);
    }
    return wrap;
  }
  function paintStage(direction) {
    const row = current();
    if (!row) { stopMedia(ui.stage); ui.stage.replaceChildren(); return; }
    stopMedia(ui.stage);
    const old = ui.stage.lastElementChild;
    const next = mediaNode(row._shots[state.shot] || '', row, true);
    const version = ++renderVersion;
    // At most two layers, even when users rapidly press an arrow.
    ui.stage.querySelectorAll('.inab-carousel__slide').forEach((node) => { if (node !== old) node.remove(); });
    if (old) { old.setAttribute('aria-hidden', 'true'); old.inert = true; old.style.pointerEvents = 'none'; }
    ui.stage.append(next);
    if (!direction || reducedMotion.matches || typeof next.animate !== 'function') {
      if (old) old.remove();
      return;
    }
    const sign = direction > 0 ? 1 : -1;
    next.animate([{ transform: 'translateX(' + sign * 7 + '%)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.22,.68,0,1)' });
    if (old) {
      const animation = old.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(' + sign * -7 + '%)', opacity: 0 }], { duration: 250, easing: 'ease-out' });
      animation.finished.catch(() => {}).then(() => { if (old.isConnected && (version <= renderVersion)) old.remove(); });
    }
  }
  function paintShots() {
    ui.shots.replaceChildren();
    ui.shots.classList.toggle('has-shots', state.filtered.some((row) => row._shots.length > 1));
    const row = current();
    if (!row || row._shots.length < 2) return;
    row._shots.forEach((url, index) => {
      const button = el('button', 'inab-carousel__shot');
      button.type = 'button';
      button.setAttribute('aria-label', (index + 1) + '번째 사진' + (isVideo(url) ? ' · 영상' : ''));
      button.setAttribute('aria-pressed', String(index === state.shot));
      const thumb = el(isVideo(url) ? 'video' : 'img');
      if (isVideo(url)) { thumb.preload = 'none'; thumb.muted = true; thumb.playsInline = true; button.append(el('span', '', '영상')); }
      else { thumb.alt = ''; thumb.loading = 'lazy'; thumb.referrerPolicy = 'no-referrer'; }
      thumb.src = url;
      button.prepend(thumb);
      button.addEventListener('click', () => { const direction = index - state.shot; state.shot = index; paintStage(direction); paintShots(); });
      ui.shots.append(button);
    });
  }
  function paint(direction) {
    const row = current();
    ui.prev.disabled = !row || state.index === 0;
    ui.next.disabled = !row || state.index >= state.filtered.length - 1;
    ui.range.max = String(Math.max(1, state.filtered.length));
    ui.range.value = String(state.index + 1);
    ui.range.disabled = state.filtered.length < 2;
    ui.range.setAttribute('aria-valuetext', row ? (state.index + 1) + ' / ' + state.filtered.length + ' · ' + text(row.title) : '작품 없음');
    ui.count.textContent = row ? (state.index + 1) + ' / ' + state.filtered.length : '0 / 0';
    ui.total.textContent = state.filtered.length + '개 작업';
    caption(row, ui.caption);
    paintStage(direction);
    paintShots();
    ui.carousel.hidden = !row;
    ui.state.hidden = !!row;
    if (!row) ui.state.textContent = '이 분류에 등록된 작품이 없습니다.';
  }
  function select(index) {
    const bounded = Math.max(0, Math.min(state.filtered.length - 1, index));
    if (bounded === state.index) return;
    const direction = bounded - state.index;
    state.index = bounded;
    state.shot = 0;
    paint(direction);
  }
  function chooseCategory(category) {
    state.category = category;
    state.filtered = byCategory(state.rows, category);
    state.index = 0;
    state.shot = 0;
    ui.filters.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
    paint(0);
    measureCaption();
  }
  function paintFilters() {
    ui.filters.replaceChildren();
    const list = [{ key: 'all', label: text(state.content.portfolio_all_label).trim() || '전체', count: state.rows.length }]
      .concat(categories(state.rows, state.content.portfolio_cats));
    list.forEach((category) => {
      const button = el('button', '', category.label);
      button.type = 'button';
      button.dataset.category = category.key;
      button.setAttribute('aria-pressed', String(state.category === category.key));
      button.append(el('small', '', String(category.count)));
      button.addEventListener('click', () => chooseCategory(category.key));
      ui.filters.append(button);
    });
  }
  function paintDialog() {
    const row = current();
    if (!row) return;
    const stage = dq('[data-portfolio-dialog-stage]');
    stopMedia(stage);
    stage.replaceChildren(mediaNode(row._shots[state.dialogShot] || '', row, false));
    dq('[data-portfolio-dialog-prev]').disabled = state.dialogShot === 0;
    dq('[data-portfolio-dialog-next]').disabled = state.dialogShot >= row._shots.length - 1;
    dq('[data-portfolio-dialog-count]').textContent = row._shots.length ? '사진 ' + (state.dialogShot + 1) + ' / ' + row._shots.length : '';
    dq('#inab-lightbox-title').textContent = text(row.title) || '제목 없는 작품';
    dq('[data-portfolio-dialog-description]').textContent = text(row.description);
    dq('[data-portfolio-dialog-credits]').textContent = publicDetails(row);
  }
  function openDialog(trigger) {
    if (!current() || dialog.open) return;
    returnFocus = trigger || document.activeElement;
    state.dialogShot = state.shot;
    stopMedia(ui.stage);
    paintDialog();
    dialog.showModal();
    document.documentElement.classList.add('inab-portfolio-modal-open');
    dq('[data-portfolio-close]').focus({ preventScroll: true });
  }
  function stepDialog(delta) {
    const row = current();
    if (!row) return;
    const next = Math.max(0, Math.min(row._shots.length - 1, state.dialogShot + delta));
    if (next === state.dialogShot) return;
    state.dialogShot = next;
    paintDialog();
  }
  function swipe(target, onSwipe) {
    let start = null;
    target.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0) || event.target.closest('video, .inab-carousel__expand')) return;
      start = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
      // No pointer capture: an image click still lands on its actual button.
    });
    target.addEventListener('pointerup', (event) => {
      if (!start || event.pointerId !== start.pointer) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy) * 1.3) return;
      lastSwipe = Date.now();
      onSwipe(dx < 0 ? 1 : -1);
    });
    target.addEventListener('pointercancel', () => { start = null; });
    target.addEventListener('dragstart', (event) => event.preventDefault());
  }
  function hashSelection() {
    if (!state.mounted) return;
    let hash;
    try { hash = decodeURIComponent(host.location.hash.slice(1)); } catch (_) { return; }
    if (!hash) return;
    const index = state.rows.findIndex((row) => text(row.anchor) === hash);
    if (index >= 0) { chooseCategory('all'); state.index = index; paint(0); }
    else if (categories(state.rows, state.content.portfolio_cats).some((category) => category.key === hash)) chooseCategory(hash);
  }
  api.mount = function (rows, content) {
    if (!Array.isArray(rows)) {
      ui.state.textContent = '포트폴리오를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';
      ui.state.hidden = false;
      ui.shell.hidden = true;
      return;
    }
    if (dialog.open) dialog.close();
    state.rows = normalizeRows(rows);
    state.content = content || {};
    state.category = 'all'; state.index = 0; state.shot = 0;
    state.filtered = state.rows.slice();
    state.mounted = true;
    ui.shell.hidden = false;
    paintFilters();
    paint(0);
    if (!state.rows.length) ui.state.textContent = '등록된 포트폴리오가 없습니다.';
    hashSelection();
    measureCaption();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureCaption);
  };
  host.INAB_PORTFOLIO = api;
  document.addEventListener('content:ready', (event) => {
    const collections = host.SITE_COLLECTIONS;
    if (collections && Object.prototype.hasOwnProperty.call(collections, 'portfolio_items')) api.mount(collections.portfolio_items, event.detail || host.SITE_CONTENT || {});
  });
  ui.prev.addEventListener('click', () => select(state.index - 1));
  ui.next.addEventListener('click', () => select(state.index + 1));
  ui.range.addEventListener('input', () => select(Number(ui.range.value) - 1));
  ui.carousel.addEventListener('keydown', (event) => {
    if (event.target.closest('input, video')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); select(state.index - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); select(state.index + 1); }
    if (event.key === 'Home') { event.preventDefault(); select(0); }
    if (event.key === 'End') { event.preventDefault(); select(state.filtered.length - 1); }
  });
  dq('[data-portfolio-close]').addEventListener('click', () => dialog.close());
  dq('[data-portfolio-dialog-prev]').addEventListener('click', () => stepDialog(-1));
  dq('[data-portfolio-dialog-next]').addEventListener('click', () => stepDialog(1));
  dialog.addEventListener('keydown', (event) => {
    if (event.target.closest('video')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); stepDialog(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); stepDialog(1); }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    stopMedia(dialog);
    dq('[data-portfolio-dialog-stage]').replaceChildren();
    document.documentElement.classList.remove('inab-portfolio-modal-open');
    if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
  });
  swipe(ui.stage, (delta) => select(state.index + delta));
  swipe(dq('[data-portfolio-dialog-stage]'), stepDialog);
  host.addEventListener('hashchange', hashSelection);
  host.addEventListener('resize', () => { host.cancelAnimationFrame(resizeFrame); resizeFrame = host.requestAnimationFrame(measureCaption); });
  if (host.SITE_COLLECTIONS) api.mount(host.SITE_COLLECTIONS.portfolio_items, host.SITE_CONTENT || {});
})(typeof window === 'undefined' ? globalThis : window);
