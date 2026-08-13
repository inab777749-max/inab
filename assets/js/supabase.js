/* Replace these two lines when the Supabase project changes.
   Supabase → Project Settings → API → Project URL / anon public key */
const SUPABASE_URL = 'https://jwfrgkfkwaedhnjmhuzv.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZnJna2Zrd2FlZGhuam1odXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2Mjk3MjQsImV4cCI6MjEwMjIwNTcyNH0.jhoLJYgVoHt9mJf6TrD82xG43wHaCvrEpwJpFKYl1dE';

const SUPABASE_READY = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SUPABASE_URL) && SUPABASE_ANON.length > 40;

const db = (SUPABASE_READY && window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

const CONTENT_ROW_ID = 1;

async function fetchContent() {
  if (!db) return null;
  try {
    const { data, error } = await db.from('site_content').select('data').eq('id', CONTENT_ROW_ID).maybeSingle();
    if (error) throw error;
    return (data && data.data) || {};
  } catch (err) {
    console.warn('fetchContent', err);
    return null;
  }
}

async function fetchAll(table, options) {
  if (!db) return null;
  const opts = options || {};
  try {
    let query = db.from(table).select('*');
    if (opts.order) query = query.order(opts.order, { ascending: opts.asc !== false });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('fetchAll ' + table, err);
    return null;
  }
}

async function insertRow(table, row) {
  if (!db) return false;
  const { error } = await db.from(table).insert(row);
  if (error) { console.warn('insertRow ' + table, error); return false; }
  return true;
}

async function updateRow(table, id, updates) {
  if (!db) return false;
  const { error } = await db.from(table).update(updates).eq('id', id);
  if (error) { console.warn('updateRow ' + table, error); return false; }
  return true;
}

async function deleteRow(table, id) {
  if (!db) return false;
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) { console.warn('deleteRow ' + table, error); return false; }
  return true;
}

async function saveContent(data) {
  if (!db) return false;
  const { error } = await db.from('site_content')
    .upsert({ id: CONTENT_ROW_ID, data: data, updated_at: new Date().toISOString() });
  if (error) { console.warn('saveContent', error); return false; }
  return true;
}

function showToast(message, duration) {
  let box = document.getElementById('site-toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'site-toast';
    box.style.cssText = 'position:fixed;left:50%;bottom:28px;z-index:9999;transform:translateX(-50%) translateY(14px);'
      + 'padding:13px 22px;border-radius:999px;color:#fff;background:#3b3346;font-size:14px;'
      + 'box-shadow:0 14px 40px rgba(40,30,55,.28);opacity:0;transition:opacity .25s ease,transform .25s ease;'
      + 'pointer-events:none;max-width:calc(100% - 32px);text-align:center';
    document.body.appendChild(box);
  }
  box.textContent = message;
  requestAnimationFrame(() => { box.style.opacity = '1'; box.style.transform = 'translateX(-50%) translateY(0)'; });
  clearTimeout(box._timer);
  box._timer = setTimeout(() => {
    box.style.opacity = '0';
    box.style.transform = 'translateX(-50%) translateY(14px)';
  }, duration || 2600);
}
