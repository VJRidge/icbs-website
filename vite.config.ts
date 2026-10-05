import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { brandDraftPlugin } from './src/brand/devDraftPlugin'

export default defineConfig({
  plugins: [react(), tailwindcss(), brandDraftPlugin()],
})
