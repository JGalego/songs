import { defineConfig } from 'vite';

export default defineConfig({
  // relative asset URLs, so the build works under any path (e.g. jgalego.github.io/songs/ghost_notes/)
  base: './',
  build: { target: 'es2022' },
  esbuild: { target: 'es2022' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
});
