"""Reference-guided youth study. Blender 4.x, original garments/hair and a CC0
MakeHuman head foundation (work/human-foundation/SOURCE.json and licenses).
Run blender -b --python scripts/build-atelier-youth.py
Outputs are intentionally outside the production asset directory.
"""
import bpy, bmesh, math, pathlib, json, runpy, os
from mathutils import Vector
R=pathlib.Path(__file__).resolve().parents[1]
OUT=R/'work/atelier-youth'; OUT.mkdir(parents=True,exist_ok=True)
foundation=runpy.run_path(str(R/'scripts/atelier-foundation.py'))
PI=math.pi
def xyz(v): return (v[0],-v[2],v[1])
def linear(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def material(name,hex,rough=.8):
    m=bpy.data.materials.new(name);m.use_nodes=True
    rgb=tuple(linear(int(hex[i:i+2],16)/255) for i in (1,3,5))
    m.diffuse_color=(*rgb,1)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=rough
    return m
def mesh(name,verts,faces,mat,bone,sub=0):
    d=bpy.data.meshes.new(name);d.from_pydata([xyz(v) for v in verts],[],faces);d.update()
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(d);bm.free()
    for p in d.polygons:p.use_smooth=True
    if sub:
        bpy.context.view_layer.objects.active=o
        mod=o.modifiers.new('Surface refinement','SUBSURF');mod.levels=sub;bpy.ops.object.modifier_apply(modifier=mod.name)
    o['bone']=bone;parts.append(o);return o
def loft(name,rings,mat,bone,n=32,sub=1,fold=0):
    vs=[]
    for j,(y,rx,rz,cx,cz) in enumerate(rings):
        for k in range(n):
            a=k*2*PI/n;f=fold*math.sin(a*5+j*1.5)*math.sin(PI*j/(len(rings)-1))
            vs.append((cx+(rx+f)*math.cos(a),y,cz+(rz+f)*math.sin(a)))
    fs=[]
    for j in range(len(rings)-1):
        for k in range(n):
            i=j*n+k;l=j*n+(k+1)%n;fs.append((i,l,l+n,i+n))
    fs.extend([tuple(reversed(range(n))),tuple((len(rings)-1)*n+i for i in range(n))])
    return mesh(name,vs,fs,mat,bone,sub)
def ellipsoid(name,c,r,mat,bone,n=24):
    rings=[]
    for j in range(17):
        a=-PI/2+PI*j/16;s=max(.0005,math.cos(a))
        rings.append((c[1]+r[1]*math.sin(a),r[0]*s,r[2]*s,c[0],c[2]))
    return loft(name,rings,mat,bone,n,0)
def catmull(points,t):
    k=min(len(points)-2,int(t*(len(points)-1)));u=t*(len(points)-1)-k
    a=Vector(points[max(0,k-1)]);b=Vector(points[k]);c=Vector(points[k+1]);d=Vector(points[min(len(points)-1,k+2)])
    return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
def stroke(name,points,width,depth,mat,bone,taper=False,n=8,steps=22):
    vs=[]
    for j in range(steps+1):
        t=j/steps;c=catmull(points,t)
        tang=(catmull(points,min(1,t+.005))-catmull(points,max(0,t-.005))).normalized()
        u=Vector((0,0,1)).cross(tang).normalized()
        if u.length<.5:u=Vector((1,0,0))
        v=tang.cross(u).normalized()
        f=max(.025,math.sin(PI*(t*.92+.04))**.6) if taper else 1
        for k in range(n):
            a=k*2*PI/n;p=c+u*math.cos(a)*width*f+v*math.sin(a)*depth*f;vs.append(tuple(p))
    fs=[]
    for j in range(steps):
        for k in range(n):
            i=j*n+k;l=j*n+(k+1)%n;fs.append((i,l,l+n,i+n))
    fs.extend([tuple(reversed(range(n))),tuple(steps*n+i for i in range(n))])
    return mesh(name,vs,fs,mat,bone)

def fuse_surfaces(objects,name,bone,voxel=.004,smooth=5):
    """Union overlapping closed volumes; retain a single deformable surface."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    o=bpy.context.object;o.name=name;o['bone']=bone
    rem=o.modifiers.new('Continuous garment volume','REMESH');rem.mode='VOXEL';rem.voxel_size=voxel
    bpy.ops.object.modifier_apply(modifier=rem.name)
    mod=o.modifiers.new('Soft sewn transitions','SMOOTH');mod.factor=.65;mod.iterations=smooth
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('Runtime surface budget','DECIMATE');mod.ratio=.5
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:p.use_smooth=True
    return o

for female in [False,True]:
    if os.environ.get('ATELIER_GENDER') and os.environ['ATELIER_GENDER']!=('female' if female else 'male'):continue
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    parts=[];gender='female' if female else 'male'
    skin=material('Warm skin','#f0c4a5',.78);innerEar=material('Ear warmth','#d7a18b')
    cloth=material('Dusty rose cropped cardigan' if female else 'Muted blue cotton overshirt','#bd8f92' if female else '#657f97');seam=material('Cotton seams','#a5787c' if female else '#536d85');lining=material('Knit edging' if female else 'Rolled cuff','#cda3a4' if female else '#8b9fae')
    ivory=material('Ivory blouse' if female else 'Ivory jersey','#f1e8d9' if female else '#eae3d4');pants=material('High waist warm stone slacks' if female else 'Charcoal navy twill','#aaa090' if female else '#353944');pantseam=material('Trouser seams','#968c7d' if female else '#424550')
    shoe=material('Cream canvas sneakers','#ded8ca');sole=material('Rubber soles','#c9c3b6');laces=material('Cotton laces','#eee8db')
    hair=material('Dark brown hair','#3c302c',.7);hairlight=material('Hair ridges','#453731',.74)
    liner=material('Lids and brows','#654637');lip=material('Soft lip','#ca9479');mouth=material('Mouth seam','#946d55')
    white=material('Warm eye white','#f6eee3',.53);iris=material('Brown iris','#594137',.5);pupil=material('Pupil','#241f1d',.45)
    buttons=material('Warm shirt buttons','#c4b499');metal=material('Brushed brass','#ae9570',.48)
    # Body proportions: 1.78 m tall, head ~0.27 m; no oversized toy head.
    shoulder=.215 if female else .228
    hip=.141 if female else .148
    underlayer=loft('Ivory blouse' if female else 'T-shirt',[(.87 if female else .995,.137,.083,0,0),(.9 if female else 1.012,.144,.087,0,0),(1.05,.137,.085,0,0),(1.23,.155,.09,0,0),(1.36,.172,.083,0,0),(1.425,.115,.073,0,0),(1.448,.055,.052,0,0)],ivory,'chest',sub=1)
    if female:
        for v in underlayer.data.vertices:v.co.x*=.88;v.co.y*=.88
    jacket=foundation['build_jacket'](female,mesh,cloth)
    for s in ([] if female else [-1,1]):
        collar=[(s*.038,1.458,.018),(s*.10,1.425,.075),(s*.075,1.37,.105),(s*.04,1.407,.087)]
        mesh('Folded collar',collar,[(0,1,2,3)],cloth,'chest',0)
        stroke('Collar edge',[collar[0],collar[1],collar[2]],.0012,.001,seam,'chest',steps=12)
        stroke('Front placket',[(s*.061,.89,.099),(s*.058,1.06,.098),(s*.063,1.24,.104),(s*.068,1.36,.097)],.003,.0018,lining,'chest')
    if female:
        for s in [-1,1]:
            stroke('Cardigan knit edge',[(s*.045,1.025,.101),(s*.044,1.14,.102),(s*.049,1.25,.113),(s*.04,1.395,.077)],.0032,.0018,lining,'chest')
            stroke('Blouse soft pleat',[(s*.021,1.38,.075),(s*.026,1.23,.095),(s*.024,1.06,.093)],.001,.001,ivory,'chest')
        for y in [1.055,1.16,1.27]:ellipsoid('Small cardigan button',(-.046,y,.109),(.0034,.0034,.0015),metal,'chest',12)
        loft('Slacks waistband',[(.966,.140,.088,0,0),(.97,.142,.09,0,0),(.991,.139,.087,0,0),(.995,.136,.085,0,0)],pants,'pelvis',32,1)
        ellipsoid('Waist button',(0,.98,.09),(.004,.004,.0015),metal,'pelvis',12)
    else:
        for y in [.96,1.08,1.2,1.32]:ellipsoid('Shirt button',(-.068,y,.104),(.004,.004,.0018),buttons,'chest',12)
        mesh('Chest patch pocket',[(.084,1.26,.103),(.139,1.26,.092),(.139,1.19,.092),(.111,1.182,.102),(.084,1.19,.106)],[(0,1,2,3,4)],cloth,'chest')
        stroke('Pocket stitching',[(.084,1.258,.105),(.084,1.19,.107),(.111,1.182,.104),(.139,1.19,.094),(.139,1.258,.094)],.0009,.0009,seam,'chest')
    loft('High waist trouser yoke',[(.79,.025,.015,0,0),(.815,.125,.064,0,0),(.86,.151,.086,0,0),(.90,.149,.09,0,0),(.955,.143,.087,0,0),(.985,.137,.084,0,0)],pants,'pelvis',40,1)
    foundation['build_face'](R/'work/human-foundation',female,mesh,ellipsoid,stroke,material,skin,white,iris,pupil,hair,metal)
    # Hair cap and flattened tapered locks follow a side part; no round spaghetti fringe.
    vs=[];fs=[];n=48
    for j in range(17):
        for k in range(n):
            a=k*2*PI/n;front=math.cos(a)
            bottom=1.61+.085*max(0,front)-.04*max(0,-front)
            y=bottom+(1.783-bottom)*j/16
            radius=math.sqrt(max(.0001,1-((y-1.64)/.145)**2))
            vs.append((.098*radius*math.sin(a),y,-.008+.092*radius*math.cos(a)))
    for j in range(16):
        for k in range(n):i=j*n+k;l=j*n+(k+1)%n;fs.append((i,l,l+n,i+n))
    mesh('Hair crown',vs,fs,hair,'head')
    # Back cap continues to the nape.
    vs=[];fs=[]
    for j in range(9):
        y=1.565+.105*j/8
        for k in range(33):
            a=PI/2+PI*k/32;vs.append((.094*math.sin(a),y,-.006+.087*math.cos(a)))
    for j in range(8):
        for k in range(32):i=j*33+k;fs.append((i,i+1,i+34,i+33))
    mesh('Hair nape',vs,fs,hair,'head')
    if female:
        vs=[];fs=[];n=48
        for j in range(17):
            t=j/16;y=1.49+.222*t;r=.086+.025*math.sin(PI*t*.92)
            for k in range(n+1):
                a=.77+(2*PI-1.54)*k/n
                wave=.005*math.sin(a*4+t*3)*math.sin(PI*t)
                vs.append(((r+wave)*math.sin(a),y+.012*math.sin(a)+.006*math.cos(a*3)*(1-t),-.009+(r*.92+wave)*math.cos(a)))
        for j in range(16):
            for k in range(n):i=j*(n+1)+k;fs.append((i,i+1,i+n+2,i+n+1))
        mesh('Soft chin length bob',vs,fs,hair,'head',1)
        for s in [-1,1]:
            for k in range(5):
                a=(.86+k*.45)*s
                stroke('Bob flowing section',[(.083*math.sin(a),1.714,-.009+.083*math.cos(a)),(.111*math.sin(a),1.61,-.009+.102*math.cos(a)),(.088*math.sin(a),1.498,-.009+.081*math.cos(a))],.007,.002,hairlight if k%2==0 else hair,'head',True,8,24)
        bangs=[[(.032,1.773,.026),(-.013,1.752,.082),(-.067,1.697,.091),(-.085,1.602,.053)],[(.03,1.771,.032),(-.004,1.74,.088),(-.054,1.687,.094),(-.075,1.654,.067)],[(.037,1.769,.018),(.079,1.729,.07),(.102,1.63,.047),(.080,1.517,.036)]]
    else:
        bangs=[[(.025,1.775,.025),(-.018,1.766,.069),(-.059,1.724,.088),(-.067,1.666,.063)],[(.017,1.776,.022),(-.034,1.76,.069),(-.075,1.711,.068),(-.087,1.665,.022)],[(.034,1.774,.018),(.063,1.745,.071),(.065,1.695,.082),(.045,1.672,.076)],[(.035,1.776,.012),(.082,1.741,.049),(.096,1.693,.029),(.092,1.646,.012)]]
    if not female:
        bangs.extend([[(.023,1.774,.034),(-.011,1.751,.080),(-.043,1.711,.092),(-.027,1.679,.085)],[(.013,1.769,.033),(-.040,1.742,.073),(-.068,1.697,.079),(-.073,1.671,.061)]])
    for i,points in enumerate(bangs):
        stroke('Swept fringe',points,.024 if female else .017,.006,hair if i%2 else hairlight,'head',True,12,32)
        for j in [-1,1]:stroke('Fine hair ridge',[(p[0]+j*.007,p[1]+.002,p[2]+.006) for p in points],.0006,.0004,hairlight,'head',True,6,28)
    for i in range(7):
        x=-.078+i*.024
        stroke('Crown locks',[(x*.5,1.765,-.04),(x,1.759,.003),(x*1.05,1.723,.064)],.018,.006,hair if i%3 else hairlight,'head',True,10,20)
    # Legs, shoes and a subtle crotch bridge under the shirt hem.
    for s in [-1,1]:
        side='L' if s<0 else 'R';x=s*.082
        trouser=[(.085,.065,.061,x,.008),(.10,.067,.063,x,.008),(.16,.064,.06,x,0),(.34,.061,.064,x,0),(.49,.066,.064,x,.013),(.63,.075,.074,x,0),(.8,.078,.078,x,0),(.88,.075,.078,x,0)]
        if female:trouser=[(.10,.071,.064,x,.008),(.115,.073,.066,x,.008),(.22,.071,.065,x,0),(.4,.069,.069,x,0),(.55,.073,.074,x,.008),(.72,.082,.082,x,0),(.86,.080,.085,x,0),(.93,.074,.084,x,0)]
        loft('Loose trouser '+side,trouser,pants,'thigh'+side,32,1,.002)
        if female:stroke('Slacks pressed crease',[(x,.15,.072),(x,.46,.077),(x,.73,.088),(x,.87,.09)],.0008,.0008,pantseam,'thigh'+side)
        stroke('Trouser outseam',[(x+s*.065,.12,.004),(x+s*.065,.35,-.008),(x+s*.07,.59,-.004),(x+s*.075,.83,-.006)],.001,.001,pantseam,'thigh'+side)
        for y in [.135,.17,.48]:stroke('Trouser fold',[(x-.05,y+.008,.046),(x,y,.061),(x+.05,y-.008,.046)],.0012,.0009,pantseam,'thigh'+side,True)
        loft('Sneaker sole '+side,[(.012,.063,.119,x,.033),(.022,.069,.126,x,.033),(.044,.068,.124,x,.033),(.051,.063,.119,x,.033)],sole,'foot'+side,32,1)
        loft('Canvas sneaker '+side,[(.043,.062,.114,x,.031),(.055,.065,.116,x,.031),(.085,.059,.104,x,.025),(.117,.045,.059,x,-.006),(.132,.04,.047,x,-.015)],shoe,'foot'+side,32,1)
        for j in range(5):
            z=.018+j*.013;y=.125-j*.008
            stroke('Laces',[(x-.028,y,z),(x,y+.004,z+.004),(x+.028,y,z)],.0015,.0013,laces,'foot'+side,steps=8)
        # Sleeves taper into rolled cuffs above elbows; bare forearm continues to wrist.
        if female:
            loft('Blouse cuff '+side,[(.955,.04,.041,s*.288,.004),(.96,.044,.045,s*.288,.004),(.984,.045,.046,s*.286,.003),(.99,.041,.042,s*.286,.003)],ivory,'lower'+side,28,1)
        else:
            loft('Rolled cuff '+side,[(1.115,.061,.064,s*.279,0),(1.12,.064,.067,s*.279,0),(1.154,.064,.067,s*.272,0),(1.16,.06,.064,s*.271,0)],lining,'upper'+side,32,1)
        forearm=[(.856,.026,.028,s*.294,.005),(.88,.027,.03,s*.292,.005)]
        # Long sleeves fully cover this region. End hidden skin inside the cuff
        # so it cannot cut through the cloth as the elbow bends.
        forearm+=([(.945,.031,.033,s*.288,.004),(.98,.032,.034,s*.286,.003)] if female else
                  [(.99,.036,.037,s*.286,.003),(1.10,.045,.044,s*.279,0),(1.15,.046,.045,s*.272,0)])
        loft('Forearm '+side,forearm,skin,'lower'+side,28,1)
        loft('Palm '+side,[(.785,.027,.016,s*.295,.009),(.80,.031,.018,s*.295,.008),(.825,.032,.018,s*.294,.006),(.85,.026,.021,s*.294,.005),(.87,.025,.026,s*.294,.005)],skin,'hand'+side,24,1)
        for k in range(4):
            fx=s*(.272+k*.015);length=[.067,.079,.075,.058][k]
            stroke('Finger '+side+str(k),[(fx,.80,.006),(fx,.779,.01),(fx+s*.001,.80-length,.014)],.0068,.0065,skin,'hand'+side,False,8,12)
            ellipsoid('Fingertip '+side+str(k),(fx+s*.001,.80-length,.014),(.0068,.007,.0065),skin,'hand'+side,12)
        stroke('Thumb '+side,[(s*.271,.843,.017),(s*.255,.82,.027),(s*.25,.791,.031)],.009,.008,skin,'hand'+side,True,10,14)
    # No bag or straps: inspect the unobstructed torso and shoulders.
    trouser_parts=[o for o in parts if o.name.startswith(('Loose trouser','High waist trouser yoke'))]
    slacks=fuse_surfaces(trouser_parts,'Continuous tailored slacks','slacks',.004,12)
    # Above the inseam, press the front into one broad cloth plane rather than
    # retaining the overlapping yoke/leg volumes as a visible central pouch.
    for v in slacks.data.vertices:
        x,y,front=v.co.x,v.co.z,-v.co.y
        if .82<y<.95 and front>0:
            fade=max(0,1-abs(x)/.105)*min(1,(y-.82)/.035)*min(1,(.95-y)/.025)
            target=.083*math.sqrt(max(0,1-(x/.163)**2))
            v.co.y=-(front*(1-fade)+target*fade)
    parts=[o for o in bpy.context.scene.objects if o.type=='MESH']
    # Shorter visible neck, with the whole head assembly shifted together.
    for o in parts:
        if o['bone']=='head':
            for v in o.data.vertices:v.co.z=1.64+(v.co.z-1.64)*.91-.045
    # Tailor both bodies. Arms move inward as a unit so narrowing the torso does
    # not leave an exaggerated A-pose or detached sleeves. Use the same mapping
    # for vertices and rest joints to preserve deformation.
    def tailored_x(x,y,bone_name=''):
        if bone_name.startswith(('upper','lower','hand')):
            return x*(.74 if female else .80)
        keys=([(0,.97),(.82,1.03),(.99,.94),(1.16,.83),(1.39,.74),(1.52,.88)] if female else
              [(0,1),(.82,1),(.99,.96),(1.16,.89),(1.39,.81),(1.52,.94)])
        factor=keys[-1][1]
        for (a,fa),(b,fb) in zip(keys,keys[1:]):
            if y<=b:factor=fa+(fb-fa)*max(0,min(1,(y-a)/(b-a)));break
        return x*factor
    for o in parts:
        if o['bone']!='head':
            for v in o.data.vertices:
                if female and o['bone'].startswith('hand'):
                    center=-.294 if o['bone'].endswith('L') else .294
                    v.co.x=center+(v.co.x-center)*.88
                    v.co.z=.855+(v.co.z-.855)*.9
                    v.co.y*=.9
                sleeve=o.data.attributes.get('Sleeve blend') if o['bone']=='garment' else None
                w=sleeve.data[v.index].value if sleeve else 0
                v.co.x=tailored_x(v.co.x,v.co.z,o['bone'])*(1-w)+v.co.x*(.74 if female else .80)*w
    # Jacket armholes and sleeves are a single quad surface from authoring.
    parts=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for side in ['L','R']:
        arm_skin=[o for o in parts if o['bone'] in ['lower'+side,'hand'+side] and o.data.materials[0]==skin]
        fuse_surfaces(arm_skin,'Continuous wrist and hand '+side,'armSkin'+side,.0025,4)
        parts=[o for o in bpy.context.scene.objects if o.type=='MESH']
    # Real armature with deform weights, retained in GLB and editable .blend source.
    arm=bpy.data.armatures.new('Youth skeleton');rig=bpy.data.objects.new('Youth_'+gender,arm);bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    bones={}
    def bone(name,a,b,parent=None):
        if name!='head':
            a=(tailored_x(a[0],a[1],name),a[1],a[2]);b=(tailored_x(b[0],b[1],name),b[1],b[2])
        q=arm.edit_bones.new(name);q.head=xyz(a);q.tail=xyz(b)
        if parent:q.parent=bones[parent]
        bones[name]=q
    bone('root',(0,0,0),(0,.12,0));bone('pelvis',(0,.86,0),(0,1.01,0),'root');bone('chest',(0,1.01,0),(0,1.41,0),'pelvis');bone('neck',(0,1.41,0),(0,1.49,0),'chest');bone('head',(0,1.49,0),(0,1.72,0),'neck')
    for s in [-1,1]:
        side='L' if s<0 else 'R'
        bone('upper'+side,(s*.215,1.385,0),(s*.277,1.105,0),'chest');bone('lower'+side,(s*.277,1.105,0),(s*.294,.855,.005),'upper'+side);bone('hand'+side,(s*.294,.855,.005),(s*.294,.75,.012),'lower'+side)
        bone('thigh'+side,(s*.082,.86,0),(s*.082,.47,.01),'pelvis');bone('calf'+side,(s*.082,.47,.01),(s*.082,.085,0),'thigh'+side);bone('foot'+side,(s*.082,.085,0),(s*.082,.04,.13),'calf'+side)
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in parts:
        name=o['bone'];o.parent=rig
        deform=o.modifiers.new('Deform','ARMATURE');deform.object=rig
        groups={name:o.vertex_groups.new(name=name)}
        if name=='garment':
            for key in ['chest','upperL','upperR','lowerL','lowerR']:groups[key]=o.vertex_groups.new(name=key)
            for v in o.data.vertices:
                side='L' if v.co.x<0 else 'R';y=v.co.z
                t=max(0,min(1,(abs(v.co.x)-(.116 if female else .126))/.055));t=t*t*(3-2*t)
                armw=t*max(0,min(1,(1.445-y)/.085))
                lowerw=max(0,min(1,(1.155-y)/.10)) if female else 0
                groups['chest'].add([v.index],1-armw,'REPLACE')
                groups['upper'+side].add([v.index],armw*(1-lowerw),'REPLACE')
                groups['lower'+side].add([v.index],armw*lowerw,'REPLACE')
        elif name.startswith('armSkin'):
            side=name[-1]
            for key in ['lower'+side,'hand'+side]:groups[key]=o.vertex_groups.new(name=key)
            for v in o.data.vertices:
                w=max(0,min(1,(v.co.z-.825)/.055))
                groups['lower'+side].add([v.index],w,'REPLACE');groups['hand'+side].add([v.index],1-w,'REPLACE')
        elif name=='slacks':
            for key in ['pelvis','thighL','thighR','calfL','calfR']:groups[key]=o.vertex_groups.new(name=key)
            for v in o.data.vertices:
                side='L' if v.co.x<0 else 'R';y=v.co.z
                hipw=max(0,min(1,(y-.82)/.10));upperw=max(0,min(1,(y-.40)/.15))
                groups['pelvis'].add([v.index],hipw,'REPLACE')
                groups['thigh'+side].add([v.index],(1-hipw)*upperw,'REPLACE')
                groups['calf'+side].add([v.index],(1-hipw)*(1-upperw),'REPLACE')
        elif female and name.startswith('upper'):
            lower='lower'+name[-1];groups[lower]=o.vertex_groups.new(name=lower)
            for v in o.data.vertices:
                w=max(0,min(1,(v.co.z-1.055)/.10))
                groups[name].add([v.index],w,'REPLACE');groups[lower].add([v.index],1-w,'REPLACE')
        elif name.startswith('thigh'):
            calf='calf'+name[-1];groups[calf]=o.vertex_groups.new(name=calf)
            if female:groups['pelvis']=o.vertex_groups.new(name='pelvis')
            for v in o.data.vertices:
                y=v.co.z;w=max(0,min(1,(y-.40)/.15));hipw=max(0,min(1,(y-.82)/.10)) if female else 0
                groups[name].add([v.index],w*(1-hipw),'REPLACE');groups[calf].add([v.index],1-w,'REPLACE')
                if female:groups['pelvis'].add([v.index],w*hipw,'REPLACE')
        else:groups[name].add(list(range(len(o.data.vertices))),1,'REPLACE')
    # A restrained walk loop is exported to prove this is an animatable mesh asset.
    bpy.context.scene.render.fps=30
    for fr in range(1,32,3):
        phase=(fr-1)/30*2*PI
        for side,sign in [('L',1),('R',-1)]:
            for name,angle in [('thigh',.24*math.sin(phase)*sign),('calf',max(0,-math.sin(phase)*sign)*.32),('upper',-.12*math.sin(phase)*sign)]:
                p=rig.pose.bones[name+side];p.rotation_mode='XYZ';p.rotation_euler.x=angle;p.keyframe_insert('rotation_euler',frame=fr,group=name+side)
    if rig.animation_data and rig.animation_data.action:
        rig.animation_data.action.name='Walk'
        track=rig.animation_data.nla_tracks.new();track.name='Walk';track.strips.new('Walk',1,rig.animation_data.action);rig.animation_data.action=None
    for p in rig.pose.bones:p.rotation_euler=(0,0,0)
    for track in rig.animation_data.nla_tracks:track.mute=True
    bpy.context.scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(gender+'.blend')))
    # Preserve editable separate pieces in .blend; combine equal materials in the
    # runtime export so buttons, fingers and stitches do not each cost a draw call.
    by_material={}
    for o in parts:by_material.setdefault(o.data.materials[0].name,[]).append(o)
    for objects in by_material.values():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
    parts=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for track in rig.animation_data.nla_tracks:track.mute=False
    bpy.ops.export_scene.gltf(filepath=str(OUT/(gender+'.glb')),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_apply=False)
    print('EXPORTED',gender,len(parts),'meshes',sum(len(o.data.polygons) for o in parts),'faces')
print('Finished original male/female study')
