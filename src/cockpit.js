import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CockpitControls } from './controls.js';
import { MCDU } from './mcdu.js';

export function buildCockpit(scene,instruments){
  const root=new THREE.Group(); scene.add(root);
  const controls=new CockpitControls(root);
  const mat=(c,r=.72,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
  const panel=mat(0x25282a,.86), panel2=mat(0x303335,.82), dark=mat(0x111416,.72), black=mat(0x030405,.45), edge=mat(0x4b5053,.55), metal=mat(0x6e7477,.3,.7);
  const glass= new THREE.MeshPhysicalMaterial({color:0x7f9eb0,roughness:.08,metalness:0,transparent:true,opacity:.10,side:THREE.DoubleSide});
  const box=(name,p,size,ma=panel,rad=.035)=>{
    const o=new THREE.Mesh(new RoundedBoxGeometry(size[0],size[1],size[2],3,rad),ma);
    o.name=name;o.position.set(...p);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;
  };
  const cyl=(name,p,r,h,ma=metal)=>{
    const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),ma);
    o.name=name;o.position.set(...p);o.rotation.x=Math.PI/2;root.add(o);return o;
  };
  const button=(name,p,action,size=[.15,.11,.1])=>{
    const o=box(name,p,size,edge,.025);controls.register(o,action,{type:'button'});return o;
  };
  const toggle=(name,p,action)=>{
    box(name+'BASE',p,[.16,.15,.10],black,.025);
    const o=box(name,p,[.065,.20,.075],metal,.018);controls.register(o,action,{type:'toggle'});return o;
  };
  const knob=(name,p,action,min=0,max=1)=>{
    const o=cyl(name,p,.075,.11);controls.register(o,action,{type:'knob',min,max,value:(min+max)/2});return o;
  };

  // Flight deck shell — curved/beveled rather than stacked cubes.
  box('floor',[0,.05,.05],[4.9,.10,5.8],dark,.08);
  box('left sidewall',[-2.38,1.48,.35],[.24,2.55,4.9],dark,.08);
  box('right sidewall',[2.38,1.48,.35],[.24,2.55,4.9],dark,.08);
  box('left window frame',[-1.82,2.15,1.58],[.18,1.18,.35],dark,.06);
  box('right window frame',[1.82,2.15,1.58],[.18,1.18,.35],dark,.06);
  box('center windshield post',[0,2.18,1.55],[.12,1.25,.30],dark,.045);
  box('windshield left',[-.91,2.24,1.67],[1.62,1.05,.055],glass,.025);
  box('windshield right',[.91,2.24,1.67],[1.62,1.05,.055],glass,.025);

  // Sloped glareshield and main instrument panel.
  const glare=box('glareshield',[0,1.78,1.54],[4.35,.28,.72],panel2,.10);
  glare.rotation.x=-.12;
  const main=box('main instrument panel',[0,1.38,1.55],[4.32,.72,.24],panel,.075);
  main.rotation.x=-.10;

  const xs=[-1.47,-.49,.49,1.47];
  ['PFD','ND','ECAM1','ECAM2'].forEach((n,i)=>{
    box(n+' bezel',[xs[i],1.50,1.405],[.92,.72,.10],black,.045);
    instruments.mount(i,root,[xs[i],1.50,1.345]);
  });

  // FCU with proper recessed strip.
  box('FCU housing',[0,1.87,1.28],[3.78,.25,.42],dark,.07);
  box('FCU face',[0,1.84,1.10],[3.60,.08,.34],panel2,.025);
  [['SPD',-1.08,150,340],['HDG',-.36,0,360],['ALT',.36,1000,45000],['VS',1.08,-6000,6000]].forEach(([n,x,min,max])=>{
    box(n+'window',[x,1.87,1.285],[.34,.08,.055],black,.012);
    knob(n,[x,1.80,1.11],n,min,max);
    button(n+'PUSH',[x,1.80,1.025],n,[.16,.075,.07]);
  });
  button('AP1',[1.52,1.80,1.20],'AP1',[.24,.12,.09]);
  button('AP2',[1.84,1.80,1.20],'AP2',[.24,.12,.09]);
  button('ATHR',[1.52,1.80,1.04],'ATHR',[.24,.12,.09]);
  button('FD',[1.84,1.80,1.04],'FD',[.24,.12,.09]);

  // Center pedestal with separated throttle, flap and gear areas.
  box('center pedestal',[0,.83,.20],[1.72,1.15,2.55],panel,.09);
  box('pedestal upper deck',[0,1.42,.48],[1.54,.14,2.15],dark,.055);
  box('throttle quadrant',[0,1.52,.76],[1.20,.16,1.35],black,.06);
  for(const x of [-.24,.24]){
    const t=box('throttle',[x,1.68,.77],[.13,.52,.19],metal,.04);
    controls.register(t,'THROTTLE',{type:'lever',min:0,max:1,value:.35,travel:.55});
  }
  box('flap panel',[.55,1.42,-.02],[.30,.12,.92],dark,.035);
  ['FLAP_0','FLAP_1','FLAP_2','FLAP_3','FLAP_4'].forEach((a,i)=>button(a,[.55,1.43,-.38+i*.18],a,[.16,.08,.10]));
  box('gear panel',[-.50,1.42,-.35],[.30,.12,.45],dark,.035);
  button('GEAR',[-.50,1.46,-.37],'GEAR',[.18,.18,.10]);
  button('PARK_BRAKE',[-.52,1.43,-.72],'PARK_BRAKE',[.24,.10,.09]);

  const mcdu=new MCDU();
  box('MCDU frame',[-.43,1.36,-.74],[.76,.16,.84],dark,.05);
  mcdu.mount(root,[-.43,1.45,-.69]);
  for(let r=0;r<8;r++) for(let c=0;c<6;c++) button('MCDUKEY'+r+c,[-.73+c*.12,1.39,-1.09+r*.10],'MCDU_'+r+'_'+c,[.08,.065,.055]);

  // Captain / FO side consoles and sidesticks.
  box('captain side console',[-1.17,.94,.05],[.48,.30,2.25],dark,.08);
  box('FO side console',[1.17,.94,.05],[.48,.30,2.25],dark,.08);
  const stick=box('captain sidestick',[-1.08,1.13,.58],[.12,.42,.13],metal,.045);
  controls.register(stick,'SIDESTICK',{type:'stick',min:-1,max:1,value:0});
  box('captain stick base',[-1.08,.93,.58],[.30,.12,.34],black,.04);

  // Overhead: angled, recessed panel with grouped switch banks.
  const overhead=box('overhead console',[0,2.52,.08],[4.05,.22,1.90],panel,.12);
  overhead.rotation.x=.18;
  box('overhead inner panel',[0,2.47,.05],[3.72,.10,1.62],dark,.07);
  for(let r=0;r<4;r++) for(let c=0;c<12;c++){
    const x=-1.68+c*.305, z=.63-r*.36;
    toggle('OVH'+r+c,[x,2.45,z],'OVH'+r+c);
  }
  ['BAT','EXT_PWR','APU','ENG1','ENG2','HYD','ELEC','BEACON','STROBE'].forEach((n,i)=>toggle(n,[-.80+i*.20,2.45,-.78],n));

  // Pilot seats/backs establish scale without blocking the camera.
  box('captain seat',[-.72,.70,-1.50],[.82,1.30,.78],dark,.10);
  box('FO seat',[.72,.70,-1.50],[.82,1.30,.78],dark,.10);
  box('captain armrest',[-1.25,.91,-1.08],[.16,.14,.82],edge,.05);
  box('FO armrest',[1.25,.91,-1.08],[.16,.14,.82],edge,.05);

  return {root,controls,interactive:controls.items,mcdu};
}