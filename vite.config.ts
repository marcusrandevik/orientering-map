import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Production builds are served from GitHub Pages at /orientering-map/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/orientering-map/' : '/',
  plugins: [react(), tailwindcss()],
}));
