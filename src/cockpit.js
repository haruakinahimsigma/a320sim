import * as THREE from 'three';
import { CockpitControls } from './controls.js';
import { MCDU } from './mcdu.js';

export function buildCockpit(scene, instruments, onAction) {
  const root = new THREE.Group(); scene.add(root);
  const controls = new CockpitControls(root, onAction);
  const mat=(color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const panel=mat(0x1b1d1f,.86),dark=mat(0x080a0c,.8),edge=mat(0x303438,.7),black=mat(0x020304,.6),metal=mat(0x70777b,.3,.65);
  const glass=new THREE.MeshStandardMaterial({color:0x0b1012,roughness:.18,metalness:.1});
  const box=(name,p,size,material=panel)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...size),material);o.name=name;o.position.set(...p);o.castShadow=true;o.receiveShadow=true;root.add(o);return o};
  const cyl=(name,p,r,h,material=metal)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20),material);o.name=name;o.position.set(...p);o.rotation.x=Math.PI/2;o.castShadow=true;root.add(o);return o};
  const button=(name,p,action,w=.13,h=.12)=>{const o=box(name,p,[w,h,.11],edge);controls.register(o,action,{type:'button'});return o};
  const toggle=(name,p,action)=>{box(name+'_BASE',p,[.16,.12,.13],black);const o=box(name,p,[.07,.24,.08],metal);controls.register(o,action,{type:'toggle',pressDepth:.045});return o};
  const knob=(name,p,action)=>{const o=cyl(name,p,.075,.11);controls.register(o,action,{type:'knob'});return o};

  box('instrument glare shield',[0,1.72,1.82],[4.35,.27,.72]);
  box('left windshield pillar',[-1.94,2.15,1.45],[.18,1.05,.18],dark);
  box('right windshield pillar',[1.94,2.15,1.45],[.18,1.05,.18],dark);
  box('center windshield pillar',[0,2.2,1.38],[.11,1.0,.16],dark);
  for(const x of[-1,1]) box('windshield',[x,2.2,1.34],[1.82,.06,.92],glass);

  box('main instrument panel',[0,1.36,1.73],[4.38,.88,.22]);
  ['PFD','ND','ECAM1','ECAM2'].forEach((n,i)=>box(n+' bezel',[-1.45+i*.96,1.5,1.57],[.88,.66,.09],black));
  instruments.mount(0,root,[-1.45,1.5,1.515]);instruments.mount(1,root,[-.48,1.5,1.515]);instruments.mount(2,root,[.49,1.5,1.515]);instruments.mount(3,root,[1.46,1.5,1.515]);

  box('FCU',[0,1.78,1.43],[3.62,.18,.32],dark);
  [['SPD',-.92],['HDG',-.30],['ALT',.34],['VS',.96]].forEach(([label,x])=>{box(label+' label',[x,1.79,1.25],[.36,.07,.06],black);knob(label,[x,1.78,1.22],label);button(label+'_PUSH',[x,1.78,1.12],label)});
  button('AP1',[1.48,1.78,1.22],'AP1');button('AP2',[1.82,1.78,1.22],'AP2');button('ATHR',[1.48,1.78,1.02],'ATHR');button('FD',[1.82,1.78,1.02],'FD');

  box('pedestal',[0,.75,.05],[1.82,.7,2.85],panel);box('pedestal top',[0,1.13,.32],[1.55,.12,2.15],dark);box('throttle quadrant',[0,1.17,.85],[1.28,.12,1.25],black);
  for(const x of[-.24,.24]){const t=box('THROTTLE',[x,1.36,.78],[.10,.43,.16],metal);controls.register(t,'THROTTLE',{type:'lever'})}
  ['FLAP_UP','FLAP_1','FLAP_2','FLAP_3','FLAP_FULL'].forEach((n,i)=>button(n,[.48,1.17,.34+i*.22],'FLAPS_'+i,.11,.09));
  button('GEAR',[0,1.17,-.72],'GEAR',.16,.18);button('PARK_BRAKE',[-.43,1.17,-.72],'PARK_BRAKE',.16,.11);

  box('MCDU housing',[-.42,1.12,-.75],[.62,.11,.62],dark);box('MCDU screen',[-.42,1.19,-.69],[.43,.025,.27],black);
  for(let r=0;r<4;r++)for(let c=0;c<3;c++)button('MCDU_L'+r+'_'+c,[-.65+c*.23,1.12,-.92+r*.12],'MCDU_KEY_'+r+'_'+c);

  box('sidestick base',[-.92,.88,.95],[.48,.16,.5],dark);const stick=box('SIDESTICK',[-.92,1.16,.95],[.12,.52,.12],metal);controls.register(stick,'SIDESTICK',{type:'stick'});

  box('overhead shell',[0,2.62,-.05],[4.45,.22,2.08],dark);box('overhead inner',[0,2.48,.02],[4.05,.08,1.75],panel);
  for(let r=0;r<4;r++)for(let c=0;c<12;c++)toggle('OVHD_'+r+'_'+c,[-1.76+c*.32,2.48,.62-r*.38],'OVHD_'+r+'_'+c);
  box('overhead center panel',[0,2.49,-.83],[1.5,.10,.34],black);
  ['BAT','EXT_PWR','APU','ENG1','ENG2','HYD','ELEC'].forEach((n,i)=>toggle(n,[-.6+i*.2,2.49,-.83],n));

  box('left sidewall',[-2.35,1.48,.15],[.24,2.15,4.4],dark);box('right sidewall',[2.35,1.48,.15],[.24,2.15,4.4],dark);box('floor',[0,.04,.2],[4.8,.08,5.1],dark);
  box('pilot seat',[-.72,.76,-1.15],[.72,1.2,.7],dark);box('copilot seat',[.72,.76,-1.15],[.72,1.2,.7],dark);
  return {root,interactive:controls.items,controls,mcdu};
}