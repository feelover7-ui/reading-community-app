"""Head topology adapter for MakeHuman's CC0 base mesh and young targets.
Only mesh data is used; this module contains no MakeHuman program code.
"""
from pathlib import Path
import math
import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def build_face(root,female,mesh,ellipsoid,stroke,material,skin,white,iris,pupil,hair,metal):
    root=Path(root);verts=[];groups={};group=''
    for line in (root/'base.obj').read_text().splitlines():
        a=line.split()
        if not a:continue
        if a[0]=='v':verts.append(Vector(tuple(map(float,a[1:4]))))
        elif a[0]=='g':group=a[1];groups[group]=[]
        elif a[0]=='f':groups[group].append([int(i.split('/')[0])-1 for i in a[1:]])
    for line in (root/('asian-'+('female' if female else 'male')+'-young.target')).read_text().splitlines():
        a=line.split()
        if len(a)==4 and not a[0].startswith('#'):
            verts[int(a[0])]+=Vector(tuple(map(float,a[1:])))
    def center(group):
        ids=set(sum(groups[group],[]));return sum((verts[i] for i in ids),Vector())/len(ids)
    eye=center('joint-l-eye');bodyids=set(sum(groups['body'],[]))
    top=max(verts[i].y for i in bodyids);scale=(1.765-1.638)/(top-eye.y)
    def convert(v):
        x,y,z=v.x*scale,1.638+(v.y-eye.y)*scale,(v.z-eye.z)*scale+.064
        # A stylized young-adult face: modestly larger lid openings, a softer
        # nose projection, and relaxed mouth corners on the actual topology.
        eye_x=eye.x*scale
        for sign in [-1,1]:
            dx=x-sign*eye_x;dy=y-1.638
            w=math.exp(-(dx/.036)**4-(dy/.025)**4)*max(0,min(1,(z-.025)/.04))
            x+=dx*.10*w;y+=dy*.55*w
        z-=.007*math.exp(-(x/.023)**4-((y-1.602)/.035)**4)*max(0,min(1,(z-.072)/.025))
        mouth=math.exp(-(x/.033)**4-((y-1.565)/.013)**4)*max(0,min(1,(z-.06)/.025))
        y+=.003*(abs(x)/.025)**2*mouth
        x*=1-.12*mouth
        # Keep the extracted neck within the collar, without shoulder remnants.
        t=max(0,min(1,(1.535-y)/.065))
        x*=1-.65*t;z=(z-.003)*(1-.40*t)+.003
        if y>1.697:
            limit=-.008+.087*math.sqrt(max(.0001,1-((y-1.64)/.145)**2))-.003
            z=min(z,limit)
        return (x,y,z)
    selected=[f for f in groups['body'] if min(verts[i].y for i in f)>eye.y-1.7]
    ids=sorted(set(sum(selected,[])));mapping={v:i for i,v in enumerate(ids)}
    points=[convert(verts[i]) for i in ids];faces=[[mapping[i] for i in f] for f in selected]
    face_skin=skin.copy();face_skin.name='Face skin with subtle lip and cheek color'
    obj=mesh('Anatomical face and neck',points,faces,face_skin,'head',1)
    # Soft painted color stays on the actual facial surface, including the lips.
    attr=obj.data.color_attributes.new(name='Complexion',type='FLOAT_COLOR',domain='POINT')
    base=tuple(face_skin.diffuse_color[:3])
    lip_rgb=(.58,.26,.21);cheek_rgb=(.80,.45,.36)
    for v in obj.data.vertices:
        x,y,z=v.co.x,v.co.z,-v.co.y
        front=max(0,min(1,(z-.06)/.035))
        lip=math.exp(-(x/.022)**4-((y-1.563)/.007)**4)*front*.40
        cheek=math.exp(-((abs(x)-.047)/.022)**2-((y-1.594)/.018)**2)*front*.10
        attr.data[v.index].color=(*(base[i]*(1-lip-cheek)+lip_rgb[i]*lip+cheek_rgb[i]*cheek for i in range(3)),1)
    nodes=face_skin.node_tree.nodes;node=nodes.new('ShaderNodeVertexColor');node.layer_name='Complexion'
    face_skin.node_tree.links.new(node.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
    # Eyeballs sit behind the modelled lids rather than covering them with patches.
    tree=BVHTree.FromPolygons([v.co for v in obj.data.vertices],[list(p.vertices) for p in obj.data.polygons])
    for side,sign in [('l',1),('r',-1)]:
        raw=center('joint-'+side+'-eye');c=(raw.x*scale,1.638+(raw.y-eye.y)*scale,(raw.z-eye.z)*scale+.064)
        radius=.017 if female else .018
        ellipsoid('Inset sclera '+side,c,(radius,radius*1.20,radius),white,'head',32)
        r=.007 if female else .0068
        # Slightly raised spherical iris, inset within the eye opening.
        ellipsoid('Inset iris '+side,(c[0],c[1],c[2]+radius-.001),(r,r,.0013),iris,'head',28)
        ellipsoid('Inset pupil '+side,(c[0],c[1],c[2]+radius+.0001),(r*.49,r*.49,.0005),pupil,'head',24)
        ellipsoid('Eye glint '+side,(c[0]-.0017,c[1]+.002,c[2]+radius+.0007),(.001,.001,.0003),white,'head',16)
        brow=[]
        for x,y in [(sign*.014,1.665),(sign*.027,1.671),(sign*.041,1.670),(sign*.056,1.662)]:
            hit=tree.ray_cast(Vector((x,-1,y)),Vector((0,1,0)))[0]
            brow.append((x,y,-hit.y+.0015 if hit else .071))
        stroke('Surface eyebrow '+side,brow,.0022 if female else .0029,.0009,hair,'head',True,10,28)
        if female:ellipsoid('Small stud earring',(sign*.089,1.584,.001),(.0025,.0025,.002),metal,'head',16)
    return obj

def build_jacket(female,mesh,cloth):
    """Quad garment with actual armholes extruded into sleeves, no cap unions."""
    n=40;ys=([1.005,1.02,1.075,1.14,1.21,1.30,1.385,1.425,1.447] if female else
             [.865,.88,.96,1.08,1.21,1.30,1.385,1.425,1.447])
    ws=([.146,.149,.145,.14,.154,.174,.193,.135,.057] if female else
        [.16,.164,.16,.151,.162,.18,.205,.14,.057])
    ds=[.099,.101,.099,.096,.105,.105,.095,.074,.052]
    points=[];faces=[];blend=[]
    for j,y in enumerate(ys):
        for k in range(n+1):
            a=.30+(2*math.pi-.60)*k/n
            neckline=.045*max(0,math.cos(a))**4 if j==8 else 0
            points.append((ws[j]*math.sin(a),y-neckline,ds[j]*math.cos(a)));blend.append(0)
    holes=[(5,13),(27,35)];lo=4;hi=7
    for j in range(8):
        for k in range(n):
            if lo<=j<hi and any(a<=k<b for a,b in holes):continue
            i=j*(n+1)+k;faces.append((i,i+1,i+n+2,i+n+1))
    for (a,b),sign in zip(holes,[1,-1]):
        border=([hi*(n+1)+k for k in range(a,b+1)]+
                [j*(n+1)+b for j in range(hi-1,lo-1,-1)]+
                [lo*(n+1)+k for k in range(b-1,a-1,-1)]+
                [j*(n+1)+a for j in range(lo+1,hi)])
        end_y=.983 if female else 1.135;end_x=.286 if female else .278
        radius=.044 if female else .058;depth=.046 if female else .061
        last=border;angles=[math.atan2(points[i][2]/.10,(points[i][1]-1.3175)/.1075) for i in border]
        for step in range(1,8):
            t=step/7;current=[]
            for index,angle in zip(border,angles):
                p=points[index];end=(sign*(end_x+radius*math.cos(angle)),end_y,depth*math.sin(angle))
                outer=max(0,math.cos(angle))
                x=p[0]*(1-t)+end[0]*t+sign*(.015+.038*outer)*math.sin(math.pi*t)
                descent=t**(1+.8*outer)
                current.append(len(points));points.append((x,p[1]*(1-descent)+end[1]*descent,p[2]*(1-t)+end[2]*t));blend.append(t)
            for k in range(len(last)):
                q=(k+1)%len(last);faces.append((last[k],last[q],current[q],current[k]))
            last=current
    obj=mesh('Pattern cut jacket and sleeves',points,faces,cloth,'garment',0)
    attr=obj.data.attributes.new(name='Sleeve blend',type='FLOAT',domain='POINT')
    for i,value in enumerate(blend):attr.data[i].value=value
    bpy.context.view_layer.objects.active=obj
    sub=obj.modifiers.new('Tailored quad surface','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
    solid=obj.modifiers.new('Thin fabric','SOLIDIFY');solid.thickness=.002;solid.offset=-1;bpy.ops.object.modifier_apply(modifier=solid.name)
    bm=bmesh.new();bm.from_mesh(obj.data)
    unused=[v for v in bm.verts if not v.link_faces]
    if unused:bmesh.ops.delete(bm,geom=unused,context='VERTS')
    bm.to_mesh(obj.data);bm.free();obj.data.update()
    return obj
