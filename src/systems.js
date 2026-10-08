export class A320Systems{
  constructor(){this.state={ias:140,alt:5000,heading:270,vs:0,pitch:2,bank:0,selSpd:150,selHdg:270,selAlt:5000,selVs:0,ap1:false,ap2:false,fd:true,athr:true,gearDown:false,flaps:0,beacon:false,strobe:false,eng1:0,eng2:0,apu:0,elec:true,hydGreen:true,hydBlue:true,hydYellow:true,parkBrake:true,fuel:100,throttle1:0,throttle2:0,trim:0,lightPanel:.7,navMode:'ROSE',mach:.42}}
  toggle(k){if(k in this.state)this.state[k]=!this.state[k]}
  set(k,v){if(k in this.state)this.state[k]=v}
  clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  update(dt){
    const s=this.state,thr=(s.throttle1+s.throttle2)*.5,target=s.athr?s.selSpd:110+thr*170;
    s.ias+=(target-s.ias)*Math.min(1,dt*.55);
    if(s.ap1){let d=((s.selHdg-s.heading+540)%360)-180;s.heading=(s.heading+d*Math.min(1,dt*.75)+360)%360;s.vs+=(s.selVs-s.vs)*Math.min(1,dt*.9);s.pitch+=((s.selAlt>s.alt?4:-2)-s.pitch)*Math.min(1,dt*.45)}
    else{s.vs+=(thr-.45)*70*dt;s.vs*=Math.pow(.98,dt*60);s.pitch+=(s.vs*.004-s.pitch)*Math.min(1,dt*.4)}
    s.alt=this.clamp(s.alt+s.vs*dt/60,0,45000);
    const spool=this.clamp((s.ias-50)/130,0,1);s.eng1+=(spool-s.eng1)*Math.min(1,dt*.45);s.eng2+=(spool-s.eng2)*Math.min(1,dt*.45);s.mach=s.ias/Math.max(1,661-s.alt*.004);
  }
}