import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

// 실제 서비스 모듈을 읽고 네트워크 의존성만 대체한다. 운영 DB에 쓰지 않는다.
let write, calls=0
const deps=`const normalizeLantern=x=>x,isSupabaseConfigured=true,canHash=true;
const fetchLanterns=async()=>({rows:[],total:0}),insertLantern=async x=>x;
const hashPassword=async()=> 'test-hash',fetchPosts=async()=>[],fetchMessages=async()=>[],deletePost=async()=>true;
const insertPost=globalThis.__campusInsert,insertMessage=insertPost;`
globalThis.__campusInsert=async row=>{calls++;return write(row)}
const source=(await readFile(new URL('../src/deungbul/original/campusServices.js',import.meta.url),'utf8'))
 .replace(/^import .*\n/gm,'')
const {createCampusCommunity}=await import('data:text/javascript;base64,'+Buffer.from(deps+'\n'+source).toString('base64'))
delete globalThis.__campusInsert

class Node {
 constructor(tag,text=''){this.tagName=tag.toUpperCase();this.textContent=text;this.children=[];this.dataset={};this.value='';this.disabled=false;this.root=false}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n)}}
 setAttribute(){}
 get isConnected(){return this.root||!!this.parent?.isConnected}
 contains(node){return this===node||this.children.some(n=>n.contains(node))}
 remove(){const p=this.parent;if(p)p.children=p.children.filter(n=>n!==this);this.parent=null}
}
function setup(){
 let panel
 const el=(tag,cls,text)=>new Node(tag,text)
 const ui=createCampusCommunity({el,getNick:()=> '점검',say:()=>{},shell:()=>{if(panel)panel.root=false;panel=new Node('div');panel.root=true;return panel}})
 const view=()=>{const form=panel.children.at(-1);return{nav:panel.children[0],body:form.children[0],pw:form.children[1],go:form.children.at(-2),submit:()=>form.onsubmit({preventDefault(){}}),result:form.children.at(-1)}}
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
