import * as THREE from 'three';
import './style.css';
import {A320Systems} from './systems.js';
import {Instruments} from './instruments.js';
import {buildCockpit} from './cockpit.js';

const systems=new A320Systems(),scene=new THREE.Scene();
scene.background=new THREE.Color(0x030609);scene.fog=new THREE.Fog(0x030609,12,40);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.03,100);
camera.position.set(0,1.58,3.0);camera.rotation.order='YXZ';
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;
document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0x9fb8cf,0x120e0a,1.55));
const key=new THREE.DirectionalLight(0xffffff,1.7);key.position.set(2,5,4);key.castShadow=true;scene.add(key);

const instruments=new Instruments();
const cockpit=buildCockpit(scene,instruments,(name)=>{
  const s=systems.state;
  cockpit.controls.items.find(o=>o.name===name)?.userData && cockpit.controls.pulse(cockpit.controls.items.find(o=>o.name===name));
  if(name==='AP1')systems.toggle('ap1');
  else if(name==='AP2')systems.toggle('ap2');
  else if(name==='ATHR')systems.toggle('athr');
  else if(name==='FD')systems.toggle('fd');
  else if(name==='SPD')systems.set('selSpd',Math.min(340,s.selSpd+5));
  else if(name==='HDG')systems.set('selHdg',(s.selHdg+5)%360);
  else if(name==='ALT')systems.set('selAlt',Math.min(45000,s.selAlt+100));
  else if(name==='VS')systems.set('selVs',s.selVs===0?500:s.selVs+500);
  else if(name==='GEAR')systems.toggle('gearDown');
  else if(name==='PARK_BRAKE')systems.toggle('parkBrake');
  else if(name==='THROTTLE'){systems.set('throttle1',Math.min(1,s.throttle1+.05));systems.set('throttle2',Math.min(1,s.throttle2+.05));systems.set('athr',false)}
  else if(name==='FLAPS_0')systems.set('flaps',0);
  else if(name==='FLAPS_1')systems.set('flaps',1);
  else if(name==='FLAPS_2')systems.set('flaps',2);
  else if(name==='FLAPS_3')systems.set('flaps',3);
  else if(name==='FLAPS_4')systems.set('flaps',4);
  else if(name==='BAT'||name==='ELEC')systems.toggle('elec');
});

const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();
let looking=false,lx=0,ly=0;
renderer.domElement.addEventListener('pointerdown',e=>{
  ptr.x=e.clientX/innerWidth*2-1;ptr.y=-(e.clientY/innerHeight)*2+1;ray.setFromCamera(ptr,camera);
  const hit=ray.intersectObjects(cockpit.interactive,false)[0];
  if(hit?.object.userData.control)hit.object.userData.control.action && hit.object.userData.control.action;
  if(hit?.object.userData.control){const action=hit.object.userData.control.action;hit.object.userData.pressedUntil=performance.now()+120;
    const synthetic={action}; const a=synthetic.action;
    const s=systems.state;
    if(a==='AP1')systems.toggle('ap1');else if(a==='AP2')systems.toggle('ap2');else if(a==='ATHR')systems.toggle('athr');else if(a==='FD')systems.toggle('fd');
    else if(a==='SPD')systems.set('selSpd',Math.min(340,s.selSpd+5));else if(a==='HDG')systems.set('selHdg',(s.selHdg+5)%360);else if(a==='ALT')systems.set('selAlt',Math.min(45000,s.selAlt+100));else if(a==='VS')systems.set('selVs',s.selVs===0?500:s.selVs+500);
    else if(a==='GEAR')systems.toggle('gearDown');else if(a==='PARK_BRAKE')systems.toggle('parkBrake');
    else if(a.startsWith('FLAPS_'))systems.set('flaps',Number(a.split('_')[1]));
    else if(a==='THROTTLE'){systems.set('throttle1',Math.min(1,s.throttle1+.05));systems.set('throttle2',Math.min(1,s.throttle2+.05));systems.set('athr',false)}
    else if(a==='BAT'||a==='ELEC')systems.toggle('elec');
    else if(a.startsWith('MCDU_KEY_')){const parts=a.split('_');const r=Number(parts[2]),c=Number(parts[3]);const keys=[['FPLN','DIR','PERF'],['A','B','C'],['D','E','F'],['CLR','MENU','1']];cockpit.mcdu.key(keys[r]?.[c]||'1');cockpit.mcdu.draw();}
  }
  looking=true;lx=e.clientX;ly=e.clientY;
});
renderer.domElement.addEventListener('pointerup',()=>looking=false);
renderer.domElement.addEventListener('pointercancel',()=>looking=false);
renderer.domElement.addEventListener('pointermove',e=>{if(!looking)return;camera.rotation.y-= (e.clientX-lx)*.0021;camera.rotation.x=Math.max(-.68,Math.min(.35,camera.rotation.x-(e.clientY-ly)*.0018));lx=e.clientX;ly=e.clientY});

const hud=document.createElement('div');hud.id='hud';document.body.append(hud);
const hint=document.createElement('div');hint.id='hint';hint.innerHTML='<b>A320neo FLIGHT DECK</b><br>DRAG = LOOK • TAP = CONTROL';document.body.append(hint);

let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;
  systems.update(dt);cockpit.controls.animate();instruments.update(systems.state);cockpit.mcdu.draw();
  const s=systems.state;
  hud.innerHTML=`<b>A320neo</b><br>IAS ${Math.round(s.ias)} • M${s.mach.toFixed(2)}<br>ALT ${Math.round(s.alt)} • VS ${Math.round(s.vs)}<br>HDG ${String(Math.round(s.heading)%360).padStart(3,'0')} • FLAPS ${s.flaps}<br>AP1 ${s.ap1?'ON':'OFF'} • A/THR ${s.athr?'ON':'OFF'} • ELEC ${s.elec?'AVAIL':'OFF'}`;
  renderer.render(scene,camera);
}
requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
