import {createSeatedPractice,stepSeatedPractice,readBest108,recordBest108,YEBUL_LINES,formatPracticeRemaining} from './hallPractices.js'
import {hallLookFromAppearance} from './characterStyle.js'
import {fetchToday,insertPractice,subscribePractice,sharedPhase,crossedCycle,isSupabaseConfigured,kstDay} from './practiceApi.js'
import {BOW_CYCLE_SECONDS} from './bowMotion.js'
import {findWalkPath,createGuidedWalk} from './guidedWalk.js'
import {mountSceneQuality} from './realismMaterials.js'
import {hallReturnUrl} from './mapChoiceRoutes.js'
import {installMobileViewport} from './mobileUi.js'
import { fitHallView } from './hallCamera.js'
/* 대법당 안.
   칸 크기·걷는 속도·화면 배율은 등불사장·도량과 같은 값(sceneKit)을 씁니다.
   좌복 위에서 절을 할 수 있고, 같이 들어온 법우들도 서로 보입니다. */
import { T, W, H, structures, spots, cushions, MAT, DOOR, startPosition, canStand, atDoor, cushionAt, SOURCE, createHallExitGate,cushionSupportAt }
  from './beopdangData.js'
import {
  bindKeys, bindJoystick, stepPlayer, createPeers, createModal, readIdentity,
  readStore, writeStore, createChat, SAY_MS, releaseFocus
} from './sceneKit.js'
import { createWorld, createFollower, createLabelLayer, makePerson, stepPerson, bowPose,lerpPose,POSE, V3 } from './three3d.js'
import { buildHall, createHallPeers } from './beopdangScene.js'
import { createBgm } from './bgm.js'

const byId = id => document.getElementById(id)
const cv = byId('game')
const fadeEl = byId('fade'), promptEl = byId('prompt')
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
let reducedMotion = motionPreference.matches
motionPreference.addEventListener?.('change', e => { reducedMotion = e.matches })
const isTouch = matchMedia('(hover:none) and (pointer:coarse)').matches
if (isTouch) document.body.classList.add('touch')

const me = readIdentity()
let savedAppearance=null;try{savedAppearance=JSON.parse(readStore('hanmaum-campus-v2')||'null')?.ap}catch{}
const myLook=hallLookFromAppearance(savedAppearance,me.sex)

const player = { x: startPosition.x, y: startPosition.y, dir: 'up', face: Math.PI, moving: false, walk: 0, vx: 0, vy: 0 }
let traveling = false

/* ---------- 절 ---------- */
const BOW_KEY = 'hanmaum-deungbul-bow'
const BOW_CYCLE = BOW_CYCLE_SECONDS            // 한 배에 걸리는 시간(초)
const BOW_CYCLE_QUIET = 1.2      // 동작 줄이기에서는 짧게
let bowReturn=null
const bow = { on: false, goal: 0, done: 0, t: 0, spot: null,mode:'bow',speed:1,sync:false,phase:0 }
/* 오늘 도량에 쌓인 절. shared 는 서버에서 읽은 남들 몫, mine 은 아직 못 올린 내 몫이다. */
const yardBows={shared:0,mine:0,ready:false,at:0,day:kstDay()};let stopPractice=()=>{}
let seatedPractice=null,best108=readBest108(readStore('hanmaum-hall-practices'),readStore('hanmaum-campus-v2'))
// 본원 기준 오늘은 한국 시간(UTC+9) 자정에 바뀐다.
const today = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
let countDay = today(), dayCheckAt = 0
function readBowTotal () {
  try {
    const raw = JSON.parse(readStore(BOW_KEY) || '{}')
    return raw && raw.d === today() && Number.isFinite(raw.n) ? Math.floor(Math.max(0, Math.min(99999, raw.n))) : 0
  } catch (e) { return 0 }
}
let bowTotal = readBowTotal()
function saveBowTotal () { writeStore(BOW_KEY, JSON.stringify({ d: countDay, n: bowTotal })) }
function syncBowDay () {
  const day = today()
  if (day === countDay) return
  countDay = day; bowTotal = 0
  saveBowTotal(); updateCount()
}

/* 한 배를 다섯 마디로 나눈다. 합장 → 무릎 → 엎드림 → 무릎 → 일어섬 */
function bowFrame (u) {
  if (u < .20) return 0
  if (u < .38) return 1
  if (u < .70) return 2
  if (u < .88) return 1
  return 3
}

const seatWalk=createGuidedWalk();let chosenSeat=null
const seatTaken=c=>[...peers.peers.values()].some(p=>Math.hypot(p.x-c.x,p.y-c.y)<.85)
function cancelSeatWalk(){seatWalk.cancel();chosenSeat=null;player.vx=0;player.vy=0;document.body.classList.remove('guide-active')}
/* ---------- 창 ---------- */
const modal = createModal(byId('modal'), byId('card'), {
  onClose: () => { keys.clear(); joy.reset(); try { cv.focus({ preventScroll: true }) } catch (e) {} }
})
const el = modal.el

