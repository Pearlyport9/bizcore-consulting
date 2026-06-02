import { supabase } from './supabase.js';

const BLOG_KEY = 'bizcore_blog_posts';
let cmsPosts = null;

async function getPosts() {
  if (cmsPosts) return cmsPosts;
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('published', true)
      .order('date', { ascending: false });
    if (!error && data && data.length > 0) {
      cmsPosts = data;
      return cmsPosts;
    }
  } catch (err) {
    console.warn('Supabase unavailable, falling back:', err);
  }
  try {
    const res = await fetch('/posts.json');
    if (res.ok) {
      cmsPosts = await res.json();
      return cmsPosts;
    }
  } catch {}
  try {
    return JSON.parse(localStorage.getItem(BLOG_KEY)) || [];
  } catch { return []; }
}

function renderCategory(active) {
  document.querySelectorAll('#category-filter .badge').forEach(btn => {
    const cat = btn.dataset.category;
    if (cat === active) {
      btn.className = 'badge badge-gold cursor-pointer';
    } else {
      btn.className = 'badge bg-gray-100 text-brand-muted cursor-pointer hover:bg-brand-gold/15 hover:text-brand-gold transition-all';
    }
  });
}

async function renderPosts(category = 'all', page = 0, pageSize = 7) {
  const allPosts = await getPosts();
  const posts = allPosts.filter(p => p.published).sort((a, b) => new Date(b.date) - new Date(a.date));
  const filtered = category === 'all' ? posts : posts.filter(p => p.category === category);

  const featuredEl = document.getElementById('featured-post');
  const gridEl = document.getElementById('posts-grid');
  const emptyEl = document.getElementById('empty-state');
  const loadMoreContainer = document.getElementById('load-more-container');

  if (filtered.length === 0) {
    featuredEl.innerHTML = '';
    gridEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    loadMoreContainer.classList.add('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  if (page === 0 && filtered.length > 0) {
    const f = filtered[0];
    featuredEl.innerHTML = `
      <a href="/blog-post.html?id=${f.id}" class="card flex flex-col lg:flex-row overflow-hidden !p-0 hover:!translate-y-0">
        <div class="lg:w-2/5 aspect-[16/9] lg:aspect-auto bg-brand-charcoal">
          <img src="${f.thumbnail || '/assets/images/blog-placeholder.svg'}" alt="${f.title}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.display='none'">
        </div>
        <div class="lg:w-3/5 p-8 flex flex-col justify-center">
          <span class="badge badge-gold mb-3 self-start">${f.category}</span>
          <h3 class="font-heading text-2xl font-semibold text-brand-navy mb-3">${f.title}</h3>
          <p class="text-brand-muted text-sm mb-4 line-clamp-2">${f.excerpt}</p>
          <div class="flex items-center gap-3 text-xs text-brand-muted">
            <span>${f.author || 'BIZCORE'}</span>
            <span>&middot;</span>
            <span>${new Date(f.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </a>
    `;
  } else {
    featuredEl.innerHTML = '';
  }

  const start = page === 0 ? 1 : page * pageSize;
  const end = start + pageSize;
  const pagePosts = filtered.slice(start, end);

  if (pagePosts.length === 0) {
    loadMoreContainer.classList.add('hidden');
    return;
  }

  gridEl.innerHTML += pagePosts.map(p => `
    <a href="/blog-post.html?id=${p.id}" class="card flex flex-col !p-0 overflow-hidden group">
      <div class="aspect-[16/9] bg-brand-charcoal overflow-hidden">
        <img src="${p.thumbnail || '/assets/images/blog-placeholder.svg'}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onerror="this.style.display='none'">
      </div>
      <div class="p-6 flex flex-col flex-1">
        <span class="badge badge-gold mb-2 self-start">${p.category}</span>
        <h3 class="font-heading text-lg font-semibold text-brand-navy mb-2 group-hover:text-brand-gold transition-colors">${p.title}</h3>
        <p class="text-brand-muted text-sm mb-4 line-clamp-2 flex-1">${p.excerpt}</p>
        <div class="flex items-center justify-between text-xs text-brand-muted">
          <span>${p.author || 'BIZCORE'} &middot; ${new Date(p.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          <span class="text-brand-gold font-heading font-semibold uppercase tracking-wider text-xs">Read More →</span>
        </div>
      </div>
    </a>
  `).join('');

  if (end < filtered.length) {
    loadMoreContainer.classList.remove('hidden');
    loadMoreContainer.dataset.page = page + 1;
    loadMoreContainer.dataset.category = category;
  } else {
    loadMoreContainer.classList.add('hidden');
  }
}

document.getElementById('category-filter').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-category]');
  if (!btn) return;
  const cat = btn.dataset.category;
  renderCategory(cat);
  document.getElementById('featured-post').innerHTML = '';
  document.getElementById('posts-grid').innerHTML = '';
  await renderPosts(cat, 0);
});

document.getElementById('category-filter-mobile').addEventListener('click', async function(e) {
  const btn = e.target.closest('[data-category]');
  if (!btn) return;
  document.querySelectorAll('#category-filter-mobile .category-segmented').forEach(function(b) {
    b.className = 'category-segmented whitespace-nowrap px-4 py-2 rounded-full text-sm font-heading font-medium border transition-all bg-white text-brand-muted border-gray-200';
  });
  btn.className = 'category-segmented whitespace-nowrap px-4 py-2 rounded-full text-sm font-heading font-medium border transition-all bg-brand-gold text-brand-navy border-brand-gold';
  const cat = btn.dataset.category;
  renderCategory(cat);
  document.getElementById('featured-post').innerHTML = '';
  document.getElementById('posts-grid').innerHTML = '';
  await renderPosts(cat, 0);
});

document.getElementById('load-more-btn').addEventListener('click', async () => {
  const container = document.getElementById('load-more-container');
  const page = parseInt(container.dataset.page || '1');
  const cat = container.dataset.category || 'all';
  await renderPosts(cat, page);
});

renderCategory('all');
renderPosts('all', 0);
