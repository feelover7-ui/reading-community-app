# Guided Visit Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.
**Goal:** 제작·자동 참배 동선과 현장 방명록을 편하게 만든다.
**Architecture:** 기존 장면에 공용 보행 경로 탐색/이동기를 연결하고 제작 순서는 버전 있는 공용 상태로 관리한다. 방명록은 기존 API를 그대로 사용한다.
**Tech Stack:** JavaScript, Three.js, Vite, node:test, Playwright.
**Spec:** docs/superpowers/specs/2026-11-11-guided-visit-design.md
## Global Constraints
고정 시설 배치, DB 쓰기 없는 검증, 새 의존성 없음, 병합·배포 없음.
## Review Focus
저장 단계 마이그레이션; 장애물/도량 밖 경로; 자동 이동 중 모달·수동입력·페이지 복원; 방석 점유; 방명록 날짜 없음/잘못된 값.
### Task 1: 제작 순서와 저장
- [x] craftProgress.js/lanternCraft.js에 버전2 순서와 이전 진행 마이그레이션, 반복터치 축소, 채색 후 완성.
- [x] 단계 복원/검증 테스트 추가 후 node --test tests/*.test.mjs 통과.
### Task 2: 안내 보행과 탑돌이
- [x] guidedWalk.js에 findWalkPath/createGuidedWalk 구현. 장애물·차단·중단 테스트.
- [x] campusScene.js에 목적지/다음작업 버튼, 입구 게시판, 자동 한바퀴/추가바퀴·안정 카메라 연결.
### Task 3: 법당과 방명록
- [x] beopdang.js에 빈 방석 선택/자동 이동/도착 후 선택 연결.
- [x] communityTime.js 및 campusServices.js에 한국시간 time 요소, 날짜 없는 글 대체 문구, 기존 API/초안 보존.
### Task 4: 검증·전달
- [x] 전체 테스트/빌드/PC·모바일 브라우저 실제 흐름, 방명록 API mock으로 날짜 확인. 운영 DB 쓰기 없음.
- [x] 독립 코드 리뷰, 문서와 실행 화면, 새 PR 하나(본문 검증 못 했음).