const seatButton=el('button','iconbtn','좌복');seatButton.type='button';seatButton.id='choose-seat';seatButton.setAttribute('aria-label','참배할 빈 방석 고르기');byId('topbtns').append(seatButton)
const seatBar=el('div','guided-actions'),seatText=el('span',null,'선택한 방석으로 이동 중'),seatStop=el('button','btn ghost','멈추기');seatBar.hidden=true;seatBar.append(seatText,seatStop);document.body.append(seatBar);seatStop.onclick=cancelSeatWalk
seatButton.onclick=()=>{
 if(traveling||bow.on||seatedPractice)return
 cancelSeatWalk()
 const panel=modal.shell('참배할 자리','빈 방석을 고르면 그 자리까지 걸어갑니다. 도착한 뒤 참배를 선택해 주세요.')
 const list=el('div','bowpick')
 cushions.forEach((c,i)=>{const b=el('button','placebtn',`${Math.floor(i/8)+1}열 ${i%8+1}번 · ${seatTaken(c)?'사용 중':'빈 방석'}`);b.disabled=seatTaken(c);b.onclick=()=>{
  if(seatTaken(c)){setStatus('다른 법우가 있는 자리예요. 다른 방석을 골라 주세요.');return}
  const path=findWalkPath({x:player.x,z:player.y},{x:c.x,z:c.y},canStand,{maxX:W,maxZ:H})
  if(!path){setStatus('이 자리로 가는 길을 찾지 못했어요. 다른 방석을 골라 주세요.');return}
  modal.close();keys.clear();joy.reset();chosenSeat=c;seatWalk.start(path);document.body.classList.add('guide-active')
 };list.append(b)})
 panel.append(list)
}
/* ---------- 키와 조이스틱 ---------- */
const keys = bindKeys({
  onAction: () => action(),
  onEnter: () => chat.toggle(),
  onModalAction: () => modal.runPrimary(),
  onEscape: () => { if (modal.open) modal.close(); else if (chat.isOpen) chat.hide(); else if (bow.on) stopBow('멈췄어요'); else if(seatedPractice)stopSeatedPractice('자리에서 일어났어요') },
  isModalOpen: () => modal.open
})
const joy = bindJoystick(byId('joy'))
installMobileViewport({onInterrupt:()=>{keys.clear();joy.reset()}})
addEventListener('blur', () => { keys.clear(); joy.reset();cancelSeatWalk() })
document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); joy.reset();cancelSeatWalk() } else refreshYardBows(true) })

/* ---------- 함께 있는 법우들 ---------- */
const peers = createPeers({
  ownerId: me.id,
  channel: 'deungbul-beopdang',
  bounds: { w: W, h: H },
  nick: me.nick,
  sex: me.sex,
  canStand,
  getSelf: () => ({ x: player.x, y: player.y, vx: player.vx, vy: player.vy, dir: player.dir, moving: player.moving, bow: bow.on }),
  onChange: () => { updateHere(); countBowing(); paintTogether() },
  isPaused: () => traveling,
  onSay: (id, nick, text) => chat.push(nick, text, false)
})

const statusEl = byId('status'), countEl = byId('count'), hereEl = byId('here')
const bowBar = byId('bowbar'), bowNum = byId('bownum')
function setStatus (text) { if (statusEl) statusEl.textContent = text }
const togetherEl = byId('together')
let bowingPeers = 0
/* 지금 함께 절하는 사람 수는 이미 오가는 접속자 정보(bow)에서 센다. 새로 보내는 것은 없다. */
function countBowing () {
  let n = 0
  for (const p of peers.peers.values()) if (p.bow) n++
  bowingPeers = n
  return n
}
/* onChange 는 들고 날 때만 온다. 상대가 절을 시작·중단하는 건 위치 broadcast 로 오니 직접 센다. */
let bowingAt = 0
function watchBowing () {
  const now = Date.now()
  if (now - bowingAt < 500) return
  bowingAt = now
  const before = bowingPeers
  if (countBowing() !== before) paintTogether()
}
function paintTogether () {
  if (!togetherEl) return
  const live = bowingPeers + (bow.on ? 1 : 0)
  const total = yardBows.shared + yardBows.mine
  const parts = []
  if (yardBows.ready && total > 0) parts.push('오늘 도량에 <b>' + total.toLocaleString('ko-KR') + '배</b>가 쌓였어요')
  if (live > 1) parts.push('<span class="live">지금 ' + live + '명이 함께 절하고 있어요</span>')
  else if (live === 1 && !bow.on) parts.push('<span class="live">지금 한 분이 절하고 있어요</span>')
  togetherEl.innerHTML = parts.join('<br>')
}
async function refreshYardBows (force = false) {
  const now = Date.now()
  if (!force && now - yardBows.at < 60000) return
  yardBows.at = now
  try {
    const result = await fetchToday()
    if (!result) return                       // 설정 전에는 이 브라우저 숫자만 쓴다
    yardBows.shared = result.total
    yardBows.ready = true
    paintTogether()
  } catch (e) {}
}
/* 절을 마치면 그만큼만 한 번 올린다. 실패하면 내 몫으로 들고 있다가 다음에 다시 보낸다. */
let sending = false
async function sendPractice (bows, kind, dedication) {
  const count = Math.min(1000, Math.floor(bows))
  if (!(count > 0)) return
  if (!isSupabaseConfigured) return          // 설정 전에는 이 브라우저 숫자만 센다
  // 날짜가 바뀌면 못 올린 어제 몫은 버린다. 어제 절을 오늘 것으로 올리지 않는다.
  if (yardBows.day !== kstDay()) { yardBows.day = kstDay(); yardBows.mine = 0; yardBows.shared = 0; yardBows.ready = false }
  yardBows.mine += count
  paintTogether()
  if (sending) return
  sending = true
  const pending = yardBows.mine
  try {
    const row = await insertPractice({ nick: me.nick, bows: pending, kind, dedication })
    if (row) { yardBows.mine -= pending; yardBows.shared += pending; yardBows.ready = true }
  } catch (e) {
  } finally { sending = false; paintTogether() }
}
function updateCount () {
  countEl.textContent = (bowTotal > 0 ? '오늘 ' + bowTotal + '배' : '좌복 위에서 절을 할 수 있어요')+(best108?' · 108배 최고 '+best108+'배':'')
  paintTogether()
}
function updateHere () {
  if (!hereEl) return
  const live = peers.joined
  hereEl.innerHTML = ''
  hereEl.append(el('div', null, live ? '법당에 ' + (peers.peers.size + 1) + '명' : '혼자 있는 법당'))
  const row = el('div')
  row.append(el('span', 'me', me.nick))
  if (live) {
    let shown = 0
    for (const p of peers.peers.values()) {
      if (shown >= 9) break
      row.append(document.createTextNode(' · '), el('span', null, p.nick || '법우')); shown++
    }
    const rest = peers.peers.size - shown
    if (rest > 0) row.append(document.createTextNode(' 외 ' + rest + '명'))
  }
  hereEl.append(row)
}

