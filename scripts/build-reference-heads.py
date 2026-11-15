"""Fresh stylized head study; original mesh, eye openings and sculpted hair.
Blender 4.x. Produces real three-view renders and editable/exported static heads.
Not a game-ready rig or an image-generated illustration.
"""
import bpy,bmesh,math,pathlib,os,json
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/reference-heads-v6';OUT.mkdir(parents=True,exist_ok=True)
PI=math.pi
def xyz(p):return (p[0],-p[2],p[1])
def linear(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def material(name,color,rough=.65):
 m=bpy.data.materials.new(name);m.use_nodes=True
 rgb=[linear(int(color[i:i+2],16)/255) for i in (1,3,5)]
 m.diffuse_color=(*rgb,1);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=rough
 return m
def mesh(name,points,faces,mat,sub=0):
 d=bpy.data.meshes.new(name);d.from_pydata([xyz(p) for p in points],[],faces);d.update()
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(d);bm.free()
 for f in d.polygons:f.use_smooth=True
 bpy.context.view_layer.objects.active=o
 if sub:
  mod=o.modifiers.new('Smooth control surface','SUBSURF');mod.levels=sub;bpy.ops.object.modifier_apply(modifier=mod.name)
 parts.append(o);return o
def sphere(name,p,r,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=xyz(p))
 o=bpy.context.object;o.name=name;o.scale=(r[0],r[2],r[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
 parts.append(o);return o
def catmull(ps,t):
 k=min(len(ps)-2,int(t*(len(ps)-1)));u=t*(len(ps)-1)-k
 a,b,c,d=[Vector(ps[i]) for i in [max(0,k-1),k,k+1,min(len(ps)-1,k+2)]]
 return .5*(2*b+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
def ribbon(name,path,width,depth,mat,outward=(0,0,1)):
 ps=[];fs=[];n=12;steps=36
 for j in range(steps+1):
  t=j/steps;c=catmull(path,t);tan=(catmull(path,min(1,t+.01))-catmull(path,max(0,t-.01))).normalized()
  across=Vector(outward).cross(tan).normalized()
  if across.length<.5:across=Vector((1,0,0))
  normal=tan.cross(across).normalized()
  if normal.dot(Vector(outward))<0:normal=-normal
  taper=max(.015,math.sin(PI*(.08+.92*t))**.65)
  for k in range(n):
   a=2*PI*k/n
   p=c+across*(math.cos(a)*width*taper)+normal*(math.sin(a)*depth*taper)
   ps.append(tuple(p))
 for j in range(steps):
  for k in range(n):i=j*n+k;q=j*n+(k+1)%n;fs.append((i,q,q+n,i+n))
 fs.extend([tuple(reversed(range(n))),tuple(steps*n+k for k in range(n))])
 return mesh(name,ps,fs,mat)
def interp(keys,y):
 for i,((a,va),(b,vb)) in enumerate(zip(keys,keys[1:])):
  if y<=b:
   t=max(0,min(1,(y-a)/(b-a)));h=b-a
   prev=keys[max(0,i-1)];nxt=keys[min(len(keys)-1,i+2)]
   ma=(vb-prev[1])/(b-prev[0]);mb=(nxt[1]-va)/(nxt[0]-a)
   return (2*t**3-3*t*t+1)*va+(t**3-2*t*t+t)*h*ma+(-2*t**3+3*t*t)*vb+(t**3-t*t)*h*mb
 return keys[-1][1]
def loft(name,rings,mat):
 ps=[];fs=[];n=64
 for y,rx,rz,cz in rings:
  for k in range(n):a=2*PI*k/n;ps.append((rx*math.sin(a),y,cz+rz*math.cos(a)))
 for j in range(len(rings)-1):
  for k in range(n):i=j*n+k;q=j*n+(k+1)%n;fs.append((i,q,q+n,i+n))
 fs.extend([tuple(reversed(range(n))),tuple((len(rings)-1)*n+k for k in range(n))])
 return mesh(name,ps,fs,mat,2)
def point_camera(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()

for female in [False,True]:
 gender='female' if female else 'male'
 if os.environ.get('HEAD_GENDER') and os.environ['HEAD_GENDER']!=gender:continue
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);parts=[]
 skin=material('Peach skin','#efbf98',.68);lip=material('Soft lip edge','#b77d69',.7)
 ear=material('Ear inner warmth','#dba58c',.75);hair=material('Deep brown hair','#382b27',.84);hair2=material('Soft brown hair facets','#43322b',.85)
 white=material('Ivory sclera','#f6f0e6',.23);iris=material('Warm brown iris','#725040',.35);irisrim=material('Iris outer ring','#3e2b25',.37);pupil=material('Pupil','#211b18',.22);glint=material('Eye reflection','#fffdf6',.12)
 cloth=material('Rose cardigan' if female else 'Blue grey overshirt','#bd8f92' if female else '#657f97');ivory=material('Ivory collar','#f0e7d7')
 # Independent silhouette controls for chin, jaw, cheek, temple and cranium.
 widths=[(0,.10),(.10,.32),(.30,.51 if female else .55),(.58,.65 if female else .69),(1.02,.79),(1.40,.78),(1.78,.76),(2.02,.67),(2.22,.43),(2.35,.015)]
 fronts=[(0,.19),(.12,.38),(.35,.52),(.60,.56),(.90,.57),(1.25,.55),(1.58,.57),(1.85,.49),(2.12,.22),(2.35,-.13)]
 def face_z(x,y):
  w=interp(widths,y);r=min(.9999,abs(x)/max(w,.001));z=interp(fronts,y)*(1-r*r)**.30
  def g(cx,cy,sx,sy):return math.exp(-((x-cx)/sx)**2-((y-cy)/sy)**2)
  z+=.075*g(0,1.12,.10,.25)+(.11 if female else .13)*g(0,.91,.14,.105)
  z+=.025*g(0,.57,.25,.10)+.032*(g(-.42,.98,.27,.20)+g(.42,.98,.27,.20))
  z-=.018*(g(-.36,1.27,.25,.15)+g(.36,1.27,.25,.15))
  return z
 def eye_hole(x,y):
  for s in [-1,1]:
   dx=x-s*.36;dy=y-1.27-s*.025*dx
   if (dx/.282)**2+(dy/(.153 if dy>0 else .118))**2<1:return True
  return False
 ps=[];fs=[];rows=140;n=160
 for j in range(rows+1):
  y=2.35*j/rows;w=interp(widths,y)
  for k in range(n):
   a=2*PI*k/n;x=w*math.sin(a)
   z=face_z(x,y) if math.cos(a)>=0 else -.13-.57*math.sqrt(max(0,1-((y-1.24)/1.14)**2))*abs(math.cos(a))
   ps.append((x,y,z))
 for j in range(rows):
  for k in range(n):
   indices=(j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k)
   c=sum((Vector(ps[i]) for i in indices),Vector())/4
   if c.z>.25 and eye_hole(c.x,c.y):continue
   fs.append(indices)
 head=mesh('New cheek jaw and facial surface',ps,fs,skin)
 # Color belongs to the facial surface, not a separate lip/cheek object.
 color=head.data.color_attributes.new(name='Complexion',type='FLOAT_COLOR',domain='POINT');base=tuple(skin.diffuse_color[:3])
 for v in head.data.vertices:
  x,y,z=v.co.x,v.co.z,-v.co.y
  blush=math.exp(-((abs(x)-.49)/.21)**2-((y-.96)/.18)**2)*.10 if z>0 else 0
  mouth=math.exp(-(x/.20)**4-((y-.56)/.037)**4)*.10 if z>0 else 0
  color.data[v.index].color=(*(base[i]*(1-blush-mouth)+(.67,.28,.20)[i]*(blush+mouth) for i in range(3)),1)
 nodes=skin.node_tree.nodes;vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Complexion';skin.node_tree.links.new(vc.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
 # Skin elsewhere does not need the cheek color attribute.
 plain_skin=material('Neck and eyelid skin','#efbf98',.68)
 for s in [-1,1]:
  ex=s*.36;ey=1.27;ez=.26;r=.27
  # Only the visible curved sclera is exposed. The globe is trimmed to the lid
  # opening, preventing a whole white sphere from protruding through the cheek.
  sclera=[];sfaces=[];around=80;radial=10
  for j in range(radial+1):
   t=j/radial
   for k in range(around):
    a=2*PI*k/around;dx=.24*t*math.cos(a);dy=(.105 if math.sin(a)>0 else .075)*t*math.sin(a)
    sclera.append((ex+dx,ey+dy+s*.025*dx,ez+math.sqrt(max(.001,r*r-dx*dx-dy*dy))))
  for j in range(radial):
   for k in range(around):i=j*around+k;q=j*around+(k+1)%around;sfaces.append((i,q,q+around,i+around))
  mesh('Curved inset sclera',sclera,sfaces,white)
  # Ringed brown iris curved over the globe.
  for name,rad,zoff,mat in [('Iris border',.094,.001,irisrim),('Brown iris',.085,.002,iris),('Pupil',.041,.003,pupil)]:
   points=[];faces=[]
   for j in range(9):
    rr=rad*j/8
    for k in range(64):
     a=2*PI*k/64;points.append((ex+rr*math.cos(a),ey+rr*math.sin(a),ez+math.sqrt(r*r-rr*rr)+zoff+.002))
   for j in range(8):
    for k in range(64):i=j*64+k;q=j*64+(k+1)%64;faces.append((i,q,q+64,i+64))
   mesh(name,points,faces,mat)
  sphere('Eye sparkle',(ex-.026,ey+.039,ez+r+.005),(.014,.014,.004),glint)
  sphere('Small eye sparkle',(ex+.024,ey-.025,ez+r+.002),(.006,.006,.003),glint)
  points=[];faces=[];ringsteps=7;around=80;upper=[]
  for j in range(ringsteps):
   t=j/(ringsteps-1)
   for k in range(around):
    a=2*PI*k/around;dx=(.24+.09*t)*math.cos(a);dy=((.105+.095*t) if math.sin(a)>0 else (.075+.085*t))*math.sin(a)
    x=ex+dx;y=ey+dy+s*.025*dx
    inner_dx=.24*math.cos(a);inner_dy=(.105 if math.sin(a)>0 else .075)*math.sin(a)
    inside=ez+math.sqrt(max(.001,r*r-inner_dx*inner_dx-inner_dy*inner_dy))+.004
    # Meet the cheek surface before the cutout boundary. A linear recess let
    # the coarse edge of the original opening show through the new lid patch.
    join=min(1,t*2.2);join=join*join*(3-2*join)
    z=inside*(1-join)+(face_z(x,y)+.003)*join
    points.append((x,y,z))
    if j==0 and k<=around//2:upper.append((x,y,z+.003))
  for j in range(ringsteps-1):
   for k in range(around):i=j*around+k;q=j*around+(k+1)%around;faces.append((i,q,q+around,i+around))
  mesh('Modelled upper and lower eyelids',points,faces,plain_skin)
  ribbon('Fine upper lash',upper[::4],.010 if female else .007,.004,hair)
  brow=[]
  for x,y in [(s*.13,1.56),(s*.29,1.60),(s*.46,1.59),(s*.61,1.54)]:brow.append((x,y,face_z(x,y)+.025))
  ribbon('Tapered eyebrow',brow,.027 if female else .039,.013,hair)
  sphere('Ear',(s*.79,1.02,-.015),(.105,.22,.12),plain_skin)
  sphere('Ear hollow',(s*.835,1.04,.065),(.050,.125,.032),ear)
 # Quiet closed smile with volume supplied by the facial surface.
 path=[(x,.55+.018*(abs(x)/.18)**1.5,face_z(x,.55)+.008) for x in [-.18,-.09,0,.09,.18]]
 ribbon('Closed relaxed mouth',path,.006,.003,lip)
 loft('Neck',[(-.62,.34,.30,-.06),(-.40,.31,.28,-.07),(-.12,.27,.26,-.09),(.24,.28,.27,-.11)],plain_skin)
 loft('Shoulder study bust',[(-.72,1.08,.43,-.04),(-.66,1.12,.46,-.04),(-.40,.98,.40,-.04),(-.24,.55,.31,-.05),(-.16,.36,.29,-.05)],cloth)
 loft('Inner collar',[(-.31,.365,.295,-.045),(-.20,.35,.29,-.045),(-.16,.34,.28,-.045)],ivory)
 # Continuous scalp coverage plus non-cylindrical, tapered hair sections.
 points=[];faces=[];n=96;nr=28
 for j in range(nr+1):
  for k in range(n):
   a=2*PI*k/n;front=math.cos(a);low=1.06+.94*max(0,front)-.20*max(0,-front)
   y=low+(2.52-low)*j/nr;rad=math.sqrt(max(.0001,1-((y-1.43)/1.10)**2))
   points.append((.87*rad*math.sin(a),y,-.10+.79*rad*math.cos(a)))
 for j in range(nr):
  for k in range(n):i=j*n+k;q=j*n+(k+1)%n;faces.append((i,q,q+n,i+n))
 mesh('Continuous scalp volume',points,faces,hair)
 locks=[[(.24,2.49,.08),(-.02,2.43,.48),(-.48,2.09,.70),(-.59,1.65,.52)],
        [(.17,2.47,.04),(-.20,2.38,.45),(-.68,1.96,.51),(-.78,1.53,.24)],
        [(.29,2.48,.10),(.51,2.32,.54),(.70,1.98,.53),(.63,1.71,.47)],
        [(.35,2.43,.02),(.69,2.23,.31),(.84,1.81,.26),(.81,1.41,.08)]]
 if not female:
  locks.extend([[ (.20,2.49,.10),(-.02,2.32,.64),(-.31,2.03,.74),(-.25,1.73,.62)],
                [(-.12,2.43,.22),(-.42,2.24,.58),(-.64,1.88,.58),(-.69,1.61,.40)]])
 for i,path in enumerate(locks):ribbon('Layered side part '+str(i),path,.20 if female else .16,.026,hair if i%2 else hair2)
 for i in range(6):
  x=-.65+i*.24
  ribbon('Crown swept section '+str(i),[(x*.40,2.48,-.22),(x,2.43,.08),(x*1.08,2.18,.48)],.15,.020,hair if i%2 else hair2)
 if not female:
  for s in [-1,1]:
   for i in range(4):
    z=.22-i*.18
    ribbon('Temple layers',[(s*.66,2.20,z),(s*.88,1.75,z+.04),(s*.84,1.28,z),(s*.74,.98,z-.04)],.12,.025,hair if i%2 else hair2,(s,0,0))
 if female:
  points=[];faces=[];around=80
  for j in range(28):
   t=j/27;y=.19+1.92*t;r=.78+.17*math.sin(PI*t*.88)
   for k in range(around+1):
    a=.98+(2*PI-1.96)*k/around;wave=.025*math.sin(a*4+t*3)*math.sin(PI*t)
    points.append(((r+wave)*math.sin(a),y+.07*math.sin(a)*(1-t),-.13+(r*.88+wave)*math.cos(a)))
  for j in range(27):
   for k in range(around):i=j*(around+1)+k;faces.append((i,i+1,i+around+2,i+around+1))
  mesh('Curved bob shell',points,faces,hair,1)
  for s in [-1,1]:
   ribbon('Face framing bob',[(s*.68,2.11,.35),(s*.88,1.57,.43),(s*.91,.76,.36),(s*.72,.21,.23)],.18,.045,hair2)
   ribbon('Bob outer layer',[(s*.74,2.06,.15),(s*.94,1.32,.18),(s*.92,.57,.12),(s*.79,.22,.05)],.13,.025,hair)
 # Export the real static head/bust before staging three copies for rendering.
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=head
 bpy.ops.export_scene.gltf(filepath=str(OUT/(gender+'.glb')),export_format='GLB',use_selection=True,export_animations=False)
 stats={'gender':gender,'objects':len(parts),'vertices':sum(len(o.data.vertices) for o in parts),'faces':sum(len(o.data.polygons) for o in parts),'scope':'Original static head/bust, not rigged or integrated into v8'}
 (OUT/(gender+'-geometry.json')).write_text(json.dumps(stats,indent=2));print('HEAD',json.dumps(stats))
 original=list(parts)
 for index,angle in enumerate([0,-PI/4,-PI/2]):
  root=bpy.data.objects.new('View '+str(index),None);bpy.context.collection.objects.link(root);root.location.x=(index-1)*2.85;root.rotation_euler.z=angle
  for o in original:
   obj=o if index==0 else o.copy()
   if index:obj.data=o.data;bpy.context.collection.objects.link(obj)
   obj.parent=root
 # Minimal neutral studio so the geometry is visible from every requested angle.
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False
 scene.render.resolution_x=1536;scene.render.resolution_y=640;scene.render.resolution_percentage=100
 scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.72,.65,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
 scene.view_settings.view_transform='AgX'
 for name,loc,power,size in [('Key',(-3,-4,5),700,5),('Fill',(4,-3,3),450,5),('Rim',(0,3,4),850,4)]:
  data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
  obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=loc;point_camera(obj,(0,0,1))
 bpy.ops.object.camera_add(location=(0,-10,1));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=9;point_camera(camera,(0,0,1));scene.camera=camera
 scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/(gender+'-three-views.png'))
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(gender+'.blend')))
 bpy.ops.render.render(write_still=True)
print('Head studies exported and rendered')
