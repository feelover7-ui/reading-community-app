export const MAP_LINKS=Object.freeze({chooser:'/deungbul.html',claude:'/deungbul.html?map=claude',codex:'/site-preview.html'})
export function selectedMap(search=''){
 const p=new URLSearchParams(search),map=p.get('map')
 if(map==='claude'||map==='codex')return map
 if(!map&&p.get('from')==='beopdang')return 'claude'
 return null
}
export function hallReturnUrl(search=''){
 return new URLSearchParams(search).get('from')==='codex'?'/site-preview.html?view=hall3':'/deungbul.html?map=claude&from=beopdang'
}
