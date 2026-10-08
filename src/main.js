import * as THREE from 'three';
import './style.css';
import {A320Systems} from './systems.js';
import {Instruments} from './instruments.js';
import {buildCockpit} from './cockpit.js';

const systems=new A320Systems();
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x2487d8);
scene.fog=new THREE.Fog(0x2487d8,12,42);

// Wider, slightly pulled-back flight-deck camera.
// Three.js PerspectiveCamera FOV is the vertical field of view.
const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.03,80);
camera.rotation.order='YXZ';
const cameraViews={
  CAPTAIN:new THREE.Vector3(-.48,1.53,-1.55),
  CENTER:new THREE.Vector3(0,1.53,-1.55),
  FO:new THREE.Vector3(.48,1.53,-1.55)
};
let viewName='CAPTAIN';
let targetPos=cameraViews.CAPTAIN.clone();
camera.position.copy(targetPos);
camera.rotation.set(-.025,0,0);

const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xd9efff,0x3c3025,2.15));
const sun=new THREE.DirectionalLight(0xfff4dd,3.0);
sun.position.set(-5,8,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const fill=new THREE.DirectionalLight(0xb9dcff,1.0);fill.position.set(4,4,1);scene.add(fill);

const instruments=new Instruments();
const cockpit=buildCockpit(scene,instruments);

cockpit.mcdu.onCommand=command=>{
  if(command.type==='DIRECT_TO') systems.directTo(command.ident);
  else if(command.type==='ADD_WAYPOINT') systems.addWaypoint(command.ident);
};

const ray=new THREE.Raycaster();
const pointer=new THREE.Vector2();
let looking=false,lx=0,ly=0,drag=null;
let lookYaw=0,lookPitch=-.06;

function setView(name){
  viewName=name;targetPos.copy(cameraViews[name]);
  lookYaw=0; lookPitch=-.06;
  camera.rotation.y=lookYaw; camera.rotation.x=lookPitch;
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
}
function hit(e){
  const r=renderer.domElement.getBoundingClientRect();
  pointer.x=((e.clientX-r.left)/r.width)*2-1;
  pointer.y=-((e.clientY-r.top)/r.height)*2+1;
  ray.setFromCamera(pointer,camera);
  return ray.intersectObjects(cockpit.interactive,false)[0]?.object||null;
}
function action(name){
  const s=systems.state;
  if(name==='AP1')systems.toggle('ap1');else if(name==='AP2')systems.toggle('ap2');
  else if(name==='ATHR')systems.toggle('athr');else if(name==='FD')systems.toggle('fd');
  else if(name==='SPD')systems.set('selSpd',Math.min(340,s.selSpd+5));
  else if(name==='HDG')systems.set('selHdg',(s.selHdg+5)%360);
  else if(name==='ALT')systems.set('selAlt',Math.min(45000,s.selAlt+100));
  else if(name==='VS')systems.set('selVs',s.selVs>=5500?-6000:s.selVs+500);
  else if(name==='GEAR')systems.toggle('gearDown');else if(name==='PARK_BRAKE')systems.toggle('parkBrake');
  else if(name.startsWith('FLAP_'))systems.set('flaps',name==='FLAP_4'?4:Number(name.slice(5)));
  else if(name==='THROTTLE'){systems.set('throttle1',Math.min(1,s.throttle1+.05));systems.set('throttle2',Math.min(1,s.throttle2+.05));systems.set('athr',false);}
  else if(name==='BAT'||name==='ELEC')systems.toggle('elec');else if(name==='APU')systems.set('apu',1);
  else if(name==='ENG1'||name==='ENG2')systems.set(name.toLowerCase(),1);
  else if(name==='HYD'){systems.toggle('hydGreen');systems.toggle('hydBlue');systems.toggle('hydYellow');}
  else if(name==='BEACON')systems.toggle('beacon');else if(name==='STROBE')systems.toggle('strobe');
  else if(name==='ILS')systems.toggle('ils');
}
function mcduKey(a){
  const p=a.split('_'),r=Number(p[1]),c=Number(p[2]);
  const keys=cockpit.mcdu.keys;
  cockpit.mcdu.key(keys[r]?.[c]||'CLR');
}
function applyDrag(o,v){
  const a=o.userData.control.action;
  if(a==='SPD')systems.set('selSpd',v);else if(a==='HDG')systems.set('selHdg',(v+360)%360);
  else if(a==='ALT')systems.set('selAlt',v);else if(a==='VS')systems.set('selVs',v);
  else if(a==='THROTTLE'){systems.set('throttle1',v);systems.set('throttle2',v);systems.set('athr',false);}
  else if(a==='SIDESTICK'){systems.set('aileron',v);systems.set('elevator',-v);}
}
function down(e){
  const o=hit(e);
  if(o){
    const c=o.userData.control;cockpit.controls.pulse(o);
    if(c.type==='knob'||c.type==='lever'||c.type==='stick'){drag=o;cockpit.controls.beginDrag(o,e.clientX,e.clientY);}
    else if(c.action.startsWith('MCDU_'))mcduKey(c.action);else action(c.action);
    return;
  }
  looking=true;lx=e.clientX;ly=e.clientY;
}
function move(e){
  if(drag){const result=cockpit.controls.drag(e.clientX,e.clientY);if(result)applyDrag(result.object,result.value);return;}
  if(!looking)return;
  lookYaw-= (e.clientX-lx)*.002;
  lookPitch=THREE.MathUtils.clamp(lookPitch-(e.clientY-ly)*.0017,-.50,.28);
  lx=e.clientX;ly=e.clientY;
}
function up(){drag=null;cockpit.controls.endDrag();looking=false;}
renderer.domElement.addEventListener('pointerdown',down);
renderer.domElement.addEventListener('pointermove',move);
renderer.domElement.addEventListener('pointerup',up);
renderer.domElement.addEventListener('pointercancel',up);
renderer.domElement.addEventListener('wheel',e=>{camera.fov=THREE.MathUtils.clamp(camera.fov+e.deltaY*.025,55,78);camera.updateProjectionMatrix();},{passive:true});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

const viewBar=document.createElement('div');
viewBar.id='viewbar';
viewBar.innerHTML='<button data-view="CAPTAIN">CAPTAIN</button><button data-view="CENTER">CENTER</button><button data-view="FO">FO</button>';
document.body.append(viewBar);
viewBar.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('pointerdown',e=>{e.stopPropagation();setView(b.dataset.view);}));
setView('CAPTAIN');