/* ---------- 화면 전환 ---------- */
const hallExitGate = createHallExitGate()
function travel (url) {
  if (traveling) return
  traveling = true
  keys.clear(); joy.reset()
  if (fadeEl) fadeEl.classList.add('on')
  peers.stop()
  setTimeout(() => { location.href = url }, 320)
}

/* ---------- 살펴보기 ---------- */
function nearSpot () {
  let best = null, bd = 2.2
  for (const s of spots) {
    const d = Math.hypot(s.stand[0] - player.x, s.stand[1] - player.y)
    if (d < bd) { bd = d; best = s }
  }
  return best
}
function promptNow () {
  if (atDoor(player.x, player.y)) return { label: '도량으로 나가기', run: () => travel(hallReturnUrl(location.search)) }
  const c = cushionAt(player.x, player.y)
  if (c) return { label: '절하기', run: () => openBowPicker(c) }
  const s = nearSpot()
  if (s) return { label: s.name, run: () => openSpot(s) }
  return null
}
function action () {
  if (traveling || modal.open) return
  if (chat.isOpen) { chat.hide(); return }
  if (bow.on) { stopBow('멈췄어요'); return }
  if(seatedPractice){stopSeatedPractice('자리에서 일어났어요');return}
  cancelSeatWalk()
  const p = promptNow()
  if (p) p.run()
}
byId('act').addEventListener('click', action)

function openSpot (s) {
  const m = modal.shell(s.name, '대법당 · 본관 5층')
  m.append(el('p', 'note', s.description))
  if (s.note) m.append(el('p', 'note', s.note))
  const a = document.createElement('a')
  a.className = 'btn ghost linky'; a.href = SOURCE; a.target = '_blank'; a.rel = 'noopener noreferrer'
  a.textContent = '공식 안내 보기 · 새 창'
  const close = el('button', 'btn ghost', '닫기'); close.onclick = modal.close
  m.append(a, close)
  modal.primary = modal.close
}

