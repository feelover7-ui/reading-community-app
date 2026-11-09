/* 캐릭터와 기존 불단을 함께 담는 시점. 가로/세로 FOV로 거리를 계산한다. */
export function fitHallView ({ playerX, playerZ, aspect, fov }) {
  const altar={x:13,z:4.8},pitch=.3,yaw=Math.atan2(playerX-altar.x,playerZ-altar.z)
  const back={x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:Math.cos(yaw)*Math.cos(pitch)}
  const right={x:Math.cos(yaw),y:0,z:-Math.sin(yaw)}
  const up={x:-Math.sin(yaw)*Math.sin(pitch),y:Math.cos(pitch),z:-Math.cos(yaw)*Math.sin(pitch)}
  const target={x:(playerX+altar.x)/2,y:1.9,z:(playerZ+altar.z)/2}
  const points=[]
  for(const x of [altar.x-2.4,altar.x+2.4])for(const y of [.1,4.35])for(const z of [4.1,6.1])points.push({x,y,z})
  for(const x of [playerX-.5,playerX+.5])for(const y of [0,1.5])points.push({x,y,z:playerZ})
  const tanV=Math.tan(fov*Math.PI/360)*.82,tanH=tanV*aspect
  let distance=7
  for(const p of points){
    const d={x:p.x-target.x,y:p.y-target.y,z:p.z-target.z}
    const dot=v=>d.x*v.x+d.y*v.y+d.z*v.z
    distance=Math.max(distance,dot(back)+Math.max(Math.abs(dot(right))/tanH,Math.abs(dot(up))/tanV)+.8)
  }
  return {position:{x:target.x+back.x*distance,y:target.y+back.y*distance,z:target.z+back.z*distance},
    target,distance,back,right,up,points}
}
