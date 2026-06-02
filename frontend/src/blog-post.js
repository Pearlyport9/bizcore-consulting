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

function getReadTime(content) {
  const words = content ? content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200)) + ' min read';
}

async function loadPost() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const posts = await getPosts();
  const post = posts.find(p => p.id === id);

  if (!post || !post.published) {
    document.getElementById('post-loading').classList.add('hidden');
    document.getElementById('post-404').classList.remove('hidden');
    document.title = 'Post Not Found | BIZCORE Consulting';
    return;
  }

  document.title = `${post.title} | BIZCORE Consulting`;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = (post.excerpt || '').substring(0, 155);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = post.title;

  document.getElementById('post-loading').classList.add('hidden');
  document.getElementById('post-body').classList.remove('hidden');
  document.getElementById('post-category').textContent = post.category;
  document.getElementById('post-title').textContent = post.title;
  document.getElementById('post-author').textContent = post.author || 'BIZCORE';
  document.getElementById('post-date').textContent = new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('post-read-time').textContent = getReadTime(post.content || post.excerpt);

  if (post.thumbnail) {
    const thumbEl = document.getElementById('post-thumbnail');
    thumbEl.classList.remove('hidden');
    document.getElementById('post-thumbnail-img').src = post.thumbnail;
    document.getElementById('post-thumbnail-img').alt = post.title;
  }

  document.getElementById('post-content-body').innerHTML = post.content || post.excerpt || '';

  document.getElementById('author-name').textContent = post.author || 'BIZCORE Consulting';
  document.getElementById('author-bio-text').textContent = `${post.author || 'BIZCORE'} is a trusted advisor in ${post.category.toLowerCase()}.`;

  const related = posts.filter(p => p.id !== id && p.category === post.category && p.published).slice(0, 3);
  const relatedGrid = document.getElementById('related-grid');
  if (related.length === 0) {
    document.getElementById('related-posts').classList.add('hidden');
  } else {
    relatedGrid.innerHTML = related.map(p => `
      <a href="/blog-post.html?id=${p.id}" class="card !p-0 overflow-hidden group">
        <div class="aspect-[16/9] bg-brand-charcoal overflow-hidden">
          <img src="${p.thumbnail || '/assets/images/blog-placeholder.svg'}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onerror="this.style.display='none'">
        </div>
        <div class="p-5">
          <span class="badge badge-gold mb-2 inline-block text-xs">${p.category}</span>
          <h4 class="font-heading font-semibold text-brand-navy text-sm group-hover:text-brand-gold transition-colors">${p.title}</h4>
        </div>
      </a>
    `).join('');
  }
}

loadPost();
