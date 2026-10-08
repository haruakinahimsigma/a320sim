import * as THREE from 'three';
import { CockpitControls } from './controls.js';
import { MCDU } from './mcdu.js';

export function buildCockpit(scene,instruments){
  const root=new THREE.Group(); scene.add(root);
  const controls=new CockpitControls(root);
  const mat=(c,r=.7,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
  const panel=mat(0x202326,.82),dark=mat(0x090b0d,.75),edge=mat(0x3a3e42,.55),black=mat(0x020304,.5),metal=mat(0x777c80,.28,.72),glass=mat(0x10171b,.12,.25);
  const box=(name,p,size,ma=panel)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...size),ma);o.name=name;o.position.set(...p);o.castShadow=true;o.receiveShadow=true;root.add(o);return o};
  const cyl=(name,p,r,h,ma=metal)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),ma);o.name=name;o.position.set(...p);o.rotation.x=Math.PI/2;root.add(o);return o};
  const button=(name,p,action,size=[.15,.11,.1])=>{const o=box(name,p,size,edge);controls.register(o,action,{type:'button'});return o};
  const toggle=(name,p,action)=>{box(name+'BASE',p,[.16,.14,.11],black);const o=box(name,p,[.06,.22,.07],metal);controls.register(o,action,{type:'toggle'});return o};
  const knob=(name,p,action,min=0,max=1)=>{const o=cyl(name,p,.075,.105);o.userData.baseAngle=0;controls.register(o,action,{type:'knob',min,max,value:(min+max)/2});return o};
  box('floor',[0,.02,.1],[4.9,.08,5.6],dark); box('left wall',[-2.38,1.55,.1],[.22,2.45,4.7],dark); box('right wall',[2.38,1.55,.1],[.22,2.45,4.7],dark);
  box('glareshield',[0,1.72,1.86],[4.45,.28,.7],panel); box('center pedestal',[0,.88,.05],[1.9,.95,3.05],panel); box('pedestal top',[0,1.36,.35],[1.65,.14,2.45],dark);
  box('windshield left',[-1.02,2.25,1.35],[1.82,.06,.95],glass); box('windshield right',[1.02,2.25,1.35],[1.82,.06,.95],glass); box('pillar left',[-2.02,2.2,1.4],[.18,1.12,.2],dark); box('pillar right',[2.02,2.2,1.4],[.18,1.12,.2],dark); box('pillar center',[0,2.25,1.38],[.1,1.02,.18],dark);
  box('main panel',[0,1.39,1.72],[4.45,.82,.2],panel);
  const xs=[-1.5,-.5,.5,1.5]; ['PFD','ND','ECAM1','ECAM2'].forEach((n,i)=>{box(n+' bezel',[xs[i],1.5,1.58],[.94,.7,.08],black);instruments.mount(i,root,[xs[i],1.5,1.53]);});
  box('FCU',[0,1.8,1.35],[3.8,.2,.34],dark);
  [['SPD',-1.02,150,340],['HDG',-.35,0,360],['ALT',.34,1000,45000],['VS',1.0,-6000,6000]].forEach(([n,x,min,max])=>{box(n+'window',[x,1.82,1.43],[.34,.08,.05],black);knob(n,[x,1.78,1.23],n,min,max);button(n+'PUSH',[x,1.78,1.11],n,[.16,.09,.08]);});
  button('AP1',[1.48,1.8,1.22],'AP1'); button('AP2',[1.82,1.8,1.22],'AP2'); button('ATHR',[1.48,1.8,1.04],'ATHR'); button('FD',[1.82,1.8,1.04],'FD');
  box('throttle deck',[0,1.45,.8],[1.38,.12,1.65],black); for(const x of [-.24,.24]){const t=box('throttle',[x,1.64,.8],[.12,.48,.16],metal);controls.register(t,'THROTTLE',{type:'lever',min:0,max:1,value:.35,travel:.5});}
  ['FLAP_0','FLAP_1','FLAP_2','FLAP_3','FLAP_4'].forEach((a,i)=>button(a,[.55,1.45,.12+i*.18],a,[.12,.1,.1])); button('GEAR',[0,1.45,-.82],'GEAR',[.18,.22,.1]); button('PARK_BRAKE',[-.48,1.45,-.82],'PARK_BRAKE');
  const mcdu=new MCDU(); box('MCDU frame',[-.43,1.38,-.76],[.7,.14,.78],dark); mcdu.mount(root,[-.43,1.46,-.73]);
  for(let r=0;r<8;r++) for(let c=0;c<6;c++) button('MCDUKEY'+r+c,[-.73+c*.12,1.39,-1.08+r*.1],'MCDU_'+r+'_'+c,[.08,.07,.06]);
  const stick=box('sidestick',[-1.12,1.12,.55],[.11,.45,.11],metal); controls.register(stick,'SIDESTICK',{type:'stick',min:-1,max:1,value:0});
  box('left side console',[-1.12,.92,-.05],[.45,.22,2.1],dark); box('right side console',[1.12,.92,-.05],[.45,.22,2.1],dark);
  box('overhead',[0,2.63,-.05],[4.5,.18,2.2],dark); box('overhead panel',[0,2.5,.05],[4.1,.08,1.85],panel);
  for(let r=0;r<4;r++) for(let c=0;c<13;c++) toggle('OVH'+r+c,[-1.85+c*.31,2.49,.63-r*.38],'OVH'+r+c);
  ['BAT','EXT_PWR','APU','ENG1','ENG2','HYD','ELEC','BEACON','STROBE'].forEach((n,i)=>toggle(n,[-.8+i*.2,2.49,-.82],n));
  box('captain seat',[-.75,.72,-1.45],[.8,1.25,.8],dark); box('copilot seat',[.75,.72,-1.45],[.8,1.25,.8],dark); box('captain armrest',[-1.25,.9,-1.1],[.18,.12,.85],edge); box('copilot armrest',[1.25,.9,-1.1],[.18,.12,.85],edge);
  return {root,controls,interactive:controls.items,mcdu};
}
