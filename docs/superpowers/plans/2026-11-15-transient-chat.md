# Transient chat implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 게임을 가리지 않는 PC·모바일 대화 표시를 배포한다.
**Architecture:** v8-chat-panel.js/CSS가 일시 피드·입력줄·기록을 소유한다. HanmaumLocalChat의 전송/실패/초안 계약은 재사용한다.
**Tech Stack:** 기존 JavaScript/CSS, Node tests, Playwright.
**Spec:** docs/superpowers/specs/2026-11-15-transient-chat.md

## Global constraints
- PC 5개/모바일 3개; 8초 표시 + 1초 페이드; 접속 중 기록 60개.
- 새 라이브러리·DB·전송 계약 변경 없음. 운영 글 쓰기는 시험하지 않음.

## Review focus
- 메시지 폭주/만료/창 크기 변경: 피드 개수와 수명이 정확하고 입력을 가리지 않음.
- 기록 60개 한도에서 앞 글이 빠져도 읽던 위치를 유지함.
- 한글 IME/늦은 응답/실패 초안: 기존 회귀와 브라우저 검증 유지.
- 모바일 가상 키보드/가로 방향: 입력 버튼 모두 보이고 캔버스가 밀리지 않음.
- 기록·입력 버튼에 초점이 있어도 이동/지도 키가 뒤 게임으로 새지 않음.

### Task 1: 일시 피드와 기록/입력 UI
**Files:** public/v8-chat-panel.js, public/v8-chat-panel.css, public/v8.html, tests/v8-chat-feed.test.mjs, scripts/qa-v8-enter-chat.cjs.
**Interfaces:** 기존 render(chat), bindComposer와 quickOpen/openQuick/closeQuick 사용. feedEntries(entries,now,mobile)로 시간 필터/상한 선택, dispose(chat)로 타이머/이벤트 정리.
- [x] 만료(8000/9000ms), 최대 개수(5/3), 오래된 글 재등장 방지 테스트를 쓰고 실패 확인.
- [x] UI 분리와 기록 스크롤 앵커 보존, 키 차단·키보드 위치/캔버스 고정을 구현.
- [x] 기존 IME/초안 회귀 및 피드 테스트 통과 확인.
- [x] PC/모바일 터치, 만료, 60개 회전 기록, 키보드 모형/가로 화면을 브라우저에서 확인.
- [x] 전체 tests/*.test.mjs, build, diff check 후 커밋.

### Task 2: 검토와 배포
- [x] 전체 변경 독립 검토 후 중요한 문제 수정·재검증.
- [ ] 승인된 배포 범위로 PR/검사/병합, Vercel READY와 커밋/소스 확인.
- [ ] 운영 화면의 격리된 브라우저 확인 후 결과 보고.
