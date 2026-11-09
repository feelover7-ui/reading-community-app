import test from 'node:test'
import assert from 'node:assert/strict'
import {MAP_LINKS,selectedMap,hallReturnUrl} from '../src/deungbul/mapChoiceRoutes.js'
test('첫 방문과 잘못된 선택 값은 선택 화면에서 시작한다',()=>{
 for(const q of ['', '?map=unknown','?map=https://example.com','?map=../../index.js'])assert.equal(selectedMap(q),null)
})
test('선택한 두 맵과 기존 법당 복귀를 올바르게 구분한다',()=>{
 assert.equal(selectedMap('?map=claude'),'claude')
 assert.equal(selectedMap('?map=codex'),'codex')
 assert.equal(selectedMap('?from=beopdang'),'claude')
 assert.equal(MAP_LINKS.codex,'/site-preview.html')
 assert.equal(MAP_LINKS.claude,'/deungbul.html?map=claude')
})
test('법당에서 나올 때 진입한 맵으로 복귀하고 외부 주소를 허용하지 않는다',()=>{
 assert.equal(hallReturnUrl('?from=codex'),'/site-preview.html?view=hall3')
 for(const q of ['', '?from=campus','?from=https://example.com'])assert.equal(hallReturnUrl(q),'/deungbul.html?map=claude&from=beopdang')
})
