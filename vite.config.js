import { svelte } from '@sveltejs/vite-plugin-svelte';
import IstanbulPlugin from 'vite-plugin-istanbul';
import visualizer from 'rollup-plugin-visualizer';

const config = {
  base: '/modules/obs-utils/',
  resolve: { conditions: ['import', 'browser'] },
  esbuild: {
    target: ['esnext', 'chrome100'],
    keepNames: true, // Note: doesn't seem to work.
  },
  server: {
    port: 30001,
    open: true,
    proxy: {
      '^(?!/modules/obs-utils/)': 'http://localhost:30000/',
      '/socket.io': {
        target: 'ws://localhost:30000',
        ws: true,
      },
    },
  },
  plugins: [svelte(), IstanbulPlugin({
    include: 'src/*',
    exclude: ['node_modules','test/'],
    extention: ['.ts', '.svelte'],
    checkProd: true,
    forceBuildInstrument: true,
    requireEnv: true
  }),visualizer()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      name: 'obs-utils',
      entry: 'src/obs-utils.ts',
      formats: ['es'],
      fileName: 'obs-utils',
    },
  },
};

export default config;
