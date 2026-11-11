/* 완료한 제작 단계만 이 기기에 보존한다. 잘못된 저장값은 처음 단계로 되돌린다. */
export function restoreCraftProgress(saved){
 const stage=saved?.stage,c=saved?.craft,empty={stage:0,craft:{}}
 if(!Number.isInteger(stage)||stage<1||stage>4||!c||!['lotus','wheel','fish','elephant'].includes(c.shape))return empty
 if(stage>=2&&!/^#[0-9a-f]{6}$/i.test(c.color||''))return empty
 if(stage>=3&&!['none','dots','wave','dancheong','gold'].includes(c.pattern))return empty
 const craft={shape:c.shape}
 if(stage>=2)craft.color=c.color
 if(stage>=3)craft.pattern=c.pattern
 if(stage===4){if(typeof c.wish!=='string')return empty;craft.wish=c.wish.trim().replace(/\s+/g,' ').slice(0,24)||'모두 평안하기를'}
 return{stage,craft}
}

export function restoreOrderedCraft(saved){
 if(saved?.craftVersion!==2){
  const old=restoreCraftProgress(saved)
  if(old.stage===4)return{stage:4,craft:{...old.craft,electric:true}}
  if(old.stage>=2)return{stage:1,craft:{...old.craft}}
  return old
 }
 const c=saved?.craft,s=saved?.stage,empty={stage:0,craft:{}}
 if(!Number.isInteger(s)||s<1||s>4||!['lotus','wheel','fish','elephant'].includes(c?.shape))return empty
 if(s>=2&&c.electric!==true)return empty
 if(s>=3&&!/^#[0-9a-f]{6}$/i.test(c.color||''))return empty
 if(s===4&&(!['none','dots','wave','dancheong','gold'].includes(c.pattern)||typeof c.wish!=='string'))return empty
 const craft={shape:c.shape}
 if(c.electric===true)craft.electric=true
 if(/^#[0-9a-f]{6}$/i.test(c.color||''))craft.color=c.color
 if(['none','dots','wave','dancheong','gold'].includes(c.pattern))craft.pattern=c.pattern
 if(s===4)craft.wish=c.wish.trim().replace(/\s+/g,' ').slice(0,24)||'모두 평안하기를'
 return{stage:s,craft}
}
export const nextCraftStageAfterElectric=craft=>/^#[0-9a-f]{6}$/i.test(craft.color||'')?3:2
