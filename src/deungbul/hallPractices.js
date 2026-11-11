// 기존 예불문과 법당 체험 상태. 실제 법문 녹취나 의례 지도를 대신하지 않는다.
export const YEBUL_LINES=['지심귀명례 삼계도사 사생자부 시아본사 석가모니불','지심귀명례 시방삼세 제망찰해 상주일체 불타야중','지심귀명례 시방삼세 제망찰해 상주일체 달마야중','지심귀명례 대지문수사리보살 대행보현보살 대비관세음보살 대원본존지장보살 마하살','지심귀명례 영산당시 수불부촉 십대제자 십육성 오백성 독수성 내지 천이백 제대아라한 무량자비성중','지심귀명례 서건동진 급아해동 역대전등 제대조사 천하종사 일체미진수 제대선지식','지심귀명례 시방삼세 제망찰해 상주일체 승가야중']
export const READING_LINES=[
 '오늘 잠시 하던 일을 내려놓고 자리에 앉아 봅니다.',
 '등 하나를 만들 때처럼, 지금 하는 일에 차분히 마음을 모아 봅니다.',
 '함께 머무는 사람과 주변의 생명을 돌아봅니다.',
 '지금 떠오르는 생각을 억지로 붙잡거나 밀어내지 않고 잠시 바라봅니다.',
 '자리에서 일어난 뒤에도 오늘 만나는 사람에게 따뜻한 말을 건네 봅니다.'
]
export function createSeatedPractice(kind,duration=60){
 if(kind!=='meditation'&&kind!=='reading')throw new Error('unknown practice')
 return{kind,duration:kind==='meditation'&&[60,180,300].includes(duration)?duration:60,elapsed:0,index:0,done:false,breath:'들숨',lines:READING_LINES,notice:'법회 체험을 위해 만든 안내 글입니다.'}
}
export function stepSeatedPractice(s,dt){
 if(s.done||!Number.isFinite(dt)||dt<=0||s.kind!=='meditation')return s
 s.elapsed=Math.min(s.duration,s.elapsed+dt);s.done=s.elapsed>=s.duration;s.breath=s.done?'마침':Math.floor(s.elapsed/5)%2?'날숨':'들숨';return s
}
const clean=n=>Number.isFinite(n)?Math.min(108,Math.max(0,Math.floor(n))):0
export function readBest108(...values){return Math.max(0,...values.map(value=>{try{return clean(JSON.parse(value||'{}').best108)}catch{return 0}}))}
export const recordBest108=(old,count)=>Math.max(clean(old),clean(count))

export const formatPracticeRemaining=remaining=>{const n=Math.max(0,Math.ceil(remaining));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')}
