import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// index.html: 독서 커뮤니티 앱
// deungbul.html: 한마음선원 등불사장 (정적 페이지 1개, /deungbul.html 로 열림)
export default defineConfig({
  plugins: [react(), {
    name: 'v8-network-dev-entry',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] === '/v8-network.js') req.url = '/src/v8/network.js'
        next()
      })
    },
  }],
  build: {
    rollupOptions: {
      preserveEntrySignatures: 'exports-only',
      output: { entryFileNames: chunk => chunk.name === 'v8Network' ? 'v8-network.js' : 'assets/[name]-[hash].js' },
      input: {
        v8Network: fileURLToPath(new URL('./src/v8/network.js', import.meta.url)),
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        deungbul: fileURLToPath(new URL('./deungbul.html', import.meta.url)),
        doryang: fileURLToPath(new URL('./doryang.html', import.meta.url)),
        beopdang: fileURLToPath(new URL('./beopdang.html', import.meta.url)),
        // 원본 HTML 맵 미리보기. 운영 화면과 분리된 별도 진입점입니다.
        sitePreview: fileURLToPath(new URL('./site-preview.html', import.meta.url)),
        siteCompare: fileURLToPath(new URL('./site-compare.html', import.meta.url)),
        original: fileURLToPath(new URL('./original.html', import.meta.url)),
      },
    },
  },
})
