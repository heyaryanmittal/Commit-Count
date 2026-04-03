import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Optimized for Netlify Deployment
export default defineConfig({
  plugins: [react()],
  // Remove base path so assets load from root /
})
