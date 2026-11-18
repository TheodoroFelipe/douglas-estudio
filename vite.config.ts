import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Em produção o site fica em https://theodorofelipe.github.io/douglas-estudio/ (GitHub Pages).
// No `npm run dev` continua na raiz.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/douglas-estudio/' : '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
}))
