import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  // Les paquets du monorepo sont en TypeScript source : on les embarque dans le bundle.
  noExternal: [/^@arcade\//],
  clean: true,
});
