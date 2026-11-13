# v8 위치 전송 최적화 구현 계획
Spec: ../specs/2026-11-13-v8-motion-network.md
1. 순수 motion 모듈에 정규화·예측·전송 결정 추가. 가짜 시계로 정지 무전송/직선 억제/시작·정지/회전/오차·속도 범위·실패 후 재시도 RED→GREEN.
2. 기존 room 채널과 ref 보호를 유지하며 scene motion/inbox 수명 관리 추가. 이전 콜백 무효화, targeted snapshot, 동일 장소 격리, 전송 실패/재접속을 mock과 실제SDK로 검증.
3. inline proxy와 features의100ms 샘플/수신 예측/scene-change/peerCount를 연결. 오프라인 탭과 저장·게임은 유지.
4. 전체 단위 테스트/빌드/PC·모바일 독립 브라우저를 검증. 임시 방 부하 시험은 새 sender를 통해 호출하고 실제 전송 건수를 따로 기록. 직선과 반복 회전은 별도 결과.
5. 실행 계획 스킬에 따라 독립 최종 코드 리뷰1회, 중요 사항 수정 및 회귀 검증. PR 본문은 기존 요청대로 ‘검증 못 했음’. 승인된 배포 범위 내 main 병합 후 정확한 운영 SHA와 공개 주소 재확인.
