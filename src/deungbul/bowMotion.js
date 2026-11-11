// 관절 인형용 자세와 부드러운 한 배 동작. 실측 인체/의례 모션 캡처는 아니다.
const pose=o=>({y:0,bend:0,legX:0,legY:0,kneeX:0,ankleX:0,armX:0,armZ:-.08,elbowX:0,swing:0,...o})
export const BOW_CYCLE_SECONDS=6.4
export const POSE={
 stand:pose({swing:1}),hap:pose({armX:-.7,armZ:.82,elbowX:-1.25}),
 bow:pose({bend:.95,armX:-1.2,armZ:.62}),
 kneel:pose({y:-.2,bend:.06,kneeX:Math.PI/2,ankleX:-Math.PI/2,armX:-.7,armZ:.82,elbowX:-1.25}),
 prost:pose({y:-.2,bend:1.64,kneeX:Math.PI/2,ankleX:-Math.PI/2,armX:-1.13,armZ:.12,elbowX:-2.08}),
 sit:pose({y:-.25,bend:.06,legX:-1.1,legY:.65,kneeX:1.65,armX:-.62,armZ:.5,elbowX:-.9})
}
export function lerpPose(a,b,k){const out={};for(const key in POSE.stand)out[key]=(a[key]||0)+((b[key]||0)-(a[key]||0))*k;return out}
const frames=[[0,POSE.hap],[.12,POSE.hap],[.28,POSE.kneel],[.46,POSE.prost],[.6,POSE.prost],[.78,POSE.kneel],[.94,POSE.hap],[1,POSE.hap]]
export function bowPose(u,quiet){
 if(quiet)return POSE.hap
 const t=((u%1)+1)%1
 for(let i=1;i<frames.length;i++)if(t<=frames[i][0]){
  const [at,a]=frames[i-1],[bt,b]=frames[i],q=(t-at)/(bt-at),k=q*q*(3-2*q)
  return lerpPose(a,b,k)
 }
 return POSE.hap
}
// 신발·종아리·무릎과 손/머리가 지면 아래로 내려가지 않게 관절 치수로 계산한다.
export function poseGroundOffset(p){
 const a=p.legX||0,b=a+(p.kneeX||0),hip=.44+p.y
 const thigh=hip-.095*Math.cos(a)-.095*Math.abs(Math.cos(a))-.065*Math.abs(Math.sin(a))
 const knee=hip-.19*Math.cos(a)
 const shin=knee-.095*Math.cos(b)-.095*Math.abs(Math.cos(b))-.065*Math.abs(Math.sin(b))
 const shoe=b+(p.ankleX||0)
 const foot=knee-.215*Math.cos(b)-.03*Math.sin(b)-.035*Math.abs(Math.cos(shoe))-.1*Math.abs(Math.sin(shoe))
 const arm=p.bend+p.armX,e=p.elbowX||0,z=p.armZ
 const hand=hip+.44*Math.cos(p.bend)-.2*Math.cos(z)*Math.cos(arm)-.23*Math.cos(e)*Math.cos(z)*Math.cos(arm)+.23*Math.sin(e)*Math.sin(arm)-.05
 const head=hip+.66*Math.cos(p.bend)-.19
 return Math.max(0,-Math.min(thigh,shin,foot,hand,head))
}
