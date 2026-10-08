export class A320Systems {
  constructor() {
    this.state = {
      ias: 145, alt: 5000, heading: 270, vs: 0, pitch: 2.2, bank: 0,
      selSpd: 150, selHdg: 270, selAlt: 5000, selVs: 0,
      ap1: false, ap2: false, fd: true, athr: true,
      gearDown: false, flaps: 0, beacon: false, strobe: false,
      eng1: .55, eng2: .55, apu: 0, elec: true,
      hydGreen: true, hydBlue: true, hydYellow: true, parkBrake: true,
      fuel: 100, throttle1: .35, throttle2: .35, trim: 0,
      lightPanel: .7, navMode: 'ROSE', mach: .42,
      rudder: 0, elevator: 0, aileron: 0, spoilers: 0,
      lat: 0, lon: 0, onGround: false
    };
  }
  toggle(k) { if (k in this.state) this.state[k] = !this.state[k]; }
  set(k,v) { if (k in this.state && Number.isFinite(v)) this.state[k] = v; }
  clamp(v,a,b) { return Math.max(a,Math.min(b,v)); }
  update(dt) {
    const s=this.state;
    const thrust=(s.throttle1+s.throttle2)*.5;
    const power=s.eng1+s.eng2;
    const targetSpeed=s.athr ? s.selSpd : 105+thrust*205;
    const speedResponse=.32+(power*.22);
    s.ias += (targetSpeed-s.ias)*this.clamp(dt*speedResponse,0,1);

    if(s.ap1) {
      let hdgErr=((s.selHdg-s.heading+540)%360)-180;
      s.bank=this.clamp(hdgErr*.45,-25,25);
      s.heading=(s.heading+s.bank*dt*.10+360)%360;
      const altErr=s.selAlt-s.alt;
      const commandedVs=this.clamp(altErr*.055,-2200,2200);
      s.vs+=(commandedVs-s.vs)*this.clamp(dt*.75,0,1);
      s.pitch=this.clamp(2+s.vs*.0018,-10,12);
    } else {
      s.bank += (s.aileron*28-s.bank)*this.clamp(dt*2.2,0,1);
      s.heading=(s.heading+s.bank*dt*.12+360)%360;
      const lift=((s.ias-125)*.045)+(s.elevator*180)-(s.flaps*5)-(s.gearDown?4:0);
      s.vs += (lift-s.vs)*this.clamp(dt*.7,0,1);
      s.pitch += (s.elevator*10-s.pitch)*this.clamp(dt*.8,0,1);
    }

    s.alt=this.clamp(s.alt+s.vs*dt/60,0,45000);
    s.onGround=s.alt<20 && s.vs<120;
    const desiredSpool=this.clamp(.25+thrust*.75,0,1);
    s.eng1+=(desiredSpool-s.eng1)*this.clamp(dt*.8,0,1);
    s.eng2+=(desiredSpool-s.eng2)*this.clamp(dt*.8,0,1);
    s.apu += ((s.apu>.05?1:0)-s.apu)*this.clamp(dt*.25,0,1);
    s.fuel=this.clamp(s.fuel-(.0025+thrust*.006)*dt,0,100);
    s.mach=s.ias/Math.max(500,661-s.alt*.004);
    if(s.gearDown) s.vs-=Math.max(0,(s.ias-170)*.015);
  }
}
