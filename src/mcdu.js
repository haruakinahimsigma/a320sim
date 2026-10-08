import * as THREE from 'three';

export class MCDU {
  constructor() {
    this.page='MCDU MENU'; this.input=''; this.message='READY';
    const c=document.createElement('canvas'); c.width=640; c.height=430;
    this.canvas=c; this.texture=new THREE.CanvasTexture(c); this.texture.colorSpace=THREE.SRGBColorSpace;
    this.mesh=new THREE.Mesh(
      new THREE.PlaneGeometry(.48,.323),
      new THREE.MeshBasicMaterial({map:this.texture})
    );
    this.keys=[
      ['DIR','PROG','PERF','INIT','DATA','F-PLN'],
      ['1','2','3','4','5','6'],
      ['7','8','9','0','.','/'],
      ['A','B','C','D','E','F'],
      ['G','H','I','J','K','L'],
      ['M','N','O','P','Q','R'],
      ['S','T','U','V','W','X'],
      ['Y','Z','SP','CLR','DEL','EXEC']
    ];
  }
  mount(parent,p){this.mesh.position.set(...p);parent.add(this.mesh);}
  key(k) {
    if(k==='CLR'){this.input=this.input.slice(0,-1);this.message='CLR';}
    else if(k==='DEL'){this.input='';this.message='DELETED';}
    else if(k==='EXEC'){this.message='EXECUTED';}
    else if(k==='DIR'){this.page='DIRECT TO';this.message='IDENT';}
    else if(k==='PROG'){this.page='PROGRESS';}
    else if(k==='PERF'){this.page='PERF TAKEOFF';}
    else if(k==='INIT'){this.page='INIT A';}
    else if(k==='DATA'){this.page='DATA INDEX';}
    else if(k==='F-PLN'){this.page='F-PLN';}
    else {this.input=(this.input+k).slice(-18);this.message='ENTRY';}
  }
  draw() {
    const g=this.canvas.getContext('2d');
    g.fillStyle='#00140b';g.fillRect(0,0,640,430);
    g.fillStyle='#63ef91';g.font='24px monospace';g.fillText(this.page,22,34);
    g.font='20px monospace';
    const lines={
      'MCDU MENU':['1R F-PLN','2R DIR','3R PERF','4L INIT','5L DATA'],
      'DIRECT TO':['SELECT WAYPOINT','IDENT  '+(this.input||'----'),'INSERT →'],
      'PROGRESS':['ACTIVE FLIGHT PLAN','GS ----','TRK ----','DIST ----'],
      'PERF TAKEOFF':['FLAPS 1','FLEX ----','THR RED/ACC ----'],
      'INIT A':['FROM ----','TO ----','ALTN ----','CRZ FL ----'],
      'DATA INDEX':['POSITION','IRS','GPS','AIRPORT'],
      'F-PLN':['ACTIVE F-PLN','---- / ----','NEXT WPT ----']
    };
    (lines[this.page]||['SYSTEM READY']).forEach((t,i)=>g.fillText(t,22,82+i*38));
    g.fillText(this.input||'_',22,370);g.fillText(this.message,22,407);
    this.texture.needsUpdate=true;
  }
}
