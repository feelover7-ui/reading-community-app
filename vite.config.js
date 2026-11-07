import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// index.html: 독서 커뮤니티 앱
// deungbul.html: 한마음선원 등불사장 (정적 페이지 1개, /deungbul.html 로 열림)
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        deungbul: fileURLToPath(new URL('./deungbul.html', import.meta.url)),
      },
    },
  },
})
