export class A320Systems {
  constructor() {
    this.state = {
      ias:0, alt:0, heading:0, vs:0, pitch:0, bank:0,
      selSpd:150, selHdg:0, selAlt:5000, selVs:0,
      ap1:false, ap2:false, fd:true, athr:true,
      gearDown:false, flaps:0, beacon:false, strobe:false,
      eng1:.20, eng2:.20, apu:0, elec:true,
      hydGreen:true, hydBlue:true, hydYellow:true, parkBrake:true,
      fuel:100, throttle1:0, throttle2:0, trim:0,
      lightPanel:.7, navMode:'ROSE', mach:0,
      rudder:0, elevator:0, aileron:0, spoilers:0,
      lat:35.55, lon:139.78, onGround:true,
      radioAlt:0, gs:0, track:0, nav1:null, nav2:null,
      ils:false, locDeviation:0, gsDeviation:0, flightPathAngle:0,
      weight:62000, wind:0, oat:15,
      n1_1:20, n1_2:20, n2_1:37, n2_2:37,
      egt1:300, egt2:300, fuelFlow1:0.08, fuelFlow2:0.08,
      oilPress1:16, oilPress2:16, oilTemp1:62, oilTemp2:62
    };
    this.flightPlan=[
      {ident:'TAKEOFF',lat:35.55,lon:139.78,alt:5000},
      {ident:'FIX01',lat:35.62,lon:139.86,alt:7000},
      {ident:'FIX02',lat:35.70,lon:139.96,alt:10000}
    ];
    this.activeWaypoint=1;
    this._pitchRate=0;
    this._vsFpm=0;
  }

  toggle(k) { if(k in this.state) this.state[k]=!this.state[k]; }
  set(k,v) { if(k in this.state && Number.isFinite(v)) this.state[k]=v; }

