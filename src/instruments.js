import * as THREE from 'three';

export class Instruments{
  constructor(){
    this.displays=[];
    ['PFD','ND','ECAM1','ECAM2'].forEach(n=>this.make(n));
  }
  make(name){
    const c=document.createElement('canvas'); c.width=800; c.height=600;
    const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(
      new THREE.PlaneGeometry(.87,.65),
      new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide})
    );
    this.displays.push({name,c,tex,mesh});
  }
  mount(i,parent,p){
    const d=this.displays[i];
    d.mesh.position.set(...p);
    d.mesh.rotation.set(0,0,0);
    parent.add(d.mesh);
  }
  txt(g,t,x,y,z=22,col='#e9f1f3',a='left'){
    g.fillStyle=col;g.font=z+'px monospace';g.textAlign=a;g.fillText(t,x,y);
  }
  line(g,a,b,c,d,col='#e9f1f3',w=3){
    g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.stroke();
  }
  box(g,x,y,w,h,label,value,col='#65e69b'){
    g.strokeStyle='#33464b';g.lineWidth=2;g.strokeRect(x,y,w,h);
    this.txt(g,label,x+12,y+25,17,'#9aaeb2');
    this.txt(g,value,x+12,y+52,23,col);
  }
  update(s){
    for(const d of this.displays){
      const g=d.c.getContext('2d');
      g.fillStyle='#02070b';g.fillRect(0,0,800,600);

      if(d.name==='PFD'){
        g.fillStyle='#14708d';g.fillRect(0,0,800,300);
        g.fillStyle='#62462e';g.fillRect(0,300,800,300);
        this.txt(g,Math.round(s.ias),48,105,58);
        this.txt(g,'SPD',50,135,18,'#7be9ff');
        this.txt(g,Math.round(s.alt),750,105,54,'#fff','right');
        this.txt(g,'ALT',750,135,18,'#7be9ff','right');
        const pitch=s.pitch*12;
        this.line(g,250,300-pitch,550,300-pitch,'#fff',4);
        this.line(g,370,300,430,300,'#fff',5);
        this.txt(g,'HDG '+String(Math.round(s.heading)%360).padStart(3,'0'),400,555,25,'#fff','center');
        this.txt(g,'VS '+Math.round(s.vs),400,520,20,s.vs>=0?'#65e69b':'#ff9870','center');
        this.txt(g,s.ap1?'AP1':'',400,42,23,s.ap1?'#65e69b':'#ffbd55','center');
        this.txt(g,s.fd?'FD':'',400,70,19,'#65e69b','center');
        this.txt(g,s.athr?'A/THR':'',400,98,18,s.athr?'#65e69b':'#ffbd55','center');
        this.line(g,385,300,415,300,'#ffdc55',3);
        this.txt(g,'GS '+Math.round(s.ias),24,565,18,'#7be9ff');
        this.txt(g,'M '+s.mach.toFixed(2),776,565,18,'#fff','right');
      }else if(d.name==='ND'){
        this.txt(g,s.navMode||'ROSE',25,35,24,'#65e69b');
        this.txt(g,String(Math.round(s.heading)%360).padStart(3,'0'),400,55,28,'#fff','center');
        g.strokeStyle='#27c8ec';g.lineWidth=4;g.beginPath();g.arc(400,310,220,0,Math.PI*2);g.stroke();
        for(let a=0;a<360;a+=30){
          const r=a*Math.PI/180;
          this.line(g,400+Math.sin(r)*205,310-Math.cos(r)*205,400+Math.sin(r)*220,310-Math.cos(r)*220,'#28434a',2);
        }
        this.txt(g,'▲',400,320,58,'#55ddff','center');
        this.txt(g,'WPT',400,360,18,'#55ddff','center');
        this.txt(g,'HDG '+String(Math.round(s.selHdg)%360).padStart(3,'0'),25,565,18);
        this.txt(g,'ALT '+Math.round(s.alt)+' FT',400,565,18,'#fff','center');
        this.txt(g,'M '+s.mach.toFixed(2),775,565,18,'#fff','right');
      }else if(d.name==='ECAM1'){
        this.txt(g,'E/WD',24,34,24,'#65e69b');
        const warnings=[];
        if(!s.elec)warnings.push(['ELEC EMERGENCY','red']);
        if(s.fuel<20)warnings.push(['FUEL LOW','amber']);
        if(!s.hydGreen||!s.hydBlue||!s.hydYellow)warnings.push(['HYD PRESS','amber']);
        if(s.eng1<.25||s.eng2<.25)warnings.push(['ENG THRUST LOW','amber']);
        if(s.gearDown && s.ias>250)warnings.push(['GEAR SPEED','red']);
        if(warnings.length===0)this.txt(g,'NORMAL','400',110,28,'#65e69b','center');
        warnings.forEach((w,i)=>this.txt(g,w[0],400,110+i*42,26,w[1]==='red'?'#ff4e4e':'#ffbd55','center'));
        this.box(g,30,220,350,120,'ENG 1',Math.round(s.eng1*100)+'%');
        this.box(g,420,220,350,120,'ENG 2',Math.round(s.eng2*100)+'%');
        this.box(g,30,370,350,90,'THRUST',Math.round(((s.throttle1+s.throttle2)/2)*100)+'%');
        this.box(g,420,370,350,90,'FUEL',s.fuel.toFixed(1)+'%','#7be9ff');
      }else{
        this.txt(g,'SD / STATUS',24,34,24,'#65e69b');
        this.box(g,30,70,350,90,'ELEC',s.elec?'AVAIL':'OFF',s.elec?'#65e69b':'#ff4e4e');
        this.box(g,420,70,350,90,'APU',s.apu>0.5?'RUN':'OFF',s.apu>0.5?'#65e69b':'#ffbd55');
        this.box(g,30,190,350,90,'HYD GREEN',s.hydGreen?'PRESS':'OFF',s.hydGreen?'#65e69b':'#ff4e4e');
        this.box(g,420,190,350,90,'HYD BLUE',s.hydBlue?'PRESS':'OFF',s.hydBlue?'#65e69b':'#ff4e4e');
        this.box(g,30,310,350,90,'HYD YELLOW',s.hydYellow?'PRESS':'OFF',s.hydYellow?'#65e69b':'#ff4e4e');
        this.box(g,420,310,350,90,'GEAR',s.gearDown?'DOWN':'UP',s.gearDown?'#65e69b':'#ffbd55');
        this.box(g,30,430,350,90,'FLAPS',String(s.flaps),'#fff');
        this.box(g,420,430,350,90,'PARK BRK',s.parkBrake?'ON':'OFF',s.parkBrake?'#ffbd55':'#65e69b');
      }
      d.tex.needsUpdate=true;
    }
  }
}
