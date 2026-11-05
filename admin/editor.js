
(() => {
  "use strict";

  const S = window.SITE_SCHEMA;
  const gate = document.getElementById('inabGate');
  const shell = document.getElementById('inabShell');
  const errorBox = document.getElementById('inabError');
  const stateBox = document.getElementById('inabState');

  let content = {};
  let sets = {};
  const failed = new Set();
  let dirty = false;
  // One library, one Storage object per original file. Picking a file reuses its URL.
  let mediaAssets = [];
  let mediaLoaded = false;
  let mediaError = '';
  let mediaSearch = '';
  let mediaCategory = '';
  let mediaSelected = '';
  let mediaBusy = false;
  let mediaPickerTarget = null;
  let mediaPickerFocus = null;
  const pendingDeletes = [];
  const scheduleDayPrivate = new Map();

  function mediaType(url, mime) {
    return /^video\//.test(mime || '') || /\.(mp4|webm|mov)(?:[?#]|$)/i.test(url || '') ? 'video' : 'image';
  }
  function mediaPreview(url, name, mime, controls) {
    const src = esc(resolvePath(url));
    if (!url) return '<span aria-hidden="true">＋</span>';
    if (mediaType(url, mime) === 'video') return '<video src="' + src + '" preload="metadata" muted playsinline' + (controls ? ' controls' : '') + ' aria-label="' + esc(name || '영상') + '"></video>';
    return '<img src="' + src + '" loading="lazy" decoding="async" alt="' + esc(name || '') + '" referrerpolicy="no-referrer">';
  }
  function mediaName(url) {
    try { return decodeURIComponent(String(url).split('/').pop().split('?')[0]) || '사진'; } catch (_) { return '사진'; }
  }
  function referencedMedia() {
    const found = new Map();
    const add = (url, name, usage) => {
      const value = txt(url).trim();
      if (!value || !/^(https?:\/\/|assets\/|\/)/i.test(value)) return;
      if (!found.has(value)) found.set(value, { id: 'ref:' + value, url: value, name: name || mediaName(value), category: '', tags: '', mime_type: '', _reference: true, _usage: [] });
      if (usage) found.get(value)._usage.push(usage);
    };
    S.CONTENT_TABS.forEach((tab) => tab.cards.forEach((card) => card.fields.forEach((field) => {
      if (field.type === 'image' || field.type === 'gallery') txt(content[field.key]).split('\n').forEach((url) => add(url, mediaName(url), tab.label + ' · ' + field.label));
    })));
    Object.keys(S.COLLECTIONS).forEach((name) => (sets[name] || []).forEach((row, index) => {
      const label = S.COLLECTIONS[name].label + ' · ' + (row.title || row.name || index + 1);
      S.COLLECTIONS[name].fields.forEach((field) => {
        if (field.type === 'image' || field.type === 'gallery') txt(row[field.key]).split('\n').forEach((url) => add(url, mediaName(url), label));
      });
      if (row.image_url) add(row.image_url, mediaName(row.image_url), label);
    }));
    return found;
  }
  function allMedia() {
    const refs = referencedMedia();
    const list = mediaAssets.map((asset) => Object.assign({}, asset, { _usage: (refs.get(asset.url) || {})._usage || [] }));
    refs.forEach((asset, url) => { if (!list.some((item) => item.url === url)) list.push(asset); });
    return list;
  }
  function libraryMarkup() {
    return '<div class="card"><div class="card__title"><span>사진 · GIF · 영상 보관함</span>'
      + '<label class="btn btn--primary btn--sm" for="mediaUpload">＋ 파일 올리기</label><input type="file" id="mediaUpload" multiple accept="image/*,video/mp4,video/webm" hidden></div>'
      + '<p class="card__where">원본 파일을 한 번 올린 뒤, 포트폴리오와 사이트의 사진 칸에서 다시 선택할 수 있습니다. GIF 움직임과 이미지 원본을 유지합니다.</p>'
      + '<p class="media-progress" id="mediaProgress" role="status"></p><div id="mediaLibraryBody"></div></div>';
  }
  function filteredMedia() {
    const query = mediaSearch.trim().toLocaleLowerCase();
    return allMedia().filter((asset) => (!mediaCategory || txt(asset.category) === mediaCategory)
      && (!query || [asset.name, asset.category, asset.tags].join(' ').toLocaleLowerCase().includes(query)));
  }
  function mediaCards(list, picker) {
    return list.map((asset) => '<button type="button" class="media-card' + (asset.id === mediaSelected ? ' is-active' : '')
      + '" ' + (picker ? 'data-media-pick' : 'data-media-edit') + '="' + esc(asset.id) + '"><span class="media-card__preview">'
      + mediaPreview(asset.url, asset.name, asset.mime_type) + '</span><strong>' + esc(asset.name) + '</strong><small>'
      + esc(asset.category || (asset._reference ? '현재 사이트에서 사용 중' : (mediaType(asset.url, asset.mime_type) === 'video' ? '영상' : '사진')))
      + '</small></button>').join('');
  }
  function mediaToolsMarkup(picker) {
    const categories = [...new Set(allMedia().map((asset) => txt(asset.category).trim()).filter(Boolean))];
    return '<div class="media-tools"><input type="search" data-media-search value="' + esc(mediaSearch) + '" placeholder="사진 이름 · 태그 검색" aria-label="사진 이름과 태그 검색">'
      + '<select data-media-filter aria-label="사진 분류"><option value="">전체 분류</option>'
      + categories.map((value) => '<option' + (value === mediaCategory ? ' selected' : '') + '>' + esc(value) + '</option>').join('') + '</select>'
      + (picker ? '<label class="btn btn--sm" for="mediaPickerUpload">＋ 새 파일 올리기</label><input type="file" id="mediaPickerUpload" multiple accept="image/*,video/mp4,video/webm" hidden>' : '') + '</div>';
  }
  function renderMediaLibrary() {
    const host = document.getElementById('mediaLibraryBody');
    if (!host) return;
    const asset = allMedia().find((item) => item.id === mediaSelected);
    const detail = asset ? '<div class="media-editor"><div class="media-editor__preview">' + mediaPreview(asset.url, asset.name, asset.mime_type, true) + '</div>'
      + '<div class="grid"><label class="field field--full">파일 이름<input id="mediaName" type="text" value="' + esc(asset.name) + '"></label>'
      + '<label class="field">분류<input id="mediaCategory" type="text" value="' + esc(asset.category) + '"></label><label class="field">태그<input id="mediaTags" type="text" value="' + esc(asset.tags) + '"></label></div>'
      + '<div class="media-usage"><strong>이 사진 사용처</strong>' + (asset._usage.length ? '<ul>' + [...new Set(asset._usage)].map((usage) => '<li>' + esc(usage) + '</li>').join('') + '</ul>' : '<p>현재 페이지에서 사용하지 않는 파일입니다.</p>') + '</div>'
      + '<button type="button" class="btn btn--sm btn--primary" data-media-save="' + esc(asset.id) + '">' + (asset._reference ? '보관함에 등록' : '파일 정보 저장') + '</button>'
      + '<p class="help">사진을 보관함에 등록하거나 이름을 바꿔도 이미 사용 중인 사진 주소는 유지됩니다.</p></div>' : '';
    host.innerHTML = (mediaError ? '<p class="alarm">보관함을 불러오지 못했습니다. ' + esc(mediaError) + '</p>' : '')
      + mediaToolsMarkup(false) + detail + '<p class="help">' + filteredMedia().length + '개 파일</p><div class="media-grid" id="mediaGrid">'
      + mediaCards(filteredMedia(), false) + '</div>';
  }
  async function loadMediaLibrary() {
    if (!db) return false;
    try {
      const { data, error } = await db.from('media_assets').select('*').order('created_at', { ascending: false });
      if (error || !Array.isArray(data)) throw error || new Error('사진 보관함 응답을 확인할 수 없습니다.');
      mediaAssets = data; mediaLoaded = true; mediaError = ''; failed.delete('media_assets');
    } catch (error) { mediaError = error.message || String(error); failed.add('media_assets'); }
    renderMediaLibrary();
    return !mediaError;
  }
  function openMediaPicker(targetId) {
    syncFromInputs();
    mediaPickerTarget = targetId;
    mediaPickerFocus = document.activeElement;
    let dialog = document.getElementById('mediaPicker');
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.id = 'mediaPicker'; dialog.className = 'media-dialog';
      dialog.addEventListener('close', () => { mediaPickerTarget = null; if (mediaPickerFocus && mediaPickerFocus.isConnected) mediaPickerFocus.focus(); });
      dialog.addEventListener('click', (event) => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
      document.body.appendChild(dialog);
    }
    mediaSearch = ''; mediaCategory = '';
    renderMediaPicker(); dialog.showModal();
  }
  function renderMediaPicker() {
    const dialog = document.getElementById('mediaPicker'); if (!dialog) return;
    const imagesOnly = !document.getElementById(mediaPickerTarget)?.closest('[data-gal]');
    dialog.innerHTML = '<div class="media-dialog__head"><h2>보관함에서 사진 · 영상 선택</h2><button type="button" class="btn btn--sm" data-media-close aria-label="닫기">닫기 ✕</button></div>'
      + '<div class="media-dialog__body">' + (imagesOnly ? '<p class="help">이 칸은 사진·GIF만 사용할 수 있습니다. 영상은 사진·영상 갤러리에서 선택해 주세요.</p>' : '')
      + (mediaError ? '<p class="alarm">보관함을 불러오지 못했습니다. ' + esc(mediaError) + '</p>' : '')
      + mediaToolsMarkup(true) + '<p class="media-progress" id="mediaPickerProgress" role="status"></p>'
      + '<div class="media-grid" id="mediaPickerGrid">' + mediaCards(filteredMedia(), true) + '</div>'
      + (!filteredMedia().length ? '<p class="media-picker-empty">해당하는 파일이 없습니다. 새 파일을 올려주세요.</p>' : '') + '</div>';
  }
  function chooseMedia(url, mime) {
    const target = document.getElementById(mediaPickerTarget); if (!target) return;
    const wrap = target.closest('[data-gal]');
    if (!wrap && mediaType(url, mime) === 'video') { toast('이 칸에는 사진이나 GIF를 선택해 주세요. 영상은 포트폴리오 사진·영상 칸에서 사용할 수 있습니다.'); return; }
    if (wrap) {
      const list = galList(wrap); const index = Number(wrap.dataset.index || 0);
      if (list.length) list[index] = url; else list.push(url);
      galWrite(wrap, list); galPaint(wrap);
    } else { target.value = url; refreshThumbs(); }
    markDirty(); document.getElementById('mediaPicker').close();
  }
  async function uploadOriginal(file) {
    if (!/^image\/(png|jpeg|gif|webp|avif|apng)$/.test(file.type) && !/^video\/(mp4|webm)$/.test(file.type)) throw new Error('PNG · JPG · GIF · WEBP · AVIF · MP4 · WEBM 파일을 선택해 주세요.');
    if (file.size > 50 * 1024 * 1024) throw new Error('파일 하나당 최대 50MB입니다.');
    const uuid = crypto.randomUUID(); const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = 'media/' + uuid + '.' + ext;
    const { error } = await db.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data: publicData } = db.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    const asset = { id: uuid, name: file.name, url: publicData.publicUrl, storage_path: path, mime_type: file.type, size_bytes: file.size, category: '', tags: '' };
    const { data, error: metadataError } = await db.from('media_assets').insert(asset).select().single();
    if (metadataError || !data) throw new Error('원본 파일은 올라갔지만 보관함 등록에 실패했습니다: ' + (metadataError?.message || '등록된 항목을 확인할 수 없습니다.'));
    mediaAssets.unshift(data); return data;
  }
  async function uploadMediaBatch(files, targetId) {
    if (mediaBusy) return;
    mediaBusy = true;
    const progress = document.getElementById(targetId || 'mediaProgress'); let uploaded = 0;
    try {
      for (const file of files) {
        if (progress) progress.textContent = (uploaded + 1) + ' / ' + files.length + ' · ' + file.name + ' 올리는 중';
        await uploadOriginal(file); uploaded += 1;
      }
      if (progress) progress.textContent = uploaded + '개 원본 파일을 보관함에 올렸습니다.';
      renderMediaLibrary(); if (document.getElementById('mediaPicker')?.open) renderMediaPicker();
      toast(uploaded + '개 파일을 보관함에 올렸습니다.');
    } catch (error) { if (progress) progress.textContent = uploaded + '개 업로드 완료 · ' + error.message; toast(error.message); }
    finally { mediaBusy = false; }
  }
  async function saveMediaMetadata(id) {
    const asset = allMedia().find((item) => item.id === id); if (!asset) return;
    const patch = { name: document.getElementById('mediaName').value.trim() || mediaName(asset.url), category: document.getElementById('mediaCategory').value.trim(), tags: document.getElementById('mediaTags').value.trim() };
    const result = asset._reference ? await db.from('media_assets').insert(Object.assign({ url: asset.url, mime_type: asset.mime_type || '' }, patch)).select().single()
      : await db.from('media_assets').update(patch).eq('id', asset.id).select().single();
    if (result.error || !result.data) { toast('저장 실패: ' + (result.error?.message || '저장된 항목을 확인할 수 없습니다.')); return; }
    mediaSelected = result.data.id;
    const loaded = await loadMediaLibrary();
    toast(loaded ? '파일 정보를 저장했습니다.' : '파일 정보는 저장됐지만 목록을 다시 불러오지 못했습니다. ' + mediaError, 6000);
  }

  let portfolioSelected = '';
  function portfolioRowFields(row, index) {
    return S.COLLECTIONS.portfolio_items.fields.map((field) => {
      if (field.key === 'tag') {
        const options = (categories('portfolio_items') || []).map((cat) => [cat.slug, cat.label]);
        if (row.tag && !options.some((item) => item[0] === row.tag)) options.push([row.tag, row.tag]);
        return fieldHtml(Object.assign({}, field, { type: 'select', options: [['', '분류 선택']].concat(options) }), row.tag, 'portfolio_items_' + index + '_');
      }
      return fieldHtml(field, row[field.key], 'portfolio_items_' + index + '_');
    }).join('');
  }
  function renderPortfolioEditor() {
    const wrap = document.getElementById('col-portfolio_items'); if (!wrap) return;
    const rows = sets.portfolio_items || [], cats = categories('portfolio_items') || [], filter = colFilter.portfolio_items || 'all';
    const visible = rows.map((row, index) => ({ row, index })).filter(({row}) => filter === 'all' || (filter === '__none' ? !cats.some((cat) => cat.slug === row.tag) : row.tag === filter));
    let selected = visible.find(({row}) => rowUid(row) === portfolioSelected) || visible[0];
    if (selected) portfolioSelected = rowUid(selected.row);
    const sidebar = visible.map(({row,index}) => '<button type="button" class="editor-item' + (rowUid(row) === portfolioSelected ? ' is-active' : '') + '" data-portfolio-select="' + rowUid(row) + '">'
      + mediaPreview(txt(row.images || row.image_url).split('\n')[0], row.title) + '<span>' + esc(row.title || '이름 없는 작업') + '<small>' + esc((cats.find((cat) => cat.slug === row.tag) || {}).label || row.tag || '분류 없음') + '</small></span></button>').join('');
    const detail = selected ? '<div class="editor-detail"><div class="editor-toolbar"><p>' + (selected.index + 1) + ' / ' + rows.length + ' · 추가 순서대로 표시</p>'
      + '<button class="btn btn--sm" type="button" data-move="portfolio_items" data-dir="-1" data-index="' + selected.index + '"' + (!selected.index ? ' disabled' : '') + '>위로 ↑</button>'
      + '<button class="btn btn--sm" type="button" data-move="portfolio_items" data-dir="1" data-index="' + selected.index + '"' + (selected.index === rows.length - 1 ? ' disabled' : '') + '>아래로 ↓</button>'
      + '<button class="btn btn--sm" type="button" data-portfolio-duplicate="' + selected.index + '">복제</button>'
      + '<button class="btn btn--sm" type="button" data-remove="portfolio_items" data-index="' + selected.index + '">삭제</button></div>'
      + '<div class="row" data-row="portfolio_items" data-index="' + selected.index + '" data-uid="' + rowUid(selected.row) + '"><div class="grid">' + portfolioRowFields(selected.row, selected.index) + '</div></div></div>'
      : '<p class="empty">이 분류에 등록된 작업이 없습니다. 새로 추가해 주세요.</p>';
    wrap.innerHTML = categoryBar('portfolio_items', rows) + '<div class="editor-category-add"><input id="newPortfolioCategory" type="text" placeholder="새 분류 이름" aria-label="새 포트폴리오 분류"><button class="btn btn--sm" type="button" data-portfolio-category-add>＋ 분류 추가</button></div>'
      + '<div class="editor-workspace"><div class="editor-list" aria-label="포트폴리오 목록">' + sidebar + '</div>' + detail + '</div>';
    galPaintAll(); refreshThumbs();
  }

  async function revisionClick(event) {
    const target = event.target;
    const pick = target.closest('[data-media-open]'); if (pick) { openMediaPicker(pick.dataset.mediaOpen); return true; }
    if (target.closest('[data-media-close]')) { document.getElementById('mediaPicker').close(); return true; }
    const choice = target.closest('[data-media-pick]'); if (choice) { const asset=allMedia().find((item)=>item.id===choice.dataset.mediaPick); if(asset) chooseMedia(asset.url, asset.mime_type); return true; }
    const mediaEdit = target.closest('[data-media-edit]'); if(mediaEdit){ mediaSelected=mediaEdit.dataset.mediaEdit; renderMediaLibrary(); return true; }
    const mediaSave = target.closest('[data-media-save]'); if(mediaSave){ mediaSave.disabled=true; try{await saveMediaMetadata(mediaSave.dataset.mediaSave);}catch(error){toast('파일 정보 저장 실패: '+error.message,6000);}finally{mediaSave.disabled=false;} return true; }
    const selected = target.closest('[data-portfolio-select]'); if(selected){ syncFromInputs(); portfolioSelected=selected.dataset.portfolioSelect; renderPortfolioEditor(); return true; }
    const duplicate = target.closest('[data-portfolio-duplicate]'); if(duplicate){
      syncFromInputs(); const original=sets.portfolio_items[Number(duplicate.dataset.portfolioDuplicate)]; if(!original)return true;
      const copy=JSON.parse(JSON.stringify(original)); delete copy.id; delete copy._uid; delete copy.created_at; delete copy.updated_at; delete copy.client_display;
      copy.anchor=txt(copy.anchor) ? txt(copy.anchor)+'-copy-'+Date.now().toString(36) : '';
      sets.portfolio_items.unshift(copy); portfolioSelected=rowUid(copy); renumber('portfolio_items'); renderPortfolioEditor(); markDirty(); toast('작업을 복제했습니다. 내용을 확인한 뒤 저장해 주세요.'); return true;
    }
    if(target.closest('[data-portfolio-category-add]')){
      const input=document.getElementById('newPortfolioCategory'), label=input.value.trim(); if(!label){input.focus();return true;}
      syncFromInputs(); const cats=categories('portfolio_items')||[]; if(cats.some((cat)=>cat.label===label)){toast('이미 있는 분류입니다.');return true;}
      const slug='category-'+Date.now().toString(36); const raw=txt(content.portfolio_cats).trim(); content.portfolio_cats=(raw?raw+'\n':'')+slug+' | '+label;
      const existing=document.getElementById('c_portfolio_cats'); if(existing)existing.value=content.portfolio_cats;
      colFilter.portfolio_items=slug; renderPortfolioEditor(); markDirty(); return true;
    }
    if(target.closest('[data-day-status-apply]')){setDayState(cal.days,document.querySelector('[data-day-status-bulk]').value);return true;}
    if(target.closest('[data-slot-add]')){
      const slots=Array.isArray(content.schedule_slots)?content.schedule_slots:[]; slots.push({month:calDate(cal.year,cal.month,1).slice(0,7),calendar:cal.calendar,capacity:0,booked:0,state:'open',note:''}); content.schedule_slots=slots;markDirty();renderCalendar();return true;
    }
    const slotRemove=target.closest('[data-slot-remove]');if(slotRemove){content.schedule_slots.splice(Number(slotRemove.dataset.slotRemove),1);markDirty();renderCalendar();return true;}
    return false;
  }
  function revisionInput(target) {
    if(target.matches('[data-media-search]')){
      mediaSearch=target.value; const picker=!!target.closest('#mediaPicker');
      const grid=document.getElementById(picker?'mediaPickerGrid':'mediaGrid');if(grid)grid.innerHTML=mediaCards(filteredMedia(),picker);return true;
    }
    if(target.matches('[data-media-filter]')){mediaCategory=target.value;const picker=!!target.closest('#mediaPicker');const grid=document.getElementById(picker?'mediaPickerGrid':'mediaGrid');if(grid)grid.innerHTML=mediaCards(filteredMedia(),picker);return true;}
    if(target.matches('[data-cal-month],[data-day-status]')) return true;
    if(target.id==='mediaName'||target.id==='mediaCategory'||target.id==='mediaTags'||target.id==='newPortfolioCategory'||target.matches('[data-bulk-label],[data-bulk-kind],[data-day-status-bulk]')) return true;
    if(target.matches('[data-day-memo]')){
      const key=cal.calendar+':'+target.dataset.dayMemo; scheduleDayPrivate.set(key,{calendar:cal.calendar,event_date:target.dataset.dayMemo,private_memo:target.value,_dirty:true});markDirty();return true;
    }
    if(target.matches('[data-schedule-setting]')){content[target.dataset.scheduleSetting]=target.type==='checkbox'?target.checked:target.value;markDirty();return true;}
    if(target.matches('[data-slot-key]')){const slot=content.schedule_slots?.[Number(target.dataset.slotIndex)];if(slot){slot[target.dataset.slotKey]=target.type==='number'?Math.max(0,Number(target.value)||0):target.value;markDirty();}return true;}
    return false;
  }
  async function revisionChange(target) {
    if(target.id==='mediaUpload'||target.id==='mediaPickerUpload'){
      const files=Array.from(target.files||[]);target.value='';await uploadMediaBatch(files,target.id==='mediaPickerUpload'?'mediaPickerProgress':'mediaProgress');return true;
    }
    if(target.matches('[data-cal-month]')){if(/^\d{4}-\d{2}$/.test(target.value)){cal.year=Number(target.value.slice(0,4));cal.month=Number(target.value.slice(5,7));cal.days=[];cal.anchor=null;renderCalendar();}return true;}
    if(target.matches('[data-day-status]')){setDayState([target.dataset.dayStatus],target.value);return true;}
    if(target.matches('[data-schedule-setting="schedule_sunday_off"]')){content.schedule_sunday_off=target.checked;markDirty();renderCalendar();return true;}
    return revisionInput(target);
  }


  /* ------------------------------------------------------------- helpers */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function txt(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.join('\n');
    if (typeof value === 'object') return '';
    return String(value);
  }

  function toast(message) {
    const box = document.getElementById('toast');
    box.textContent = message;
    box.classList.add('is-on');
    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.classList.remove('is-on'), 2400);
  }

  function markDirty() {
    dirty = true;
    stateBox.textContent = '저장하지 않은 변경이 있습니다';
    stateBox.classList.add('is-dirty');
  }

  function markClean(message) {
    dirty = false;
    stateBox.textContent = message || '모든 변경이 저장되었습니다';
    stateBox.classList.remove('is-dirty');
  }

  window.addEventListener('beforeunload', (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  /* ------------------------------------------------------------- inputs */
  function inputHtml(field, value, idPrefix) {
    const id = idPrefix + field.key;
    const val = txt(value);
    if (field.type === 'textarea') {
      return '<textarea id="' + id + '" rows="' + (field.rows || 4) + '">' + esc(val) + '</textarea>';
    }
    if (field.type === 'select') {
      const options = (field.options || []).map((option) => {
        const v = option[0];
        return '<option value="' + esc(v) + '"' + (val === v ? ' selected' : '') + '>' + esc(option[1]) + '</option>';
      }).join('');
      const legacy = val && !(field.options || []).some((option) => option[0] === val) ? '<option value="' + esc(val) + '" selected>' + esc(val) + '</option>' : '';
      return '<select id="' + id + '">' + legacy + options + '</select>';
    }
    if (field.type === 'checkbox') {
      return '<input type="checkbox" id="' + id + '"' + (value ? ' checked' : '') + '>';
    }
    if (field.type === 'number') {
      return '<input type="number" id="' + id + '" value="' + esc(val) + '">';
    }
    if (field.type === 'date') {
      return '<input type="date" id="' + id + '" value="' + esc(val.slice(0, 10)) + '">';
    }
    if (field.type === 'gallery') {
      const ratio = field.ratio || '4 / 3';
      return '<div class="imgbox" data-gal="' + id + '">'
        + '<input type="hidden" id="' + id + '" value="' + esc(val) + '">'
        + '<div class="imgbox__frame" style="aspect-ratio:' + ratio + '">'
        + '<img data-gal-img alt=""><span class="imgbox__tag" data-gal-tag></span></div>'
        + '<div class="imgbox__side">'
        + '<div class="gal__nav">'
        + '<button class="gal__step" type="button" data-gal-step="-1" aria-label="이전 사진">‹</button>'
        + '<span class="gal__pos" data-gal-pos>0 / 0</span>'
        + '<button class="gal__step" type="button" data-gal-step="1" aria-label="다음 사진">›</button>'
        + '</div>'
        + '<input type="text" data-gal-url placeholder="사진을 올리거나 주소를 붙여넣으세요">'
        + '<div class="imgbox__row">'
        + '<button class="btn btn--sm btn--primary" type="button" data-media-open="' + id + '">보관함에서 선택</button>'
        + '<label class="btn btn--sm" for="up_' + id + '">새 파일 올리기</label>'
        + '<input type="file" id="up_' + id + '" accept="image/*,video/mp4,video/webm" data-upload-for="' + id + '" data-upload-gal hidden>'
        + '<button class="btn btn--sm" type="button" data-gal-add>＋ 사진 추가</button>'
        + '<button class="btn btn--sm" type="button" data-gal-del>이 사진 삭제</button>'
        + '<span class="imgbox__state" data-state-for="' + id + '"></span></div>'
        + '<div class="imgbox__spec"><b>규격</b> ' + esc(field.spec || '')
        + '<br>여러 장이면 첫 장이 카드에 나오고, 방문자는 확대 화면에서 ‹ › 로 넘겨봅니다.'
        + ' GIF·움직이는 WEBP 는 압축 없이 그대로 올라갑니다.</div>'
        + '</div></div>';
    }
    if (field.type === 'image') {
      const ratio = field.ratio || '4 / 3';
      const fallback = field.fallback || '';
      return '<div class="imgbox">'
        + '<div class="imgbox__frame" style="aspect-ratio:' + ratio + '">'
        + '<img data-thumb-for="' + id + '" data-fallback="' + esc(fallback) + '" alt="">'
        + '<span class="imgbox__tag" data-tag-for="' + id + '"></span></div>'
        + '<div class="imgbox__side">'
        + '<div class="imgbox__row">'
        + '<button class="btn btn--sm btn--primary" type="button" data-media-open="' + id + '">보관함에서 선택</button>'
        + '<label class="btn btn--sm" for="up_' + id + '">새 파일 올리기</label>'
        + '<input type="file" id="up_' + id + '" accept="image/*" data-upload-for="' + id + '" hidden>'
        + (fallback ? '<button class="btn btn--sm" type="button" data-clear-for="' + id + '">기본 사진으로</button>' : '')
        + '<span class="imgbox__state" data-state-for="' + id + '"></span></div>'
        + '<input type="text" id="' + id + '" value="' + esc(val) + '" placeholder="사진을 올리거나 주소를 붙여넣으세요">'
        + '<div class="imgbox__spec"><b>규격</b> ' + esc(field.spec || '')
        + '<br>사진·GIF 전용 칸입니다. 영상은 사진·영상 갤러리에서 사용해 주세요.'
        + '<br>원본 파일을 보관함에 저장합니다. GIF 움직임과 원본 비율을 유지하며 같은 사진을 다시 선택할 수 있습니다.</div>'
        + '</div></div>';
    }
    return '<input type="text" id="' + id + '" value="' + esc(val) + '">';
  }

  function fieldHtml(field, value, idPrefix) {
    const id = idPrefix + field.key;
    if (field.hidden) {
      return '<input type="hidden" id="' + id + '" value="' + esc(txt(value)) + '">';
    }
    const full = field.width === 'half' ? '' : ' field--full';
    const help = field.help ? '<span class="help">' + esc(field.help) + '</span>' : '';
    if (field.type === 'checkbox') {
      return '<div class="field field--check' + full + '">' + inputHtml(field, value, idPrefix)
        + '<label for="' + id + '">' + esc(field.label) + '</label>' + help + '</div>';
    }
    return '<div class="field' + full + '"><label for="' + id + '">' + esc(field.label) + '</label>'
      + inputHtml(field, value, idPrefix) + help + '</div>';
  }

  function readField(field, idPrefix) {
    const node = document.getElementById(idPrefix + field.key);
    if (!node) return undefined;
    if (field.type === 'checkbox') return node.checked;
    if (field.type === 'number') return node.value === '' ? null : Number(node.value);
    return node.value;
  }

  /* -------------------------------------------------------- collections */
  function rowLabel(name, row, index) {
    const fields = S.COLLECTIONS[name].fields;
    const first = fields.find((f) => f.type === 'text' || f.type === 'textarea');
    const value = first ? txt(row[first.key]).slice(0, 40) : '';
    return (index + 1) + '. ' + (value || '(내용 없음)');
  }

  const colFilter = {};
  const LEGACY_IMAGE_TABLES = ['portfolio_items', 'shop_items'];
  let activeTab = null;
  const collapsed = new Set();
  let uidSeed = 0;
  let dragFrom = null;

  function rowUid(row) {
    if (!row._uid) { uidSeed += 1; row._uid = 'r' + uidSeed; }
    return row._uid;
  }

  /* Order follows the list itself, so the numbers are rewritten after any move. */
  function renumber(name) {
    const spec = S.COLLECTIONS[name];
    if (!spec.fields.some((f) => f.key === 'sort_order')) return;
    (sets[name] || []).forEach((row, index) => { row.sort_order = (index + 1) * 10; });
  }

  /* slug|label lines from the matching content key */
  function categories(name) {
    const key = name === 'portfolio_items' ? 'portfolio_cats'
      : (name === 'price_packages' ? 'price_cats' : null);
    if (!key) return null;
    const node = document.getElementById('c_' + key);
    const raw = node ? node.value : txt(content[key]);
    return txt(raw).split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split('|');
      return { slug: (parts[0] || '').trim(), label: (parts[1] || parts[0] || '').trim() };
    }).filter((c) => c.slug);
  }

  function categoryBar(name, rows) {
    const cats = categories(name);
    if (!cats || !cats.length) return '';
    const active = colFilter[name] || 'all';
    const count = (slug) => rows.filter((r) => txt(r.tag).trim() === slug).length;
    const buttons = ['<button class="catbar__btn' + (active === 'all' ? ' is-active' : '')
      + '" type="button" data-cat="' + name + '" data-cat-value="all">전체 <span>'
      + rows.length + '</span></button>'];
    cats.forEach((c) => {
      buttons.push('<button class="catbar__btn' + (active === c.slug ? ' is-active' : '')
        + '" type="button" data-cat="' + name + '" data-cat-value="' + esc(c.slug) + '">'
        + esc(c.label) + ' <span>' + count(c.slug) + '</span></button>');
    });
    const other = rows.filter((r) => !cats.some((c) => c.slug === txt(r.tag).trim())).length;
    if (other) {
      buttons.push('<button class="catbar__btn' + (active === '__none' ? ' is-active' : '')
        + '" type="button" data-cat="' + name + '" data-cat-value="__none">분류 없음 <span>'
        + other + '</span></button>');
    }
    return '<div class="catbar">' + buttons.join('') + '</div>';
  }

  function renderCollection(name) {
    const spec = S.COLLECTIONS[name];
    const rows = sets[name] || [];
    const wrap = document.getElementById('col-' + name);
    if (!wrap) return;
    if (name === 'schedule_events') { renderCalendar(); return; }
    if (name === 'portfolio_items') { renderPortfolioEditor(); return; }
    const cats = categories(name);
    const active = colFilter[name] || 'all';
    const bar = categoryBar(name, rows);
    if (!rows.length) {
      wrap.innerHTML = bar + (failed.has(name)
        ? '<p class="alarm"><b>이 목록을 불러오지 못했습니다.</b><br>Supabase → SQL Editor 에서'
          + ' <b>supabase-update.sql</b> 을 한 번 실행한 뒤 새로고침해 주세요.</p>'
        : '<p class="empty">아직 등록된 항목이 없습니다. 위 “새로 추가”를 눌러 시작하세요.</p>');
      return;
    }
    const visible = rows.map((row, index) => ({ row: row, index: index })).filter((item) => {
      if (!cats || active === 'all') return true;
      const tag = txt(item.row.tag).trim();
      if (active === '__none') return !cats.some((c) => c.slug === tag);
      return tag === active;
    });
    if (!visible.length) {
      wrap.innerHTML = bar + '<p class="empty">이 분류에는 아직 항목이 없습니다. “새로 추가”를 누르면 이 분류로 만들어집니다.</p>';
      return;
    }
    const alarm = failed.has(name)
      ? '<p class="alarm"><b>이 목록을 불러오지 못했습니다.</b><br>표가 아직 만들어지지 않았을 수 있습니다.'
        + ' Supabase → SQL Editor 에서 <b>supabase-update.sql</b> 을 한 번 실행한 뒤 새로고침해 주세요.'
        + ' 이 상태로 저장하면 새 항목이 저장되지 않습니다.</p>'
      : '';
    const tools = alarm + '<div class="rows__tools">'
      + '<button class="btn btn--sm" type="button" data-foldall="' + name + '" data-shut="1">모두 접기</button>'
      + '<button class="btn btn--sm" type="button" data-foldall="' + name + '" data-shut="0">모두 펼치기</button></div>'
      + '<p class="rows__hint">⠿ 를 끌어서 순서를 바꿀 수 있습니다. 위에 있을수록 사이트에서 먼저 나옵니다.</p>';
    wrap.innerHTML = bar + tools + visible.map((item) => {
      const row = item.row;
      const index = item.index;
      const prefix = name + '_' + index + '_';
      const fields = spec.fields.map((field) => fieldHtml(field, row[field.key], prefix)).join('');
      const shut = collapsed.has(rowUid(row));
      return '<div class="row' + (shut ? ' is-collapsed' : '') + '" data-row="' + name + '" data-index="' + index + '" data-uid="' + rowUid(row) + '">'
        + '<div class="row__head"><span class="row__grab">'
        + '<button class="row__handle" type="button" data-drag="' + name + '" data-index="' + index + '" aria-label="끌어서 순서 바꾸기" title="끌어서 순서 바꾸기">⠿</button>'
        + '<button class="row__toggle" type="button" data-fold="' + rowUid(row) + '" aria-expanded="' + (!shut) + '">' + (shut ? '▸ 펼치기' : '▾ 접기') + '</button>'
        + '<span class="row__name" data-fold="' + rowUid(row) + '">' + esc(rowLabel(name, row, index)) + '</span></span>'
        + '<span class="row__tools">'
        + '<button class="btn" type="button" data-move="' + name + '" data-dir="-1" data-index="' + index + '"' + (index === 0 ? ' disabled' : '') + '>▲</button>'
        + '<button class="btn" type="button" data-move="' + name + '" data-dir="1" data-index="' + index + '"' + (index === rows.length - 1 ? ' disabled' : '') + '>▼</button>'
        + '<button class="btn btn--danger" type="button" data-remove="' + name + '" data-index="' + index + '" aria-label="삭제">✕</button>'
        + '</span></div>'
        + '<div class="row__body"><div class="grid">' + fields + '</div></div></div>';
    }).join('');
    galPaintAll();
    refreshThumbs();
  }

  function collectRows(name) {
    const spec = S.COLLECTIONS[name];
    const rows = sets[name] || [];
    return rows.map((row, index) => {
      const prefix = name + '_' + index + '_';
      const next = Object.assign({}, row);
      spec.fields.forEach((field) => {
        const value = readField(field, prefix);
        if (value !== undefined) next[field.key] = value;
      });
      return next;
    });
  }

  function syncFromInputs() {
    S.CONTENT_TABS.forEach((tab) => {
      tab.cards.forEach((card) => {
        card.fields.forEach((field) => {
          const value = readField(field, 'c_');
          if (value !== undefined) content[field.key] = value;
        });
      });
    });
    S.PALETTE.forEach((item) => {
      const node = document.getElementById('pal_' + item.key);
      if (node) content[item.key] = node.value;
    });
    S.TYPE_SCALE.forEach((item) => {
      const node = document.getElementById('fs_' + item.key);
      if (node) content[item.key] = node.value;
    });
    Object.keys(S.COLLECTIONS).forEach((name) => {
      if (name === 'schedule_events') return;   /* edited straight into the objects */
      if (document.getElementById('col-' + name)) sets[name] = collectRows(name);
    });
  }


  /* -------------------------------------------------- schedule calendar */
  const KINDS = [['holiday', '휴일'], ['closed', '마감'], ['waiting', '대기중'], ['working', '작업중'], ['done', '완료']];
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const cal = { calendar: 'package', year: 0, month: 0, days: [], anchor: null };
  function calDate(year, month, day) { return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0'); }
  function todayKorea() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  function calRows(date) {
    return (sets.schedule_events || []).map((row, index) => ({ row, index })).filter(({row}) => txt(row.calendar) === cal.calendar
      && txt(row.event_date).slice(0,10) <= date && txt(row.end_date || row.event_date).slice(0,10) >= date);
  }
  function workQuantity(row) {
    const match = txt(row.label).trim().match(/^(?:대기|진행|작업중|완료)\s*(\d+)\s*건$/);
    return Math.max(1, Number(row.quantity) > 1 ? Number(row.quantity) : (match ? Number(match[1]) : Number(row.quantity) || 1));
  }
  function dayState(date) {
    const override = (Array.isArray(content.schedule_day_states) ? content.schedule_day_states : []).find((item) => item.date === date && item.calendar === cal.calendar);
    if (override) return override.state;
    const rows = calRows(date);
    if (rows.some(({row}) => row.kind === 'holiday')) return 'holiday';
    if (rows.some(({row}) => row.kind === 'closed')) return 'closed';
    const sunday = new Date(date + 'T12:00:00').getDay() === 0;
    return sunday && content.schedule_sunday_off !== false && content.schedule_sunday_off !== 'false' ? 'holiday' : 'open';
  }
  function heartMarkup(rows) {
    const status = ['waiting','working','done'];
    const groups = status.map((kind) => ({ kind, count: rows.filter(({row}) => row.kind === kind).reduce((sum,{row}) => sum + workQuantity(row), 0) }));
    let painted = 0;
    return groups.map(({kind,count}) => {
      const shown = Math.min(count, Math.max(0, 12-painted)); painted += shown;
      return Array.from({length:shown}, () => '<i class="cal__heart cal__heart--' + kind + '" aria-hidden="true">♥</i>').join('')
        + (count > shown ? '<span class="cal__heart-more">+' + (count-shown) + '</span>' : '');
    }).join('');
  }
  function renderCalendar() {
    const wrap = document.getElementById('col-schedule_events'); if (!wrap) return;
    const today = todayKorea();
    if (!cal.year) { cal.year = Number(today.slice(0,4)); cal.month = Number(today.slice(5,7)); cal.days = [today]; }
    const first = new Date(cal.year, cal.month-1,1), days = new Date(cal.year,cal.month,0).getDate();
    let cells = WD.map((day) => '<div class="cal__wd">' + day + '</div>').join('');
    for(let i=0;i<first.getDay();i++) cells += '<div class="cal__day is-out" aria-hidden="true"></div>';
    for(let day=1;day<=days;day++) {
      const date = calDate(cal.year,cal.month,day), rows = calRows(date), state = dayState(date);
      const work = rows.filter(({row}) => ['waiting','working','done'].includes(row.kind));
      const count = work.reduce((sum,{row})=>sum+workQuantity(row),0);
      const stateText = state === 'holiday' ? '휴일' : state === 'closed' ? '마감' : '';
      cells += '<button type="button" class="cal__day is-' + state + (cal.days.includes(date)?' is-on':'') + '" data-cal-day="' + date + '" aria-pressed="' + cal.days.includes(date)
        + '" aria-label="' + date + ' ' + stateText + ' 작업 ' + count + '건"><span class="cal__num">' + day + '</span><span class="cal__day-status">' + stateText
        + '</span><span class="cal__hearts">' + heartMarkup(work) + '</span>' + (date === today ? '<small class="cal__today">오늘</small>' : '') + '</button>';
    }
    const tabs = [['package',content.schedule_tab1 || '패키지 작업'],['nilo',content.schedule_tab2 || '닐로툰 · 뚜따 작업']].map(([value,label]) => '<button type="button" class="catbar__btn' + (value===cal.calendar?' is-active':'') + '" data-cal-tab="' + value + '">' + esc(label) + '</button>').join('');
    wrap.innerHTML = '<div class="cal"><div><div class="cal__head"><div class="gal__nav"><button class="gal__step" type="button" data-cal-move="-1" aria-label="이전 달">‹</button>'
      + '<button class="btn btn--sm" type="button" data-cal-today>이번 달</button><button class="gal__step" type="button" data-cal-move="1" aria-label="다음 달">›</button></div>'
      + '<input type="month" data-cal-month aria-label="일정 연월 선택" value="' + calDate(cal.year,cal.month,1).slice(0,7) + '"><span class="cal__title">' + cal.year + '년 ' + cal.month + '월</span></div>'
      + '<div class="catbar">' + tabs + '</div><p class="cal__hint">휴일은 연한 파랑, 마감은 진한 파랑입니다. 하트 하나가 작업 1건이며, 날짜를 누르면 내용을 수정할 수 있습니다.</p>'
      + '<div class="cal__grid">' + cells + '</div><div class="cal__legend"><span><i class="chip--waiting"></i>대기중</span><span><i class="chip--working"></i>작업중</span><span><i class="chip--done"></i>완료</span></div>'
      + '<p class="cal__hint" style="margin-top:12px">Ctrl(⌘) + 클릭: 날짜를 여러 개 선택 · Shift + 클릭: 날짜 범위 선택</p></div>' + calSide() + '</div>' + scheduleSettingsMarkup();
  }
  function calField(row, index, key, label, type) {
    return '<label>' + label + '<' + (type==='textarea'?'textarea':'input type="'+(type||'text')+'"')
      + ' data-cal-field="' + key + '" data-cal-index="' + index + '"' + (type==='textarea' ? '>' + esc(txt(row[key])) + '</textarea>' : ' value="' + esc(txt(row[key])) + '"' + (type==='number'?' min="1" step="1"':'') + '>') + '</label>';
  }
  function stateSelect(value, attr) {
    return '<select ' + attr + '>' + [['','기본 · 일요일은 정기 휴일'],['open','접수 가능'],['closed','접수 마감'],['holiday','휴일']].map(([id,label]) => '<option value="' + id + '"' + (value===id?' selected':'') + '>' + label + '</option>').join('') + '</select>';
  }
  function calSide() {
    if (!cal.days.length) return '<aside class="cal__side"><h4>날짜를 선택해 주세요</h4><p class="cal__hint">날짜를 누르면 그날의 상태와 작업 내용을 편집할 수 있습니다.</p></aside>';
    const dayStates = Array.isArray(content.schedule_day_states) ? content.schedule_day_states : [];
    if (cal.days.length > 1) return '<aside class="cal__side"><h4>' + cal.days.length + '개 날짜 선택</h4><p class="cal__dates">' + cal.days.slice().sort().map(esc).join(' · ') + '</p>'
      + '<label>선택한 날짜 상태' + stateSelect('', 'data-day-status-bulk') + '</label><button type="button" class="btn btn--sm" data-day-status-apply>날짜 상태 적용</button>'
      + '<div class="cal__bulk"><label>추가할 작업 상태<select data-bulk-kind><option value="waiting">대기중</option><option value="working">작업중</option><option value="done">완료</option></select></label>'
      + '<label>공개할 작업 내용<input data-bulk-label type="text" placeholder="작업 이름"></label><button type="button" class="btn btn--sm" data-cal-bulk-add>선택 날짜마다 작업 추가</button></div>'
      + '<p class="cal__hint">기존 작업은 그대로 유지됩니다. 날짜별 작업은 날짜를 하나씩 선택해서 수정해 주세요.</p></aside>';
    const date = cal.days[0], override = dayStates.find((item)=>item.calendar===cal.calendar && item.date===date);
    const memo = scheduleDayPrivate.get(cal.calendar + ':' + date);
    const rows = calRows(date).filter(({row})=>!['holiday','closed'].includes(row.kind));
    const legacy = calRows(date).filter(({row})=>['holiday','closed'].includes(row.kind));
    const body = rows.map(({row,index}) => '<div class="cal__row">' + calField(row,index,'client_name','신청자 닉네임 · 원문은 관리자만 확인')
      + calField(Object.assign({},row,{public_title:row.public_title || row.label || ''}),index,'public_title','공개할 작업 내용')
      + '<label>작업 상태<select data-cal-field="kind" data-cal-index="' + index + '">' + [['waiting','대기중'],['working','작업중'],['done','완료']].map(([id,label])=>'<option value="' + id + '"'+(row.kind===id?' selected':'')+'>'+label+'</option>').join('') + '</select></label>'
      + '<details><summary>기간 · 분류 · 개수 · 비공개 메모</summary><div class="grid">' + calField(row,index,'event_date','시작일','date') + calField(row,index,'end_date','종료일 (하루면 비움)','date')
      + '<label>분류<select data-cal-field="calendar" data-cal-index="' + index + '"><option value="package"'+(row.calendar==='package'?' selected':'')+'>패키지 작업</option><option value="nilo"'+(row.calendar==='nilo'?' selected':'')+'>닐로툰 · 뚜따 작업</option></select></label>'
      + calField(Object.assign({},row,{quantity:workQuantity(row)}),index,'quantity','작업 개수','number') + '<div class="field--full">' + calField(row,index,'private_memo','이 작업의 관리 메모 · 공개 안 됨','textarea') + '</div></div></details>'
      + '<button class="btn btn--danger" type="button" data-cal-del="' + index + '">이 작업 삭제</button></div>').join('');
    return '<aside class="cal__side"><h4>' + date.replace(/-/g,'. ') + '</h4><label>이 날짜의 상태' + stateSelect(override?.state || '', 'data-day-status="' + date + '"') + '</label>'
      + '<label style="margin-top:14px">이 날짜의 관리 메모 · 공개 안 됨<textarea data-day-memo="' + date + '">' + esc(memo?.private_memo || '') + '</textarea></label>'
      + '<div class="cal__section-head"><strong>등록 작업 ' + rows.length + '개</strong><button class="btn btn--sm" type="button" data-cal-add>＋ 일정</button></div>' + body
      + (legacy.length ? '<details><summary>기존 휴일 · 마감 항목 ' + legacy.length + '개</summary>' + legacy.map(({row,index})=>'<p>'+esc(row.label || row.kind)+' <button class="btn btn--sm" data-cal-del="'+index+'" type="button">삭제</button></p>').join('')+'</details>' : '')
      + '<p class="cal__hint">변경 후 아래 저장하기를 눌러주세요. 공개 화면의 예약자는 첫 글자만 표시하며 관리 메모는 공개하지 않습니다.</p></aside>';
  }
  function scheduleSettingsMarkup() {
    const slots = Array.isArray(content.schedule_slots) ? content.schedule_slots : [];
    return '<div class="schedule-settings"><h3>예약 안내 · 월별 슬롯 현황</h3><label><input type="checkbox" data-schedule-setting="schedule_sunday_off"' + (content.schedule_sunday_off !== false && content.schedule_sunday_off !== 'false' ? ' checked':'') + '> 매주 일요일 정기 휴일</label>'
      + '<label class="field" style="margin-top:15px">예약 전에 확인해 주세요 · 공지<textarea data-schedule-setting="schedule_booking_notice">' + esc(content.schedule_booking_notice || '') + '</textarea></label>'
      + '<div class="cal__section-head"><strong>월별 슬롯</strong><button type="button" class="btn btn--sm" data-slot-add>＋ 월 추가</button></div>'
      + slots.map((slot,index) => '<div class="slot-row"><label>월<input type="month" data-slot-index="'+index+'" data-slot-key="month" value="'+esc(slot.month)+'"></label>'
        + '<label>작업 분류<select data-slot-index="'+index+'" data-slot-key="calendar"><option value="package"'+(slot.calendar!=='nilo'?' selected':'')+'>패키지 작업</option><option value="nilo"'+(slot.calendar==='nilo'?' selected':'')+'>닐로툰 · 뚜따</option></select></label>'
        + '<label>전체 슬롯<input type="number" min="0" step="1" data-slot-index="'+index+'" data-slot-key="capacity" value="'+esc(slot.capacity ?? 0)+'"></label>'
        + '<label>예약 슬롯<input type="number" min="0" step="1" data-slot-index="'+index+'" data-slot-key="booked" value="'+esc(slot.booked ?? 0)+'"></label>'
        + '<label>접수 상태<select data-slot-index="'+index+'" data-slot-key="state"><option value="open"'+(slot.state!=='closed'?' selected':'')+'>접수 가능</option><option value="closed"'+(slot.state==='closed'?' selected':'')+'>접수 마감</option></select></label>'
        + '<button type="button" class="btn btn--sm" data-slot-remove="'+index+'">삭제</button><label class="slot-note">공개 안내<textarea data-slot-index="'+index+'" data-slot-key="note">'+esc(slot.note || '')+'</textarea></label></div>').join('') + '</div>';
  }
  function setDayState(dates, state) {
    const list = Array.isArray(content.schedule_day_states) ? content.schedule_day_states : [];
    content.schedule_day_states = list.filter((item)=>!(item.calendar===cal.calendar && dates.includes(item.date)));
    if (state) dates.forEach((date)=>content.schedule_day_states.push({date,calendar:cal.calendar,state}));
    markDirty(); renderCalendar();
  }
  async function loadDayPrivate() {
    try {
      const {data,error}=await db.from('schedule_day_private').select('calendar,event_date,private_memo');
      if (error || !Array.isArray(data)) throw error || new Error('날짜 관리 메모 응답을 확인할 수 없습니다.');
      scheduleDayPrivate.clear();
      data.forEach((row)=>scheduleDayPrivate.set(row.calendar+':'+row.event_date,row));
      failed.delete('schedule_day_private'); renderCalendar(); return true;
    } catch (error) { failed.add('schedule_day_private'); toast('날짜 관리 메모를 불러오지 못했습니다. '+error.message,6000); return false; }
  }

  /* ------------------------------------------------------------ rendering */
  function collectionCard(name) {
    const spec = S.COLLECTIONS[name];
    return '<div class="card">'
      + '<div class="card__title"><span>' + esc(spec.label) + '</span>'
      + '<button class="btn btn--sm" type="button" data-add="' + name + '">＋ 새로 추가</button></div>'
      + '<p class="card__where">나오는 곳 — ' + esc(spec.where) + '</p>'
      + '<div class="rows" id="col-' + name + '"></div></div>';
  }

  function themePanel() {
    const presets = Object.keys(S.THEME_PRESETS).map((name) =>
      '<button class="btn btn--sm" type="button" data-preset="' + esc(name) + '">' + esc(name) + '</button>').join('');
    const swatches = S.PALETTE.map((item) => {
      const value = txt(content[item.key]) || item.def;
      return '<div class="pal">'
        + '<input type="color" id="pal_' + item.key + '" value="' + esc(value) + '">'
        + '<span class="pal__label">' + esc(item.label) + '</span>'
        + '<input type="text" id="palhex_' + item.key + '" value="' + esc(value) + '" spellcheck="false">'
        + '<span class="pal__desc">' + esc(item.desc) + ' · ' + esc(item.var) + '</span></div>';
    }).join('');
    const scales = S.TYPE_SCALE.map((item) => {
      const value = parseFloat(txt(content[item.key])) || item.def;
      return '<div class="scale__item"><span class="pal__label">' + esc(item.label) + '</span>'
        + '<p class="pal__desc" style="margin:2px 0 8px">' + esc(item.desc) + '</p>'
        + '<div class="scale__row"><input type="range" id="fs_' + item.key + '" min="0.8" max="1.4" step="0.05" value="'
        + value + '"><span class="scale__value" id="fsval_' + item.key + '">' + value + '×</span></div></div>';
    }).join('');
    return '<div class="card"><div class="card__title">색 조합</div>'
      + '<p class="card__where">나오는 곳 — 사이트 전 페이지. 저장하면 모든 페이지의 색이 함께 바뀝니다</p>'
      + '<div class="presets">' + presets + '<button class="btn btn--sm btn--ghost" type="button" data-preset-reset>기본값으로</button></div>'
      + '<div class="palette">' + swatches + '</div>'
      + '<div class="contrast" id="inabContrast"></div></div>'
      + '<div class="card"><div class="card__title">글자 크기</div>'
      + '<p class="card__where">나오는 곳 — 사이트 전 페이지. 1×이 기본이고 0.8~1.4배까지 조절됩니다</p>'
      + '<div class="scale">' + scales + '</div></div>';
  }

  function inquiryPanel() {
    return '<div class="card"><div class="card__title">받은 문의</div>'
      + '<p class="card__where">나오는 곳 — 관리자만 볼 수 있습니다. 커미션 안내 페이지의 전송 상자로 접수된 내용</p>'
      + '<div class="table-wrap"><table class="table"><thead><tr><th>받은 날짜</th><th>연락처</th><th>양식</th><th>내용</th><th>삭제</th></tr></thead>'
      + '<tbody id="inabInquiries"></tbody></table></div></div>';
  }

  function renderInquiries() {
    const tbody = document.getElementById('inabInquiries');
    if (!tbody) return;
    const rows = sets.inquiries || [];
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#837d8c">아직 받은 문의가 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map((row) => {
      const date = txt(row.created_at).slice(0, 16).replace('T', ' ');
      return '<tr><td>' + esc(date) + '</td><td>' + esc(txt(row.contact)) + '</td><td>' + esc(txt(row.form_title))
        + '</td><td><details><summary>펼쳐보기</summary><pre style="white-space:pre-wrap;margin:8px 0 0;font:inherit">'
        + esc(txt(row.message)) + '</pre></details></td>'
        + '<td><button class="btn btn--danger" type="button" data-inquiry-delete="' + esc(row.id) + '" aria-label="삭제">✕</button></td></tr>';
    }).join('');
  }

  function build() {
    const tabs = document.getElementById('inabTabs');
    const panels = document.getElementById('inabPanels');
    const all = S.CONTENT_TABS.concat([
      { id: 'media', label: '🖼 사진 보관함', cards: [], custom: 'media' },
      { id: 'theme', label: '🎨 테마', cards: [], custom: 'theme' },
      { id: 'inbox', label: '📮 문의함', cards: [], custom: 'inbox' }
    ]);

    if (!all.some((tab) => tab.id === activeTab)) activeTab = all[0].id;
    tabs.innerHTML = all.map((tab) =>
      '<button class="tab-btn' + (tab.id === activeTab ? ' is-active' : '') + '" type="button" data-tab="' + tab.id + '">'
      + esc(tab.label) + '</button>').join('');

    panels.innerHTML = all.map((tab, index) => {
      let inner = '';
      if (tab.custom === 'media') inner = libraryMarkup();
      else if (tab.custom === 'theme') inner = themePanel();
      else if (tab.custom === 'inbox') inner = inquiryPanel();
      else {
        inner = tab.cards.map((card) => '<div class="card"><div class="card__title">' + esc(card.title) + '</div>'
          + '<p class="card__where">나오는 곳 — ' + esc(card.where) + '</p>'
          + '<div class="grid">' + card.fields.map((field) => fieldHtml(field, content[field.key], 'c_')).join('')
          + '</div></div>').join('');
        inner += (tab.collections || []).map(collectionCard).join('');
      }
      const page = S.PAGES.find((p) => p.slug === tab.id);
      const link = page ? '<div class="note">이 탭의 값은 <b>' + esc(page.label)
        + '</b> 화면에 나옵니다. <a href="../' + page.file + '" target="_blank" rel="noopener">새 창에서 열어 확인하기</a></div>' : '';
      return '<div class="tab-panel' + (tab.id === activeTab ? ' is-active' : '') + '" id="panel-' + tab.id + '">'
        + inner + link + '</div>';
    }).join('');

    Object.keys(S.COLLECTIONS).forEach(renderCollection);
    renderInquiries();
    renderMediaLibrary();
    galPaintAll();
    refreshThumbs();
    updateContrast();
  }

  /* ------------------------------------------------------------- previews */
  /* Site-relative paths need the ../ prefix because admin sits one level down. */
  function resolvePath(value) {
    if (!value) return '';
    return /^(https?:|data:|blob:|\/|\.\.\/)/.test(value) ? value : '../' + value;
  }

  function refreshThumbs() {
    document.querySelectorAll('[data-thumb-for]').forEach((img) => {
      const source = document.getElementById(img.dataset.thumbFor);
      if (!source) return;
      const value = source.value.trim();
      const fallback = img.dataset.fallback || '';
      const shown = value || fallback;
      const src = resolvePath(shown);
      const tag = document.querySelector('[data-tag-for="' + img.dataset.thumbFor + '"]');
      if (tag) tag.textContent = value ? '지금 쓰는 사진' : (fallback ? '기본 사진 (비어 있음)' : '사진 없음');
      img.style.visibility = shown ? 'visible' : 'hidden';
      if (src && img.getAttribute('src') !== src) {
        img.setAttribute('referrerpolicy', 'no-referrer');
        img.src = src;
      }
    });
  }

  function galList(wrap) {
    const store = wrap.querySelector('input[type=hidden]');
    if (!store.value.trim()) return [];
    return store.value.split('\n').map((v) => v.trim());
  }

  function galWrite(wrap, list) {
    wrap.querySelector('input[type=hidden]').value = list.join('\n');
  }

  function galPaint(wrap) {
    const list = galList(wrap);
    let index = Number(wrap.dataset.index || 0);
    if (index >= list.length) index = Math.max(0, list.length - 1);
    wrap.dataset.index = String(index);
    let img = wrap.querySelector('[data-gal-img]');
    const url = wrap.querySelector('[data-gal-url]');
    const pos = wrap.querySelector('[data-gal-pos]');
    const tag = wrap.querySelector('[data-gal-tag]');
    const current = list[index] || '';
    if (url && document.activeElement !== url) url.value = current;
    if (pos) pos.textContent = (list.length ? index + 1 : 0) + ' / ' + list.length;
    if (tag) tag.textContent = list.length ? (index === 0 ? '카드에 나오는 사진' : '확대 화면에서만') : '사진 없음';
    const src = resolvePath(current);
    const kind=mediaType(current);
    if(img && img.tagName.toLowerCase() !== (kind==='video'?'video':'img')){const replacement=document.createElement(kind==='video'?'video':'img');replacement.setAttribute('data-gal-img','');if(kind==='video'){replacement.controls=true;replacement.muted=true;replacement.playsInline=true;replacement.preload='metadata';}img.replaceWith(replacement);img=replacement;}
    if (img) {
      img.style.visibility = current ? 'visible' : 'hidden';
      if (img.getAttribute('src') !== src) {
        img.setAttribute('referrerpolicy', 'no-referrer');
        img.src = src;
      }
    }
    wrap.querySelectorAll('[data-gal-step]').forEach((b) => { b.disabled = list.length < 2; });
  }

  function galPaintAll() {
    document.querySelectorAll('[data-gal]').forEach(galPaint);
  }

  async function handleUpload(input) {
    const targetId=input.dataset.uploadFor, target=document.getElementById(targetId), file=input.files?.[0]; input.value='';
    if(!target||!file)return;
    if(!target.closest('[data-gal]') && /^video\//.test(file.type)){toast('이 칸에는 사진이나 GIF를 선택해 주세요.');return;}
    const state=document.querySelector('[data-state-for="'+targetId+'"]');
    if(state)state.textContent='원본을 보관함에 올리는 중…';
    input.disabled=true;
    try {
      const asset=await uploadOriginal(file), wrap=target.closest('[data-gal]');
      if(wrap){const list=galList(wrap),index=Number(wrap.dataset.index||0);if(list.length)list[index]=asset.url;else list.push(asset.url);galWrite(wrap,list);galPaint(wrap);}
      else{target.value=asset.url;refreshThumbs();}
      if(state)state.textContent='원본 저장 완료';renderMediaLibrary();markDirty();
    }catch(error){if(state)state.textContent='업로드 실패';toast(error.message);}
    finally{input.disabled=false;}
  }

  function luminance(hex) {
    const value = hex.replace('#', '');
    if (value.length !== 6) return 1;
    const rgb = [0, 2, 4].map((i) => {
      const c = parseInt(value.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  function ratio(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function readPalette() {
    const out = {};
    S.PALETTE.forEach((item) => {
      const node = document.getElementById('pal_' + item.key);
      out[item.key] = node ? node.value : item.def;
    });
    return out;
  }

  function updateContrast() {
    const box = document.getElementById('inabContrast');
    if (!box) return;
    const p = readPalette();
    const checks = [
      ['본문 글자 ↔ 기본 배경', p.theme_body, p.theme_paper],
      ['제목 글자 ↔ 기본 배경', p.theme_ink, p.theme_paper],
      ['진한 포인트 ↔ 연한 배경', p.theme_deep, p.theme_pale],
      ['버튼 글자(흰색) ↔ 진한 포인트', '#ffffff', p.theme_deep]
    ];
    box.innerHTML = '<b>읽기 쉬움 검사</b> — 4.5 이상이면 안심하고 쓸 수 있습니다<br>' + checks.map((check) => {
      const value = ratio(check[1], check[2]);
      const ok = value >= 4.5;
      return check[0] + ' : ' + value.toFixed(2)
        + '<span class="badge ' + (ok ? 'badge--ok' : 'badge--no') + '">' + (ok ? '좋음' : '낮음') + '</span>';
    }).join('<br>');
  }

  /* ---------------------------------------------------------------- events */
  document.addEventListener('click', async (event) => {
    const target = event.target;
    if (!target.closest) return;
    if (await revisionClick(event)) return;

    const tab = target.closest('[data-tab]');
    if (tab) {
      syncFromInputs();
      if (tab.dataset.tab === 'media') renderMediaLibrary();
      activeTab = tab.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('is-active', b === tab));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('is-active', p.id === 'panel-' + tab.dataset.tab));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const add = target.closest('[data-add]');
    if (add) {
      const name = add.dataset.add;
      syncFromInputs();
      const rows = sets[name] || (sets[name] = []);
      const blank = {};
      S.COLLECTIONS[name].fields.forEach((field) => {
        if (field.key === 'sort_order') blank[field.key] = (rows.length + 1) * 10;
        else if (field.type === 'checkbox') blank[field.key] = false;
        else if (field.type === 'select') blank[field.key] = field.options[0][0];
        else if (field.type === 'number') blank[field.key] = 50;
        else blank[field.key] = '';
      });
      const active = colFilter[name];
      if (active && active !== 'all' && active !== '__none' && 'tag' in blank) blank.tag = active;
      if (name === 'portfolio_items') { rows.unshift(blank); portfolioSelected = rowUid(blank); } else rows.push(blank);
      renumber(name);
      collapsed.delete(rowUid(blank));
      renderCollection(name);
      markDirty();
      return;
    }

    const remove = target.closest('[data-remove]');
    if (remove) {
      const name = remove.dataset.remove;
      const index = Number(remove.dataset.index);
      if (!window.confirm('이 항목을 목록에서 삭제할까요? 저장하기를 눌러야 반영됩니다.')) return;
      syncFromInputs();
      const row = sets[name][index];
      if (row && row.id) pendingDeletes.push({table:name,id:row.id});
      sets[name].splice(index, 1);
      renumber(name);
      renderCollection(name);
      markDirty();
      toast('삭제했습니다.');
      return;
    }

    const move = target.closest('[data-move]');
    if (move) {
      const name = move.dataset.move;
      const index = Number(move.dataset.index);
      const dir = Number(move.dataset.dir);
      syncFromInputs();
      const rows = sets[name];
      const next = index + dir;
      if (next < 0 || next >= rows.length) return;
      const tmp = rows[index];
      rows[index] = rows[next];
      rows[next] = tmp;
      renumber(name);
      renderCollection(name);
      markDirty();
      return;
    }

    const calTab = target.closest('[data-cal-tab]');
    if (calTab) { cal.calendar = calTab.dataset.calTab; cal.days = []; cal.anchor = null; renderCalendar(); return; }

    const calMove = target.closest('[data-cal-move]');
    if (calMove) {
      const next = new Date(cal.year, cal.month - 1 + Number(calMove.dataset.calMove), 1);
      cal.year = next.getFullYear();
      cal.month = next.getMonth() + 1;
      cal.days = [];
      cal.anchor = null;
      renderCalendar();
      return;
    }

    if (target.closest('[data-cal-today]')) {
      const today = todayKorea();
      cal.year = Number(today.slice(0,4));
      cal.month = Number(today.slice(5,7));
      cal.days = [];
      cal.anchor = null;
      renderCalendar();
      return;
    }

    const calDay = target.closest('[data-cal-day]');
    if (calDay) {
      const date = calDay.dataset.calDay;
      if (event.shiftKey && cal.anchor) {
        const from = cal.anchor < date ? cal.anchor : date;
        const to = cal.anchor < date ? date : cal.anchor;
        cal.days = [];
        document.querySelectorAll('[data-cal-day]').forEach((node) => {
          const value = node.dataset.calDay;
          if (value >= from && value <= to) cal.days.push(value);
        });
      } else if (event.ctrlKey || event.metaKey) {
        const at = cal.days.indexOf(date);
        if (at >= 0) cal.days.splice(at, 1); else cal.days.push(date);
        cal.anchor = date;
      } else {
        cal.days = [date];
        cal.anchor = date;
      }
      renderCalendar();
      return;
    }

    if (target.closest('[data-cal-add]')) {
      if (cal.days.length !== 1) return;
      (sets.schedule_events = sets.schedule_events || []).push({
        calendar: cal.calendar, event_date: cal.days[0], kind: 'waiting', label: '', public_title:'',client_name:'',private_memo:'',quantity:1,end_date:null
      });
      renderCalendar();
      markDirty();
      return;
    }

    if (target.closest('[data-cal-bulk-add]')) {
      const side = target.closest('.cal__side');
      const kind = side.querySelector('[data-bulk-kind]').value;
      const label = side.querySelector('[data-bulk-label]').value.trim();
      const rows = (sets.schedule_events = sets.schedule_events || []);
      cal.days.forEach((date) => {
        rows.push({ calendar: cal.calendar, event_date: date, kind: kind, label: label, public_title:label,client_name:'',private_memo:'',quantity:1,end_date:null });
      });
      renderCalendar();
      markDirty();
      toast(cal.days.length + '개 날짜에 넣었습니다.');
      return;
    }

    if (target.closest('[data-cal-bulk-clear]')) {
      const targets = (sets.schedule_events || []).filter((row) =>
        txt(row.calendar) === cal.calendar && cal.days.indexOf(txt(row.event_date).slice(0, 10)) >= 0);
      if (!targets.length) { toast('고른 날짜에 일정이 없습니다.'); return; }
      if (!window.confirm('고른 날짜의 일정 ' + targets.length + '건을 지울까요?')) return;
      for (const row of targets) {
        if (row.id) {
          pendingDeletes.push({table:'schedule_events',id:row.id});
        }
      }
      sets.schedule_events = (sets.schedule_events || []).filter((row) => targets.indexOf(row) < 0);
      renderCalendar();
      markDirty();
      toast(targets.length + '건을 지웠습니다.');
      return;
    }

    const calDel = target.closest('[data-cal-del]');
    if (calDel) {
      const index = Number(calDel.dataset.calDel);
      const row = sets.schedule_events[index];
      if (!window.confirm('이 일정을 지울까요?')) return;
      if (row && row.id) pendingDeletes.push({table:'schedule_events',id:row.id});
      sets.schedule_events.splice(index, 1);
      renderCalendar();
      markDirty();
      toast('삭제했습니다.');
      return;
    }

    const fold = target.closest('[data-fold]');
    if (fold) {
      const uid = fold.dataset.fold;
      if (collapsed.has(uid)) collapsed.delete(uid); else collapsed.add(uid);
      const row = document.querySelector('[data-uid="' + uid + '"]');
      if (row) {
        const shut = collapsed.has(uid);
        row.classList.toggle('is-collapsed', shut);
        const button = row.querySelector('[data-fold]');
        button.textContent = shut ? '▸ 펼치기' : '▾ 접기';
        button.setAttribute('aria-expanded', String(!shut));
      }
      return;
    }

    const foldAll = target.closest('[data-foldall]');
    if (foldAll) {
      const name = foldAll.dataset.foldall;
      const shut = foldAll.dataset.shut === '1';
      (sets[name] || []).forEach((row) => {
        if (shut) collapsed.add(rowUid(row)); else collapsed.delete(rowUid(row));
      });
      syncFromInputs();
      renderCollection(name);
      return;
    }

    const cat = target.closest('[data-cat]');
    if (cat) {
      syncFromInputs();
      colFilter[cat.dataset.cat] = cat.dataset.catValue;
      renderCollection(cat.dataset.cat);
      return;
    }

    const preset = target.closest('[data-preset]');
    if (preset) {
      const values = S.THEME_PRESETS[preset.dataset.preset];
      Object.keys(values).forEach((key) => {
        const color = document.getElementById('pal_' + key);
        const hex = document.getElementById('palhex_' + key);
        if (color) color.value = values[key];
        if (hex) hex.value = values[key];
      });
      updateContrast();
      markDirty();
      return;
    }

    if (target.closest('[data-preset-reset]')) {
      S.PALETTE.forEach((item) => {
        const color = document.getElementById('pal_' + item.key);
        const hex = document.getElementById('palhex_' + item.key);
        if (color) color.value = item.def;
        if (hex) hex.value = item.def;
      });
      S.TYPE_SCALE.forEach((item) => {
        const node = document.getElementById('fs_' + item.key);
        const label = document.getElementById('fsval_' + item.key);
        if (node) node.value = item.def;
        if (label) label.textContent = item.def + '×';
      });
      updateContrast();
      markDirty();
      return;
    }

    const galStep = target.closest('[data-gal-step]');
    if (galStep) {
      const wrap = galStep.closest('[data-gal]');
      const list = galList(wrap);
      if (list.length > 1) {
        const next = (Number(wrap.dataset.index || 0) + Number(galStep.dataset.galStep) + list.length) % list.length;
        wrap.dataset.index = String(next);
        galPaint(wrap);
      }
      return;
    }

    if (target.closest('[data-gal-add]')) {
      const wrap = target.closest('[data-gal]');
      const list = galList(wrap);
      list.push('');
      galWrite(wrap, list);
      wrap.dataset.index = String(list.length - 1);
      galPaint(wrap);
      const url = wrap.querySelector('[data-gal-url]');
      if (url) url.focus();
      markDirty();
      return;
    }

    if (target.closest('[data-gal-del]')) {
      const wrap = target.closest('[data-gal]');
      const list = galList(wrap);
      if (!list.length) return;
      list.splice(Number(wrap.dataset.index || 0), 1);
      galWrite(wrap, list);
      galPaint(wrap);
      markDirty();
      return;
    }

    const clear = target.closest('[data-clear-for]');
    if (clear) {
      const field = document.getElementById(clear.dataset.clearFor);
      if (field) { field.value = ''; refreshThumbs(); markDirty(); }
      return;
    }

    const inquiryDelete = target.closest('[data-inquiry-delete]');
    if (inquiryDelete) {
      if (!window.confirm('이 문의를 지울까요?')) return;
      const id = inquiryDelete.dataset.inquiryDelete;
      const ok = await deleteRow('inquiries', id);
      if (!ok) { toast('삭제하지 못했습니다.'); return; }
      sets.inquiries = (sets.inquiries || []).filter((row) => String(row.id) !== String(id));
      renderInquiries();
      toast('삭제했습니다.');
    }
  });

  function dragRows(name) {
    return [...document.querySelectorAll('.row[data-row="' + name + '"]')];
  }

  function clearDragMarks() {
    document.querySelectorAll('.row').forEach((row) => {
      row.classList.remove('is-dragging', 'is-over', 'is-over-after');
    });
  }

  function dragTarget(event) {
    if (!dragFrom) return null;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const row = under && under.closest ? under.closest('.row') : null;
    if (!row || row.dataset.row !== dragFrom.name) return null;
    const box = row.getBoundingClientRect();
    return { row: row, after: event.clientY > box.top + box.height / 2 };
  }

  document.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest && event.target.closest('[data-drag]');
    if (!handle) return;
    event.preventDefault();
    dragFrom = { name: handle.dataset.drag, index: Number(handle.dataset.index) };
    handle.setPointerCapture(event.pointerId);
    const row = handle.closest('.row');
    if (row) row.classList.add('is-dragging');
  });

  document.addEventListener('pointermove', (event) => {
    if (!dragFrom) return;
    const edge = 70;
    if (event.clientY < edge) window.scrollBy(0, -14);
    else if (event.clientY > window.innerHeight - edge) window.scrollBy(0, 14);
    const hit = dragTarget(event);
    dragRows(dragFrom.name).forEach((row) => row.classList.remove('is-over', 'is-over-after'));
    if (!hit) return;
    hit.row.classList.toggle('is-over', !hit.after);
    hit.row.classList.toggle('is-over-after', hit.after);
  });

  function endDrag(event) {
    if (!dragFrom) return;
    const hit = dragTarget(event);
    const name = dragFrom.name;
    const from = dragFrom.index;
    dragFrom = null;
    clearDragMarks();
    if (!hit) return;
    let to = Number(hit.row.dataset.index) + (hit.after ? 1 : 0);
    if (to === from || to === from + 1) return;
    syncFromInputs();
    const rows = sets[name];
    const moved = rows.splice(from, 1)[0];
    if (to > from) to -= 1;
    rows.splice(to, 0, moved);
    renumber(name);
    renderCollection(name);
    markDirty();
  }

  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', () => { dragFrom = null; clearDragMarks(); });

  function calEdit(target) {
    const index = Number(target.dataset.calIndex);
    const row = (sets.schedule_events || [])[index];
    if (!row) return;
    row[target.dataset.calField] = target.dataset.calField === 'quantity' ? Number(target.value) : target.value;
    if(target.dataset.calField === 'public_title') row.label=target.value;
    if (target.dataset.calField === 'kind' || target.dataset.calField === 'calendar') renderCalendar();
    markDirty();
  }

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (revisionInput(target)) return;
    if (!shell.contains(target)) return;
    if (target.dataset && target.dataset.calField !== undefined) { calEdit(target); return; }
    if (target.dataset && target.dataset.galUrl !== undefined) {
      const wrap = target.closest('[data-gal]');
      const list = galList(wrap);
      const index = Number(wrap.dataset.index || 0);
      if (list.length) list[index] = target.value.trim(); else list.push(target.value.trim());
      galWrite(wrap, list);
      markDirty();
      return;
    }
    if (!target.id) { markDirty(); return; }
    if (target.id.indexOf('pal_') === 0) {
      const key = target.id.slice(4);
      const hex = document.getElementById('palhex_' + key);
      if (hex) hex.value = target.value;
      updateContrast();
    }
    if (target.id.indexOf('palhex_') === 0) {
      const key = target.id.slice(7);
      const color = document.getElementById('pal_' + key);
      if (color && /^#[0-9a-fA-F]{6}$/.test(target.value.trim())) color.value = target.value.trim();
      updateContrast();
    }
    if (target.id.indexOf('fs_') === 0) {
      const label = document.getElementById('fsval_' + target.id.slice(3));
      if (label) label.textContent = Number(target.value).toFixed(2).replace(/0$/, '') + '×';
    }
    if (target.dataset && target.type === 'text') refreshThumbs();
    const row = target.closest ? target.closest('.row') : null;
    if (row && /_(title|name|question|tab_label)$/.test(target.id || '')) {
      const label = row.querySelector('.row__name');
      if (label) {
        const number = label.textContent.split('.')[0];
        label.textContent = number + '. ' + (target.value.trim() || '(내용 없음)');
      }
    }
    markDirty();
  });

  document.addEventListener('change', async (event) => {
    if (await revisionChange(event.target)) return;
    if (!shell.contains(event.target)) return;
    if (event.target.dataset && event.target.dataset.uploadFor) { handleUpload(event.target); return; }
    if (event.target.dataset && event.target.dataset.calField !== undefined) { calEdit(event.target); return; }
    refreshThumbs();
    markDirty();
  });

  /* ----------------------------------------------------------------- data */
  async function loadAll() {
    stateBox.textContent = '불러오는 중';
    const names = Object.keys(S.COLLECTIONS);
    const [row, ...rest] = await Promise.all([
      fetchContent(),
      ...names.map((name) => fetchAll(name, { order: S.COLLECTIONS[name].order, asc: true })),
      fetchAll('inquiries', { order: 'created_at', asc: false })
    ]);
    const readFailures=names.filter((name,index)=>rest[index]===null);
    if(row === null || readFailures.length) {
      if(row===null)failed.add('site_content');
      readFailures.forEach((name)=>failed.add(name));
      stateBox.textContent='자료를 불러오지 못했습니다. 기존 입력을 유지합니다.';
      throw new Error('읽기 실패: '+(row===null?'사이트 설정 ': '')+readFailures.join(', '));
    }
    content = row || {};
    sets = {};
    collapsed.clear();
    failed.clear();
    names.forEach((name, index) => {
      if (rest[index] == null) failed.add(name);
      sets[name] = rest[index] || [];
      if (sets[name].length > 3) sets[name].forEach((item) => collapsed.add(rowUid(item)));
      const hasGallery = S.COLLECTIONS[name].fields.some((f) => f.type === 'gallery');
      if (hasGallery) {
        sets[name].forEach((item) => {
          if (!txt(item.images).trim() && txt(item.image_url).trim()) item.images = txt(item.image_url).trim();
        });
      }
    });
    sets.inquiries = rest[names.length] || [];
    pendingDeletes.length=0;
    await Promise.all([loadMediaLibrary(),loadDayPrivate()]);
    build();
    if(failed.size)throw new Error('일부 자료를 불러오지 못했습니다. DB 업데이트와 관리자 권한을 확인해 주세요: '+[...failed].join(', '));
    markClean('불러왔습니다');
  }

  async function saveAll() {
    syncFromInputs();
    const button=document.getElementById('inabSave'); if(button.disabled)return;
    button.disabled=true; stateBox.textContent='저장 중';
    try {
      const bad=(sets.schedule_events||[]).find((row)=>!/^\d{4}-\d{2}-\d{2}$/.test(row.event_date||'')||(row.end_date&&(!/^\d{4}-\d{2}-\d{2}$/.test(row.end_date)||row.end_date<row.event_date))||!(Number(row.quantity??1)>=1));
      if(bad)throw new Error('일정의 날짜와 작업 개수를 확인해 주세요. 종료일은 시작일보다 빠를 수 없습니다.');
      for(const slot of (Array.isArray(content.schedule_slots)?content.schedule_slots:[])){
        if(!/^\d{4}-\d{2}$/.test(slot.month)||Number(slot.booked)>Number(slot.capacity))throw new Error('월별 슬롯의 월과 개수를 확인해 주세요. 예약 슬롯은 전체 슬롯보다 많을 수 없습니다.');
      }
      if(failed.size)throw new Error('불러오지 못한 목록이 있어 저장을 중단했습니다. 새로고침 후 다시 시도해 주세요: '+[...failed].join(', '));
      const auth=await db.rpc('inab_is_admin'); if(auth.error||auth.data!==true)throw new Error('관리자 권한을 확인할 수 없습니다. 다시 로그인해 주세요.');
      const ok=await saveContent(content); if(!ok)throw new Error('사이트 설정을 저장하지 못했습니다. '+(lastDbError()?.message||''));
      for(const name of Object.keys(S.COLLECTIONS)){
        for(const row of sets[name]||[]){
          const payload={};
          S.COLLECTIONS[name].fields.forEach((field)=>{
            let value=row[field.key];if(value===undefined)return;
            if(field.type==='number')value=(value===''||value==null)?null:Number(value);
            if(field.type==='date'&&!value)value=null;
            if(field.type==='gallery')value=String(value??'').split('\n').map((part)=>part.trim()).filter(Boolean).join('\n');
            payload[field.key]=value;
          });
          if(LEGACY_IMAGE_TABLES.includes(name)&&'images'in row)payload.image_url=String(row.images||'').split('\n').map((part)=>part.trim()).filter(Boolean)[0]||'';
          if(name==='schedule_events'){
            for(const key of ['end_date','public_title','client_name','private_memo','quantity'])if(row[key]!==undefined)payload[key]=key==='end_date'?(row[key]||null):key==='quantity'?Number(row[key]||1):row[key];
          }
          const result=row.id?await db.from(name).update(payload).eq('id',row.id).select('id').single():await db.from(name).insert(payload).select('id').single();
          if(result.error||!result.data)throw new Error(S.COLLECTIONS[name].label+' 저장 실패: '+(result.error?.message||'수정된 행이 없습니다.'));
          row.id=result.data.id;
        }
      }
      for(const row of scheduleDayPrivate.values()){
        if(!row._dirty)continue;
        const {data,error}=await db.from('schedule_day_private').upsert({calendar:row.calendar,event_date:row.event_date,private_memo:row.private_memo},{onConflict:'calendar,event_date'}).select('calendar,event_date').single();
        if(error||!data)throw new Error('날짜 관리 메모 저장 실패: '+(error?.message||'저장된 항목을 확인할 수 없습니다.'));delete row._dirty;
      }
      while(pendingDeletes.length){
        const item=pendingDeletes[0]; const result=await db.from(item.table).delete().eq('id',item.id).select('id').single();
        if(result.error||!result.data)throw new Error('삭제 실패: '+(result.error?.message||'대상을 찾지 못했습니다.'));pendingDeletes.shift();
      }
      await loadAll(); markClean('저장 후 다시 불러와 확인했습니다');toast('저장했습니다. 사이트에 반영되었습니다.');
    } catch(error){
      console.warn(error);markDirty();stateBox.textContent='저장 미완료 · 입력 내용을 유지했습니다';toast(error.message,6000);
      window.alert(error.message+'\n\n저장되지 않은 입력은 유지했습니다. 이미 저장된 항목은 다시 추가되지 않습니다.');
    } finally{button.disabled=false;}
  }

  document.getElementById('inabSave').addEventListener('click', saveAll);
  document.getElementById('inabReload').addEventListener('click', async () => {
    if (dirty && !window.confirm('저장하지 않은 변경이 사라집니다. 계속할까요?')) return;
    try { await loadAll(); } catch(error) { toast(error.message); }
  });
  document.getElementById('inabPreview').addEventListener('click', () => window.open('../index.html', '_blank'));

  document.getElementById('inabBackup').addEventListener('click', () => {
    syncFromInputs();
    const payload = { saved_at: new Date().toISOString(), content: content, sets: sets, media_assets: mediaAssets, schedule_day_private: [...scheduleDayPrivate.values()] };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'inab-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  document.getElementById('inabRestore').addEventListener('click', () => {
    document.getElementById('inabRestoreFile').click();
  });

  document.getElementById('inabRestoreFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!window.confirm('백업 내용으로 화면을 채웁니다. 저장을 눌러야 사이트에 반영됩니다. 계속할까요?')) return;
    try {
      const parsed = JSON.parse(await file.text());
      content = parsed.content || {};
      Object.keys(S.COLLECTIONS).forEach((name) => { sets[name] = (parsed.sets && parsed.sets[name]) || []; });
      pendingDeletes.length=0;
      if(Array.isArray(parsed.schedule_day_private)){scheduleDayPrivate.clear();parsed.schedule_day_private.forEach(row=>scheduleDayPrivate.set(row.calendar+':'+row.event_date,Object.assign({},row,{_dirty:true})));}
      build();
      markDirty();
      toast('백업을 불러왔습니다. 저장을 눌러 반영하세요.');
    } catch (err) {
      toast('백업 파일을 읽지 못했습니다.');
    }
    event.target.value = '';
  });

  /* ----------------------------------------------------------------- auth */
  async function openShell() {
    let result;
    try { result=await db.rpc('inab_is_admin'); }
    catch(error) { errorBox.textContent='관리자 권한을 확인하지 못했습니다. 연결 상태를 확인하고 다시 로그인해 주세요.'; return; }
    if(result.error||result.data!==true){errorBox.textContent='이 계정은 관리자 권한이 없습니다.';return;}
    gate.style.setProperty('display','none','important');shell.style.setProperty('display','block','important');
    try{await loadAll();}catch(error){stateBox.textContent='자료를 불러오지 못했습니다.';toast(error.message);}
  }

  async function login() {
    const email = document.getElementById('inabEmail').value.trim();
    const password = document.getElementById('inabPassword').value;
    errorBox.textContent = '';
    if (!db) { errorBox.textContent = 'supabase.js의 주소와 키를 먼저 채워주세요.'; return; }
    const button = document.getElementById('inabLoginBtn');
    button.disabled = true;
    try {
      const { error } = await db.auth.signInWithPassword({ email: email, password: password });
      if (error) { errorBox.textContent = '이메일 또는 비밀번호를 확인해 주세요.'; return; }
      document.getElementById('inabPassword').value='';
      await openShell();
    } catch(error) { errorBox.textContent='로그인 요청을 완료하지 못했습니다. 연결 상태를 확인해 주세요.'; }
    finally { button.disabled = false; }
  }

  document.getElementById('inabLoginBtn').addEventListener('click', login);
  ['inabEmail', 'inabPassword'].forEach((id) => {
    document.getElementById(id).addEventListener('keydown', (event) => {
      if (event.key === 'Enter') login();
    });
  });

  document.getElementById('inabLogout').addEventListener('click', async () => {
    if (dirty && !window.confirm('저장하지 않은 변경이 사라집니다. 로그아웃할까요?')) return;
    dirty = false;
    if (db) await db.auth.signOut();
    location.reload();
  });

  (async () => {
    if (!db) {
      errorBox.textContent = 'supabase.js의 주소와 키를 먼저 채워주세요.';
      return;
    }
    try {
      const { data, error } = await db.auth.getSession();
      if(error){errorBox.textContent='로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.';return;}
      if (data && data.session) await openShell();
    } catch(error) { errorBox.textContent='로그인 상태를 확인하지 못했습니다. 연결 상태를 확인해 주세요.'; }
  })();
})();
