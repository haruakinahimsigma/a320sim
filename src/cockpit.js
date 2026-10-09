import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {CockpitControls} from './controls.js';
import {MCDU} from './mcdu.js';

const MODEL_URL='https://raw.githubusercontent.com/haruakinahimsigma/a320sim/main/Panel_A320_3D_2023.glb';
const MODEL_SCALE=0.001;
const MODEL_ROTATION_X=-Math.PI/2;

export function buildCockpit(scene,instruments){
  const root=new THREE.Group();
  root.name='A320_COCKPIT_ROOT';
  scene.add(root);
  const controls=new CockpitControls(root);
  const mcdu=new MCDU();
  const interactive=[];
  const anchors={};
  const visualControls={throttleLevers:[],sidesticks:[],gearLever:null,flapLever:null};
  let ready=false;

  const modelRoot=new THREE.Group();
  modelRoot.name='A320_CAD_MODEL';
  modelRoot.scale.setScalar(MODEL_SCALE);
  modelRoot.rotation.x=MODEL_ROTATION_X;
  modelRoot.position.set(0,0,0);
  root.add(modelRoot);

  const status=document.createElement('div');
  status.id='model-status';
  status.textContent='LOADING A320 3D COCKPIT…';
  document.body.append(status);

  function zone(name,pos,size,type='button',extra={}){
    const mesh=new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})
    );
    mesh.name='HIT_'+name;
    mesh.position.set(...pos);
    controls.register(mesh,name,{type,...extra});
    root.add(mesh);
    interactive.push(mesh);
    return mesh;
  }

  function addInteractionZones(){
    zone('SPD',[-.22,1.57,-.76],[.13,.10,.08],'knob',{min:100,max:340,step:1,value:150,travel:.22});
    zone('HDG',[-.05,1.57,-.76],[.13,.10,.08],'knob',{min:0,max:359,step:1,value:270,travel:.22});
    zone('ALT',[.13,1.57,-.76],[.15,.10,.08],'knob',{min:1000,max:45000,step:100,value:5000,travel:.22});
    zone('VS',[.30,1.57,-.76],[.13,.10,.08],'knob',{min:-6000,max:6000,step:100,value:0,travel:.22});
    zone('AP1',[-.34,1.57,-.76],[.08,.07,.06]);
    zone('ATHR',[-.43,1.57,-.76],[.08,.07,.06]);
    zone('FD',[-.52,1.57,-.76],[.08,.07,.06]);
    zone('ILS',[-.60,1.57,-.76],[.08,.07,.06]);

    zone('GEAR',[.02,.37,-.60],[.12,.20,.12],'lever',{min:0,max:1,value:0,travel:.18});
    zone('PARK_BRAKE',[.24,.37,-.60],[.12,.12,.12]);
    zone('BAT',[.38,1.18,-.66],[.10,.08,.06]);
    zone('ELEC',[.47,1.18,-.66],[.10,.08,.06]);
    zone('APU',[.56,1.18,-.66],[.10,.08,.06]);
    zone('ENG1',[.38,1.08,-.66],[.10,.08,.06]);
    zone('ENG2',[.47,1.08,-.66],[.10,.08,.06]);
    zone('HYD',[.56,1.08,-.66],[.10,.08,.06]);
    zone('BEACON',[.38,.98,-.66],[.10,.08,.06]);
    zone('STROBE',[.47,.98,-.66],[.10,.08,.06]);
    zone('THROTTLE',[.00,.48,-.49],[.42,.24,.18],'lever',{min:0,max:1,value:.35,travel:.28});
    zone('FLAP_1',[-.30,.43,-.62],[.08,.08,.08]);
    zone('FLAP_2',[-.22,.43,-.62],[.08,.08,.08]);
    zone('FLAP_3',[-.14,.43,-.62],[.08,.08,.08]);
    zone('FLAP_4',[-.06,.43,-.62],[.08,.08,.08]);
    zone('SIDESTICK',[-.72,.84,-.22],[.20,.40,.24],'stick',{min:-1,max:1,value:0,travel:.35});
    zone('SIDESTICK_FO',[.78,.84,-.22],[.20,.40,.24],'stick',{min:-1,max:1,value:0,travel:.35});

    const keyW=.07,keyH=.055;
    for(let r=0;r<8;r++) for(let c=0;c<6;c++){
      zone(`MCDU_${r}_${c}`,[-.215+c*keyW,.48,-.735],[keyW*.92,keyH,.025]);
    }
  }

  function addScreenFrames(){
    const frameMat=new THREE.MeshStandardMaterial({color:0x11171b,roughness:.5,metalness:.15});
    const bezelMat=new THREE.MeshStandardMaterial({color:0x343a3e,roughness:.72,metalness:.05});
    const screens=[
      {i:0,name:'PFD',p:[-.60,1.16,-.475]},
      {i:1,name:'ND',p:[-.17,1.16,-.475]},
      {i:2,name:'ECAM1',p:[.30,1.16,-.475]},
      {i:3,name:'ECAM2',p:[.30,.83,-.475]}
    ];
    for(const item of screens){
      const frame=new THREE.Mesh(new THREE.BoxGeometry(.405,.285,.035),frameMat);
      frame.position.set(item.p[0],item.p[1],item.p[2]-.03);
      frame.name=item.name+'_BEZEL';
      root.add(frame);
      const lip=new THREE.Mesh(new THREE.BoxGeometry(.385,.265,.008),bezelMat);
      lip.position.set(item.p[0],item.p[1],item.p[2]-.01);
      root.add(lip);
      instruments.mount(item.i,root,item.p);
    }
  }

  function addVisibleThrottleLevers(){
    const metal=new THREE.MeshStandardMaterial({color:0x6c777d,roughness:.42,metalness:.65});
    const dark=new THREE.MeshStandardMaterial({color:0x171b1d,roughness:.7,metalness:.12});
    const amber=new THREE.MeshStandardMaterial({color:0xd49a42,roughness:.4,metalness:.15});
    for(const x of [-.055,.055]){
      const lever=new THREE.Group();
      lever.position.set(x,.49,-.515);
      const shaft=new THREE.Mesh(new THREE.BoxGeometry(.018,.17,.018),metal);
      shaft.position.y=.085;lever.add(shaft);
      const grip=new THREE.Mesh(new THREE.BoxGeometry(.055,.045,.055),dark);
      grip.position.set(0,.17,0);lever.add(grip);
      const cap=new THREE.Mesh(new THREE.BoxGeometry(.038,.012,.038),amber);
      cap.position.set(0,.195,0);lever.add(cap);
      root.add(lever);
      visualControls.throttleLevers.push(lever);
    }
    const base=new THREE.Mesh(new THREE.BoxGeometry(.24,.035,.22),dark);
    base.position.set(0,.48,-.515);root.add(base);
  }

  function addVisibleConfigLevers(){
    const metal=new THREE.MeshStandardMaterial({color:0x7b8589,roughness:.45,metalness:.55});
    const dark=new THREE.MeshStandardMaterial({color:0x202629,roughness:.68,metalness:.1});
    const gear=new THREE.Group();gear.position.set(.02,.37,-.60);
    const gearStem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.016,.13,8),metal);gearStem.position.y=.07;gear.add(gearStem);
    const gearGrip=new THREE.Mesh(new THREE.BoxGeometry(.045,.035,.05),dark);gearGrip.position.set(0,.14,0);gear.add(gearGrip);root.add(gear);visualControls.gearLever=gear;
    const flap=new THREE.Group();flap.position.set(-.18,.43,-.62);
    const flapStem=new THREE.Mesh(new THREE.CylinderGeometry(.009,.012,.11,8),metal);flapStem.position.y=.055;flap.add(flapStem);
    const flapGrip=new THREE.Mesh(new THREE.BoxGeometry(.035,.025,.045),dark);flapGrip.position.set(0,.115,0);flap.add(flapGrip);root.add(flap);visualControls.flapLever=flap;
  }

  function addVisibleSidestick(x,side){
    const dark=new THREE.MeshStandardMaterial({color:0x202629,roughness:.7,metalness:.12});
    const metal=new THREE.MeshStandardMaterial({color:0x7b8589,roughness:.45,metalness:.55});
    const group=new THREE.Group();
    group.position.set(x,.76,-.31);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.025,.22,10),metal);
    stem.position.y=.11;group.add(stem);
    const grip=new THREE.Mesh(new THREE.BoxGeometry(.09,.12,.075),dark);
    grip.position.set(0,.25,0);grip.rotation.z=side==='captain'?.08:-.08;group.add(grip);
    root.add(group);visualControls.sidesticks.push({group,side});
  }
  addVisibleConfigLevers();
  addVisibleSidestick(-.72,'captain');
  addVisibleSidestick(.78,'fo');

  const loader=new GLTFLoader();
  loader.load(MODEL_URL,(gltf)=>{
    const model=gltf.scene;
    model.name='A320_CAD_COCKPIT';
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=true;o.receiveShadow=true;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      for(const m of mats){
        if(!m)continue;
        // Preserve original maps and colors instead of flattening the whole model gray.
        if('roughness' in m)m.roughness=Math.max(.35,Math.min(.88,m.roughness||.65));
        if('metalness' in m)m.metalness=Math.min(.18,m.metalness||0);
        if('envMapIntensity' in m)m.envMapIntensity=.8;
        if(m.color && !m.map){
          const name=(o.name+' '+m.name).toLowerCase();
          if(/screen|display|monitor|glass/.test(name))m.color.setHex(0x111a20);
          else if(/seat|cushion/.test(name))m.color.setHex(0x30383b);
          else if(/panel|cockpit|console|bezel/.test(name))m.color.setHex(0x85898a);
        }
      }
    });
    modelRoot.add(model);

    // Fit the imported model from its actual bounds instead of relying on guessed CAD units.
    modelRoot.updateMatrixWorld(true);
    let bounds=new THREE.Box3().setFromObject(modelRoot);
    const size=bounds.getSize(new THREE.Vector3());
    if(size.x>0 && size.y>0 && size.z>0){
      const fitScale=Math.min(2.15/size.x,1.35/size.y,2.0/size.z);
      modelRoot.scale.multiplyScalar(fitScale);
      modelRoot.updateMatrixWorld(true);
      bounds=new THREE.Box3().setFromObject(modelRoot);
      const center=bounds.getCenter(new THREE.Vector3());
      modelRoot.position.add(new THREE.Vector3(-center.x,1.0-center.y,-0.85-center.z));
      modelRoot.updateMatrixWorld(true);
      console.info('A320 model fitted',bounds.getSize(new THREE.Vector3()));
    }

    addInteractionZones();
    addScreenFrames();
    addVisibleThrottleLevers();
    ready=true;
    status.textContent='A320 COCKPIT • 3D MODEL READY';
    setTimeout(()=>status.remove(),2200);
  },xhr=>{
    if(xhr.total)status.textContent='LOADING A320 3D COCKPIT… '+Math.round(xhr.loaded/xhr.total*100)+'%';
  },err=>{
    console.error('A320 GLB load failed',err);
    status.textContent='3D MODEL LOAD FAILED — CHECK /Panel_A320_3D_2023.glb';
  });

  function update(state){
    const t=(state.throttle1+state.throttle2)*.5;
    visualControls.throttleLevers.forEach((lever,i)=>{
      lever.position.y=.49+t*.20;
      lever.rotation.x=-.10-t*.18;
    });
    if(visualControls.gearLever){visualControls.gearLever.rotation.z=state.gearDown?-.42:0;}
    if(visualControls.flapLever){visualControls.flapLever.rotation.z=-state.flaps*.12;}
    visualControls.sidesticks.forEach(({group,side})=>{
      const isCaptain=side==='captain';
      group.rotation.z=(isCaptain?state.aileron:0)*.18;
      group.rotation.x=-(isCaptain?state.elevator:0)*.20;
    });
  }

  return {root,controls,interactive,mcdu,modelRoot,anchors,update,get ready(){return ready;}};
}
