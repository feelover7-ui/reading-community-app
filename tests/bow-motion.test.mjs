import test from 'node:test'
import assert from 'node:assert/strict'
import {bowPose,POSE,poseGroundOffset,BOW_CYCLE_SECONDS} from '../src/deungbul/bowMotion.js'
import {cushionSupportAt,CUSHION_TOP} from '../src/deungbul/beopdangData.js'
test('절은 충분히 천천히 이어지고 엎드려 잠시 머문 뒤 합장으로 돌아온다',()=>{
 assert.ok(BOW_CYCLE_SECONDS>=6)
 assert.deepEqual(bowPose(.49,false),bowPose(.57,false))
 for(const boundary of[.12,.28,.46,.6,.78,.94,1]){
  const a=bowPose(boundary-.00001,false),b=bowPose(boundary+.00001,false)
  for(const k in POSE.stand)assert.ok(Math.abs(a[k]-b[k])<.002,k+' 자세 끊김')
 }
 assert.ok(bowPose(.35,false).kneeX>1)
 assert.deepEqual(bowPose(.5,true),POSE.hap)
})
test('방석의 실제 윗면과 사람의 접지 보정 높이를 공유한다',()=>{
 assert.equal(CUSHION_TOP,.23);assert.equal(cushionSupportAt(13.5,13.5),CUSHION_TOP)
 assert.equal(cushionSupportAt(13,18.2),0)
 for(let i=0;i<=100;i++)assert.ok(Number.isFinite(poseGroundOffset(bowPose(i/100,false))))
 assert.ok(Math.abs(poseGroundOffset(POSE.stand))<.00001)
})
