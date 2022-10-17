const config = {
    publicDir: 'public',
    base: '/modules/obs-utils/',
    server: {
      port: 30001,
      open: true,
      proxy: {
        '^(?!/modules/obs-utils/)': 'http://localhost:30000/',
        '/socket.io': {
          target: 'ws://localhost:30000',
          ws: true,
        },
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      lib: {
        name: 'obs-utils',
        entry: 'obs-utils.js',
        formats: ['es'],
        fileName: 'lancer'
      }
    },
}