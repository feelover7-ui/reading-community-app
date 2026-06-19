# 독서 커뮤니티

무료 플랜 Windows Codex 실습용으로 만든 React + Vite 기반 독서 커뮤니티 MVP입니다.

## 기능

- 모바일에서 보기 좋은 독서 커뮤니티 화면
- 읽는 중 책 목록과 완독 책 목록 분리
- 책 제목, 저자, 상태, 진행률 입력 후 직접 추가
- 책 삭제
- 진행률 표시
- 책 제목/저자 내부 검색
- localStorage 저장
- 새로고침 후 데이터 유지
- 기본 샘플 책 5권 포함
- Open Library 도서 검색
- 검색 결과에서 내 서재에 추가

## 실행 방법

```powershell
npm install
npm run dev
```

브라우저에서 Vite가 안내하는 로컬 주소를 열면 됩니다. 보통 아래 주소를 사용합니다.

```text
http://localhost:5173/
```

## 테스트 방법

1. `npm run dev` 실행
2. 브라우저에서 `http://localhost:5173/` 열기
3. 도서 검색 영역에 검색어 입력 후 검색
4. 검색 결과에서 `내 서재에 추가` 클릭
5. 읽는 중 책 목록에 추가되는지 확인
6. 새로고침 후 추가한 책이 유지되는지 확인

## 빌드

```powershell
npm run build
```

빌드 결과물은 `dist` 폴더에 생성됩니다.

## GitHub

```text
https://github.com/feelover7-ui/reading-community-app.git
```

## Vercel 배포 준비

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

## Vercel Preview 배포

현재 preview 배포 주소:

```text
https://goal-windows-codex-mvp-node-js-2-6jnvt74d2-ami18.vercel.app
```

Preview 배포는 Vercel 인증 보호가 켜져 있으면 브라우저에서 Vercel 로그인이 필요할 수 있습니다.

현재 공개 접근이 확인된 Vercel 주소:

```text
https://goal-windows-codex-mvp-node-js-2.vercel.app
```

Vercel CLI 대체 배포 명령:

```powershell
npx vercel --target preview
```

Production 배포는 별도 승인 후에만 진행합니다.

## 이번 단계에서 제외한 것

- Supabase 연동
- Kakao 로그인
- `.env.local` 생성