const BOW_CHOICES = [
  [1, '한 배', '잠깐 마음을 모을 때'],
  [3, '삼배', '법당에 들어와 올리는 절'],
  [7, '일곱 배', '짧게 이어서'],
  [21, '스물한 배', '조금 길게'],
  [108, '백팔배', '천천히 오래']
]
function openBowPicker (c) {
  const m = modal.shell('절하기', '좌복 위에서 절을 올립니다. 그만하고 싶으면 아무 때나 멈출 수 있어요.')
  const wrap = el('div', 'bowpick')
  for (const [n, name, hint] of BOW_CHOICES) {
    const b = el('button', 'placebtn')
    b.append(el('b', null, String(n)))
    const box = el('span', 'txt')
    box.append(el('span', 'nm', name), el('small', null, hint))
    b.append(box)
    b.onclick = () => { modal.close(); startBow(c, n) }
    wrap.append(b)
  }
  const live=countBowing()
  const join=el('button','btn join-together',live>0?'지금 '+live+'명과 함께 절하기':'함께 정진 · 동참하기')
  join.onclick=()=>{modal.close();startBow(c,108,'together')}
  m.append(join,el('p','note',live>0?'같은 박자로 이어서 절합니다. 숫자는 오늘 도량에 함께 쌓입니다.':'먼저 시작하면 다른 법우가 이어서 들어올 수 있어요. 108배까지 세고, 언제든 멈출 수 있어요.'))
  const practices=el('div','practice-choices');for(const [label,fn]of[['예불 · 칠정례',()=>{modal.close();startBow(c,7,'yebul')}],['법회 · 함께 읽기',()=>{modal.close();startSeatedPractice(c,'reading')}],['좌선 · 호흡하며 머물기',()=>openMeditationPicker(c)]]){const b=el('button','btn ghost',label);b.onclick=fn;practices.append(b)}
  m.append(practices,wrap)
  if(best108)m.append(el('p','note','108배 최고기록 '+best108+'배'))
  if (bowTotal > 0) m.append(el('p', 'note', '오늘 여기서 ' + bowTotal + '배 했어요.'))
  const close = el('button', 'btn ghost', '닫기'); close.onclick = modal.close
  m.append(close)
}
function startBow (c, goal,mode='bow') {
  if(seatTaken(c)){setStatus('다른 법우가 있는 자리예요. 다른 방석을 골라 주세요.');return}
  cancelSeatWalk()
  if(seatedPractice)stopSeatedPractice()
  bowReturn=null
  syncBowDay()
  document.body.classList.add('bow-active')
  bow.on = true; bow.mode=mode;bow.speed=1;bow.goal = goal; bow.done = 0; bow.t = 0; bow.spot = c
  // 동참은 신호를 주고받지 않고 벽시계로 박자를 맞춘다. 그래서 속도 조절을 쓰지 않는다.
  bow.sync = mode==='together'; bow.phase = bow.sync?sharedPhase(BOW_CYCLE):0
  player.x = c.x; player.y = c.y; player.dir = 'up'
  player.vx = 0; player.vy = 0; player.moving = false
  faceTowards(c.x, 2)
  keys.clear(); joy.reset()
  bowBar.classList.add('show')
  bowNum.textContent = '0 / ' + goal
  setStatus(mode==='yebul'?'예불 · 칠정례를 시작했어요.':mode==='together'?'함께 정진에 들어왔어요. 같은 박자로 이어 갑니다.':goal + '배를 시작했어요.');bowSpeed.hidden=goal!==108||bow.sync;bowSpeed.textContent='빠르게 ×2.5';bowText.textContent=mode==='yebul'?YEBUL_LINES[0]:''
  peers.send(true)
}
/* 회향. 적어도 되고 안 적어도 된다. 어느 쪽이든 그만큼은 오늘 도량에 올라간다. */
function openDedication (bows, kind) {
  const m = modal.shell('회향', bows + '배를 마쳤어요. 이 마음을 누구에게 전할까요? 적지 않아도 됩니다.')
  const wrap = el('div', 'dedication')
  const ta = el('textarea'); ta.maxLength = 24; ta.rows = 2
  ta.placeholder = '예) 어머니 건강하시기를 (24자까지)'
  ta.setAttribute('aria-label', '회향 한 줄')
  const go = el('button', 'btn', '회향하고 올리기')
  const skip = el('button', 'btn ghost', '그냥 올리기')
  let done = false
  const finish = text => { if (done) return; done = true; modal.close(); sendPractice(bows, kind, text); setStatus(text ? '회향했어요 · ' + text : bows + '배를 오늘 도량에 올렸어요.') }
  go.onclick = () => finish(ta.value.trim().replace(/\s+/g, ' ').slice(0, 24))
  skip.onclick = () => finish('')
  wrap.append(ta, go, skip)
  m.append(wrap)
  modal.primary = go
  setTimeout(() => { try { ta.focus({ preventScroll: true }) } catch (e) {} }, 60)
}

function stopBow (why) {
  if (!bow.on) return
  bowReturn=reducedMotion?null:{from:bowPose(bow.t/BOW_CYCLE,false),t:0}
  const done = bow.done, goal = bow.goal, kindOf = bow.mode
  if(done>0)markHallPractice()
  document.body.classList.remove('bow-active')
  bow.on = false; bow.t = 0
  bowBar.classList.remove('show')
  peers.send(true)
  if (done >= goal && goal > 0) setStatus(goal + '배를 마쳤어요. 오늘 모두 ' + bowTotal + '배.')
  else setStatus((why || '멈췄어요') + ' · ' + done + '배 했어요. 오늘 모두 ' + bowTotal + '배.')
  bow.sync = false
  updateCount()
  // 세 번 이상 숙인 때만 묻는다. 한두 번은 조용히 올린다.
  if (done >= 3 && !traveling) openDedication(done, kindOf)
  else if (done > 0) sendPractice(done, kindOf, '')
}
const bowSpeed=el('button',null,'빠르게 ×2.5'),bowText=el('p','bow-text');bowSpeed.id='bowspeed';bowSpeed.hidden=true;bowBar.append(bowSpeed,bowText)
bowSpeed.onclick=()=>{if(!bow.on||bow.goal!==108)return;bow.speed=bow.speed===1?2.5:1;bowSpeed.textContent=bow.speed===1?'빠르게 ×2.5':'보통 속도'}
function markHallPractice(){try{const a=JSON.parse(readStore('hanmaum-campus-v2')||'{}');if(a&&typeof a==='object'&&!Array.isArray(a))writeStore('hanmaum-campus-v2',JSON.stringify({...a,hallDone:true,best108:Math.max(a.best108||0,best108)}))}catch{}}
function save108(){best108=recordBest108(best108,bow.done);writeStore('hanmaum-hall-practices',JSON.stringify({best108}));markHallPractice()}
const practicePanel=el('section','seated-practice'),practiceTitle=el('h2'),practiceText=el('p'),practiceTime=el('div','practice-time'),practiceNext=el('button','btn','다음 글'),practiceStop=el('button','btn ghost','자리에서 일어나기');practicePanel.hidden=true;practicePanel.id='seated-practice';practicePanel.setAttribute('aria-label','법당 머무르기');practiceTime.setAttribute('role','timer');practiceTime.setAttribute('aria-live','off');practicePanel.append(practiceTitle,practiceText,practiceTime,practiceNext,practiceStop);byId('scene-main').append(practicePanel)
function openMeditationPicker(c){const m=modal.shell('좌선','편안히 머물 시간을 골라 주세요. 언제든 일어날 수 있어요.');for(const min of[1,3,5]){const b=el('button','btn ghost',min+'분 좌선');b.onclick=()=>{modal.close();startSeatedPractice(c,'meditation',min*60)};m.append(b)}}
function startSeatedPractice(c,kind,duration){
 if(seatTaken(c)){setStatus('다른 법우가 있는 자리예요.');return}
 cancelSeatWalk();if(bow.on)stopBow();bowReturn=null;player.x=c.x;player.y=c.y;player.face=Math.PI;player.moving=false;player.vx=player.vy=0;keys.clear();joy.reset()
 seatedPractice=createSeatedPractice(kind,duration);practicePanel.hidden=false;document.body.classList.add('seated-active');practiceNext.hidden=kind!=='reading';practiceTitle.textContent=kind==='reading'?'법회 · 함께 읽기':'좌선';paintSeatedPractice();peers.send(true)
}
function paintSeatedPractice(){if(!seatedPractice)return;const p=seatedPractice;practiceText.textContent=p.kind==='reading'?p.lines[p.index]:'편안한 호흡으로 잠시 머물러 보세요.';practiceTime.textContent=p.kind==='reading'?p.notice+' · '+(p.index+1)+' / '+p.lines.length:formatPracticeRemaining(p.duration-p.elapsed)+' · '+p.breath;practiceNext.textContent=p.index===p.lines.length-1?'함께 읽기 마치기':'다음 글'}
function stopSeatedPractice(message){if(!seatedPractice)return;const p=seatedPractice;seatedPractice=null;practicePanel.hidden=true;document.body.classList.remove('seated-active');bowReturn=reducedMotion?null:{from:POSE.sit,t:0};if(p.done)markHallPractice();setStatus(message||'자리에서 일어났어요.');peers.send(true)}
practiceStop.onclick=()=>stopSeatedPractice()
practiceNext.onclick=()=>{if(!seatedPractice||seatedPractice.kind!=='reading')return;if(++seatedPractice.index>=seatedPractice.lines.length){seatedPractice.done=true;stopSeatedPractice('함께 읽기를 마쳤어요.')}else paintSeatedPractice()}
byId('bowstop').addEventListener('click', () => stopBow('멈췄어요'))

