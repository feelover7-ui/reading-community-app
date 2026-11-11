import test from 'node:test'
import assert from 'node:assert/strict'
import {mergeBoardRows,mergeLanternRows} from '../src/deungbul/communityRows.js'
test('실시간 수신과 조회가 겹쳐도 새 글/삭제 상태를 보존하고 중복하지 않는다',()=>{
 const a={id:'a',createdAt:'2026-11-11T01:00:00Z'},b={id:'b',createdAt:'2026-11-11T02:00:00Z'}
 assert.deepEqual(mergeBoardRows([b,a],[a],{known:new Set(['a']),kind:'posts'}).map(x=>x.id),['b','a'])
 assert.deepEqual(mergeBoardRows([b,a],[b,a],{removed:new Set(['a']),kind:'posts'}).map(x=>x.id),['b'])
})
test('내 등 표시를 유지하고 로컬 등과 공유 등을 합치며 같은 내용의 별도 등은 보존한다',()=>{
 const r={id:'shared',owner:'me',shape:'lotus',wish:'평안'},local={owner:'me',shape:'lotus',wish:'평안'}
 const rows=mergeLanternRows([r],[local,local,{owner:'other',shape:'fish',wish:'건강'}],'me')
 assert.equal(rows.length,3);assert.equal(rows.filter(x=>x.mine).length,2);assert.equal(rows[0].shapeLabel,'연꽃등')
})
