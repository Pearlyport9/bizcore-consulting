import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = join(__dirname, '..', 'content', 'blog');
const outputPath = join(__dirname, '..', 'public', 'posts.json');

if (!existsSync(contentDir)) {
  writeFileSync(outputPath, '[]');
  console.log('No content directory found. Created empty posts.json');
  process.exit(0);
}

const files = readdirSync(contentDir).filter(f => f.endsWith('.json'));
const posts = files.map(file => {
  const raw = readFileSync(join(contentDir, file), 'utf-8');
  try {
    const data = JSON.parse(raw);
    const slug = file.replace(/\.json$/, '');
    return {
      id: slug,
      slug,
      title: data.title || 'Untitled',
      date: data.date || new Date().toISOString(),
      author: data.author || 'BIZCORE Team',
      category: data.category || 'Uncategorized',
      thumbnail: data.thumbnail || '',
      excerpt: data.excerpt || '',
      content: data.body || '',
      published: true,
    };
  } catch {
    return null;
  }
}).filter(Boolean);

posts.sort((a, b) => new Date(b.date) - new Date(a.date));
writeFileSync(outputPath, JSON.stringify(posts, null, 2));
console.log(`Generated posts.json with ${posts.length} posts`);
