/* Reads site_content + collection tables and rewrites the page.
   Every element the admin can change carries a data-c* hook or sits inside a
   data-list container. Without a database the shipped markup stays as is. */
(() => {
  "use strict";

  const READY_CLASS = 'ready';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Values arriving from jsonb can be arrays or objects; never assign them raw. */
  function txt(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(txt).filter(Boolean).join('\n');
    if (typeof value === 'object') return '';
    return String(value);
  }

  function lines(value) {
    return txt(value).split('\n').map((line) => line.trim()).filter(Boolean);
  }

  function multiline(value) {
    return txt(value).split('\n').map(esc).join('<br>');
  }

  function markReady() {
    document.body.classList.add(READY_CLASS);
  }

  /* ---------------------------------------------------------- text hooks */
  function applyHooks(data) {
    const has = (key) => Object.prototype.hasOwnProperty.call(data, key) && txt(data[key]).trim() !== '';

    document.querySelectorAll('[data-c]').forEach((node) => {
      const key = node.dataset.c;
      if (has(key)) node.textContent = txt(data[key]).trim();
    });

    document.querySelectorAll('[data-c-multi]').forEach((node) => {
      const key = node.dataset.cMulti;
      if (has(key)) node.innerHTML = multiline(txt(data[key]).trim());
    });

    document.querySelectorAll('[data-c-year]').forEach((node) => {
      const key = node.dataset.cYear;
      const raw = has(key) ? txt(data[key]) : node.textContent;
      node.textContent = raw.replace(/\{year\}/g, String(new Date().getFullYear()));
    });

    document.querySelectorAll('[data-c-content]').forEach((node) => {
      const key = node.dataset.cContent;
      if (has(key)) node.setAttribute('content', txt(data[key]).trim());
    });

    document.querySelectorAll('[data-c-placeholder]').forEach((node) => {
      const key = node.dataset.cPlaceholder;
      if (has(key)) node.setAttribute('placeholder', txt(data[key]).trim());
    });

    document.querySelectorAll('[data-c-src]').forEach((node) => {
      const key = node.dataset.cSrc;
      if (has(key)) {
        node.setAttribute('src', txt(data[key]).trim());
        node.setAttribute('referrerpolicy', 'no-referrer');
      }
    });

    document.querySelectorAll('[data-c-href]').forEach((node) => {
      const key = node.dataset.cHref;
      if (has(key)) node.setAttribute('href', txt(data[key]).trim());
    });

    document.querySelectorAll('[data-c-focus]').forEach((node) => {
      const key = node.dataset.cFocus;
      if (has(key)) node.style.objectPosition = txt(data[key]).trim();
    });

    /* Optional pieces disappear instead of leaving an empty slot. */
    document.querySelectorAll('[data-c-if]').forEach((node) => {
      const key = node.dataset.cIf;
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        node.hidden = !has(key);
      }
    });
  }

  function applyToday(data) {
    const node = document.querySelector('[data-c="schedule_stat1_value"]');
    if (!node) return;
    if (txt(data.schedule_stat1_value).trim()) return;
    const now = new Date();
    node.textContent = now.getFullYear() + '. '
      + String(now.getMonth() + 1).padStart(2, '0') + '. '
      + String(now.getDate()).padStart(2, '0');
  }

  function applyTheme(data) {
    const schema = window.SITE_SCHEMA;
    if (!schema) return;
    const root = document.documentElement;
    schema.PALETTE.forEach((item) => {
      const value = txt(data[item.key]).trim();
      if (value) root.style.setProperty(item.var, value);
    });
    schema.TYPE_SCALE.forEach((item) => {
      const value = parseFloat(txt(data[item.key]));
      if (value > 0) root.style.setProperty(item.var, String(value));
    });
  }

  /* ------------------------------------------------------------ renderers */
  /* One URL per line; the old single-image column is the fallback. */
  function gallery(row) {
    const list = lines(row.images);
    if (list.length) return list;
    const single = txt(row.image_url).trim();
    return single ? [single] : [];
  }

  function focusStyle(row) {
    const x = row.focus_x == null || row.focus_x === '' ? 50 : Number(row.focus_x);
    const y = row.focus_y == null || row.focus_y === '' ? 50 : Number(row.focus_y);
    return '--focus:' + x + '% ' + y + '%';
  }

  function portfolioCard(row, tag) {
    const shots = gallery(row);
    const first = shots[0] || '';
    const contain = row.fit === 'contain';
    const style = focusStyle(row);
    const media = 'portfolio-card__media' + (contain ? ' portfolio-card__media--contain' : '');
    const blur = contain ? '<span class="portfolio-card__blur" aria-hidden="true" style="background-image:url('
      + esc(first) + ')"></span>' : '';
    const title = esc(txt(row.title));
    const count = shots.length > 1
      ? '<span class="media-count" aria-hidden="true">1 / ' + shots.length + '</span>' : '';
    return '<article class="portfolio-card" id="' + esc(txt(row.anchor)) + '" data-tags="' + esc(txt(row.tag)) + '">'
      + '<button class="' + media + '" type="button" style="' + esc(style) + '" data-lightbox'
      + ' data-image="' + esc(first) + '" data-images="' + esc(shots.join('|')) + '" data-title="' + title
      + '" data-description="' + esc(txt(row.description)) + '" aria-label="' + title + ' 크게 보기">'
      + blur
      + '<img src="' + esc(first) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
      + count
      + '</button>'
      + '<div class="portfolio-card__body"><p class="work-card__meta">' + esc(txt(row.meta)) + '</p>'
      + '<' + tag + ' class="portfolio-card__title">' + title + '</' + tag + '>'
      + '<p class="portfolio-card__copy">' + multiline(txt(row.description)) + '</p>'
      + '<p class="portfolio-card__more">크게 보기</p></div></article>';
  }

  function workCard(row) {
    const shots = gallery(row);
    const first = shots[0] || '';
    const title = esc(txt(row.title));
    return '<article class="work-card" data-tags="' + esc(txt(row.tag)) + '">'
      + '<button class="work-card__button" type="button" data-lightbox data-image="' + esc(first)
      + '" data-images="' + esc(shots.join('|')) + '" data-title="' + title
      + '" data-description="' + esc(txt(row.description))
      + '" aria-label="' + title + ' 크게 보기">'
      + '<span class="work-card__image"><img src="' + esc(first)
      + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="' + esc(focusStyle(row)) + '"></span>'
      + '</button>'
      + '<div class="work-card__body"><p class="work-card__meta">' + esc(txt(row.meta)) + '</p>'
      + '<h3 class="work-card__title">' + title + '</h3>'
      + '<p class="work-card__copy">' + multiline(txt(row.description)) + '</p></div></article>';
  }

  function collabCard(row) {
    const url = txt(row.link_url).trim();
    const label = txt(row.link_label).trim() || '아트머그 페이지';
    const link = url ? '<a class="text-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">'
      + esc(label) + '</a>' : '';
    return '<article class="collab-card"><div class="collab-card__image"><img src="' + esc(txt(row.image_url))
      + '" alt="" loading="lazy" referrerpolicy="no-referrer"></div>'
      + '<div class="collab-card__body"><h3 class="collab-card__title">' + esc(txt(row.name)) + '</h3>'
      + '<p class="collab-card__copy">' + multiline(txt(row.description)) + '</p>' + link + '</div></article>';
  }

  function priceCard(row) {
    const before = txt(row.price_before).trim();
    return '<article class="price-card" data-tags="' + esc(txt(row.tag)) + '">'
      + '<p class="price-card__type">' + esc(txt(row.type_label)) + '</p>'
      + '<h2 class="price-card__title">' + esc(txt(row.title)) + '</h2>'
      + (before ? '<p class="price-card__before">' + esc(before) + '</p>' : '')
      + '<p class="price-card__price">' + esc(txt(row.price)) + '</p>'
      + '<ul class="price-card__list">' + lines(row.features).map((f) => '<li>' + esc(f) + '</li>').join('')
      + '</ul></article>';
  }

  function shopCard(row) {
    const status = txt(row.status).trim();
    const url = txt(row.link_url).trim();
    const shots = gallery(row);
    const image = shots[0] || '';
    const title = esc(txt(row.title));
    const count = shots.length > 1
      ? '<span class="media-count" aria-hidden="true">1 / ' + shots.length + '</span>' : '';
    const media = image
      ? '<button class="shop-card__media" type="button" style="' + esc(focusStyle(row)) + '" data-lightbox'
        + ' data-image="' + esc(image) + '" data-images="' + esc(shots.join('|')) + '" data-title="' + title
        + '" data-description="' + esc(txt(row.description)) + '" aria-label="' + title + ' 크게 보기">'
        + '<img src="' + esc(image) + '" alt="" loading="lazy" referrerpolicy="no-referrer">'
        + (status ? '<span class="shop-card__status">' + esc(status) + '</span>' : '') + count + '</button>'
      : '<div class="shop-card__media">' + (status ? '<span class="shop-card__status">' + esc(status) + '</span>' : '') + '</div>';
    return '<article class="shop-card">' + media + '<div class="shop-card__body"><h2 class="shop-card__title">' + esc(txt(row.title)) + '</h2>'
      + (txt(row.price).trim() ? '<p class="shop-card__price">' + esc(txt(row.price)) + '</p>' : '')
      + '<p class="shop-card__copy">' + multiline(txt(row.description)) + '</p>'
      + (url ? '<a class="text-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">'
        + esc(txt(row.link_label).trim() || '자세히 보기') + '</a>' : '')
      + '</div></article>';
  }

  function noticePost(row, index) {
    const shots = gallery(row);
    const pinned = row.pinned === true || row.pinned === 'true';
    const title = esc(txt(row.title));
    const date = txt(row.date_label).trim();
    const url = txt(row.link_url).trim();
    const media = shots.map((src, i) => '<button class="notice-shot" type="button" data-lightbox'
      + ' data-image="' + esc(src) + '" data-images="' + esc(shots.join('|')) + '" data-title="' + title
      + '" data-description="" aria-label="' + title + ' 사진 ' + (i + 1) + ' 크게 보기">'
      + '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button>').join('');
    return '<details class="notice-post' + (pinned ? ' is-pinned' : '') + '"' + (index === 0 ? ' open' : '') + '>'
      + '<summary><span class="notice-post__head">'
      + (pinned ? '<span class="notice-post__pin">중요</span>' : '')
      + '<span class="notice-post__title">' + title + '</span></span>'
      + (date ? '<span class="notice-post__date">' + esc(date) + '</span>' : '') + '</summary>'
      + '<div class="notice-post__body">'
      + '<div class="notice-post__copy">' + multiline(txt(row.body)) + '</div>'
      + (media ? '<div class="notice-post__shots">' + media + '</div>' : '')
      + (url ? '<a class="text-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">'
        + esc(txt(row.link_label).trim() || '자세히 보기') + '</a>' : '')
      + '</div></details>';
  }

  function inquiryField(spec, index, prefix) {
    const parts = String(spec).split('|').map((p) => p.trim());
    const label = parts[0] || '';
    if (!label) return '';
    const kind = parts[1] || 'text';
    const help = parts[2] || '';
    const options = parts[3] || '';
    const id = prefix + '-' + index;
    const wide = (kind === 'textarea' || kind === 'file') ? ' field--wide' : '';
    const helpHtml = help ? '<p class="field-help">' + esc(help) + '</p>' : '';
    let control;
    if (kind === 'textarea') {
      control = '<textarea id="' + id + '" data-copy-field data-label="' + esc(label) + '"></textarea>';
    } else if (kind === 'select') {
      const opts = options.split(';').map((o) => o.trim()).filter(Boolean)
        .map((o) => '<option>' + esc(o) + '</option>').join('');
      control = '<select id="' + id + '" data-copy-field data-label="' + esc(label)
        + '"><option value="">선택해주세요</option>' + opts + '</select>';
    } else if (kind === 'file') {
      control = '<input type="file" id="' + id + '" accept="image/*" multiple data-copy-field data-label="'
        + esc(label) + '">';
    } else {
      control = '<input type="text" id="' + id + '" data-copy-field data-label="' + esc(label) + '">';
    }
    return '<div class="field' + wide + '"><label for="' + id + '">' + esc(label) + '</label>'
      + control + helpHtml + '</div>';
  }

  function inquiryForms(rows, data) {
    const sendOn = txt(data.inquiry_send_on).trim() !== 'off';
    const tabs = [];
    const panels = [];
    rows.forEach((row, index) => {
      const prefix = 'iq' + index;
      const first = index === 0;
      tabs.push('<button class="tab-button" id="tab-' + prefix + '" type="button" role="tab" aria-selected="'
        + (first ? 'true' : 'false') + '" aria-controls="panel-' + prefix + '"'
        + (first ? '' : ' tabindex="-1"') + '>' + esc(txt(row.tab_label)) + '</button>');
      const fields = lines(row.fields).map((spec, i) => inquiryField(spec, i, prefix)).join('');
      const send = sendOn ? '<div class="inquiry-send" data-inquiry-send>'
        + '<p class="inquiry-send__head">' + esc(txt(data.inquiry_send_head)) + '</p>'
        + '<p class="field-help">' + multiline(txt(data.inquiry_send_help)) + '</p>'
        + '<div class="inquiry-send__row"><div class="field"><label for="' + prefix + '-contact">'
        + esc(txt(data.inquiry_contact_label)) + '</label><input type="text" id="' + prefix + '-contact" data-contact></div>'
        + '<button class="button button--small" type="button" data-send-form>'
        + esc(txt(data.inquiry_send_btn) || '문의 보내기') + '</button></div></div>' : '';
      panels.push('<section class="tab-panel" id="panel-' + prefix + '" role="tabpanel" aria-labelledby="tab-'
        + prefix + '"' + (first ? '' : ' hidden') + '>'
        + '<form data-inquiry-form data-form-title="' + esc(txt(row.form_title)) + '">'
        + '<div class="form-grid">' + fields + '</div>'
        + '<div class="form-actions"><button class="button button--small" type="button" data-copy-form>작성 내용 복사</button>'
        + '<button class="button button--ghost button--small" type="button" data-preview-form>텍스트 미리보기</button>'
        + '<p class="copy-status" aria-live="polite" data-copy-status></p></div>'
        + '<div class="field field--wide" style="margin-top:18px"><label class="sr-only" for="' + prefix
        + '-preview">문의서 미리보기</label><textarea id="' + prefix + '-preview" data-form-preview hidden readonly></textarea></div>'
        + send
        + '<p class="form-note">' + multiline(txt(row.note)) + '</p></form></section>');
    });
    return '<div class="tab-list" role="tablist" aria-label="문의 유형">' + tabs.join('') + '</div>' + panels.join('');
  }

  /* --------------------------------------------------------- filter bars */
  function renderFilters(data) {
    document.querySelectorAll('[data-filter-source]').forEach((bar) => {
      const key = bar.dataset.filterSource;
      const rows = lines(data[key]);
      if (!rows.length) return;
      const allKey = bar.querySelector('[data-c]');
      const allLabel = allKey ? allKey.textContent : '전체';
      const buttons = ['<button class="filter-button is-active" type="button" data-filter="all" aria-pressed="true">'
        + esc(allLabel) + '</button>'];
      rows.forEach((row) => {
        const parts = row.split('|');
        const slug = (parts[0] || '').trim();
        const label = (parts[1] || parts[0] || '').trim();
        if (!slug) return;
        buttons.push('<button class="filter-button" type="button" data-filter="' + esc(slug)
          + '" aria-pressed="false">' + esc(label) + '</button>');
      });
      bar.innerHTML = buttons.join('');
    });
  }

  /* ------------------------------------------------------------ calendar */
  const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

  function renderCalendars(data, events) {
    const grids = document.querySelectorAll('[data-calendar]');
    if (!grids.length || events == null) return;
    const now = new Date();
    const year = parseInt(txt(data.schedule_year), 10) || now.getFullYear();
    const month = parseInt(txt(data.schedule_month), 10) || (now.getMonth() + 1);
    const title = document.querySelector('[data-calendar-title]');
    if (title) title.textContent = year + '년 ' + month + '월';

    const first = new Date(year, month - 1, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const days = new Date(year, month, 0).getDate();
    const isThisMonth = now.getFullYear() === year && now.getMonth() + 1 === month;

    grids.forEach((grid) => {
      const calendar = grid.dataset.calendar;
      const byDay = {};
      (events || []).forEach((row) => {
        if (txt(row.calendar) !== calendar) return;
        const date = txt(row.event_date).slice(0, 10).split('-');
        if (Number(date[0]) !== year || Number(date[1]) !== month) return;
        const day = Number(date[2]);
        (byDay[day] = byDay[day] || []).push(row);
      });
      let cells = WEEKDAYS.map((w) => '<div class="calendar-weekday">' + w + '</div>').join('');
      for (let i = 0; i < startOffset; i += 1) {
        cells += '<div class="calendar-day calendar-day--muted" aria-hidden="true"></div>';
      }
      for (let day = 1; day <= days; day += 1) {
        const today = isThisMonth && now.getDate() === day ? ' calendar-day--today' : '';
        const marks = (byDay[day] || []).map((row) => '<span class="calendar-event calendar-event--'
          + esc(txt(row.kind) || 'waiting') + '">' + esc(txt(row.label)) + '</span>').join('');
        cells += '<div class="calendar-day' + today + '"><span class="calendar-day__number">' + day + '</span>'
          + marks + '</div>';
      }
      const tail = (7 - ((startOffset + days) % 7)) % 7;
      for (let i = 0; i < tail; i += 1) {
        cells += '<div class="calendar-day calendar-day--muted" aria-hidden="true"></div>';
      }
      grid.innerHTML = cells;
    });
  }

  /* --------------------------------------------------------------- lists */
  function fill(selector, html) {
    const node = document.querySelector(selector);
    if (node) node.innerHTML = html;
    return node;
  }

  /* A section with nothing left in it is hidden rather than shown as a bare heading. */
  function hideEmptySection(selector) {
    const node = document.querySelector(selector);
    if (!node) return;
    const section = node.closest('section');
    if (section) section.classList.toggle('is-empty', node.children.length === 0);
  }

  function renderLists(data, sets) {
    const portfolio = sets.portfolio_items;

    const ratio = txt(data.portfolio_ratio).trim();
    const portfolioGrid = document.querySelector('[data-list="portfolio_items"]');
    if (ratio && portfolioGrid) portfolioGrid.style.setProperty('--card-ratio', ratio);

    if (portfolio) {
      if (portfolioGrid) portfolioGrid.innerHTML = portfolio.map((row) => portfolioCard(row, 'h2')).join('');
      hideEmptySection('[data-list="portfolio_items"]');
      const featured = document.querySelector('[data-list="featured"]');
      if (featured) {
        const picked = portfolio.filter((row) => row.featured).slice(0, 5);
        const rows = picked.length ? picked : portfolio.slice(0, 5);
        featured.innerHTML = rows.map(workCard).join('');
        hideEmptySection('[data-list="featured"]');
      }
      if (portfolio.length) {
        document.querySelectorAll('[data-subnav]').forEach((list) => {
          list.innerHTML = portfolio.map((row) => '<li><a href="portfolio.html#' + esc(txt(row.anchor))
            + '">' + esc(txt(row.title)) + '</a></li>').join('');
        });
      } else {
        document.querySelectorAll('[data-subnav]').forEach((list) => list.remove());
        document.querySelectorAll('.site-nav__link--has-menu')
          .forEach((link) => link.classList.remove('site-nav__link--has-menu'));
      }
    }

    if (sets.collab_artists) {
      fill('[data-list="collab_artists"]', sets.collab_artists.map(collabCard).join(''));
      hideEmptySection('[data-list="collab_artists"]');
    }

    if (sets.price_packages) {
      fill('[data-list="price_packages"]', sets.price_packages.map(priceCard).join(''));
      hideEmptySection('[data-list="price_packages"]');
    }

    if (sets.price_options) {
      /* Rows carrying the same group label get one sub heading above them. */
      let current = null;
      const rows = sets.price_options.map((row) => {
        const group = txt(row.group_label).trim();
        let head = '';
        if (group && group !== current) {
          head = '<tr class="option-group"><th colspan="3" scope="colgroup">' + esc(group) + '</th></tr>';
        }
        current = group || current;
        return head + '<tr><td>' + esc(txt(row.name)) + '</td><td>' + esc(txt(row.amount))
          + '</td><td>' + multiline(txt(row.note)) + '</td></tr>';
      }).join('');
      fill('[data-list="price_options"]', rows);
      hideEmptySection('[data-list="price_options"]');
    }

    if (sets.commission_steps) {
      fill('[data-list="commission_steps"]', sets.commission_steps.map((row, i) => '<li class="flow-step" data-step="'
        + (i + 1 < 10 ? '0' : '') + (i + 1) + '"><span class="flow-step__title">' + esc(txt(row.title))
        + '</span></li>').join(''));
      hideEmptySection('[data-list="commission_steps"]');
    }

    if (sets.commission_notices) {
      fill('[data-list="commission_notices"]', sets.commission_notices.map((row, i) => '<article class="notice-card">'
        + '<span class="notice-card__number">' + (i + 1 < 10 ? '0' : '') + (i + 1) + '</span>'
        + '<h3 class="notice-card__title">' + esc(txt(row.title)) + '</h3>'
        + '<p class="notice-card__copy">' + multiline(txt(row.content)) + '</p></article>').join(''));
      hideEmptySection('[data-list="commission_notices"]');
    }

    if (sets.inquiry_forms) {
      fill('[data-list="inquiry_forms"]', inquiryForms(sets.inquiry_forms, data));
      const shell = document.querySelector('.inquiry-shell');
      if (shell) shell.classList.toggle('is-empty', sets.inquiry_forms.length === 0);
      if (!sets.inquiry_forms.length) hideEmptySection('[data-list="inquiry_forms"]');
    }

    if (sets.notice_posts) {
      const list = document.querySelector('[data-list="notice_posts"]');
      if (list) {
        /* Pinned posts jump to the front; the rest keep the admin order. */
        const rows = sets.notice_posts.slice().sort((a, b) => {
          const pa = (a.pinned === true || a.pinned === 'true') ? 0 : 1;
          const pb = (b.pinned === true || b.pinned === 'true') ? 0 : 1;
          return pa - pb;
        });
        list.innerHTML = rows.length
          ? rows.map(noticePost).join('')
          : '<p class="notice-empty">' + esc(txt(data.notice_empty).trim() || '등록된 공지가 없습니다.') + '</p>';
      }
    }

    if (sets.faq_items) {
      const list = document.querySelector('[data-list="faq_items"]');
      if (list) {
        list.innerHTML = sets.faq_items.map((row) => '<details class="faq-item" data-faq-item><summary>'
          + esc(txt(row.question)) + '</summary><div class="faq-answer">' + multiline(txt(row.answer))
          + '</div></details>').join('')
          + '<p class="faq-empty" data-faq-empty hidden>검색 결과가 없습니다. 다른 단어로 검색해보세요.</p>';
        const count = document.querySelector('[data-faq-count]');
        if (count) count.textContent = sets.faq_items.length + '개';
      }
    }

    const shopGrid = document.querySelector('[data-list="shop_items"]');
    if (shopGrid && sets.shop_items) {
      const items = sets.shop_items;
      const empty = document.querySelector('[data-shop-empty]');
      shopGrid.innerHTML = items.map(shopCard).join('');
      shopGrid.classList.toggle('is-empty', items.length === 0);
      if (empty) empty.classList.toggle('is-empty', items.length > 0);
    }

    const flow = document.querySelector('[data-list="home_flow"]');
    if (flow) {
      const steps = lines(data.home_flow);
      if (steps.length) {
        flow.innerHTML = steps.map((step, i) => '<div class="mini-flow__item"><span class="mini-flow__number">'
          + (i + 1 < 10 ? '0' : '') + (i + 1) + '</span><span class="mini-flow__label">' + esc(step)
          + '</span></div>').join('');
      }
    }

    const tags = document.querySelector('[data-list="profile_tags"]');
    if (tags) {
      const values = txt(data.profile_tags).replace(/\n/g, ',').split(',')
        .map((t) => t.trim()).filter(Boolean);
      if (values.length) tags.innerHTML = values.map((t) => '<li class="tag">' + esc(t) + '</li>').join('');
      tags.classList.toggle('is-empty', values.length === 0);
    }

    const upcoming = document.querySelector('[data-list="schedule_upcoming"]');
    if (upcoming) {
      const title = txt(data.schedule_upcoming_title).trim();
      const rows = lines(data.schedule_upcoming);
      if (Object.prototype.hasOwnProperty.call(data, 'schedule_upcoming_title')) {
        upcoming.classList.toggle('is-empty', !title && !rows.length);
      }
      if (title || rows.length) {
        upcoming.innerHTML = '<strong>' + esc(title) + '</strong>'
          + rows.map((row) => '<span>' + esc(row) + '</span>').join('');
      }
    }
  }

  /* Top strip: custom text wins, otherwise the closed notice stands in for it. */
  function applyBanner(data) {
    const bar = document.querySelector('[data-notice-bar]');
    if (!bar) return;
    const closed = txt(data.intake_state).trim() === 'closed';
    const text = txt(data.banner_text).trim()
      || (closed ? txt(data.intake_closed_title).trim() : '');
    if (!text) { bar.hidden = true; return; }
    bar.querySelector('[data-notice-text]').textContent = text;
    const link = bar.querySelector('[data-notice-link]');
    const label = txt(data.banner_link_label).trim();
    const url = txt(data.banner_link_url).trim();
    if (link) {
      link.hidden = !(label && url);
      if (label && url) { link.textContent = label; link.setAttribute('href', url); }
    }
    bar.hidden = false;
  }

  /* While intake is closed the form never opens; a notice takes its place. */
  function applyIntake(data) {
    if (txt(data.intake_state).trim() !== 'closed') return;
    const shell = document.querySelector('.inquiry-shell');
    if (!shell) return;
    const title = txt(data.intake_closed_title).trim() || '지금은 신청을 받지 않습니다';
    const copy = txt(data.intake_closed_copy).trim();
    const box = document.createElement('div');
    box.className = 'intake-closed';
    box.innerHTML = '<h3 class="intake-closed__title">' + esc(title) + '</h3>'
      + (copy ? '<p class="intake-closed__copy">' + multiline(copy) + '</p>' : '');
    shell.replaceWith(box);
  }

  /* The hash target is rebuilt after load, so the jump is repeated here. */
  function focusHash() {
    const id = decodeURIComponent((location.hash || '').slice(1));
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    if (target.classList.contains('portfolio-card')) {
      const all = document.querySelector('[data-filter-group] [data-filter="all"]');
      if (all && !all.classList.contains('is-active')) all.click();
    }
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start' });
      target.classList.add('is-target');
      setTimeout(() => target.classList.remove('is-target'), 2400);
    });
  }

  /* ----------------------------------------------------------------- run */
  async function load() {
    if (typeof fetchContent !== 'function' || !db) { markReady(); return; }
    try {
      const [content, portfolio, collab, packages, options, steps, notices, forms, faq, posts, events, shop] =
        await Promise.all([
          fetchContent(),
          fetchAll('portfolio_items', { order: 'sort_order' }),
          fetchAll('collab_artists', { order: 'sort_order' }),
          fetchAll('price_packages', { order: 'sort_order' }),
          fetchAll('price_options', { order: 'sort_order' }),
          fetchAll('commission_steps', { order: 'sort_order' }),
          fetchAll('commission_notices', { order: 'sort_order' }),
          fetchAll('inquiry_forms', { order: 'sort_order' }),
          fetchAll('faq_items', { order: 'sort_order' }),
          fetchAll('notice_posts', { order: 'sort_order' }),
          fetchAll('schedule_events', { order: 'event_date' }),
          fetchAll('shop_items', { order: 'sort_order' })
        ]);
      const data = content || {};
      applyTheme(data);
      applyHooks(data);
      applyToday(data);
      renderFilters(data);
      renderLists(data, {
        portfolio_items: portfolio, collab_artists: collab, price_packages: packages,
        price_options: options, commission_steps: steps, commission_notices: notices,
        inquiry_forms: forms, faq_items: faq, notice_posts: posts, shop_items: shop
      });
      renderCalendars(data, events);
      applyBanner(data);
      applyIntake(data);
      if (txt(data.inquiry_send_on).trim() === 'off') {
        document.querySelectorAll('[data-inquiry-send]').forEach((box) => box.remove());
      }
      window.SITE_CONTENT = data;
      document.dispatchEvent(new CustomEvent('content:ready', { detail: data }));
      focusHash();
    } catch (err) {
      console.warn('content load', err);
    }
    markReady();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
