"""Combine original v6 head with tailored continuous garments; export compact skinned runtime data."""
import bpy, pathlib, json, base64, struct
from mathutils import Vector
R=pathlib.Path(__file__).resolve().parents[1]; OUT=R/'public/models'; OUT.mkdir(exist_ok=True)
result={}
def packed(values,kind):return base64.b64encode(struct.pack('<'+kind*len(values),*values)).decode()
def coord(v):return (v.x*1.28,v.z*1.28,-v.y*1.28)
for gender in ['male','female']:
 bpy.ops.wm.open_mainfile(filepath=str(R/'outputs/atelier-no-bag-v5'/f'{gender}.blend'))
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and o.get('bone')=='head':bpy.data.objects.remove(o,do_unlink=True)
 old=set(bpy.context.scene.objects)
 bpy.ops.import_scene.gltf(filepath=str(R/'outputs/reference-heads-v6'/f'{gender}.glb'))
 for o in list(set(bpy.context.scene.objects)-old):
  if o.type!='MESH':continue
  if any(x in o.name.lower() for x in ['bust','collar','shoulder']):bpy.data.objects.remove(o,do_unlink=True);continue
  world=o.matrix_world.copy();o.parent=None;o.matrix_world.identity()
  for v in o.data.vertices:v.co=world@v.co;v.co*=.12;v.co.z+=1.49
  o['bone']='head';o.vertex_groups.clear();g=o.vertex_groups.new(name='head');g.add(list(range(len(o.data.vertices))),1,'REPLACE')
  o.parent=rig;mod=o.modifiers.new('Deform','ARMATURE');mod.object=rig
 # Rest pose and a single animation-independent, identity-axis runtime skeleton.
 for track in rig.animation_data.nla_tracks:track.mute=True
 for p in rig.pose.bones:p.rotation_euler=(0,0,0)
 bpy.context.scene.frame_set(1)
 bones=list(rig.data.bones);names=[b.name for b in bones];rests=[coord(b.head_local) for b in bones]
 skeleton=[{'name':b.name,'parent':names.index(b.parent.name) if b.parent else -1,'position':rests[i]} for i,b in enumerate(bones)]
 pos=[];norm=[];col=[];skin=[];weight=[];indices=[];regions=[]
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 for o in meshes:
  bpy.context.view_layer.objects.active=o
  # Preserve skinning but remove tiny stitches and round detail cost at game scale.
  arm=[m for m in o.modifiers if m.type=='ARMATURE']
  for m in arm:m.show_viewport=False
  if len(o.data.polygons)>120:
   m=o.modifiers.new('Game mesh budget','DECIMATE');m.ratio=.22 if o.get('bone')!='head' else .38
   bpy.ops.object.modifier_apply(modifier=m.name)
  d=o.data;d.calc_loop_triangles();offset=len(pos)//3
  name=o.data.materials[0].name.lower();color=o.data.materials[0].diffuse_color[:3]
  region=1 if any(k in name for k in ['skin','ear']) else 2 if 'hair' in name else 3 if any(k in name for k in ['overshirt','cardigan','cotton seams','knit edging']) else 0
  vc=d.color_attributes.active_color
  corner_colors={}
  if vc and vc.domain=='CORNER':
   for loop in d.loops:corner_colors[loop.vertex_index]=vc.data[loop.index].color[:3]
  for v in d.vertices:
   p=o.matrix_world@v.co;pos.extend(coord(p));n=o.matrix_world.to_3x3()@v.normal;norm.extend((n.x,n.z,-n.y))
   c=vc.data[v.index].color[:3] if vc and vc.domain=='POINT' else corner_colors.get(v.index,color)
   col.extend(c);regions.append(region)
   ws=[(names.index(o.vertex_groups[g.group].name),g.weight) for g in v.groups if o.vertex_groups[g.group].name in names and g.weight>0]
   ws=sorted(ws,key=lambda q:-q[1])[:4] or [(names.index(o.get('bone')) if o.get('bone') in names else names.index('chest'),1)]
   total=sum(w for _,w in ws);ws=[(i,w/total) for i,w in ws]+[(0,0)]*(4-len(ws))
   skin.extend(i for i,w in ws);weight.extend(w for i,w in ws)
  for t in d.loop_triangles:indices.extend(offset+i for i in t.vertices)
  for m in arm:m.show_viewport=True
 result[gender]={'bones':skeleton,'vertices':len(pos)//3,'position':packed(pos,'f'),'normal':packed(norm,'f'),'color':packed(col,'f'),'skinIndex':packed(skin,'H'),'skinWeight':packed(weight,'f'),'index':packed(indices,'I'),'region':packed(regions,'B')}
 bpy.ops.wm.save_as_mainfile(filepath=str(R/'outputs/reference-heads-v6'/f'{gender}-release.blend'))
 bpy.ops.export_scene.gltf(filepath=str(OUT/f'youth-{gender}.glb'),export_format='GLB',export_animations=False)
 print('RELEASE',gender,len(pos)//3,'vertices',len(indices)//3,'triangles')
(OUT/'youth-meshes.js').write_text('window.HanmaumYouthMeshes='+json.dumps(result,separators=(',',':'))+';\n')
