import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

// 실제 서비스 모듈을 읽고 네트워크 의존성만 대체한다. 운영 DB에 쓰지 않는다.
let write, calls=0
const deps=`import {mergeBoardRows,mergeLanternRows} from '${new URL('../src/deungbul/communityRows.js',import.meta.url).href}';
import {formatCommunityTime} from '${new URL('../src/deungbul/communityTime.js',import.meta.url).href}';
const normalizeLantern=x=>x,isSupabaseConfigured=true,canHash=true;
const fetchLanterns=async()=>({rows:[],total:0}),insertLantern=async x=>x;
const hashPassword=async()=> 'test-hash',fetchPosts=async()=>[],fetchMessages=async()=>globalThis.__fetchedMessages||[],deletePost=async()=>true;
const subscribeBoard=handlers=>{globalThis.__boardHandlers=handlers;return()=>{globalThis.__boardUnsub=(globalThis.__boardUnsub||0)+1}};
const insertPost=globalThis.__campusInsert,insertMessage=insertPost;`
globalThis.__campusInsert=async row=>{calls++;return write(row)}
const source=(await readFile(new URL('../src/deungbul/original/campusServices.js',import.meta.url),'utf8'))
 .replace(/^import .*\n/gm,'')
const {createCampusCommunity}=await import('data:text/javascript;base64,'+Buffer.from(deps+'\n'+source).toString('base64'))
delete globalThis.__campusInsert

class Node {
 constructor(tag,text=''){this.tagName=tag.toUpperCase();this.textContent=text;this.children=[];this.dataset={};this.value='';this.disabled=false;this.root=false}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n)}}
 insertBefore(n,b){if(n.parent)n.remove();n.parent=this;const i=b?this.children.indexOf(b):-1;if(i<0)this.children.push(n);else this.children.splice(i,0,n)}
 setAttribute(){}
 get isConnected(){return this.root||!!this.parent?.isConnected}
 contains(node){return this===node||this.children.some(n=>n.contains(node))}
 remove(){const p=this.parent;if(p)p.children=p.children.filter(n=>n!==this);this.parent=null}
}
function setup(){
 let panel
 const el=(tag,cls,text)=>new Node(tag,text)
 const ui=createCampusCommunity({el,getNick:()=> '점검',say:()=>{},shell:()=>{if(panel)panel.root=false;panel=new Node('div');panel.root=true;return panel}})
 const view=()=>{const form=panel.children.at(-1);return{nav:panel.children[0],list:panel.children[2],body:form.children[0],pw:form.children[1],go:form.children.at(-2),submit:()=>form.onsubmit({preventDefault(){}}),result:form.children.at(-1)}}
 const input=(node,value)=>{node.value=value;node.oninput()}
 ui.open()
 return{ui,view,input}
}

test('방명록/대화 탭 전환과 닫았다 열기에서 초안·비밀번호를 보존한다',async()=>{
 const t=setup();let v=t.view();t.input(v.body,'방명록 초안');t.input(v.pw,'test-only')
 v.nav.children[1].onclick();v=t.view();t.input(v.body,'대화 초안')
 v.nav.children[0].onclick();v=t.view();assert.equal(v.body.value,'방명록 초안');assert.equal(v.pw.value,'test-only')
 t.ui.open('messages');assert.equal(t.view().body.value,'대화 초안')
})

test('전송 중 탭을 왕복해도 중복 전송하지 않고 늦은 응답이 새 입력을 지우지 않는다',async()=>{
 calls=0;let finish;write=row=>new Promise(resolve=>{finish=()=>resolve({id:'saved',...row})})
 const t=setup();let v=t.view();t.input(v.body,'보낸 글');t.input(v.pw,'test-only');const sending=v.submit()
 v.nav.children[1].onclick();t.view().nav.children[0].onclick();v=t.view()
 assert.equal(v.go.disabled,true);await v.submit();assert.equal(calls,1)
 t.input(v.body,'새 글');finish();await sending
 assert.equal(v.body.value,'새 글');assert.equal(v.pw.value,'');assert.equal(v.go.disabled,false)
 assert.equal(v.result.textContent,'저장했어요.')
})

test('전송 실패 후에도 다시 연 탭의 입력을 유지하고 재시도 버튼을 푼다',async()=>{
 let fail;write=()=>new Promise((_,reject)=>{fail=()=>reject(Error('offline'))})
 const t=setup();let v=t.view();t.input(v.body,'실패해도 남길 글');t.input(v.pw,'test-only');const sending=v.submit()
 v.nav.children[1].onclick();t.view().nav.children[0].onclick();v=t.view();await Promise.resolve();fail();await sending
 assert.equal(v.body.value,'실패해도 남길 글');assert.equal(v.pw.value,'test-only');assert.equal(v.go.disabled,false)
 assert.match(v.result.textContent,/입력을 보관/)
})

test('실시간 글이 추가돼도 기존 삭제 비밀번호와 새 글 초안을 유지한다',()=>{
 const t=setup();t.ui.start();try{
  globalThis.__boardHandlers.onPost({id:'old',nick:'법우',body:'먼저 온 글',createdAt:'2026-11-11T01:00:00Z'})
  const v=t.view(),old=v.list.children[0],pass=old.children[3];pass.value='보존할 비밀번호';t.input(v.body,'작성 중인 글')
  globalThis.__boardHandlers.onPost({id:'new',nick:'새 법우',body:'실시간 새 글',createdAt:'2026-11-11T02:00:00Z'})
  assert.equal(v.list.children.length,2);assert.equal(v.list.children[1],old);assert.equal(pass.value,'보존할 비밀번호');assert.equal(v.body.value,'작성 중인 글')
  globalThis.__boardHandlers.onPost({id:'new',nick:'새 법우',body:'실시간 새 글',createdAt:'2026-11-11T02:00:00Z'});assert.equal(v.list.children.length,2)
 }finally{t.ui.stop()}
 assert.ok(globalThis.__boardUnsub>0)
})

test('간편 대화는 이미 조회한 기록과 실시간 누락 후 재조회한 새 글을 한 번씩 보여준다',async()=>{
 const t=setup(),seen=[];globalThis.__fetchedMessages=[{id:'history',nick:'법우',body:'기존 대화',createdAt:'2026-11-11T01:00:00Z'}]
 try{
  t.ui.open('messages');await new Promise(resolve=>setImmediate(resolve));t.ui.onMessage(row=>seen.push(row.id));t.ui.setQuickOpen(true);await new Promise(resolve=>setImmediate(resolve))
  assert.deepEqual(seen,['history'])
  globalThis.__fetchedMessages.push({id:'poll',nick:'다른 법우',body:'누락 후 조회',createdAt:'2026-11-11T02:00:00Z'})
  await t.ui.refresh('messages');await t.ui.refresh('messages');assert.deepEqual(seen,['history','poll'])
 }finally{t.ui.stop();globalThis.__fetchedMessages=[]}
})
