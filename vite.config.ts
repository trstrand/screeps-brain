import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.ts',
      fileName: () => 'main.js',
      formats: ['cjs'], // Screeps engine expects CommonJS for the entry point
    },
    //outDir: 'C:\\Users\\trstr\\AppData\\Local\\Screeps\\scripts\\127_0_0_1___21025\\default',
    outDir: 'C:\\Users\\trstr\\AppData\\Local\\Screeps\\scripts\\screeps.com\\default',
    minify: false, // Set to true to save space, false for easier debugging in-game
    emptyOutDir: true,
  },
});