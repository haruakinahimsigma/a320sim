import * as THREE from 'three';
import './style.css';
import {A320Systems} from './systems.js';
import {Instruments} from './instruments.js';
import {buildCockpit} from './cockpit.js';

const systems=new A320Systems();
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x2487d8);
scene.fog=new THREE.Fog(0x2487d8,12,42);

// Move 30 cm aft from the previous seated view while preserving eye height.
const CAMERA_Z=-0.35;
const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.03,120);
camera.rotation.order='YXZ';
const cameraViews={
  CAPTAIN:new THREE.Vector3(-.33,1.12,CAMERA_Z),
  CENTER:new THREE.Vector3(.20,1.12,CAMERA_Z),
  FO:new THREE.Vector3(.68,1.12,CAMERA_Z)
};
let viewName='CAPTAIN';
let targetPos=cameraViews.CAPTAIN.clone();
camera.position.copy(targetPos);
camera.rotation.set(-.18,0,0);

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
let lookYaw=0,lookPitch=-.18;

function setView(name){
  viewName=name;targetPos.copy(cameraViews[name]);
  lookYaw=0;lookPitch=-.18;
  camera.rotation.y=lookYaw;camera.rotation.x=lookPitch;
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
  else if(name==='THROTTLE'){const v=Math.min(1,s.throttle1+.05);setThrottle(v);}
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
function sync3DControl(actionName,value){
  cockpit.controls.setActionValue?.(actionName,value);
}
function setThrottle(value){
  const v=THREE.MathUtils.clamp(value,0,1);
  systems.set('throttle1',v);systems.set('throttle2',v);systems.set('athr',false);
  sync3DControl('THROTTLE',v);
}
function applyDrag(o,v){
  const a=o.userData.control.action;
  if(a==='SPD')systems.set('selSpd',v);else if(a==='HDG')systems.set('selHdg',(v+360)%360);
  else if(a==='ALT')systems.set('selAlt',v);else if(a==='VS')systems.set('selVs',v);
  else if(a==='THROTTLE')setThrottle(v);
  else if(a==='GEAR')systems.set('gearDown',v>.5);
  else if(a==='SIDESTICK'){systems.set('aileron',v);sync3DControl('SIDESTICK',v);}
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
  const sensitivity=e.pointerType==='touch'?.0045:.0036;
  lookYaw-=(e.clientX-lx)*sensitivity;
  lookPitch=THREE.MathUtils.clamp(lookPitch-(e.clientY-ly)*sensitivity,-1.05,.48);
  lx=e.clientX;ly=e.clientY;
}
function up(){drag=null;cockpit.controls.endDrag();looking=false;}
renderer.domElement.addEventListener('pointerdown',down);
renderer.domElement.addEventListener('pointermove',move);
renderer.domElement.addEventListener('pointerup',up);
renderer.domElement.addEventListener('pointercancel',up);
renderer.domElement.addEventListener('wheel',e=>{camera.fov=THREE.MathUtils.clamp(camera.fov+e.deltaY*.025,48,82);camera.updateProjectionMatrix();},{passive:true});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

const viewBar=document.createElement('div');
viewBar.id='viewbar';
viewBar.innerHTML='<button data-view="CAPTAIN">CAPTAIN</button><button data-view="CENTER">CENTER</button><button data-view="FO">FO</button>';
document.body.append(viewBar);
viewBar.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('pointerdown',e=>{e.stopPropagation();setView(b.dataset.view);}));
setView('CAPTAIN');

const hud=document.createElement('div');hud.id='hud';document.body.append(hud);
const hint=document.createElement('div');hint.id='hint';
hint.innerHTML='<b>A320neo FLIGHT DECK</b><br>DRAG EMPTY SPACE = LOOK<br>TOUCH LEFT STICK = PITCH / ROLL<br>RIGHT THROTTLE = IDLE / CLB / FLEX / TOGA';
document.body.append(hint);

// Touch-friendly virtual flight controls. The same systems state drives the HUD,
// engine model and displays, and the 3D control hit zones are synchronized too.
const touchUI=document.createElement('div');
touchUI.id='touch-controls';
touchUI.innerHTML=`
  <div id="virtual-stick" aria-label="Virtual sidestick">
    <div class="stick-cross"></div><div id="virtual-stick-knob"></div>
    <div class="stick-label">PITCH / ROLL</div>
  </div>
  <div id="throttle-control" aria-label="Engine thrust control">
    <div class="throttle-title">THRUST <b id="throttle-percent">35%</b></div>
    <div id="throttle-track">
      <div class="throttle-mark mark-toga"><span>TOGA</span></div>
      <div class="throttle-mark mark-flex"><span>FLEX / MCT</span></div>
      <div class="throttle-mark mark-clb"><span>CLB</span></div>
      <div class="throttle-mark mark-idle"><span>IDLE</span></div>
      <div id="throttle-fill"></div><div id="throttle-thumb"></div>
    </div>
    <div id="throttle-detent">MANUAL</div>
  </div>`;
