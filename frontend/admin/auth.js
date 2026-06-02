import { supabase } from '../src/supabase.js';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@bizcoreconsulting.com';
const BLOG_FOLDER = '/content/blog/';
let posts = [];
let searchQuery = '';

function getSlug(title) {
  return title.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80) || 'untitled';
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const raw = match[1];
  const body = match[2].trim();
  const meta = {};
  const lines = raw.split('\n');
  let currentKey = null;
  let currentVal = '';
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (kv) {
      if (currentKey) meta[currentKey] = parseValue(currentVal.trim());
      currentKey = kv[1];
      currentVal = kv[2];
    } else if (currentKey) {
      currentVal += '\n' + line;
    }
  }
  if (currentKey) meta[currentKey] = parseValue(currentVal.trim());
  return { meta, body };
}

function parseValue(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === '') return '';
  if (val.startsWith('[') && val.endsWith(']')) {
    try { return JSON.parse(val.replace(/'/g, '"')); } catch { return val; }
  }
  if (!isNaN(val) && val !== '') return Number(val);
  return val;
}

function toFrontmatter(meta) {
  let out = '---\n';
  for (const [k, v] of Object.entries(meta)) {
    if (v === true) out += `${k}: true\n`;
    else if (v === false) out += `${k}: false\n`;
    else if (Array.isArray(v)) out += `${k}: ${JSON.stringify(v)}\n`;
    else if (typeof v === 'string' && (v.includes(':') || v.includes('#'))) out += `${k}: "${v}"\n`;
    else out += `${k}: ${v}\n`;
  }
  out += '---\n';
  return out;
}

async function loadPosts() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('date', { ascending: false });
      if (!error && data) {
        posts = data.map(p => ({
          ...p,
          file: p.slug ? `${p.slug}.md` : `${p.id}.md`,
          body: p.content || ''
        }));
        renderTable();
        return;
      }
    } catch (err) {
      console.warn('Failed to load posts from Supabase, falling back to local markdown', err);
    }
  }

  try {
    const resp = await fetch(BLOG_FOLDER);
    if (!resp.ok) { posts = []; renderTable(); return; }
    const html = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = [...doc.querySelectorAll('a')];
    const mdFiles = links.map(a => a.textContent).filter(f => f.endsWith('.md'));
    posts = [];
    for (const file of mdFiles) {
      try {
        const fileResp = await fetch(`${BLOG_FOLDER}${file}`);
        if (!fileResp.ok) continue;
        const text = await fileResp.text();
        const parsed = parseFrontmatter(text);
        if (!parsed) continue;
        posts.push({ file, ...parsed.meta, body: parsed.body });
      } catch {
        continue;
      }
    }
  } catch {
    posts = [];
  }
  renderTable();
}

async function savePostToFile(meta, body, originalFile) {
  const { data: { session } } = await supabase.auth.getSession();
  const slug = meta.slug || getSlug(meta.title);
  const filename = `${slug}.md`;
  if (session) {
    const postPayload = {
      slug: slug,
      title: meta.title,
      date: meta.date,
      author: meta.author,
      category: meta.category,
      thumbnail: meta.cover_image || '',
      excerpt: meta.excerpt,
      content: body,
      tags: meta.tags || [],
      featured: !!meta.featured,
      published: true
    };
    try {
      const postId = document.getElementById('postId').value;
      let result;
      if (postId) {
        result = await supabase
          .from('posts')
          .update(postPayload)
          .eq('id', postId)
          .select()
          .single();
      } else {
        postPayload.id = String(Date.now());
        result = await supabase
          .from('posts')
          .insert(postPayload)
          .select()
          .single();
      }
      const { data: saved, error } = result;
      if (!error && saved) {
        showToast(postId ? 'Post updated' : 'Post published to site', 'success');
        if (postId) {
          const idx = posts.findIndex(p => p.id === postId || p.file === document.getElementById('editOriginalFile').value);
          if (idx !== -1) {
            posts[idx] = { ...posts[idx], ...saved, file: filename, body: body };
          } else {
            posts.unshift({ ...saved, file: filename, body: body });
          }
        } else {
          posts.unshift({ ...saved, file: filename, body: body });
        }
        renderTable();
        closeEditor();
        return;
      }
    } catch (err) {
      // fall back to download if publish fails
    }
  }

  const frontmatter = toFrontmatter(meta);
  const content = frontmatter + body + '\n';
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (originalFile && originalFile !== filename) {
    showToast(`Original file "${originalFile}" needs to be deleted manually. New file "${filename}" has been downloaded.`, 'success');
  } else {
    showToast(`"${filename}" downloaded. Place it in ${BLOG_FOLDER} and refresh.`, 'success');
  }
  closeEditor();
  setTimeout(loadPosts, 1000);
}

