# v8 Multiplayer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** v8의 기존 함께 접속 UI로 서로 다른 기기가 캐릭터·위치·대화를 공유한다.
**Architecture:** Supabase Realtime Presence/Broadcast를 v8 기존 relay 인터페이스에 연결한다. Vite 독립 JS entry로 환경설정을 번들한다.
**Tech Stack:** JavaScript, Vite, existing @supabase/supabase-js, node:test, Playwright.
**Spec:** docs/superpowers/specs/2026-11-13-v8-multiplayer-design.md

## Global Constraints
- v8 화면/배치/제작/성장/탑돌이 변경 없음. 기존 페이지 코드와 혼합 없음.
- 새 DB/라이브러리/환경변수 변경 없음. 위치/대화는 DB가 아닌 Realtime만 사용.
- 공개 방이며 계정 인증이나 영구 대화 저장 없음.

## Review Focus
- 빠른 방 변경 중 이전 subscribe/send 결과가 새 방을 건드리지 않는다.
- 백그라운드 참가자를 단순 위치 지연만으로 퇴장시키지 않는다.
- 끊긴 연결/실패 전송은 초안 보존, 수동 퇴장은 자동 재접속 금지.
- 늦은 입장자는 정지한 기존 참가자의 현재 위치를 받는다.
- 세오산을 포함한 서로 다른 장면은 인형을 섞어 그리지 않는다.

### Task 1: Realtime adapter
- [x] src/v8/realtime.js에 주입 가능한 createV8RealtimeClient({client,onMessage,onStatus,id}) 인터페이스 테스트를 먼저 추가한다.
- [x] tests/v8-realtime.test.mjs: invalid room/message, two clients/room isolation/leave, stale subscribe/send, presence TTL, position suppression, failure/reconnect를 mock으로 검증한다.
- [x] src/v8/network.js가 기존 환경변수로 SDK client를 만들고 Vite entry v8-network.js를 생성한다.

### Task 2: Existing UI integration
- [x] public/v8.html relay script만 dynamic module adapter로 교체한다.
- [x] 온라인 presence 퇴장/세오산 장면/대화 실패 초안과 중복 전송 방지만 연결한다.
- [x] 기존 scripts 불변 비교 및 전체 node tests/build를 실행한다.

### Task 3: Browser/release verification
- [x] 실제 Realtime 전용 시험방에서 PC+모바일 독립 context 두 개의 이름/외형/위치/장면/대화/퇴장/재접속/방 분리를 확인한다.
- [x] PR 검토 가능한 문서/검증 기록을 남기고, 허용된 배포로 운영 v8 주소를 검증한다.