byId('helpb').onclick = () => {
  const m = modal.shell('도움말', null)
  const h = el('div', 'help')
  h.innerHTML = '<p><b>이동</b> ' + (isTouch ? '왼쪽 조이스틱' : '<kbd>방향키</kbd> 또는 <kbd>WASD</kbd>') +
    '<br><b>살펴보기 · 절하기</b> ' + (isTouch ? '오른쪽 <b>살펴보기</b> 버튼' : '<kbd>Space</kbd> 또는 <kbd>E</kbd>') + '</p>' +
    '<p>바닥에 깔린 <b>좌복</b> 위에 서서 누르면 절을 시작합니다. 한 배·삼배·일곱 배·스물한 배·백팔배 중에 고를 수 있고, 하는 중에 다시 누르면 멈춥니다. 한 만큼 오늘 숫자에 쌓입니다.</p>' +
    '<p>🧭는 부처님과 내 캐릭터를 함께 담습니다. 화면 끌기·Q/R·휠은 자유 시점, 🧭를 누르면 자동 구도로 돌아옵니다.</p>' +
    '<p>아래쪽 문턱을 향해 걸어 나가면 버튼 없이 도량으로 돌아갑니다. 문 앞 살펴보기와 돌아가기 버튼도 사용할 수 있습니다.</p>' +
    '<p style="color:#8a7a66;font-size:13px">공식 안내를 참고해 본존불·세 부분 목탱화·닫집·단청을 구성한 시안입니다. 공식 사진의 천장·창·목재·불단 특징을 대조해 표현했습니다. 실측 치수가 아니고, 사진을 복제하지 않았습니다. 오늘 숫자는 이 브라우저에만 남습니다.</p>'
  const b = el('button', 'btn', '닫기'); b.onclick = modal.close
  m.append(h, b)
}
byId('backb').addEventListener('click', e => { e.preventDefault(); travel(hallReturnUrl(location.search)) })

/* ---------- 한 줄 이야기 ---------- */
let myLine = '', myLineUntil = 0
const chat = createChat({
  bar: byId('chatbar'), log: byId('chatlog'),
  input: byId('chatmsg'), sendBtn: byId('chatsend'), toggleBtn: byId('chatb'),
  send: text => {
    if (!peers.say(text)) { setStatus('지금은 혼자 있는 법당이라 이야기를 나눌 수 없어요.'); return false }
    chat.push(me.nick, text, true)
    myLine = text; myLineUntil = Date.now() + SAY_MS
    return true
  },
  onOpenChange: open => { keys.clear();joy.reset();if (!open) { try { cv.focus({ preventScroll: true }) } catch (e) {} } }
})

/* ---------- 배경음악 ---------- */
const bgm = createBgm()
const bgmBtn = byId('bgmb')
function paintBgm () {
  bgmBtn.textContent = bgm.on ? '🎵' : '🔈'
  bgmBtn.setAttribute('aria-pressed', String(bgm.on))
  bgmBtn.setAttribute('aria-label', bgm.on ? '배경음악 끄기' : '배경음악 켜기')
}
bgmBtn.onclick = () => { bgm.toggle(); paintBgm() }
paintBgm()