document.body.append(touchUI);

const stick=document.getElementById('virtual-stick');
const stickKnob=document.getElementById('virtual-stick-knob');
let stickPointer=null;
function updateStick(e){
  const r=stick.getBoundingClientRect();
  const radius=Math.min(r.width,r.height)*.34;
  const dx=THREE.MathUtils.clamp((e.clientX-(r.left+r.width/2))/radius,-1,1);
  const dy=THREE.MathUtils.clamp(((r.top+r.height/2)-e.clientY)/radius,-1,1);
  stickKnob.style.transform=`translate(${dx*radius}px,${-dy*radius}px)`;
  systems.set('aileron',dx);
  systems.set('elevator',dy);
  sync3DControl('SIDESTICK',dx);
}
stick.addEventListener('pointerdown',e=>{
  e.preventDefault();e.stopPropagation();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);updateStick(e);
});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)updateStick(e);});
function releaseStick(e){
  if(stickPointer===null||e.pointerId!==stickPointer)return;
  stickPointer=null;systems.set('aileron',0);systems.set('elevator',0);
  stickKnob.style.transform='translate(0px,0px)';
}
stick.addEventListener('pointerup',releaseStick);
stick.addEventListener('pointercancel',releaseStick);

const throttleTrack=document.getElementById('throttle-track');
let throttlePointer=null;
function updateThrottleFromPointer(e){
  const r=throttleTrack.getBoundingClientRect();
  setThrottle(1-THREE.MathUtils.clamp((e.clientY-r.top)/r.height,0,1));
}
throttleTrack.addEventListener('pointerdown',e=>{
  e.preventDefault();e.stopPropagation();throttlePointer=e.pointerId;throttleTrack.setPointerCapture(e.pointerId);updateThrottleFromPointer(e);
});
throttleTrack.addEventListener('pointermove',e=>{if(e.pointerId===throttlePointer)updateThrottleFromPointer(e);});
function releaseThrottle(e){if(e.pointerId===throttlePointer)throttlePointer=null;}
throttleTrack.addEventListener('pointerup',releaseThrottle);
throttleTrack.addEventListener('pointercancel',releaseThrottle);
document.getElementById('throttle-control').addEventListener('pointerdown',e=>e.stopPropagation());

function throttleLabel(v){
  if(v<.06)return 'IDLE';
  if(v>=.96)return 'TOGA';
  if(v>=.78)return 'FLEX / MCT';
  if(v>=.52&&v<=.68)return 'CLB';
  return 'MANUAL';
}
function updateTouchUI(s){
  const v=THREE.MathUtils.clamp((s.throttle1+s.throttle2)*.5,0,1);
  document.getElementById('throttle-percent').textContent=Math.round(v*100)+'%';
  document.getElementById('throttle-fill').style.height=(v*100)+'%';
  document.getElementById('throttle-thumb').style.bottom=(v*100)+'%';
  document.getElementById('throttle-detent').textContent=throttleLabel(v);
  document.getElementById('throttle-control').classList.toggle('active',throttlePointer!==null);
}

let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  systems.update(dt);cockpit.controls.animate();instruments.update(systems.state);cockpit.mcdu.draw(systems.state);
  const s=systems.state;
  updateTouchUI(s);
  camera.position.lerp(targetPos,1-Math.pow(.001,dt));
  camera.rotation.y=THREE.MathUtils.lerp(camera.rotation.y,lookYaw,1-Math.pow(.001,dt));
  camera.rotation.x=THREE.MathUtils.lerp(camera.rotation.x,lookPitch,1-Math.pow(.001,dt));
  const wp=s.nav1?(' • '+s.nav1.ident+' '+s.nav1.distance.toFixed(1)+'NM'):'';
  hud.innerHTML='<b>A320neo</b><br>VIEW '+viewName+' • IAS '+Math.round(s.ias)+' KT • M'+s.mach.toFixed(2)+'<br>ALT '+Math.round(s.alt)+' FT • VS '+Math.round(s.vs)+' FPM<br>HDG '+String(Math.round(s.heading)%360).padStart(3,'0')+' • GS '+Math.round(s.gs)+' KT'+wp+'<br>N1 '+Math.round(s.n1_1)+' / '+Math.round(s.n1_2)+'% • THR '+Math.round(((s.throttle1+s.throttle2)/2)*100)+'%<br>AP1 '+(s.ap1?'ON':'OFF')+' • A/THR '+(s.athr?'ON':'OFF')+' • ELEC '+(s.elec?'AVAIL':'OFF');
  renderer.render(scene,camera);
}
requestAnimationFrame(frame);
