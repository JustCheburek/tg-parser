import { defineConfig } from 'tsup';
import { dependencies } from './package.json';

export default defineConfig([
  {
    tsconfig: './tsconfig.json',
    dts: true,
    entry: {
      index: './src/index.ts',
    },
    platform: 'node',
    treeshake: true,
    sourcemap: false,
    splitting: false,
    clean: true,
    format: ['cjs'],
    external: Object.keys(dependencies),
  },
]);
