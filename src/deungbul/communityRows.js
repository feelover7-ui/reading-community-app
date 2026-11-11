const time=row=>Date.parse(row.createdAt||'')||0
export function mergeBoardRows(current,incoming,{known=null,removed=new Set(),kind='posts'}={}){
 const rows=new Map()
 for(const row of current)if(!known||!known.has(String(row.id)))rows.set(String(row.id),row)
 for(const row of incoming)if(row?.id!=null&&!removed.has(String(row.id)))rows.set(String(row.id),row)
 return [...rows.values()].filter(row=>!removed.has(String(row.id))).sort((a,b)=>kind==='messages'?time(a)-time(b):time(b)-time(a)).slice(kind==='messages'?-40:0,kind==='messages'?undefined:30)
}
const shapes={lotus:'연꽃등',wheel:'법륜등',fish:'잉어등',elephant:'코끼리등'}
const signature=L=>[L.owner,L.shape,L.color,L.pattern,L.wish].join('|')
export function mergeLanternRows(remote,local,owner){
 const out=[...remote],ids=new Set(remote.map(L=>L.id).filter(Boolean)),counts=new Map()
 for(const L of remote)counts.set(signature(L),(counts.get(signature(L))||0)+1)
 for(const L of local){if(L.id&&ids.has(L.id))continue;const key=signature(L),n=counts.get(key)||0;if(!L.id&&n){counts.set(key,n-1);continue}out.push(L);if(L.id)ids.add(L.id)}
 return out.map(L=>({...L,mine:!!owner&&L.owner===owner,shapeLabel:shapes[L.shape]||'소원등'}))
}
