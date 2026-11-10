/* 같은 좌표·기능을 유지하고 그리는 비용만 조절한다. */
export function chooseSceneQuality({coarse=false,memory=8,cores=8,saveData=false,mode='auto'}={}){
  const capable=!coarse&&memory>=4&&cores>=4&&!saveData
  const detailed=mode!=='light'&&capable
  return {detailed,shadows:detailed,pixelRatio:detailed?1.5:1.1,segments:detailed?36:20}
}
export function createQualityMonitor(onSlow,{threshold=45,samples=90}={}){
  let slow=0,done=false
  return {sample(ms){if(done||!Number.isFinite(ms)||ms<0)return;if(ms>1000){slow=0;return}
    slow=ms>threshold?slow+1:Math.max(0,slow-2)
    if(slow>=samples){done=true;onSlow()}},reset(){slow=0;done=false}}
}
