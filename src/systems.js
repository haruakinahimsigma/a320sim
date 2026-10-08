export class A320Systems {
  constructor() {
    this.state = {
      ias:145, alt:5000, heading:270, vs:0, pitch:2.2, bank:0,
      selSpd:150, selHdg:270, selAlt:5000, selVs:0,
      ap1:false, ap2:false, fd:true, athr:true,
      gearDown:false, flaps:0, beacon:false, strobe:false,
      eng1:.55, eng2:.55, apu:0, elec:true,
      hydGreen:true, hydBlue:true, hydYellow:true, parkBrake:true,
      fuel:100, throttle1:.35, throttle2:.35, trim:0,
      lightPanel:.7, navMode:'ROSE', mach:.42,
      rudder:0, elevator:0, aileron:0, spoilers:0,
      lat:35.55, lon:139.78, onGround:false,
      radioAlt:4900, gs:145, track:270, nav1:null, nav2:null,
      ils:false, locDeviation:0, gsDeviation:0, flightPathAngle:0,
      weight:62000, wind:0, oat:15
    };
    this.flightPlan=[
      {ident:'TAKEOFF',lat:35.55,lon:139.78,alt:5000},
      {ident:'FIX01',lat:35.62,lon:139.86,alt:7000},
      {ident:'FIX02',lat:35.70,lon:139.96,alt:10000}
    ];
    this.activeWaypoint=1;
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
    return this.addWaypoint(clean), this.activeWaypoint=this.flightPlan.length-1, true;
  }

  update(dt) {
    const s=this.state;
    const thrust=(s.throttle1+s.throttle2)*.5;
    const power=(s.eng1+s.eng2)*.5;
    const targetSpeed=s.athr ? s.selSpd : 105+thrust*205;
    const speedResponse=.55+(power*.35);

    const drag=.00075*s.ias*s.ias + s.flaps*2.2 + (s.gearDown?18:0);
    const accel=((thrust*150)-drag)*.018;
    s.ias += (targetSpeed-s.ias)*this.clamp(dt*speedResponse,0,1) + accel*dt;
    s.ias=this.clamp(s.ias,0,390);

    if(s.ap1){
      let hdgErr=((s.selHdg-s.heading+540)%360)-180;
      s.bank=this.clamp(hdgErr*.65,-28,28);
      s.heading=(s.heading+s.bank*dt*.12+360)%360;
      const altErr=s.selAlt-s.alt;
      const commandedVs=this.clamp(altErr*.075,-2500,2500);
      s.vs+=(commandedVs-s.vs)*this.clamp(dt*1.2,0,1);
      s.pitch=this.clamp(2+s.vs*.0018,-10,12);
    }else{
      s.bank+=(s.aileron*28-s.bank)*this.clamp(dt*2.2,0,1);
      s.heading=(s.heading+s.bank*dt*.12+360)%360;
      const lift=((s.ias-125)*.052)+(s.elevator*190)-(s.flaps*5)-(s.gearDown?7:0);
      s.vs+=(lift-s.vs)*this.clamp(dt*.8,0,1);
      s.pitch+=(s.elevator*10-s.pitch)*this.clamp(dt*.8,0,1);
    }

    s.alt=this.clamp(s.alt+s.vs*dt/60,0,45000);
    s.onGround=s.alt<20 && Math.abs(s.vs)<250;

    const desiredSpool=this.clamp(.20+thrust*.80,0,1);
    s.eng1+=(desiredSpool-s.eng1)*this.clamp(dt*1.0,0,1);
    s.eng2+=(desiredSpool-s.eng2)*this.clamp(dt*1.0,0,1);
    s.apu += ((s.apu>.05?1:0)-s.apu)*this.clamp(dt*.35,0,1);
    s.fuel=this.clamp(s.fuel-(.0025+thrust*.006)*dt,0,100);

    s.mach=s.ias/Math.max(500,661-s.alt*.004);
    s.gs=Math.max(0,s.ias-s.wind);
    s.track=(s.heading+s.bank*.18+360)%360;
    s.radioAlt=Math.max(0,s.alt);
    s.flightPathAngle=Math.atan2(s.vs/60,Math.max(20,s.ias))*180/Math.PI;

    if(s.gearDown) s.vs-=Math.max(0,(s.ias-170)*.018);

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
    }else{
      s.locDeviation=0;s.gsDeviation=0;
    }
  }

  clamp(v,a,b) { return Math.max(a,Math.min(b,v)); }
}
