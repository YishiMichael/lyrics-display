import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy';
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/manifest.json',
          dest: '.',
        }
      ],
    }),
  ],
  build: {
    lib: {
      // Define multiple entry points
      entry: {
        action: './index.html',
        background: './src/background/main.tsx',
        content: './src/content/main.tsx',
      },
      // Specify 'iife' format
      formats: ['iife'],
      // Name of the global variable for each IIFE (required for IIFE/UMD)
      name: 'Lib',
      // Custom filename pattern
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      output: {
        extend: true,
      }
    },
  },
  // build: {
  //   outDir: 'build',
  //   rollupOptions: {
  //     input: {
  //       action: './index.html',
  //       background: './src/background/main.tsx',
  //       content: './src/content/main.tsx',
  //     },
  //     output: {
  //       format: 'iife',
  //       entryFileNames: '[name].js',
  //     },
  //   },
  // },
})
