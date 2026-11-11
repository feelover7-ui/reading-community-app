const point=(x,z)=>({x,z})
function smoothClosed(points){
 let out=points.map(([x,z])=>point(x,z))
 for(let pass=0;pass<2;pass++)out=out.flatMap((a,i)=>{const b=out[(i+1)%out.length];return[point(a.x*.75+b.x*.25,a.z*.75+b.z*.25),point(a.x*.25+b.x*.75,a.z*.25+b.z*.75)]})
 return out
}
// 사용자가 승인한 변경안. 위성사진의 정확한 잔디/화단 판독값으로 취급하지 않는다.
export function createApprovedLandscape({statue,statueStand,pagoda,hallDoor}){
 const lawn=smoothClosed([[7,39.3],[11,39],[16.5,39.4],[19.4,41.1],[19,44.2],[18.1,47.2],[18.1,49.5],[19.4,53],[21,56.2],[21.1,58.7],[20,61.6],[18.9,64.1],[16.5,61.1],[13.2,57.4],[10.5,53.2],[8.2,49],[6.6,44.7],[5.9,41.7]])
 const statueBed=smoothClosed([[2.4,33.8],[3.7,31.7],[6.2,30.3],[8.5,29.8],[9.5,30.8],[8.7,32.4],[6.5,31.9],[4.7,32.7],[3.6,34.2]])
 const east=smoothClosed([[28.6,32.7],[30.1,35.9],[32.1,39.6],[32.8,42.2],[33.2,44.3],[35.8,46.5],[37.6,47.2],[38.8,45.5],[37.5,41],[34.4,35.4],[31.4,32.4]])
 const trees=[
  [4.4,32,1],[7.9,31,.95],[3.2,33.4,.85],
  [7.3,44,.95],[9,48.7,1.05],[12.2,54.9,.95],[15,58.3,1.05],[18.1,61.7,.85],
  [32.1,35.5,.95],[35.1,40,1.05],[36.5,44.8,.9]
 ].map(([x,z,scale],i)=>({x,z,scale,radius:1.2*scale,seed:i+1}))
 const shrubs=[
  [3.4,33.2],[5,31.6],[8.5,31.1],
  [7.2,43.2],[9,49.4],[12.3,54.2],[15.7,58.6],[18.3,61.4],
  [31.2,34.5],[32.7,37.9],[33.5,39.5],[34,41.8],[35.8,45.7],[36.8,45.7]
 ].map(([x,z],i)=>({x,z,scale:.65+(i%3)*.14}))
 const rocks=[[3.9,32.5,.35],[10.8,53.5,.4],[17.7,61.7,.3],[34.4,38.2,.4],[36,43.9,.45],[36.2,46.1,.3]].map(([x,z,radius],i)=>({x,z,radius,seed:i+3}))
 return Object.freeze({lawns:[lawn],beds:[{id:'statue-back',polygon:statueBed,bank:false},{id:'east',polygon:east,bank:true}],trees,shrubs,rocks,anchors:{statue:{...statue},statueStand:{...statueStand},pagoda:{...pagoda},hallDoor:{...hallDoor}}})
}
