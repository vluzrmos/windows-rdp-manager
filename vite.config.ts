import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import pkg from './package.json';

// Versão + build exibidos na tela "Sobre" (build-info.json é gerado por scripts/build-number.js)
const buildInfoPath = path.resolve(__dirname, 'build-info.json');
const buildInfo = fs.existsSync(buildInfoPath) ? JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8')) : {};
const APP_INFO = {
  version: pkg.version,
  buildNumber: buildInfo.buildNumber ?? null,
  buildDate: buildInfo.buildDate ?? null,
};

// CSP aplicada só no build: o servidor de dev do Vite injeta scripts inline (React Refresh)
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const cspPlugin: Plugin = {
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
  ],
};

export default defineConfig({
  plugins: [react(), cspPlugin],
  define: {
    __APP_INFO__: JSON.stringify(APP_INFO),
  },
  base: './',
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