const hud=document.createElement('div');hud.id='hud';document.body.append(hud);
const hint=document.createElement('div');hint.id='hint';
hint.innerHTML='<b>A320neo FLIGHT DECK</b><br>TAP = CONTROL • DRAG EMPTY SPACE = LOOK<br>CAPTAIN / CENTER / FO = CAMERA • WHEEL = FOV';
document.body.append(hint);

let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  systems.update(dt);cockpit.controls.animate();instruments.update(systems.state);cockpit.mcdu.draw(systems.state);
  camera.position.lerp(targetPos,1-Math.pow(.001,dt));
  camera.rotation.y=THREE.MathUtils.lerp(camera.rotation.y,lookYaw,1-Math.pow(.001,dt));
  camera.rotation.x=THREE.MathUtils.lerp(camera.rotation.x,lookPitch,1-Math.pow(.001,dt));
  const s=systems.state;
  const wp=s.nav1?(' • '+s.nav1.ident+' '+s.nav1.distance.toFixed(1)+'NM'):'';
  hud.innerHTML='<b>A320neo</b><br>VIEW '+viewName+' • IAS '+Math.round(s.ias)+' KT • M'+s.mach.toFixed(2)+'<br>ALT '+Math.round(s.alt)+' FT • VS '+Math.round(s.vs)+' FPM<br>HDG '+String(Math.round(s.heading)%360).padStart(3,'0')+' • GS '+Math.round(s.gs)+' KT'+wp+'<br>AP1 '+(s.ap1?'ON':'OFF')+' • A/THR '+(s.athr?'ON':'OFF')+' • ELEC '+(s.elec?'AVAIL':'OFF');
  renderer.render(scene,camera);
}
requestAnimationFrame(frame);
