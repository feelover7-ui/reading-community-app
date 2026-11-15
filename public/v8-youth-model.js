/* Original v6 face + continuous weighted garments. One skinned draw per actor. */
(function(){
 const T=window.THREE,source=window.HanmaumYouthMeshes;if(!T||!source)return
 const cache=new Map()
 function decode(s,Type){const bytes=Uint8Array.from(atob(s),c=>c.charCodeAt(0));return new Type(bytes.buffer)}
 function template(gender){
  if(cache.has(gender))return cache.get(gender)
  const record=source[gender],geometry=new T.BufferGeometry()
  for(const [key,size,Type] of [['position',3,Float32Array],['normal',3,Float32Array],['color',3,Float32Array],['skinIndex',4,Uint16Array],['skinWeight',4,Float32Array]])geometry.setAttribute(key,new T.BufferAttribute(decode(record[key],Type),size))
  geometry.setIndex(new T.BufferAttribute(decode(record.index,Uint32Array),1));geometry.computeBoundingSphere()
  const value={geometry,record:{bones:record.bones},regions:decode(record.region,Uint8Array)};cache.set(gender,value);delete source[gender];return value
 }
 function createActor(state={},label=false,avatar){
  const a=avatar.appearance(state.appearance||{}),gender=a.gender==='female'?'female':'male',data=template(gender)
  const root=new T.Group(),body=new T.Group();root.add(body)
  const bones=data.record.bones.map(b=>{const o=new T.Bone();o.name=b.name;return o})
  data.record.bones.forEach((r,i)=>{const bone=bones[i];bone.position.fromArray(r.position);if(r.parent>=0){bone.position.sub(new T.Vector3().fromArray(data.record.bones[r.parent].position));bones[r.parent].add(bone)}else body.add(bone)})
  const byName=Object.fromEntries(bones.map(b=>[b.name,b])),geometry=data.geometry.clone()
  const colors=geometry.getAttribute('color'),skinBase=new T.Color('#f0c4a5'),skinColor=new T.Color(a.skin),hairBase=new T.Color('#382b27'),hairColor=new T.Color(a.hairColor)
  const outfit=state.outfit&&state.outfit!=='basic'?window.HanmaumStore?.OUTFITS?.[state.outfit]?.color:null
  const clothColor=new T.Color(outfit||a.robeColor||(gender==='female'?'#bd8f92':'#657f97')),clothBase=new T.Color(gender==='female'?'#bd8f92':'#657f97')
  for(let i=0;i<colors.count;i++){
   const region=data.regions[i],color=region===1?skinColor:region===2?hairColor:region===3?clothColor:null,base=region===1?skinBase:region===2?hairBase:clothBase
   if(color)colors.setXYZ(i,colors.getX(i)*color.r/base.r,colors.getY(i)*color.g/base.g,colors.getZ(i)*color.b/base.b)
   if(region===2&&a.hair==='shaved'){const p=geometry.getAttribute('position');/* Keep the cropped silhouette instead of an empty scalp. */if(p.getY(i)>2.16)p.setY(i,2.16+(p.getY(i)-2.16)*.3)}
  }
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.82,side:T.DoubleSide})
  const mesh=new T.SkinnedMesh(geometry,material);mesh.name='reference-youth-v7';root.add(mesh)
  root.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);mesh.bind(skeleton);geometry.addEventListener('dispose',()=>skeleton.dispose());mesh.castShadow=true;mesh.receiveShadow=false;mesh.frustumCulled=false
  const arms=[byName.upperL,byName.upperR],elbows=[byName.lowerL,byName.lowerR],wrists=[byName.handL,byName.handR],legs=[byName.thighL,byName.thighR]
  const rig={root,body,torso:byName.chest,head:byName.head,arms,elbows,wrists,hands:wrists,legs,calves:[byName.calfL,byName.calfR],appearance:a,authored:true,skeleton,mesh}
  rig.rest=bones.map(b=>({bone:b,position:b.position.clone(),quaternion:b.quaternion.clone()}))
  root.userData={rig,parts:[mesh],materials:[material],arms,hands:wrists,signature:JSON.stringify([state.name,state.outfit,state.appearance]),directorStyle:{design:'approved-youth',model:'reference-youth-v7',jacket:gender==='female'?'rose-cardigan':'blue-overshirt',outfit:'trousers-no-bag'}}
  if(label&&typeof document!=='undefined'){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=90;const c=canvas.getContext('2d');c.fillStyle='#fffaf0';c.fillRect(0,0,512,90);c.fillStyle='#244c3b';c.font='bold 36px sans-serif';c.textAlign='center';c.fillText(String(state.name||'법우').slice(0,18),256,59,490)
   const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false}));sprite.position.y=2.7;sprite.scale.set(2.3,.4,1);sprite.userData.cameraIgnore=true;root.add(sprite);Object.assign(root.userData,{tex,label:sprite})
  }
  return root
 }
 function poseRig(rig,value={},walk=0){
  const gather=Math.max(0,Math.min(1,value.gather||0));rig.torso.rotation.x=value.bend||0
  for(let i=0;i<2;i++){
   const sign=i===0?-1:1,arm=rig.arms[i],elbow=rig.elbows[i],wrist=rig.wrists[i]
   const restUpper=elbow.position.clone(),restLower=wrist.position.clone(),l1=restUpper.length(),l2=restLower.length()
   const shoulder=arm.position.clone(),idle=shoulder.clone().add(restUpper).add(restLower);idle.z+=Math.sin(walk*sign)*.20
   const target=idle.lerp(new T.Vector3(sign*.045,.43,.40),gather),direction=target.clone().sub(shoulder)
   const distance=Math.max(.03,Math.min(l1+l2-.002,direction.length()));direction.normalize()
   const hint=new T.Vector3(sign*.45,-1,-.08);hint.addScaledVector(direction,-hint.dot(direction)).normalize()
   const along=(l1*l1-l2*l2+distance*distance)/(2*distance)
   const hinge=shoulder.clone().addScaledVector(direction,along).addScaledVector(hint,Math.sqrt(Math.max(0,l1*l1-along*along)))
   const upper=hinge.clone().sub(shoulder).normalize(),lower=target.clone().sub(hinge).normalize()
   arm.quaternion.setFromUnitVectors(restUpper.normalize(),upper)
   const lowerWorld=new T.Quaternion().setFromUnitVectors(restLower.normalize(),lower)
   elbow.quaternion.copy(arm.quaternion).invert().multiply(lowerWorld)
   const palm=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI*.85,sign*Math.PI*.35,0))
   const wanted=new T.Quaternion().slerp(palm,gather)
   wrist.quaternion.copy(lowerWorld).invert().multiply(wanted)
   rig.calves[i].rotation.x=Math.max(0,-rig.legs[i].rotation.x)*.65
  }
  rig.root.updateMatrixWorld(true);rig.skeleton.update()
 }
 window.HanmaumYouthModel={createActor,poseRig}
})()
