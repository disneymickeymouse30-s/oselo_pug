/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildServiceWorker, versionOf } from './src/pwa/sw-template.ts';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

/** public フォルダのファイル一覧 */
function listPublic(dir = 'public'): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative('public', p).split('\\').join('/'));
    }
  };
  walk(dir);
  return out;
}

/** ビルド時に sw.js（オフライン用の Service Worker）を作る */
function serviceWorker(): Plugin {
  return {
    name: 'pug-reversi-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      // iPhone のスプラッシュ画像は大きいので事前キャッシュせず、使われたときにキャッシュする
      const files = ['index.html', ...Object.keys(bundle), ...listPublic().filter((f) => !f.includes('splash-'))];
      const version = `${pkg.version}-${versionOf(files)}`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: buildServiceWorker(files, version) });
    },
  };
}

// GitHub Pages のサブパス（/リポジトリ名/）でも動くよう相対パスでビルドする
export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  worker: { format: 'es' },
  test: { include: ['tests/**/*.test.ts'] },
});
