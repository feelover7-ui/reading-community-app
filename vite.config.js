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
        doryang: fileURLToPath(new URL('./doryang.html', import.meta.url)),
        beopdang: fileURLToPath(new URL('./beopdang.html', import.meta.url)),
        // 원본 HTML 맵 미리보기. 운영 화면과 분리된 별도 진입점입니다.
        original: fileURLToPath(new URL('./original.html', import.meta.url)),
      },
    },
  },
})