  addWaypoint(ident,lat=null,lon=null,alt=7000) {
    const clean=String(ident||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
    if(!clean)return false;
    const last=this.flightPlan[this.flightPlan.length-1] || {lat:this.state.lat,lon:this.state.lon};
    const index=this.flightPlan.length;
    const bearing=(this.state.heading+index*18)*Math.PI/180;
    const distance=.10;
    const fallbackLat=last.lat+Math.cos(bearing)*distance;
    const fallbackLon=last.lon+Math.sin(bearing)*distance/Math.max(.2,Math.cos(last.lat*Math.PI/180));
    this.flightPlan.push({
      ident:clean,
      lat:Number.isFinite(lat)?lat:fallbackLat,
      lon:Number.isFinite(lon)?lon:fallbackLon,
      alt:Number.isFinite(alt)?alt:7000
    });
    if(this.activeWaypoint>=this.flightPlan.length)this.activeWaypoint=this.flightPlan.length-1;
    return true;
  }

  directTo(ident) {
    const clean=String(ident||'').trim().toUpperCase();
    const index=this.flightPlan.findIndex(w=>w.ident===clean);
    if(index>=0){this.activeWaypoint=index;return true;}
    this.addWaypoint(clean);
    this.activeWaypoint=this.flightPlan.length-1;
    return true;
  }

  update(dt) {
    const s=this.state;
    dt=this.clamp(dt,0,.05);
    const throttle=this.clamp((s.throttle1+s.throttle2)*.5,0,1);
    const power=(s.eng1+s.eng2)*.5;

    // Engine spool is deliberately lagged: throttle is a command, not instant N1.
    const targetSpool=this.clamp(.20+throttle*.80,0,1);
    const spoolRate=targetSpool > power ? 0.72 : 0.42;
    s.eng1+=(targetSpool-s.eng1)*this.clamp(dt*spoolRate,0,1);
    s.eng2+=(targetSpool-s.eng2)*this.clamp(dt*spoolRate,0,1);
    s.n1_1=s.eng1*100; s.n1_2=s.eng2*100;
    s.n2_1=this.clamp(22+s.eng1*76,0,100);
    s.n2_2=this.clamp(22+s.eng2*76,0,100);

    // Approximate single-spool response plus drag and gravity along the flight path.
    // IAS is in knots; flight-path angle is positive in climb, negative in descent.
    const gammaRad=s.flightPathAngle*Math.PI/180;
    const thrustAccel=throttle*2.25*power;
    const parasiteDrag=.000014*s.ias*s.ias + .12;
    const flapDrag=s.flaps*.22;
    const gearDrag=s.gearDown?1.05:0;
    const spoilerDrag=this.clamp(s.spoilers,0,1)*1.8;
    const gravityAccel=-19.05*Math.sin(gammaRad);
    let accel=thrustAccel-parasiteDrag-flapDrag-gearDrag-spoilerDrag+gravityAccel;
    if(s.onGround && s.parkBrake) accel=Math.min(0,accel);
    if(s.onGround && !s.parkBrake) accel-=.22;
    s.ias=this.clamp(s.ias+accel*dt,0,390);

    // Manual sidestick commands pitch/bank. The aircraft's flight path follows
    // pitch gradually; the gap between pitch and flight path represents AoA.
    if(s.ap1){
      const hdgErr=((s.selHdg-s.heading+540)%360)-180;
      const bankTarget=this.clamp(hdgErr*.65,-28,28);
      s.bank+=(bankTarget-s.bank)*this.clamp(dt*1.2,0,1);
      s.heading=(s.heading+s.bank*dt*.12+360)%360;
      const altErr=s.selAlt-s.alt;
      const commandedVs=this.clamp(altErr*.075,-2500,2500);
      s.vs+=(commandedVs-s.vs)*this.clamp(dt*1.2,0,1);
      const pitchTarget=this.clamp(2+s.vs*.0018,-10,12);
      s.pitch+=(pitchTarget-s.pitch)*this.clamp(dt*1.2,0,1);
      s.flightPathAngle+=(this.clamp(s.vs/Math.max(1,s.ias*1.6878)*60,-12,12)-s.flightPathAngle)*this.clamp(dt*.9,0,1);
    }else{
      const bankTarget=this.clamp(s.aileron*30,-30,30);
      s.bank+=(bankTarget-s.bank)*this.clamp(dt*2.0,0,1);
      s.heading=(s.heading+s.bank*dt*.12+360)%360;
      const pitchTarget=this.clamp(2+s.elevator*16,-14,18);
      s.pitch+=(pitchTarget-s.pitch)*this.clamp(dt*1.15,0,1);
      const aoa=s.pitch-s.flightPathAngle;
      const lowSpeedLift=this.clamp((s.ias-95)/65,0,1.15);
      const liftAuthority=lowSpeedLift*(1+s.flaps*.045);
      const targetFpa=this.clamp((s.pitch-3)*liftAuthority,-18,15);
      const stallPenalty=(s.ias<115 && aoa>13)?(115-s.ias)*.55:0;
      const targetVs=(targetFpa*Math.PI/180)*s.ias*101.27 - stallPenalty*35;
      s.vs+=(targetVs-s.vs)*this.clamp(dt*.65,0,1);
      s.flightPathAngle+=(targetFpa-s.flightPathAngle)*this.clamp(dt*.75,0,1);
      if(s.ias<105 && aoa>15) s.vs-=45*dt;
    }

    // Bank increases load factor and induced drag; it does not directly turn
    // heading instantaneously.
    const bankRad=s.bank*Math.PI/180;
    const loadFactor=1/Math.max(.55,Math.cos(bankRad));
    const inducedDrag=Math.max(0,loadFactor-1)*.55;
    s.ias=this.clamp(s.ias-inducedDrag*dt,0,390);

    // Gear and flap configuration changes affect drag/lift continuously.
    s.alt=this.clamp(s.alt+s.vs*dt/60,0,45000);
    if(s.alt<=0){s.alt=0;s.vs=Math.max(0,s.vs);s.onGround=true;}
    else if(s.alt>30)s.onGround=false;
    if(s.onGround){s.flightPathAngle=0;s.vs=Math.max(-20,s.vs);}

    // Engine indications lag the command and respond to operating conditions.
    const ambient=this.clamp(s.oat+273.15,230,320);
    const tempTarget=ambient*.72 + throttle*350 + power*95;
    s.egt1+=(tempTarget-s.egt1)*this.clamp(dt*.22,0,1);
    s.egt2+=(tempTarget-s.egt2)*this.clamp(dt*.22,0,1);
    s.fuelFlow1=(.08+throttle*1.35)*power;
    s.fuelFlow2=(.08+throttle*1.35)*power;
    s.oilPress1=power*78; s.oilPress2=power*78;
    s.oilTemp1+=(62+power*38-s.oilTemp1)*this.clamp(dt*.035,0,1);
    s.oilTemp2+=(62+power*38-s.oilTemp2)*this.clamp(dt*.035,0,1);
    s.apu += ((s.apu>.05?1:0)-s.apu)*this.clamp(dt*.35,0,1);
    s.fuel=this.clamp(s.fuel-(.0008+throttle*.0048)*dt,0,100);

    s.mach=s.ias/Math.max(500,661-s.alt*.004);
    s.gs=Math.max(0,s.ias-s.wind);
    s.track=(s.heading+s.bank*.18+360)%360;
    s.radioAlt=Math.max(0,s.alt);
    s.flightPathAngle=this.clamp(s.flightPathAngle,-25,20);

    const nmPerSec=s.gs/3600;
    const rad=s.track*Math.PI/180;
    const dNorth=Math.cos(rad)*nmPerSec*dt;
    const dEast=Math.sin(rad)*nmPerSec*dt;
    s.lat+=dNorth/60;
    s.lon+=dEast/(60*Math.max(.2,Math.cos(s.lat*Math.PI/180)));

    const wp=this.flightPlan[this.activeWaypoint];
    if(wp){
      const dLat=(wp.lat-s.lat)*60;
      const dLon=(wp.lon-s.lon)*60*Math.cos(s.lat*Math.PI/180);
      const distance=Math.hypot(dLat,dLon);
      const bearing=(Math.atan2(dLon,dLat)*180/Math.PI+360)%360;
      s.nav1={ident:wp.ident,distance,bearing};
      if(distance<1 && this.activeWaypoint<this.flightPlan.length-1)this.activeWaypoint++;
    }

    if(s.ils){
      s.locDeviation=this.clamp((((s.selHdg-s.heading+540)%360)-180)/2,-2.5,2.5);
      s.gsDeviation=this.clamp((s.selAlt-s.alt)/700,-2.5,2.5);
    }else{s.locDeviation=0;s.gsDeviation=0;}
  }

  clamp(v,a,b) { return Math.max(a,Math.min(b,v)); }
}
