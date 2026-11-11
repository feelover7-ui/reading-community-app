import * as THREE from 'three'

// 공식 정면 사진의 화엄석을 참고한 표현. 보이지 않는 후면 문양은 만들지 않는다.
function stoneMaterials(){
  const w=512,h=384,color=new Uint8Array(w*h*4),bump=new Uint8Array(w*h*4)
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const x=i/(w-1)*5.2-2.6,y=j/(h-1)*3.5
    const hash=Math.sin(i*127.1+j*311.7)*43758.5453,grain=hash-Math.floor(hash)
    // 오른쪽 큰 원과 위아래로 이어지는 원형 새김, 왼쪽 곡선은 사진을 참고한 근사다.
    let d=Math.abs(Math.hypot((x-.48)/1.04,(y-1.98)/1.12)-1)*1.04
    for(const [cy,r] of[[2.66,.065],[2.47,.1],[2.15,.16]])d=Math.min(d,Math.abs(Math.hypot(x-.48,y-cy)-r))
    const lower=Math.hypot((x-.48)/.29,(y-1.57)/.28)
    if(y>1.57)d=Math.min(d,Math.abs(lower-1)*.28)
    if(x<-.85){
      const a=Math.hypot((x+1.75)/.56,(y-2.78)/.76)
      if(y<2.78)d=Math.min(d,Math.abs(a-1)*.56)
      const b=Math.hypot((x+2.45)/.85,(y-1.55)/.79)
      if(y<1.55)d=Math.min(d,Math.abs(b-1)*.79)
    }
    const incision=Math.max(0,1-d/.023),fleck=Math.sin(i*.83+j*1.31)*Math.sin(j*.37-i*.59)
    const v=1+(grain-.5)*.13+fleck*.025-incision*.24,k=(j*w+i)*4
    for(let c=0;c<3;c++){color[k+c]=Math.min(255,Math.round([192,188,175][c]*v));bump[k+c]=Math.round(150+(grain-.5)*35-incision*90)}
    color[k+3]=bump[k+3]=255
  }
  const map=new THREE.DataTexture(color,w,h);map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true
  const bumpMap=new THREE.DataTexture(bump,w,h);bumpMap.needsUpdate=true
  return new THREE.MeshStandardMaterial({map,bumpMap,bumpScale:.025,roughness:.94})
}
export function addHwaeomStones({group,mesh}){
  const front=stoneMaterials(),side=new THREE.MeshStandardMaterial({color:'#b7b3a6',roughness:.96})
  const heights=[2.5,2.85,3.1,3.28,3.1,2.85,2.5]
  for(let i=0;i<7;i++){
    const h=heights[i],x=(i-3)*.73,z=-1.25+Math.abs(i-3)*.16
    const shape=new THREE.Shape()
    shape.moveTo(-.342,0);shape.lineTo(.342,.012);shape.lineTo(.346,h*.55);shape.lineTo(.315,h-.13)
    shape.lineTo(.14,h-.025);shape.lineTo(-.09,h-.045*(i%3));shape.lineTo(-.33,h-.14);shape.lineTo(-.351,h*.43);shape.closePath()
    const g=new THREE.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.018,bevelThickness:.024})
    const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv
    for(let v=0;v<p.count;v++)uv.setXY(v,(p.getX(v)+x+2.6)/5.2,(p.getY(v)+.05)/3.5)
    // 정면에만 이어지는 문양을 배치한다. 후면과 두께에는 새김을 넣지 않는다.
    g.clearGroups();let start=0,last=-1
    for(let v=0;v<p.count;v+=3){const m=n.getZ(v)>.99?0:1;if(m!==last){if(last!==-1)g.addGroup(start,v-start,last);start=v;last=m}}
    g.addGroup(start,p.count-start,last)
    const stone=mesh(g,[front,side],x,.05,z,group);stone.userData.hwaeomStone=i+1
  }
}
