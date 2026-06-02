import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = join(__dirname, '..', 'content', 'blog');
const outputPath = join(__dirname, '..', 'public', 'posts.json');

if (!existsSync(contentDir)) {
  writeFileSync(outputPath, '[]');
  console.log('No content directory found. Created empty posts.json');
  process.exit(0);
}

const files = readdirSync(contentDir).filter(f => f.endsWith('.json') || f.endsWith('.md'));

const posts = files.map(file => {
  const raw = readFileSync(join(contentDir, file), 'utf-8');
  const ext = extname(file);
  const slug = file.replace(/\.(json|md)$/, '');

  try {
    if (ext === '.json') {
      const data = JSON.parse(raw);
      return {
        id: slug,
        slug,
        title: data.title || 'Untitled',
        date: data.date || new Date().toISOString(),
        author: data.author || 'BIZCORE Team',
        category: data.category || 'Uncategorized',
        thumbnail: data.thumbnail || data.cover_image || '',
        excerpt: data.excerpt || '',
        content: data.body || data.content || '',
        published: true,
      };
    }

    if (ext === '.md') {
      const frontmatter = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!frontmatter) return null;
      const meta = {};
      for (const line of frontmatter[1].split('\n')) {
        const kv = line.match(/^(\w+):\s*(.*)/);
        if (kv) {
          let val = kv[2].trim();
          val = val.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
          if (val === 'true') val = true;
          else if (val === 'false') val = false;
          else if (val.startsWith('[') && val.endsWith(']')) {
            try { val = JSON.parse(val.replace(/'/g, '"')); } catch {}
          }
          meta[kv[1]] = val;
        }
      }
      const body = frontmatter[2].trim();
      return {
        id: slug,
        slug: meta.slug || slug,
        title: meta.title || 'Untitled',
        date: meta.date || new Date().toISOString(),
        author: meta.author || 'BIZCORE Team',
        category: meta.category || 'Uncategorized',
        thumbnail: meta.thumbnail || meta.cover_image || '',
        excerpt: meta.excerpt || '',
        content: body,
        published: true,
      };
    }

    return null;
  } catch {
    return null;
  }
}).filter(Boolean);

posts.sort((a, b) => new Date(b.date) - new Date(a.date));
writeFileSync(outputPath, JSON.stringify(posts, null, 2));
console.log(`Generated posts.json with ${posts.length} posts`);
