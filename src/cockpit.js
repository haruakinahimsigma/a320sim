import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {CockpitControls} from './controls.js';
import {MCDU} from './mcdu.js';

const MODEL_URL=`${import.meta.env.BASE_URL}Panel_A320_3D_2023.glb`;
const MODEL_SCALE=0.001;
const MODEL_ROTATION_X=-Math.PI/2;
const MODEL_POSITION=new THREE.Vector3(0.663,0.108,-0.55);
const DIAGNOSTIC_GRAY=new THREE.MeshStandardMaterial({color:0x62666b,roughness:.82,metalness:.08});

const DISPLAY_POSITIONS={
  PFD:[-.46,1.31,-.79], ND:[-.46,.91,-.79],
  ECAM1:[0,1.16,-.80], ECAM2:[0,.79,-.80]
};
const MCDU_POSITION=[0,.57,-.72];

export function buildCockpit(scene,instruments){
  const root=new THREE.Group();
  // Diagnostic scene: blue background + neutral gray cockpit geometry.

  root.name='A320_COCKPIT_ROOT';
  scene.add(root);

  const controls=new CockpitControls(root);
  const mcdu=new MCDU();
  const interactive=[];
  const anchors={};
  let ready=false;

  const modelRoot=new THREE.Group();
  modelRoot.name='A320_CAD_MODEL';
  modelRoot.scale.setScalar(MODEL_SCALE);
  modelRoot.rotation.x=MODEL_ROTATION_X;
  modelRoot.position.copy(MODEL_POSITION);
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

    const keyW=.07,keyH=.055;
    for(let r=0;r<8;r++) for(let c=0;c<6;c++){
      zone(`MCDU_${r}_${c}`,[-.215+c*keyW,.48,-.735],[keyW*.92,keyH,.025]);
    }
  }

    // Always-visible gray diagnostic dashboard. If the GLB is misplaced or
    // fails to load, this proves the Three.js camera/renderer is actually drawing.
    const diagnostic=new THREE.Group();
    const dash=new THREE.Mesh(
      new THREE.BoxGeometry(2.15,.55,.22),
      DIAGNOSTIC_GRAY
    );
    dash.position.set(0,1.02,-1.25);
    diagnostic.add(dash);
    const glareShield=new THREE.Mesh(
      new THREE.BoxGeometry(1.55,.18,.12),
      DIAGNOSTIC_GRAY
    );
    glareShield.position.set(0,1.40,-1.18);
    diagnostic.add(glareShield);
    // Keep gray fallback visible until the real GLB is confirmed rendering.
    diagnostic.visible=true;
  root.add(diagnostic);

  const loader=new GLTFLoader();
  loader.load(MODEL_URL,(gltf)=>{
    const model=gltf.scene;
    model.name='A320_CAD_COCKPIT';
    model.traverse(o=>{
      if(o.isMesh){
        // Diagnostic mode: force the imported cockpit to a neutral gray so
        // white-material/lighting issues cannot hide the geometry.
        const mats=Array.isArray(o.material)?o.material:[o.material];
        for(const m of mats){
          if(m && 'color' in m) m.color.setHex(0x62666b);
          if(m && 'emissive' in m) m.emissive.setHex(0x000000);
          if(m && 'emissiveIntensity' in m) m.emissiveIntensity=0;
        }
        o.castShadow=true;
        o.receiveShadow=true;
        if(o.material){
          const materials=Array.isArray(o.material)?o.material:[o.material];
          for(const m of materials){
            if('envMapIntensity' in m)m.envMapIntensity=.8;
            if('roughness' in m && m.roughness<.18)m.roughness=.18;
          }
        }
      }
    });
    modelRoot.add(model);

    instruments.mount(0,root,DISPLAY_POSITIONS.PFD);
    instruments.mount(1,root,DISPLAY_POSITIONS.ND);
    instruments.mount(2,root,DISPLAY_POSITIONS.ECAM1);
    instruments.mount(3,root,DISPLAY_POSITIONS.ECAM2);
    mcdu.mount(root,MCDU_POSITION);
    addInteractionZones();

    ready=true;
    status.textContent='A320 COCKPIT • 3D MODEL READY';
    setTimeout(()=>status.remove(),2200);
  },xhr=>{
    if(xhr.total){
      status.textContent='LOADING A320 3D COCKPIT… '+Math.round(xhr.loaded/xhr.total*100)+'%';
    }
  },err=>{
    console.error('A320 GLB load failed',err);
    status.textContent='3D MODEL LOAD FAILED — CHECK /Panel_A320_3D_2023.glb';
  });

  return {
    root,controls,interactive,mcdu,modelRoot,anchors,
    get ready(){return ready;}
  };
}
