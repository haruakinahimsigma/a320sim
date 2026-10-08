import * as THREE from 'three';

export class CockpitControls {
  constructor(root) {
    this.root = root;
    this.items = [];
    this.activeDrag = null;
  }
  register(object, action, opts = {}) {
    object.userData.control = {
      action,
      type: opts.type || 'button',
      axis: opts.axis || 'z',
      min: opts.min ?? 0,
      max: opts.max ?? 1,
      value: opts.value ?? 0,
      step: opts.step ?? 1,
      travel: opts.travel ?? .25,
      onDrag: opts.onDrag || null
    };
    object.userData.basePosition = object.position.clone();
    object.userData.baseRotation = object.rotation.clone();
    this.items.push(object);
    return object;
  }
  pulse(object) {
    if (object) object.userData.pressedUntil = performance.now() + 105;
  }
  setValue(object, value) {
    const c = object?.userData.control;
    if (!c) return;
    c.value = THREE.MathUtils.clamp(value, c.min, c.max);
    if (c.type === 'knob') {
      object.rotation.z = c.baseAngle + (c.value - c.min) / Math.max(.001, c.max - c.min) * Math.PI * 1.55;
    }
    if (c.type === 'lever') {
      object.position.y = object.userData.basePosition.y + (c.value - c.min) / Math.max(.001, c.max - c.min) * c.travel;
    }
  }
  beginDrag(object, x, y) {
    const c = object?.userData.control;
    if (!c || !['knob','lever','stick'].includes(c.type)) return false;
    this.activeDrag = { object, x, y, start: c.value };
    return true;
  }
  drag(x, y) {
    if (!this.activeDrag) return null;
    const d = this.activeDrag, c = d.object.userData.control;
    const dy = d.y - y, dx = x - d.x;
    let value = d.start;
    if (c.type === 'knob') value += (dx - dy) * .008 * (c.max - c.min);
    if (c.type === 'lever') value += -dy * .008 * (c.max - c.min);
    if (c.type === 'stick') value = THREE.MathUtils.clamp(d.start + dx * .006, c.min, c.max);
    this.setValue(d.object, value);
    if (c.onDrag) c.onDrag(c.value, d.object);
    d.x = x; d.y = y; d.start = c.value;
    return c.value;
  }
  endDrag() {
    const d = this.activeDrag;
    this.activeDrag = null;
    if (d?.object?.userData.control?.type === 'stick') {
      const c = d.object.userData.control;
      c.value += (0 - c.value) * .5;
    }
  }
  animate() {
    const now = performance.now();
    for (const o of this.items) {
      const c = o.userData.control;
      if (!c) continue;
      const base = o.userData.basePosition;
      if (c.type === 'button' || c.type === 'toggle') {
        const pressed = (o.userData.pressedUntil || 0) > now;
        o.position.z = base.z - (pressed ? .035 : 0);
      }
      if (c.type === 'stick' && !this.activeDrag) {
        c.value += (0 - c.value) * .16;
        o.rotation.z = c.value * .22;
      }
    }
  }
}
