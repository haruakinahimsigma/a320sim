import * as THREE from 'three';

export class CockpitControls {
  constructor(root, onAction) {
    this.root = root;
    this.onAction = onAction;
    this.items = [];
  }
  register(object, action, opts = {}) {
    object.userData.control = { action, type: opts.type || 'button', min: opts.min, max: opts.max, value: opts.value ?? 0 };
    object.userData.basePosition = object.position.clone();
    object.userData.baseRotation = object.rotation.clone();
    object.userData.pressDepth = opts.pressDepth ?? 0.025;
    this.items.push(object);
    return object;
  }
  pulse(object) {
    object.userData.pressedUntil = performance.now() + 120;
  }
  animate() {
    const now = performance.now();
    for (const o of this.items) {
      if (!o.userData.control) continue;
      const pressed = o.userData.pressedUntil && o.userData.pressedUntil > now;
      const base = o.userData.basePosition;
      o.position.z = base.z - (pressed ? o.userData.pressDepth : 0);
    }
  }
}
