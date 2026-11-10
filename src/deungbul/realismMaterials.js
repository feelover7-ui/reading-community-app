import * as THREE from 'three'
import {chooseSceneQuality,createQualityMonitor} from './sceneQuality.js'

/* 직접 만든 작은 재질이다. 공식 사진 자체를 배포하지 않는다. */
export function createSurfaceLibrary(){
  const cache=new Map(),textures=[]
  function surface(kind,color){
    const key=kind+color;if(cache.has(key))return cache.get(key)
    const n=128,data=new Uint8Array(n*n*4),height=new Uint8Array(n*n*4),base=new THREE.Color(color).getRGB({},THREE.SRGBColorSpace)
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const noise=Math.sin(x*127.1+y*311.7)*43758.5453,grain=noise-Math.floor(noise)
      const roofWave=(Math.cos(x*Math.PI/8)+1)/2
      const stoneJoint=x%32<1||y%24<1
      const tileJoint=y%32<1||(x+(Math.floor(y/32)%2)*16)%32<1
      const joint=(kind==='stone'&&stoneJoint)||(kind==='paving'&&tileJoint)
      const seam=kind==='roof'?roofWave*.065:0
      const v=1+(grain-.5)*.035+seam+(kind==='wood'?Math.sin(y*.9+Math.sin(x*.06)*2)*.065:0)-(joint?.12:0)
      const i=(y*n+x)*4
      data[i]=Math.min(255,Math.max(0,Math.round(base.r*255*v)))
      data[i+1]=Math.min(255,Math.max(0,Math.round(base.g*255*v)))
      data[i+2]=Math.min(255,Math.max(0,Math.round(base.b*255*v)));data[i+3]=255
      const bump=joint?45:kind==='roof'?95+roofWave*100:150+grain*6
      height[i]=height[i+1]=height[i+2]=Math.round(bump);height[i+3]=255
    }
    const map=new THREE.DataTexture(data,n,n);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.needsUpdate=true;textures.push(map)
    const bumpMap=new THREE.DataTexture(height,n,n);bumpMap.wrapS=bumpMap.wrapT=THREE.RepeatWrapping;bumpMap.needsUpdate=true;textures.push(bumpMap)
    const mat=new THREE.MeshStandardMaterial({map,bumpMap,bumpScale:kind==='roof'?.035:kind==='paving'?.003:kind==='stone'?.008:.012,roughness:kind==='glass'?.26:kind==='metal'?.43:kind==='wood'?.72:.88,metalness:kind==='glass'?.12:kind==='metal'?.3:0})
    cache.set(key,mat);return mat
  }
  return {surface,dispose(){for(const m of cache.values())m.dispose();for(const t of textures)t.dispose();cache.clear()}}
}
export function addInstances(parent,geometry,material,poses){
  /* geometry 는 부르는 쪽 것이다. 여기서 dispose 하면 같은 geometry 를 함께 쓰는
     다른 인스턴스까지 깨진다(hallExteriorDetails 가 unit 하나를 네 번 넘긴다). */
  if(!poses.length)return null
  const batch=new THREE.InstancedMesh(geometry,material,poses.length),dummy=new THREE.Object3D()
  for(let i=0;i<poses.length;i++){const p=poses[i];dummy.position.set(...p.p);dummy.scale.set(...(p.s||[1,1,1]));dummy.rotation.set(...(p.r||[0,0,0]));dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix)}
  batch.castShadow=false;batch.receiveShadow=true;batch.computeBoundingSphere();parent.add(batch);return batch
}
export function mountSceneQuality(renderer,{container,shadows,groups=[]}={}){
  let mode='auto';try{mode=localStorage.getItem('hanmaum-scene-quality')||'auto'}catch{}
  if(!['auto','detail','light'].includes(mode))mode='auto'
  const hardware={coarse:matchMedia('(pointer:coarse)').matches,memory:navigator.deviceMemory||8,cores:navigator.hardwareConcurrency||4,saveData:!!navigator.connection?.saveData}
  let downgraded=false,active
  const button=document.createElement('button');button.type='button';button.className='iconbtn';button.id='qualityb';button.style.fontSize='11px';button.style.lineHeight='1.2';button.style.whiteSpace='pre-line'
  const names={auto:'자동',detail:'정밀',light:'가볍게'}
  const apply=()=>{
    active=chooseSceneQuality({...hardware,mode:downgraded&&mode==='auto'?'light':mode})
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,active.pixelRatio))
    renderer.setSize(innerWidth,innerHeight,false)
    renderer.shadowMap.enabled=active.shadows
    if(shadows)shadows.castShadow=active.shadows
    groups.forEach(g=>g.visible=active.detailed)
    button.textContent='화질\n'+names[mode]
    button.setAttribute('aria-label','화질 '+names[mode]+', 현재 '+(active.detailed?'정밀 표현':'가벼운 표현')+'. 누르면 다음 화질로 변경')
    button.title=button.getAttribute('aria-label')
  }
  const monitor=createQualityMonitor(()=>{if(mode==='auto'){downgraded=true;apply()}})
  button.onclick=()=>{mode={auto:'detail',detail:'light',light:'auto'}[mode];downgraded=false;monitor.reset();try{localStorage.setItem('hanmaum-scene-quality',mode)}catch{}apply()}
  container?.append(button);apply()
  return {get detailed(){return active.detailed},get shadows(){return active.shadows},sample(ms){if(mode==='auto')monitor.sample(ms)},add(g){groups.push(g);g.visible=active.detailed}}
}