const hudEl = byId('hud'), hudH = byId('hudh')
function toggleHud () {
  const open = !hudEl.classList.toggle('collapsed')
  hudH.setAttribute('aria-expanded', String(open))
  hudH.querySelector('small').textContent = open ? '접기' : '펼치기'
}
hudH.addEventListener('click', toggleHud)
for (const id of ['act', 'helpb', 'bgmb', 'chatb', 'bowstop', 'backb']) releaseFocus(byId(id), cv)
releaseFocus(hudH, cv)
if (isTouch || window.innerWidth < 640) {
  hudEl.classList.add('collapsed')
  hudH.querySelector('small').textContent = '펼치기'
  hudH.setAttribute('aria-expanded', 'false')
}

/* ---------- 3D 세계 ---------- */
const world = createWorld(cv, { fov: 56, bg: '#2a1c12', nightBg: '#120c08', fogNear: 30, fogFar: 70, lookX: W / 2, lookZ: H / 2, shadow: !isTouch, light: .38, sunLight: .18, sky: '#fff2db', groundLight: '#9c8870' })
world.quality=mountSceneQuality(world.renderer,{container:byId('topbtns'),shadows:world.sun})
releaseFocus(byId('qualityb'),cv)
const hall = buildHall(world)
const follower = createFollower(cv, world.camera, { dist: 9, pitch: .32, min: 6, max: 14, yaw: 0, lookHeight: 1.2 })
// #17의 자동 구도. 자유 시점은 #18의 낮은 pitch/높은 시선/최소 거리를 유지한다.
let altarView=true,firstView=true,altarDetail=false
const viewButton=el('button','iconbtn','🧭')
viewButton.type='button';viewButton.title='부처님과 내 캐릭터가 함께 보이는 시점'
viewButton.setAttribute('aria-label',viewButton.title);viewButton.setAttribute('aria-pressed','true')
byId('helpb').parentElement.append(viewButton)
const freeView=()=>{
  if(!altarView&&!altarDetail)return
  altarDetail=false;detailButton.setAttribute('aria-pressed','false');altarView=false;viewButton.setAttribute('aria-pressed','false')
  follower.reset({yaw:follower.state.yaw,dist:9,pitch:.32})
}
cv.addEventListener('pointerdown',freeView)
cv.addEventListener('camera-adjust',freeView)
cv.addEventListener('wheel',event=>{if(!event.ctrlKey&&!event.metaKey)freeView()},{passive:true})
viewButton.onclick=()=>{altarDetail=false;detailButton.setAttribute('aria-pressed','false');altarView=true;firstView=true;viewButton.setAttribute('aria-pressed','true');keys.clear();joy.reset()}
releaseFocus(viewButton,cv)
const detailButton=el('button','iconbtn','불단')
detailButton.type='button';detailButton.style.fontSize='12px';detailButton.setAttribute('aria-label','불단 가까이 살펴보기');detailButton.setAttribute('aria-pressed','false')
document.querySelector('.camera-tools')?.append(detailButton)
detailButton.onclick=()=>{altarDetail=!altarDetail;firstView=true;keys.clear();joy.reset();detailButton.setAttribute('aria-pressed',String(altarDetail));viewButton.setAttribute('aria-pressed',String(!altarDetail&&altarView))}
releaseFocus(detailButton,cv)
const detailCaption=el('p','altar-caption','불단 살펴보기 · 이동하거나 🧭를 누르면 돌아갑니다.');detailCaption.hidden=true;byId('scene-main').append(detailCaption)
const leaveDetail=()=>{altarDetail=false;detailButton.setAttribute('aria-pressed','false')}
addEventListener('keydown',e=>{if(!e.isComposing&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.target.isContentEditable&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)&&/^(Arrow|Key[WASD])/.test(e.code))leaveDetail()})
byId('joy')?.addEventListener('pointerdown',leaveDetail)
const viewPosition=V3(),viewTarget=V3()
document.querySelectorAll('.camera-tools').forEach(n=>byId('scene-main').append(n))
const labels = createLabelLayer(world.camera,byId('scene-main'))
const meBody = makePerson(world, myLook)
const hallPeers = createHallPeers(world)
/* 법당 안이라 카메라를 방 안에 가둔다. */
const CAM_BOUNDS = null   // 벽은 걷어내므로 카메라를 방 안에 가두지 않는다

function faceTowards (toX, toY) {
  player.face = Math.atan2(toX - player.x, toY - player.y)
  follower.state.yaw = player.face + Math.PI
}

