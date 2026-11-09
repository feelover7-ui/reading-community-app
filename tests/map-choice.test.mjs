import test from 'node:test'
import assert from 'node:assert/strict'
import { MAP_LINKS, hallReturnUrl } from '../src/deungbul/mapChoiceRoutes.js'

/* 사용자 요청(2026-11-09): 맵 선택 화면을 없애고 예전처럼 한 곳으로 들어간다. */
test('들어가는 곳은 도량 하나뿐이다', () => {
  assert.deepEqual(Object.keys(MAP_LINKS), ['yard'])
  assert.equal(MAP_LINKS.yard, '/deungbul.html')
})

test('법당에서 나오면 도량으로 돌아가고 외부 주소를 쓰지 않는다', () => {
  for (const q of ['', '?from=codex', '?from=campus', '?from=https://example.com']) {
    const url = hallReturnUrl(q)
    assert.equal(url, '/deungbul.html?from=beopdang')
    assert.equal(url.startsWith('/'), true, '바깥 주소로 나가면 안 된다')
  }
})
