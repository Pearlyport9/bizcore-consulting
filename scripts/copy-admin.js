import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');
const admin = join(dist, 'admin');

if (!existsSync(admin)) mkdirSync(admin, { recursive: true });
cpSync(join(root, 'admin'), admin, { recursive: true, force: true });

const postsJson = join(root, 'public', 'posts.json');
if (existsSync(postsJson)) cpSync(postsJson, join(dist, 'posts.json'), { force: true });

console.log('Copied admin/ and posts.json to dist/');
