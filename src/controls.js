import * as THREE from 'three';
export class CockpitControls{
 constructor(root){this.root=root;this.items=[];this.activeDrag=null;}
 register(object,action,opts={}){object.userData.control={action,type:opts.type||'button',axis:opts.axis||'z',min:opts.min??0,max:opts.max??1,value:opts.value??0,step:opts.step??1,travel:opts.travel??.25};object.userData.basePosition=object.position.clone();object.userData.baseRotation=object.rotation.clone();object.userData.baseAngle=opts.baseAngle??0;this.items.push(object);return object;}
 pulse(object){if(object)object.userData.pressedUntil=performance.now()+105;}
 setValue(object,value){
  const c=object?.userData.control;if(!c)return;
  c.value=THREE.MathUtils.clamp(value,c.min,c.max);
  if(c.type==='knob')object.rotation.z=object.userData.baseAngle+(c.value-c.min)/Math.max(.001,c.max-c.min)*Math.PI*1.55;
  if(c.type==='lever')object.position.y=object.userData.basePosition.y+(c.value-c.min)/Math.max(.001,c.max-c.min)*c.travel;
  if(c.type==='stick'){object.rotation.z=c.value*.22;object.rotation.x=c.value*.10;}
 }
 setActionValue(action,value){
  for(const object of this.items){
   const c=object.userData.control;
   if(c?.action===action)this.setValue(object,value);
  }
 }
 beginDrag(object,x,y){const c=object?.userData.control;if(!c||!['knob','lever','stick'].includes(c.type))return false;this.activeDrag={object,x,y,start:c.value};return true;}
 drag(x,y){
  if(!this.activeDrag)return null;
  const d=this.activeDrag,c=d.object.userData.control;
  let value=d.start;const dx=x-d.x,dy=d.y-y;
  if(c.type==='knob')value+=(dx-dy)*.008*(c.max-c.min);
  else if(c.type==='lever')value+=dy*.008*(c.max-c.min);
  else if(c.type==='stick')value+=dx*.006*(c.max-c.min);
  this.setValue(d.object,value);d.x=x;d.y=y;d.start=c.value;
  return {object:d.object,value:c.value};
 }
 endDrag(){const d=this.activeDrag;this.activeDrag=null;if(d?.object?.userData.control?.type==='stick')this.setValue(d.object,0);}
 animate(){const now=performance.now();for(const o of this.items){const c=o.userData.control;if(!c)continue;const base=o.userData.basePosition;if(c.type==='button'||c.type==='toggle')o.position.z=base.z-(((o.userData.pressedUntil||0)>now)?.035:0);}}
}
