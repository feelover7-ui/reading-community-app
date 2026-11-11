const steps=['frame','light','paper','paint','sign']
const labels={frame:'골조 작업대로 이동',light:'전기 작업대로 이동',paper:'한지 작업대로 이동',paint:'채색 작업대로 이동',sign:'등 걸러 가기',big:'장엄등 점등하러 가기',tower:'자동 탑돌이 하러 가기',statue:'동상 참배하러 가기',hallDoor:'법당 참배하러 가기'}
export function nextVisitTarget(state){
 if(state.stage>0)return steps[state.stage]||null
 if(!state.hasHung)return 'frame'
 if(!state.litOnce)return 'big'
 if(!state.tapdoriDone)return 'tower'
 if(!state.statueDone)return 'statue'
 if(!state.hallDone)return 'hallDoor'
 return null
}
export const visitTargetLabel=key=>labels[key]||''
