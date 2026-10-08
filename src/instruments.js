import * as THREE from 'three';
export class Instruments{
  constructor(){this.displays=[];['PFD','ND','ECAM1','ECAM2'].forEach(n=>this.make(n))}
  make(name){const c=document.createElement('canvas');c.width=720;c.height=540;const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.82,.615),new THREE.MeshBasicMaterial({map:tex}));this.displays.push({name,c,tex,mesh})}
  mount(i,parent,p){const d=this.displays[i];d.mesh.position.set(...p);d.mesh.rotation.x=-.06;parent.add(d.mesh)}
  txt(g,t,x,y,size,color='#dce7eb',align='left'){g.fillStyle=color;g.font=`${size}px ui-monospace,monospace`;g.textAlign=align;g.fillText(t,x,y)}
  line(g,x1,y1,x2,y2,color='#5ee7ff',w=3){g.strokeStyle=color;g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()}
  draw(d,s){
    const g=d.c.getContext('2d');g.fillStyle='#02070b';g.fillRect(0,0,720,540);g.strokeStyle='#182f36';g.lineWidth=5;g.strokeRect(4,4,712,532);
    if(d.name==='PFD'){
      g.fillStyle='#176f91';g.fillRect(0,0,720,270);g.fillStyle='#573b29';g.fillRect(0,270,720,270);
      g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.moveTo(270,270);g.lineTo(450,270);g.stroke();
      this.txt(g,`${Math.round(s.ias)}`,42,108,60,'#fff');this.txt(g,'SPEED',44,138,17,'#8be9fd');
      this.txt(g,`${Math.round(s.alt)}`,565,108,54,'#fff','right');this.txt(g,'ALT',566,138,17,'#8be9fd','right');
      this.txt(g,`HDG ${String(Math.round(s.heading)%360).padStart(3,'0')}`,360,505,24,'#fff','center');
      this.txt(g,`VS ${Math.round(s.vs)}`,360,470,19,s.vs>=0?'#65e69b':'#ff9b66','center');
      this.txt(g,s.ap1?'AP1':'—',360,44,24,s.ap1?'#65e69b':'#ffbd55','center');
      this.txt(g,s.fd?'FD':'',360,72,19,'#65e69b','center');
      this.line(g,325,270,395,270,'#fff',5);this.line(g,350,250,370,250,'#fff',3);
      for(let i=-2;i<=2;i++)this.line(g,315+i*28,270-i*32,405+i*28,270-i*32,'#e8eef0',2);
    }else if(d.name==='ND'){
      this.txt(g,s.navMode,30,38,24,'#65e69b');this.txt(g,String(Math.round(s.heading)%360).padStart(3,'0'),360,60,28,'#fff','center');
      g.strokeStyle='#38c9ee';g.lineWidth=4;g.beginPath();g.arc(360,280,190,0,Math.PI*2);g.stroke();
      g.strokeStyle='#244954';g.lineWidth=2;for(let a=0;a<360;a+=30){const r1=170,r2=190,rad=(a-90)*Math.PI/180;this.line(g,360+Math.cos(rad)*r1,280+Math.sin(rad)*r1,360+Math.cos(rad)*r2,280+Math.sin(rad)*r2,'#244954',2)}
      this.txt(g,'▲',360,290,58,'#53d9ff','center');this.txt(g,'TO WPT',360,330,18,'#53d9ff','center');this.txt(g,`GS ${Math.round(s.ias)}`,35,505,18);this.txt(g,`M ${s.mach.toFixed(2)}`,685,505,18,'#dce7eb','right');
    }else{
      this.txt(g,d.name,26,38,24,'#65e69b');this.txt(g,s.elec?'ELEC NORMAL':'ELEC OFF',26,84,22,s.elec?'#65e69b':'#ff5555');
      this.txt(g,`ENG 1  ${Math.round(s.eng1*100)}%`,26,132,21);this.txt(g,`ENG 2  ${Math.round(s.eng2*100)}%`,26,170,21);
      this.txt(g,s.gearDown?'GEAR DOWN':'GEAR UP',26,218,21,s.gearDown?'#65e69b':'#ffbd55');this.txt(g,`FLAPS ${s.flaps}`,26,258,21);
      this.txt(g,s.athr?'A/THR ACTIVE':'A/THR OFF',26,298,21,s.athr?'#65e69b':'#ffbd55');
      this.txt(g,s.hydGreen?'HYD G':'HYD G OFF',26,338,20,s.hydGreen?'#65e69b':'#ff5555');this.txt(g,s.hydBlue?'HYD B':'HYD B OFF',26,374,20,s.hydBlue?'#65e69b':'#ff5555');this.txt(g,s.hydYellow?'HYD Y':'HYD Y OFF',26,410,20,s.hydYellow?'#65e69b':'#ff5555');
      this.txt(g,`FUEL ${Math.round(s.fuel)}%`,26,466,20,'#8be9fd');
    }
    d.tex.needsUpdate=true;
  }
  update(s){this.displays.forEach(d=>this.draw(d,s))}
}