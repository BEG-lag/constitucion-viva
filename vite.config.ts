import { cpSync, createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const DATA = resolve(import.meta.dirname, 'data');
const OUT = resolve(import.meta.dirname, 'dist');

/**
 * The derived data lives in data/ (documented, validated, versioned with the
 * code). The app fetches it at runtime so heavy files load lazily: in dev
 * this plugin serves data/ under <base>data/, and the build copies the JSON
 * files the page uses into dist/data/.
 */
function serveData(): Plugin {
  let base = '/';
  return {
    name: 'constitucion-viva-data',
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0] ?? '');
        const prefix = `${base}data/`;
        if (!url.startsWith(prefix)) {
          next();
          return;
        }
        const file = normalize(join(DATA, url.slice(prefix.length)));
        if (!file.startsWith(DATA) || !existsSync(file) || !statSync(file).isFile()) {
          next();
          return;
        }
        res.setHeader('content-type', 'application/json; charset=utf-8');
        createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      cpSync(DATA, join(OUT, 'data'), {
        recursive: true,
        filter: (src) => !src.endsWith('.md') && !src.includes('/schema') && !src.endsWith('graph-sample.json'),
      });
    },
  };
}

export default defineConfig({
  base: '/constitucion-viva/',
  plugins: [serveData()],
  build: {
    outDir: OUT,
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: true,
    modulePreload: { polyfill: false },
  },
  server: { port: 5180, strictPort: false },
  preview: { port: 4180 },
});