function renderTable() {
  const q = searchQuery.toLowerCase();
  const filtered = posts.filter(p => !q || (p.title && p.title.toLowerCase().includes(q)));
  document.getElementById('statTotal').textContent = posts.length;
  document.getElementById('statFeatured').textContent = posts.filter(p => p.featured === true).length;
  document.getElementById('statDrafts').textContent = posts.filter(p => p.featured !== true).length;
  const tbody = document.getElementById('postsBody');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${posts.length === 0 ? 'No posts yet. Create your first post!' : 'No posts match your search.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map((p) => `
    <tr>
      <td><strong style="font-family:'Outfit',sans-serif">${escHtml(p.title || 'Untitled')}</strong></td>
      <td><span class="badge badge-no">${escHtml(p.category || 'Uncategorized')}</span></td>
      <td style="color:var(--muted);font-size:13px">${p.date ? formatDate(p.date) : '–'}</td>
      <td><span class="badge ${p.featured ? 'badge-yes' : 'badge-no'}">${p.featured ? 'Yes' : 'No'}</span></td>
      <td class="actions">
        <button class="edit-btn" data-file="${escHtml(p.file)}">Edit</button>
        <button class="del-btn" data-file="${escHtml(p.file)}">Delete</button>
      </td>
    </tr>
  `).join('');
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(t._hide);
  t._hide = setTimeout(() => t.classList.remove('show'), 4000);
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('emailInput').value = ADMIN_EMAIL;
  document.getElementById('passwordInput').value = '';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  loadPosts();
}

async function login() {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  if (!email || !password) {
    document.getElementById('loginError').textContent = 'Email and password are required';
    document.getElementById('loginError').style.display = 'block';
    return;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById('loginError').textContent = error.message || 'Invalid credentials';
    document.getElementById('loginError').style.display = 'block';
  }
}

async function uploadImageFile(file) {
  if (!file) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    showToast('Not authenticated', 'error');
    return null;
  }
  const ext = file.name.split('.').pop();
  const filePath = `blog/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  try {
    const { data, error } = await supabase.storage
      .from('blog-images')
      .upload(filePath, file, { upsert: false });
    if (error) {
      showToast(error.message || 'Upload failed', 'error');
      return null;
    }
    const { data: { publicUrl } } = supabase.storage
      .from('blog-images')
      .getPublicUrl(data.path);
    return publicUrl;
  } catch (err) {
    showToast('Upload failed', 'error');
    return null;
  }
}

async function logout() {
  await supabase.auth.signOut();
}

function openEditor(post = null) {
  document.getElementById('editorTitle').textContent = post ? 'Edit Post' : 'New Post';
  document.getElementById('editOriginalFile').value = post ? post.file : '';
  document.getElementById('postTitle').value = post ? post.title || '' : '';
  document.getElementById('postSlug').value = post ? post.slug || '' : '';
  document.getElementById('postExcerpt').value = post ? post.excerpt || '' : '';
  document.getElementById('postCategory').value = post ? post.category || '' : '';
  document.getElementById('postCover').value = post ? post.thumbnail || '' : '';
  document.getElementById('postDate').value = post ? formatDateInput(post.date) : '';
  document.getElementById('postAuthor').value = post ? post.author || 'BIZCORE Team' : 'BIZCORE Team';
  document.getElementById('postFeatured').checked = post ? post.featured === true : false;
  document.getElementById('postTags').value = post && post.tags ? (Array.isArray(post.tags) ? post.tags.join(', ') : post.tags) : '';
  const editorBody = document.getElementById('postBodyEditor');
  const postBody = document.getElementById('postBody');
  if (post && post.body) {
    editorBody.innerHTML = post.body;
    postBody.value = post.body;
  } else {
    editorBody.innerHTML = '';
    postBody.value = '';
  }
  document.getElementById('postId').value = post ? post.id || '' : '';
  const deleteBtn = document.getElementById('deletePostBtn');
  if (post) { deleteBtn.classList.remove('hidden'); deleteBtn.dataset.file = post.file; }
  else deleteBtn.classList.add('hidden');
  document.getElementById('editorOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeEditor() {
  document.getElementById('editorOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function initAuthGuard() {
  if (window.location.pathname === '/admin') {
    window.location.replace('/admin/');
    return;
  }

  const toolbar = document.getElementById('editorToolbar');
  const editor = document.getElementById('postBodyEditor');
  if (toolbar && editor) {
    toolbar.addEventListener('click', (e) => {
      e.preventDefault();
      const btn = e.target.closest('button');
      if (!btn) return;
      const command = btn.dataset.command;
      const value = btn.dataset.value;
      editor.focus();
      if (command === 'createLink') {
        const url = prompt('Enter URL:');
        if (url) document.execCommand('createLink', false, url);
      } else if (command === 'formatBlock') {
        document.execCommand(command, false, value);
      } else {
        document.execCommand(command, false, null);
      }
    });
  }

  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('passwordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderTable();
  });
  document.getElementById('newPostBtn').addEventListener('click', () => openEditor(null));
  document.getElementById('closeEditor').addEventListener('click', closeEditor);
  document.getElementById('cancelEditor').addEventListener('click', closeEditor);
  document.getElementById('postTitle').addEventListener('input', function() {
    const slugField = document.getElementById('postSlug');
    if (!slugField.dataset.manual) {
      slugField.value = getSlug(this.value);
    }
  });
  document.getElementById('postSlug').addEventListener('input', function() {
    this.dataset.manual = this.value.length > 0;
  });
  document.getElementById('postForm').addEventListener('submit', e => {
    e.preventDefault();
    const meta = {
      title: document.getElementById('postTitle').value.trim(),
      slug: document.getElementById('postSlug').value.trim() || getSlug(document.getElementById('postTitle').value),
      date: document.getElementById('postDate').value ? new Date(document.getElementById('postDate').value).toISOString() : new Date().toISOString(),
      author: document.getElementById('postAuthor').value.trim() || 'BIZCORE Team',
      excerpt: document.getElementById('postExcerpt').value.trim(),
      category: document.getElementById('postCategory').value,
      cover_image: document.getElementById('postCover').value.trim() || undefined,
      tags: document.getElementById('postTags').value.trim() ? document.getElementById('postTags').value.split(/\s*,\s*/).map(t => t.trim()).filter(Boolean) : undefined,
      featured: document.getElementById('postFeatured').checked
    };
    const editorBody = document.getElementById('postBodyEditor');
    const body = editorBody.innerHTML.trim();
    if (!meta.title) { showToast('Title is required', 'error'); return; }
    if (!meta.excerpt) { showToast('Excerpt is required', 'error'); return; }
    if (!meta.category) { showToast('Category is required', 'error'); return; }
    if (!body) { showToast('Post body is required', 'error'); return; }
    const originalFile = document.getElementById('editOriginalFile').value;
    savePostToFile(meta, body, originalFile);
  });
  document.getElementById('deletePostBtn').addEventListener('click', async function() {
    const file = this.dataset.file;
    if (!file) return;
    const post = posts.find(p => p.file === file || p.id === file);
    if (!confirm(`Delete "${file}"? This cannot be undone.`)) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (session && post && post.id) {
      try {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', post.id);
        if (!error) {
          posts = posts.filter(p => p.id !== post.id);
          showToast(`Deleted "${file}".`, 'success');
          renderTable();
          closeEditor();
          return;
        }
      } catch (err) {
        console.warn('Supabase delete failed', err);
      }
    }

    showToast(`"${file}" needs to be deleted manually from ${BLOG_FOLDER}.`, 'success');
    closeEditor();
  });
  document.getElementById('postsBody').addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const file = btn.dataset.file;
    const post = posts.find(p => p.file === file);
    if (btn.classList.contains('edit-btn') && post) openEditor(post);
    if (btn.classList.contains('del-btn') && post) {
      if (!confirm(`Delete "${post.title || file}"?`)) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session && post.id) {
        try {
          const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', post.id);
          if (!error) {
            posts = posts.filter(p => p.id !== post.id);
            renderTable();
            showToast(`Deleted "${post.title || file}"`, 'success');
            return;
          }
        } catch (err) {
          console.warn('Supabase delete failed', err);
        }
      }
      showToast(`Delete "${file}" manually from ${BLOG_FOLDER} and refresh.`, 'success');
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      showDashboard();
    } else if (event === 'SIGNED_OUT') {
      showLoginScreen();
    }
  });

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      showDashboard();
    } else {
      showLoginScreen();
    }
  });
}

function initCoverUpload() {
  const dz = document.getElementById('coverDropzone');
  const fileInput = document.getElementById('postCoverFile');
  const urlInput = document.getElementById('postCover');
  if (!dz || !fileInput || !urlInput) return;
  dz.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    dz.classList.remove('dragover');
    showToast('Uploading image...', 'success');
    const uploaded = await uploadImageFile(f);
    if (uploaded) {
      urlInput.value = uploaded;
      showToast('Image uploaded', 'success');
    }
  });
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', async (e) => {
    e.preventDefault(); dz.classList.remove('dragover');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    showToast('Uploading image...', 'success');
    const uploaded = await uploadImageFile(f);
    if (uploaded) {
      urlInput.value = uploaded;
      showToast('Image uploaded', 'success');
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initAuthGuard();
  initCoverUpload();
});
