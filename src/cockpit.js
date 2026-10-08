import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {CockpitControls} from './controls.js';
import {MCDU} from './mcdu.js';

const MODEL_URL='/models/Panel_A320_3D_2023.glb';

// CAD export calibration.
// The supplied CAD uses Z-up with the aircraft longitudinal axis on +Y.
// Rotate -90° around X so aircraft +Y becomes simulator -Z (forward).
const MODEL_SCALE=0.001;
const MODEL_ROTATION_X=-Math.PI/2;
const MODEL_POSITION=new THREE.Vector3(0.663,0.108,4.90);

export function buildCockpit(scene,instruments){
  const root=new THREE.Group();
  root.name='A320_COCKPIT_ROOT';
  scene.add(root);

  const controls=new CockpitControls(root);
  const mcdu=new MCDU();

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

  const loader=new GLTFLoader();
  loader.load(MODEL_URL,(gltf)=>{
    const model=gltf.scene;
    model.name='A320_CAD_COCKPIT';
    model.traverse(o=>{
      if(o.isMesh){
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
    status.textContent='A320 COCKPIT • 3D MODEL READY';
    setTimeout(()=>status.remove(),2200);
  },xhr=>{
    if(xhr.total){
      status.textContent='LOADING A320 3D COCKPIT… '+Math.round(xhr.loaded/xhr.total*100)+'%';
    }
  },err=>{
    console.error('A320 GLB load failed',err);
    status.textContent='3D MODEL NOT FOUND — PUT GLB IN /public/models/';
  });

  // These are intentionally empty anchor groups. Once the CAD model is in place,
  // avionics textures and interaction colliders can be positioned against the real
  // display faces without rebuilding the cockpit geometry.
  const anchors={};
  ['PFD','ND','ECAM1','ECAM2','FCU','MCDU','THROTTLE','SIDESTICK'].forEach(n=>{
    const a=new THREE.Group();
    a.name='ANCHOR_'+n;
    root.add(a);
    anchors[n]=a;
  });

  // MCDU remains functional while we calibrate its exact CAD surface.
  const mcduFrame=new THREE.Mesh(
    new THREE.BoxGeometry(.76,.16,.84),
    new THREE.MeshStandardMaterial({color:0x111416,roughness:.72})
  );
  mcduFrame.visible=false;
  root.add(mcduFrame);
  mcdu.mount(root,[0,0,0]);

  // Keep the old procedural cockpit out of the render path. The GLB is the
  // authoritative physical cockpit; systems/instruments are layered on top.
  const interactive=[];

  return {
    root,
    controls,
    interactive,
    mcdu,
    modelRoot,
    anchors,
    ready:false
  };
}
