const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
export function formatCommunityTime(value){
 if(!value)return '작성 시각 없음'
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '작성 시각 없음'
 const p=Object.fromEntries(formatter.formatToParts(date).map(p=>[p.type,p.value]))
 return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`
}
