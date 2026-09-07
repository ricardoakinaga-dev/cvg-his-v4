import bpy, math
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.35):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
 noise=m.node_tree.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=170
 bump=m.node_tree.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.09; bump.inputs['Distance'].default_value=.025
 m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']); m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
 return m
petrol=mat('Petroleo acetinado',(.018,.13,.17),.72)
ivory=mat('Ceramica mineral',(.72,.73,.65),.12,.48)
gold=mat('Champagne',(.55,.37,.15),.8,.28)
def ring(name,radius,thickness,material,loc,rot):
 bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=thickness,major_segments=96,minor_segments=24,location=loc,rotation=rot)
 o=bpy.context.object;o.name=name;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
a=ring('Orbita principal',1.45,.34,petrol,(-.9,0,.65),(.34,.25,.2))
b=ring('Arco mineral',1.02,.20,ivory,(-.65,.1,.95),(.7,-.2,.2))
c=ring('Detalhe champagne',1.83,.028,gold,(-.9,0,.5),(.2,.1,0))
for o in [a,b,c]:
 for f in range(1,74):
  t=2*math.pi*(f-1)/72
  o.location.z += .045*math.sin(t)
  o.keyframe_insert(data_path='location',frame=f)
  o.location.z -= .045*math.sin(t)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.05));bpy.context.object.data.materials.append(ivory)
bpy.ops.object.camera_add(location=(5,-8,7));cam=bpy.context.object;cam.rotation_euler=(Vector((.1,0,.6))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=7.8;bpy.context.scene.camera=cam
for name,loc,power,size,col in [('Key',(-3,-4,7),1500,5,(1,.92,.8)),('Cyan',(2,3,4),950,3,(.35,.8,1))]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=col;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=12;s.cycles.use_denoising=True;s.render.threads_mode='FIXED';s.render.threads=6
s.world.color=(.22,.22,.22);s.render.resolution_x=768;s.render.resolution_y=432;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG';s.render.fps=24;s.frame_start=1;s.frame_end=72
s.render.filepath='/home/ricardo/cvg-his-v4/docs/frontend/assets/video/frames/pulse-'
s.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath='/home/ricardo/cvg-his-v4/docs/frontend/assets/source/cvg-pulse-orbit.blend')
result={'saved':bpy.data.filepath,'frames':72,'fps':24,'engine':'CYCLES CPU','resolution':[768,432]}

