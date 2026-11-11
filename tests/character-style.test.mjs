import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {handGeometry,CHARACTER_HEAD,hallLookFromAppearance} from '../src/deungbul/characterStyle.js'
test('손은 엄지가 있는 손바닥이며 기존 관절 접지 크기를 넘지 않는다',()=>{
 for(const side of[-1,1]){const g=handGeometry(side);g.computeBoundingBox();assert.ok(g.boundingBox.max.y<=.051);assert.ok(g.boundingBox.min.y>=-.051);assert.ok(g.boundingBox.max.x-g.boundingBox.min.x>.07)}
 assert.equal(CHARACTER_HEAD.scale,.85);assert.equal(CHARACTER_HEAD.y,.69)
})
test('법당에서도 저장된 조끼 색과 머리 선택을 사용한다',()=>{
 const o=hallLookFromAppearance({outfit:'vest',color:'#758466',hair:'bald',hairColor:'#1e1612'},'m')
 assert.equal(o.body,'#758466');assert.equal(o.vest,true);assert.equal(o.hair,null)
 assert.equal(hallLookFromAppearance(null,'f').long,true)
})
test('성별과 무관하게 머리 모양과 옷별 바지색을 보존한다',()=>{
 assert.equal(hallLookFromAppearance({hair:'pony',outfit:'hoodie'},'m').hairStyle,'pony')
 assert.equal(hallLookFromAppearance({hair:'short',outfit:'practice'},'f').hairStyle,'short')
 assert.equal(hallLookFromAppearance({outfit:'hoodie'},'m').pants,'#3d5a80')
 assert.equal(hallLookFromAppearance({outfit:'practice'},'f').pants,'#77736a')
})
