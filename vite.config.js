import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { existsSync, statSync, readFileSync, cpSync } from 'node:fs'
import { extname } from 'node:path'

/* /v9/ 는 클로드 전용 폴더입니다. 코덱스의 v8 과 코드를 하나도 나누지 않습니다.
   Vite 가 안을 들여다보거나 고치지 않고 파일을 그대로 내보내기만 합니다.
   그래서 한쪽을 고쳐도 다른 쪽 빌드가 깨지지 않습니다. */
const V9_DIR = fileURLToPath(new URL('./v9/', import.meta.url))
const V9_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2',
}
const v9Standalone = {
  name: 'v9-standalone',
  configureServer (server) {
    server.middlewares.use((req, res, next) => {
      const path = (req.url || '').split('?')[0]
      if (path !== '/v9' && !path.startsWith('/v9/')) return next()
      const rel = path === '/v9' || path === '/v9/' ? 'index.html' : path.slice(4)
      const file = fileURLToPath(new URL(rel, new URL('./v9/', import.meta.url)))
      // 폴더 밖으로 새어 나가지 않게 막는다
      if (!file.startsWith(V9_DIR) || !existsSync(file) || statSync(file).isDirectory()) return next()
      res.setHeader('Content-Type', V9_TYPES[extname(file)] || 'application/octet-stream')
      res.end(readFileSync(file))
    })
  },
  writeBundle () {
    if (existsSync(V9_DIR)) cpSync(V9_DIR, fileURLToPath(new URL('./dist/v9/', import.meta.url)), { recursive: true })
  },
}

// index.html: 독서 커뮤니티 앱
// deungbul.html: 한마음선원 등불사장 (정적 페이지 1개, /deungbul.html 로 열림)
export default defineConfig({
  plugins: [react(), v9Standalone, {
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