/* ---------- 갱신 ---------- */
function update (dt) {
  const now = Date.now()
  if (now - dayCheckAt >= 1000) { dayCheckAt = now; syncBowDay() }
  if(keys.has('q')||keys.has('r'))freeView()
  if(!altarView)follower.turn(keys, dt)
  if(seatedPractice){
   const manual=['a','d','w','s','arrowleft','arrowright','arrowup','arrowdown'].some(k=>keys.has(k))||Math.hypot(joy.x,joy.y)>.15
   player.moving=false;player.vx=player.vy=0
   if(manual)stopSeatedPractice('자리에서 일어났어요.')
   else if(!modal.open&&!chat.isOpen){stepSeatedPractice(seatedPractice,dt);paintSeatedPractice();if(seatedPractice.done)stopSeatedPractice('좌선을 마쳤어요.')}
  }else if (bow.on) {
    const pressed = keys.has('a') || keys.has('d') || keys.has('w') || keys.has('s') ||
      keys.has('arrowleft') || keys.has('arrowright') || keys.has('arrowup') || keys.has('arrowdown') ||
      Math.hypot(joy.x, joy.y) > .2
    player.moving = false; player.vx = 0; player.vy = 0
    if (pressed) stopBow('일어섰어요')
    else {
      const cycle = bow.sync ? BOW_CYCLE : (reducedMotion ? BOW_CYCLE_QUIET : BOW_CYCLE)
      let steps = 0
      if (bow.sync) {
        // 벽시계 위상이 한 바퀴 돌면 한 배. 화면이 멈춰 있던 동안은 세지 않는다.
        const phase = sharedPhase(cycle)
        if (crossedCycle(bow.phase, phase)) steps = 1
        bow.phase = phase; bow.t = phase * cycle
      } else {
        bow.t += dt*bow.speed
        while (bow.t >= cycle) { bow.t -= cycle; steps++ }
      }
      while (steps-- > 0) {
        bow.done++; bowTotal++;if(bow.goal===108)save108();saveBowTotal(); updateCount();if(bow.mode==='yebul')bowText.textContent=YEBUL_LINES[Math.min(6,bow.done)]
        bowNum.textContent = bow.done + ' / ' + bow.goal
        if (bow.done >= bow.goal) { stopBow(); break }
      }
    }
  } else {
    const manual=['a','d','w','s','arrowleft','arrowright','arrowup','arrowdown'].some(k=>keys.has(k))||Math.hypot(joy.x,joy.y)>.15
    if(manual||traveling||modal.open||chat.isOpen)cancelSeatWalk()
    if(seatWalk.active){
     if(seatTaken(chosenSeat)){cancelSeatWalk();setStatus('선택한 자리에 다른 법우가 있어요. 다른 방석을 골라 주세요.')}
     else{const q=seatWalk.step({x:player.x,z:player.y},dt,canStand);player.x=q.x;player.y=q.z;player.moving=q.moving;player.vx=q.vx;player.vy=q.vz;if(q.moving){player.face=q.face;player.walk+=dt}
      if(q.blocked){cancelSeatWalk();setStatus('길이 막혀 이동을 멈췄어요.')}
      if(q.arrived){const c=chosenSeat;cancelSeatWalk();faceTowards(c.x,2);openBowPicker(c)}
     }
    }else stepPlayer(player, keys, joy, dt, canStand, traveling || modal.open || chat.isOpen, follower.moveVector)
  }
  seatBar.hidden=!seatWalk.active
  refreshYardBows()
  watchBowing()

  if(hallExitGate.sample({x:player.x,z:player.y,moving:player.moving,enabled:!traveling&&!modal.open&&!chat.isOpen&&!bow.on&&!seatedPractice}))travel(hallReturnUrl(location.search))
  if(bowReturn){if(player.moving)bowReturn=null;else{bowReturn.t+=dt;if(bowReturn.t>=.8)bowReturn=null}}
  // 절할 때는 몸을 낮춘다
  const cycle = bow.sync ? BOW_CYCLE : (reducedMotion ? BOW_CYCLE_QUIET : BOW_CYCLE)
  const u = bow.on ? bow.t / cycle : 0
  // 몸 전체를 누르지 않고 합장·무릎·엎드림 관절로 절합니다.
  stepPerson(meBody, player.x, player.y, bow.on ? Math.PI : player.face, player.moving, player.walk, reducedMotion,
    bow.on ? bowPose(u, reducedMotion) : seatedPractice?POSE.sit:bowReturn?lerpPose(bowReturn.from,POSE.stand,Math.pow(bowReturn.t/.8,2)*(3-2*bowReturn.t/.8)):null)
  meBody.position.y+=cushionSupportAt(player.x,player.y)
  peers.update(dt)
  peers.send()
  if(altarDetail&&(player.moving||keys.size||Math.hypot(joy.x,joy.y)>.1)){altarDetail=false;detailButton.setAttribute('aria-pressed','false')}
  if(altarDetail){world.camera.position.set(W/2,2.65,10.5);world.camera.lookAt(W/2,2.65,4.7);follower.state.yaw=0}
  else if(altarView){
    const framing=fitHallView({playerX:player.x,playerZ:player.y,aspect:world.camera.aspect,fov:world.camera.fov})
    const k=firstView||reducedMotion?1:1-Math.exp(-dt*6)
    viewPosition.lerp(V3(framing.position.x,framing.position.y,framing.position.z),k)
    viewTarget.lerp(V3(framing.target.x,framing.target.y,framing.target.z),k)
    world.camera.position.copy(viewPosition);world.camera.lookAt(viewTarget);firstView=false
    follower.state.yaw=Math.atan2(framing.back.x,framing.back.z)
  }else{firstView=true;follower.follow(player.x,player.y,dt,world.blockers,CAM_BOUNDS)}
  hallPeers.sync(peers.peers, reducedMotion, player)
  world.fadeOccluders(player.x, player.y, dt)
  hall.enclosure(world.camera.position, dt)
}

