import { defineConfig } from 'vite';

export default defineConfig({
  base: '/cheatdb/',
  // Generated exports stay outside the app source tree; Vite copies them at build time.
  publicDir: '../../exports/web',
  build: { target: 'es2022' },
});
