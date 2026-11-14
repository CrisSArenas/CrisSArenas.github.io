import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, '..');
const GEN = ['work', 'research', 'lab', 'about', 'contact'];

/* every generated page (site/index.html and site/<section>/.../index.html) is a build entry */
function entries(): Record<string, string> {
  const out: Record<string, string> = { home: path.join(here, 'index.html') };
  const walk = (dir: string) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) walk(p);
      else if (d.name === 'index.html') out[path.relative(here, p).replace(/\/index\.html$/, '')] = p;
    }
  };
  for (const g of GEN) if (fs.existsSync(path.join(here, g))) walk(path.join(here, g));
  return out;
}

/* dev only: serve the existing site (demos, memos, assets) from the repository root next to the React pages */
function legacyStatic(): Plugin {
  return {
    name: 'legacy-static',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url || '/').split('?')[0]);
        if (url.startsWith('/@') || url.startsWith('/src/') || url.startsWith('/node_modules/') || url.startsWith('/assets/site/')) return next();
        const fsPath = path.join(repo, url);
        if (!fsPath.startsWith(repo) || url === '/' || /^\/(work|research|lab|about|contact)(\/|$)/.test(url)) return next();
        if (fs.existsSync(fsPath) && fs.statSync(fsPath).isFile()) {
          const ext = path.extname(fsPath);
          const types: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.csv': 'text/csv' };
          res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
          fs.createReadStream(fsPath).pipe(res);
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  root: here,
  base: '/',
  publicDir: false,
  plugins: [react(), tailwindcss(), legacyStatic()],
  resolve: { alias: { '@': path.join(here, 'src') } },
  server: { fs: { allow: [repo] } },
  build: {
    outDir: path.join(here, 'dist'),
    emptyOutDir: true,
    assetsDir: 'assets/site',
    rollupOptions: { input: entries() }
  }
});