/* ---------- 그리기 ---------- */
function render () {
  document.body.classList.toggle('altar-detail',altarDetail);detailCaption.hidden=!altarDetail;detailButton.setAttribute('aria-pressed',String(altarDetail))
  hall.update(world.camera)
  world.render()
  const now = Date.now()
  const items = []
  for (const p of peers.peers.values()) {
    if (!hallPeers.bodies.has(p.id)) continue
    items.push({ cls: 'tag3d', text: (p.nick || '법우').slice(0, 12), at: V3(p.x, 1.55, p.y) })
    if (p.say && p.sayUntil > now) items.push({ cls: 'bubble3d', text: p.say, at: V3(p.x, 2.1, p.y) })
  }
  items.push({ cls: 'tag3d mine', text: me.nick, at: V3(player.x, bow.on ? 1.0 : 1.55, player.y) })
  if (myLine && myLineUntil > now) items.push({ cls: 'bubble3d', text: myLine, at: V3(player.x, 2.1, player.y) })
  for (const s of spots) {
    if (s.pin === false || !s.at) continue
    if (Math.hypot(s.at[0] - player.x, s.at[1] - player.y) > 20) continue
    items.push({ cls: 'pin3d', text: s.name, at: V3(s.at[0], 3.3, s.at[1]) })
  }
  labels.paint(items)

  if (!modal.open && !bow.on && !chat.isOpen&&!seatedPractice) {
    const p = promptNow()
    if (p) {
      promptEl.textContent = atDoor(player.x,player.y) ? '문 밖으로 걸어가면 도량으로 나가요' : (isTouch ? '살펴보기 · ' : 'Space · ') + p.label
      promptEl.style.display = 'block'
    } else promptEl.style.display = 'none'
  } else promptEl.style.display = 'none'
}

let last = performance.now(), tt = 0
function loop (now) {
  const frameMs=now-last
  const dt = Math.min(.05, frameMs / 1000); last = now; tt += dt
  if (!document.hidden && !traveling) { world.quality.sample(frameMs);update(dt); render() }
  requestAnimationFrame(loop)
}

/* ---------- 들어오고 나가기 ---------- */
addEventListener('pagehide', () => { cancelSeatWalk(); keys.clear(); joy.reset();if(seatedPractice)stopSeatedPractice();if(bow.on)stopBow('잠시 쉬어요');peers.stop(); hallPeers.clear(); stopPractice() })
addEventListener('pageshow', e => {
  if (!e.persisted) return
  traveling = false
  hallExitGate.reset();keys.clear();joy.reset()
  if (fadeEl) fadeEl.classList.remove('on')
  peers.start(); peers.send(true)
})
document.addEventListener('visibilitychange', () => { if (!document.hidden) peers.send(true) })
addEventListener('online', () => { peers.start(); peers.send(true) })

if (!me.has) location.replace('/deungbul.html')

if (fadeEl) { fadeEl.classList.add('on'); requestAnimationFrame(() => fadeEl.classList.remove('on')) }
updateCount(); updateHere()
/* 오늘 도량 숫자: 들어올 때 한 번, 다른 법우가 올리면 바로, 그 밖에는 1분에 한 번만 읽는다. */
refreshYardBows(true)
stopPractice = subscribePractice(row => {
  if (row.nick === me.nick) return          // 내가 올린 건 이미 더해 두었다
  yardBows.shared += row.bows; yardBows.ready = true
  paintTogether()
  if (row.dedication) setStatus(row.nick + ' 법우가 ' + row.bows + '배를 회향했어요 · ' + row.dedication)
})
setStatus('좌복 위에 서서 살펴보기를 누르면 절을 합니다.')
if (me.has) peers.start()
try { cv.focus({ preventScroll: true }) } catch (e) {}
requestAnimationFrame(loop)

if (import.meta.env.DEV) window.__warp = (x, y) => { player.x = x; player.y = y; player.vx = 0; player.vy = 0; player.moving = false; peers.send(true) }
if (import.meta.env.DEV) window.__look = (x, y) => { player.face = Math.atan2(x - player.x, y - player.y); follower.state.yaw = player.face + Math.PI }
if (import.meta.env.DEV) window.__cam = () => ({ pos: world.camera.position.toArray().map(v => +v.toFixed(2)), dist: +follower.state.dist.toFixed(2), yaw: +follower.state.yaw.toFixed(2), fade: world.fadeables.map(m => +m.material.opacity.toFixed(2)), blockers: world.blockers.length })
if (import.meta.env.DEV) window.__beopdang = () => ({
  x: +player.x.toFixed(2), y: +player.y.toFixed(2), dir: player.dir, dist: +follower.state.dist.toFixed(1),
  traveling, modalOpen: modal.open, nick: me.nick, sex: me.sex,
  bow: { on: bow.on, goal: bow.goal, done: bow.done,phase:bow.t/BOW_CYCLE,speed:bow.speed,mode:bow.mode,rootY:meBody.position.y,returning:!!bowReturn }, bowTotal,best108,practice:seatedPractice?{kind:seatedPractice.kind,index:seatedPractice.index,elapsed:seatedPractice.elapsed,duration:seatedPractice.duration}:null,
  guided:seatWalk.active,yard:{...yardBows,bowing:bowingPeers,sync:bow.sync},onCushion: !!cushionAt(player.x, player.y), atDoor: atDoor(player.x, player.y),
  prompt: (promptNow() || {}).label || '',
  joined: peers.joined,
  peers: [...peers.peers.values()].map(p => ({ id: p.id, nick: p.nick, x: +p.x.toFixed(2), y: +p.y.toFixed(2), bow: p.bow }))
})
