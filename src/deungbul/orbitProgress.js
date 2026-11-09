/* 탑 중심 주위의 실제 이동 각도를 센다. 제자리 회전/왕복/지름길은 바퀴가 아니다. */
export function createOrbitProgress({x,z,minRadius=2.6,maxRadius=6.5,laps=3,maxSpeed=5}){
  let previous=null,angle=0;
  return{
    get progress(){return angle},get laps(){return angle/(2*Math.PI)},get done(){return angle+1e-8>=laps*2*Math.PI},
    sample(px,pz,now){
      const r=Math.hypot(px-x,pz-z);
      if(!Number.isFinite(r)||r<minRadius||r>maxRadius){previous=null;return{inBand:false,delta:0}}
      const current={x:px,z:pz,a:Math.atan2(pz-z,px-x),at:now};
      if(!previous){previous=current;return{inBand:true,delta:0}}
      const dt=(now-previous.at)/1000,travel=Math.hypot(px-previous.x,pz-previous.z);
      let delta=Math.atan2(Math.sin(current.a-previous.a),Math.cos(current.a-previous.a));
      previous=current;
      // 끊긴 표본이나 순간이동으로 반 바퀴를 건너뛴 경우는 기준점만 다시 잡는다.
      if(dt<=0||dt>1||travel>maxSpeed*dt+.12||Math.abs(delta)>.5)return{inBand:true,delta:0};
      angle=Math.max(0,Math.min(laps*2*Math.PI,angle+delta));
      return{inBand:true,delta};
    }
  };
}
