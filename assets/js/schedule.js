/* Public work calendar. Receives only the sanitized public schedule view.
   Pure helpers are exported for date/legacy-data regression tests. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.INABCalendar = api;
    const start = () => api.mount(root.document.querySelector('[data-inab-calendar]'), root);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  const LABEL = { waiting: '대기중', working: '작업중', done: '완료' };
  const JOB_KINDS = Object.keys(LABEL);
  const text = (value) => value == null ? '' : String(value);
  const esc = (value) => text(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const pad = (value) => String(value).padStart(2, '0');
  const dateKey = (year, month, day) => String(year).padStart(4, '0') + '-' + pad(month) + '-' + pad(day);
  function parseDate(value) {
    const s = text(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [year, month, day] = s.split('-').map(Number);
    const result = new Date(0);
    result.setUTCFullYear(year, month - 1, day);
    result.setUTCHours(0, 0, 0, 0);
    return result.getUTCFullYear() === year && result.getUTCMonth() === month - 1 && result.getUTCDate() === day ? result : null;
  }
  function todayKey(now) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now || new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return values.year + '-' + values.month + '-' + values.day;
  }
  function monthInfo(year, month) {
    const first = parseDate(dateKey(year, month, 1));
    if (!first) return null;
    const last = new Date(first);
    last.setUTCMonth(last.getUTCMonth() + 1, 0);
    const days = last.getUTCDate();
    return { year, month, days, offset: first.getUTCDay(), weeks: Math.ceil((first.getUTCDay() + days) / 7) };
  }
  function changeMonth(year, month, delta) {
    const first = parseDate(dateKey(year, month, 1));
    first.setUTCMonth(first.getUTCMonth() + delta);
    return { year: first.getUTCFullYear(), month: first.getUTCMonth() + 1 };
  }
  function array(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; } }
    return [];
  }
  function enabled(value, defaultValue) {
    if (value == null || value === '') return defaultValue;
    return ![false, 0, 'false', 'off', '0'].includes(value);
  }
  function rowQuantity(row) {
    const number = Number(row.quantity);
    /* Original rows store aggregated counts in a short status label. Their new
       quantity column defaults to 1, so retain these counts during migration. */
    const legacy = text(row.label).trim().match(/^(?:대기(?:중)?|진행|작업중|완료)\s*(\d+)\s*(?:건|개)$/);
    if (legacy && (!Number.isFinite(number) || number <= 1)) return Math.max(1, Number(legacy[1]));
    return Number.isFinite(number) && number >= 1 ? Math.floor(number) : 1;
  }
  function occursOn(row, key) {
    const start = text(row.event_date).slice(0, 10);
    if (!parseDate(start) || !parseDate(key)) return false;
    const endCandidate = text(row.end_date).slice(0, 10);
    const end = parseDate(endCandidate) && endCandidate >= start ? endCandidate : start;
    return key >= start && key <= end;
  }
  function dayModel(events, content, calendar, key) {
    const date = parseDate(key);
    const rows = array(events).filter((row) => row && text(row.calendar) === calendar && occursOn(row, key));
    const jobs = rows.filter((row) => JOB_KINDS.includes(row.kind));
    const totals = { waiting: 0, working: 0, done: 0 };
    jobs.forEach((row) => { totals[row.kind] += rowQuantity(row); });
    let state = date && date.getUTCDay() === 0 && enabled(content.schedule_sunday_off, true) ? 'holiday' : 'open';
    if (rows.some((row) => row.kind === 'closed')) state = 'closed';
    if (rows.some((row) => row.kind === 'holiday')) state = 'holiday';
    if (rows.some((row) => row.kind === 'open')) state = 'open';
    const overrides = array(content.schedule_day_states).filter((row) => row && text(row.date).slice(0, 10) === key && (!row.calendar || row.calendar === calendar));
    const override = overrides[overrides.length - 1];
    if (override && ['holiday', 'closed', 'open'].includes(override.state)) state = override.state;
    return { key, state, jobs, totals, count: totals.waiting + totals.working + totals.done };
  }
  function publicJob(row) {
    /* Intentionally never read client_name, private_memo or other private keys. */
    const title = text(row.public_title).trim() || text(row.label).trim() || '작업 내용 미등록';
    return { title, client: text(row.client_display).trim() || '비공개', status: LABEL[row.kind] || '', quantity: rowQuantity(row), start: text(row.event_date).slice(0, 10), end: text(row.end_date).slice(0, 10) };
  }
  function visibleSlots(content, month) {
    return array(content.schedule_slots).filter((row) => row && (!row.calendar || row.calendar === 'package') && /^\d{4}-\d{2}$/.test(text(row.month)) && text(row.month) >= month)
      .sort((a, b) => text(a.month).localeCompare(text(b.month))).slice(0, 3);
  }
  function hearts(totals, limit) {
    let markup = '', painted = 0;
    for (const kind of JOB_KINDS) {
      for (let i = 0; i < totals[kind] && painted < limit; i += 1, painted += 1) markup += '<span class="ic-heart ic-heart--' + kind + '" aria-hidden="true">♥</span>';
    }
    const count = Object.values(totals).reduce((a, b) => a + b, 0);
    if (count > painted) markup += '<span class="ic-heart-more" aria-hidden="true">+' + (count - painted) + '</span>';
    return markup;
  }
  function dayLabel(model) {
    return (model.state === 'holiday' ? '휴일' : model.state === 'closed' ? '마감' : '접수 가능')
      + JOB_KINDS.filter((kind) => model.totals[kind]).map((kind) => ', ' + LABEL[kind] + ' ' + model.totals[kind] + '건').join('');
  }
  function mount(host, win) {
    if (!host || host.dataset.mounted) return;
    host.dataset.mounted = 'true';
    const now = todayKey();
    const view = { year: Number(now.slice(0, 4)), month: Number(now.slice(5, 7)), calendar: 'package', selected: now, content: {}, events: null, loaded: false };
    const grid = host.querySelector('[data-ic-grid]');
    const details = host.querySelector('[data-ic-details]');
    const picker = host.querySelector('[data-ic-month]');
    function paintSidebar() {
      const content = view.content;
      const notice = text(content.schedule_booking_notice).trim();
      host.querySelector('[data-ic-notice]').textContent = notice || '날짜를 선택해 작업 현황을 확인해 주세요. 예약 가능 여부는 문의 시 확인해 주세요.';
      const slots = visibleSlots(content, dateKey(view.year, view.month, 1).slice(0, 7));
      host.querySelector('[data-ic-slots]').innerHTML = slots.length ? slots.map((row) => {
        const capacity = Math.max(0, Math.floor(Number(row.capacity) || 0));
        const booked = Math.max(0, Math.floor(Number(row.booked) || 0));
        const closed = row.state === 'closed' || (capacity > 0 && booked >= capacity);
        return '<article class="ic-slot"><div class="ic-slot__head"><h4>' + esc(Number(text(row.month).slice(5, 7))) + '월 <small>' + esc(text(row.month).slice(0, 4)) + '</small></h4><span>' + (closed ? '마감' : '접수중') + '</span></div>'
          + '<div class="ic-slot__hearts" aria-hidden="true">' + Array.from({ length: Math.min(capacity, 12) }, (_, i) => '<span class="' + (i < booked ? 'is-booked' : '') + '">♥</span>').join('') + (capacity > 12 ? '<small>+' + (capacity - 12) + '</small>' : '') + '</div>'
          + '<p>' + (capacity > 0 ? capacity + '개 중 ' + booked + '개 예약' : (closed ? '이번 달 접수 마감' : '접수 수량은 문의해 주세요.')) + '</p>'
          + (text(row.note).trim() ? '<p class="ic-slot__note">' + esc(row.note).replace(/\n/g, '<br>') + '</p>' : '') + '</article>';
      }).join('') : '<p class="ic-muted">선택한 달 이후의 슬롯 안내가 아직 없습니다.</p>';
    }
    function paintDetails() {
      if (!view.loaded) { details.innerHTML = '<p class="ic-muted">일정을 불러오는 중입니다.</p>'; return; }
      if (!Array.isArray(view.events)) { details.innerHTML = '<p class="ic-load-error" role="alert">일정을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>'; return; }
      const model = dayModel(view.events, view.content, view.calendar, view.selected);
      const date = parseDate(view.selected);
      const title = date.getUTCMonth() + 1 + '월 ' + date.getUTCDate() + '일 ' + WEEK[date.getUTCDay()] + '요일';
      const stateText = model.state === 'holiday' ? '휴일입니다.' : model.state === 'closed' ? '접수가 마감된 날짜입니다.' : '등록된 작업과 접수 현황을 확인해 주세요.';
      details.innerHTML = '<div class="ic-details__heading"><h3>' + title + '</h3><span>' + (model.count ? model.count + '건의 작업' : '등록된 작업 없음') + '</span></div>'
        + '<p class="ic-muted">' + stateText + '</p>'
        + (model.jobs.length ? '<div class="ic-jobs">' + model.jobs.map((row) => {
          const job = publicJob(row);
          const period = parseDate(job.end) && job.end > job.start ? '<div><dt>기간</dt><dd>' + esc(job.start) + ' ~ ' + esc(job.end) + '</dd></div>' : '';
          return '<article class="ic-job ic-job--' + esc(row.kind) + '"><span class="ic-status ic-status--' + esc(row.kind) + '">' + esc(job.status) + (job.quantity > 1 ? ' · ' + job.quantity + '건' : '') + '</span><h4>' + esc(job.title) + '</h4><dl><div><dt>예약자</dt><dd>' + esc(job.client) + '</dd></div>' + period + '</dl></article>';
        }).join('') + '</div>' : '<p class="ic-details__empty">이 날짜에 등록된 작업이 없습니다.</p>');
    }
    function paint() {
      const info = monthInfo(view.year, view.month);
      if (!info) return;
      const month = dateKey(view.year, view.month, 1).slice(0, 7);
      picker.value = month;
      host.querySelector('[data-ic-title]').textContent = view.year + '년 ' + view.month + '월';
      grid.setAttribute('aria-label', view.year + '년 ' + view.month + '월 작업 일정');
      host.querySelectorAll('[data-ic-tab]').forEach((button) => {
        const active = button.dataset.icTab === view.calendar;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        button.textContent = text(view.content[button.dataset.icTab === 'package' ? 'schedule_tab1' : 'schedule_tab2']).trim() || (button.dataset.icTab === 'package' ? '패키지 작업' : '닐로툰 · 뚜따 작업');
      });
      host.querySelector('[data-ic-panel]').setAttribute('aria-labelledby', 'ic-tab-' + view.calendar);
      let cells = WEEK.map((day) => '<div class="ic-weekday" role="columnheader">' + day + '</div>').join('');
      for (let n = 0; n < info.offset; n += 1) cells += '<div class="ic-day ic-day--out" aria-hidden="true"></div>';
      for (let n = 1; n <= info.days; n += 1) {
        const key = dateKey(view.year, view.month, n);
        const model = dayModel(view.events, view.content, view.calendar, key);
        const isToday = key === todayKey();
        const status = model.state === 'holiday' ? '휴일' : model.state === 'closed' ? '마감' : '';
        cells += '<button type="button" class="ic-day ic-day--' + model.state + (view.selected === key ? ' is-selected' : '') + (isToday ? ' is-today' : '') + '" data-ic-day="' + key + '" aria-pressed="' + (view.selected === key) + '" aria-controls="ic-day-details" aria-label="' + key + ', ' + esc(dayLabel(model)) + '"' + (isToday ? ' aria-current="date"' : '') + ' tabindex="' + (view.selected === key ? 0 : -1) + '"><span class="ic-day__number">' + n + '</span>' + (status ? '<span class="ic-day__state">' + status + '</span>' : '') + (isToday ? '<span class="ic-day__today">오늘</span>' : '') + '<span class="ic-day__hearts">' + hearts(model.totals, 8) + '</span></button>';
      }
      for (let n = info.offset + info.days; n < info.weeks * 7; n += 1) cells += '<div class="ic-day ic-day--out" aria-hidden="true"></div>';
      grid.innerHTML = cells;
      host.setAttribute('aria-busy', String(!view.loaded));
      const message = host.querySelector('[data-ic-load-state]');
      message.hidden = view.loaded && Array.isArray(view.events);
      message.textContent = !view.loaded ? '일정을 불러오는 중입니다.' : '일정을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';
      paintSidebar();
      paintDetails();
    }
    function goMonth(year, month) {
      const info = monthInfo(year, month);
      if (!info) return;
      view.year = year;
      view.month = month;
      const current = todayKey();
      view.selected = current.startsWith(dateKey(year, month, 1).slice(0, 7)) ? current : dateKey(year, month, Math.min(Number(view.selected.slice(8, 10)) || 1, info.days));
      paint();
    }
    host.addEventListener('click', (event) => {
      const day = event.target.closest('[data-ic-day]');
      if (day) { view.selected = day.dataset.icDay; paint(); host.querySelector('[data-ic-day="' + view.selected + '"]').focus({ preventScroll: true }); return; }
      const step = event.target.closest('[data-ic-shift]');
      if (step) { const next = changeMonth(view.year, view.month, Number(step.dataset.icShift)); goMonth(next.year, next.month); return; }
      if (event.target.closest('[data-ic-today]')) { const key = todayKey(); goMonth(Number(key.slice(0, 4)), Number(key.slice(5, 7))); return; }
      const tab = event.target.closest('[data-ic-tab]');
      if (tab) { view.calendar = tab.dataset.icTab; paint(); }
    });
    picker.addEventListener('change', () => { if (/^\d{4}-\d{2}$/.test(picker.value)) goMonth(Number(picker.value.slice(0, 4)), Number(picker.value.slice(5, 7))); });
    host.addEventListener('keydown', (event) => {
      const tab = event.target.closest('[data-ic-tab]');
      if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); view.calendar = event.key === 'Home' ? 'package' : event.key === 'End' ? 'nilo' : view.calendar === 'package' ? 'nilo' : 'package'; paint(); host.querySelector('[data-ic-tab="' + view.calendar + '"]').focus(); return; }
      const day = event.target.closest('[data-ic-day]');
      const shift = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
      if (day && shift) { event.preventDefault(); const target = parseDate(day.dataset.icDay); target.setUTCDate(target.getUTCDate() + shift); view.selected = dateKey(target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate()); view.year = target.getUTCFullYear(); view.month = target.getUTCMonth() + 1; paint(); host.querySelector('[data-ic-day="' + view.selected + '"]').focus(); }
    });
    function receive(event) {
      const explicit = win.INAB_SCHEDULE_DATA;
      view.content = (explicit && explicit.content) || win.SITE_CONTENT || (event && event.detail) || {};
      view.events = explicit ? explicit.events : win.INAB_SCHEDULE_EVENTS;
      view.loaded = true;
      paint();
    }
    win.document.addEventListener('content:ready', receive);
    paint();
    if (win.INAB_SCHEDULE_DATA || Object.prototype.hasOwnProperty.call(win, 'INAB_SCHEDULE_EVENTS')) receive();
    return { receive, view };
  }
  return { parseDate, dateKey, todayKey, monthInfo, changeMonth, rowQuantity, occursOn, dayModel, publicJob, visibleSlots, mount };
});
