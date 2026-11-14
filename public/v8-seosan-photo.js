/* v8 Sosanjeong only. Layout and interactions remain owned by upgrade.js.
 * Photos: hanmaum.org/content/one_tour_09, one_daehaeng_01,
 * hanmaumseoncenter.org/sosanjeong-daehaeng-kun-sunims-residence-and-the-site-of-her-pagoda/
 * Procedural materials only; no source photos shipped.
 */
(function () {
  'use strict';
  const W = window.HanmaumWorld, T = window.THREE;
  if (!W || !T || W.prototype.buildSeosan.photoGarden) return;
  const original = W.prototype.buildSeosan;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  function terrain(ramps) {
    return (x, z) => {
      // Keep the three original anchor heights, soften only the intervening lawn.
      const low = 1.6 * (1 - smooth(9, 17, z));
      const high = 1.6 * smooth(-9, -2, x) * (1 - smooth(-12, -4, z));
      let y = low + high;
      for (const r of ramps) {
        if (r.axis !== 'z') continue;
        const lo = Math.min(r.z0, r.z1), hi = Math.max(r.z0, r.z1);
        const side = Math.abs(x - r.x) - r.width / 2 - .1;
        const end = Math.max(lo - z, z - hi) - .3;
        const weight = (1 - smooth(0, .8, side)) * (1 - smooth(0, .8, end));
        if (weight) {
          const t = clamp((z - r.z0) / (r.z1 - r.z0));
          y += (r.y0 + (r.y1 - r.y0) * t - y) * weight;
        }
      }
      return y;
    };
  }
  function material(world, name, base, color = '#ffffff') {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const q = c.getContext('2d'); q.fillStyle = base; q.fillRect(0, 0, 256, 256);
    let seed = 1729;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 2500; i++) {
      q.fillStyle = i % 2 ? '#ffffff24' : '#302a251a';
      q.fillRect(random() * 256, random() * 256, name === 'wood' ? 1 : 2, name === 'wood' ? 23 : 1);
    }
    if (name === 'roof') for (let x = 0; x < 256; x += 32) {
      q.fillStyle = '#17232088'; q.fillRect(x, 0, 4, 256);
      q.fillStyle = '#a0a29455'; q.fillRect(x + 5, 0, 3, 256);
      for (let y = 0; y < 256; y += 64) q.fillRect(x + 5, y, 27, 2);
    }
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.wrapS = tx.wrapT = T.RepeatWrapping;
    world._textures.push(tx);
    return new T.MeshStandardMaterial({color, map: tx, roughness: name === 'wood' ? .78 : .95});
  }
  function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  function remove(m) {
    if (!m?.parent) return;
    m.parent.remove(m);
    m.traverse(o => { o.geometry?.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(a => a.dispose()); });
  }
  function curvePath(world, points, width, mat) {
    const curve = new T.CatmullRomCurve3(points.map(([x, z]) => new T.Vector3(x, 0, z)));
    const pos = [], uv = [], idx = [], n = 80, across = 12;
    for (let i = 0; i <= n; i++) {
      const p = curve.getPoint(i / n), t = curve.getTangent(i / n);
      for (let j = 0; j <= across; j++) {
        const side = j / across * 2 - 1;
        const x = p.x - t.z * width / 2 * side, z = p.z + t.x * width / 2 * side;
        pos.push(x, world.terrainHeight(x, z) + .035, z); uv.push(j / across, i / 8);
        if (i < n && j < across) { const a = i * (across + 1) + j, b = a + across + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
      }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const path = mesh(world.content, geo, mat); path.name = 'seosan-path'; return path;
  }
  function rebuildStupa(world, group, stone) {
    world.disposeGroup(group); group.clear();
    const slab = mesh(group, new T.IcosahedronGeometry(1, 2), stone, 0, .4, 0); slab.scale.set(1.72, .37, 1.18);
    mesh(group, new T.LatheGeometry([new T.Vector2(.5, .6), new T.Vector2(.39, .9), new T.Vector2(.22, 1.2), new T.Vector2(.31, 1.55), new T.Vector2(.4, 1.8)], 16), stone);
    for (const side of [-1, 1]) {
      const curl = mesh(group, new T.TorusGeometry(.29, .13, 7, 20, Math.PI * 1.7), stone, side * .4, 1.15, .13); curl.rotation.z = side * .7;
      const curl2 = mesh(group, new T.TorusGeometry(.18, .1, 7, 16, Math.PI * 1.6), stone, side * .22, .77, .42); curl2.rotation.z = side * 1.1;
    }
    const bud = mesh(group, new T.SphereGeometry(.72, 24, 18), stone, 0, 2.52, 0); bud.scale.set(1, 1.2, 1);
    // Solid curved petals hugging the bud, rather than cones or a gold finial.
    for (const side of [-1, 1]) {
      const shape = new T.Shape(); shape.moveTo(.11, 1.68);
      shape.bezierCurveTo(1.04, 1.9, 1.2, 2.75, .61, 3.75);
      shape.bezierCurveTo(.49, 3.62, .62, 3.37, .72, 3.1);
      shape.bezierCurveTo(1.01, 2.43, .68, 1.94, .11, 1.81); shape.closePath();
      const petal = mesh(group, new T.ExtrudeGeometry(shape, {depth: .12, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .025, bevelThickness: .025, curveSegments: 18}), stone, 0, 0, -.05);
      petal.scale.x = side;
    }
    group.traverse(m => { if (m.isMesh) m.userData.hotspot = 'budo'; });
  }
  function refineHouse(world, group, wood, roof, glass) {
    group.traverse(m => {
      if (!m.isMesh || !m.geometry?.parameters) return;
      const p = m.geometry.parameters;
      if (p.width === 1.9 && p.height === 2.05) { m.material.dispose(); m.material = glass; }
      else if (m.material?.color?.getHexString() === 'b4773f' || m.material?.color?.getHexString() === 'c9873f') { m.material.dispose(); m.material = wood; }
    });
    group.traverse(m => {
      if (!m.isMesh || m.material?.color?.getHexString() !== '36474a') return;
      const geo = m.geometry, p = geo.attributes.position, uv = [];
      for (let i = 0; i < p.count; i++) uv.push(p.getX(i) / 2, p.getZ(i) / 2);
      geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); m.material.dispose(); m.material = roof;
    });
    // Existing doors stay at their original positions; narrow wooden transoms add depth.
    for (const x of [-3.6, -1.2, 1.2, 3.6]) for (const y of [1.04, 1.75, 2.46]) mesh(group, new T.BoxGeometry(1.9, .045, .05), wood, x, y, 2.94);
    for (let x = -6; x <= 6; x += .6) mesh(group, new T.BoxGeometry(.075, .12, 1.3), wood, x, 3.29, 3.45);
    group.traverse(m => { if (m.isMesh) m.userData.hotspot = 'seosanjeong'; });
  }

  W.prototype.buildSeosan = function (...args) {
    const boxes = [], grounds = [], saved = {};
    for (const key of ['box', 'roundedGround']) {
      const fn = this[key]; saved[key] = Object.getOwnPropertyDescriptor(this, key);
      this[key] = function (...a) { const value = fn.apply(this, a); (key === 'box' ? boxes : grounds).push({args: a, mesh: value}); return value; };
    }
    let value;
    try { value = original.apply(this, args); }
    finally { for (const key of ['box', 'roundedGround']) { if (saved[key]) Object.defineProperty(this, key, saved[key]); else delete this[key]; } }
    this.terrainHeight = terrain(this.ramps || []);
    const grass = material(this, 'grass', '#c6ccb9', '#819b61');
    const path = material(this, 'path', '#b5afa0');
    const granite = material(this, 'stone', '#ded8ca');
    const wood = material(this, 'wood', '#aa7648');
    const roof = material(this, 'roof', '#35413f');
    const glass = new T.MeshStandardMaterial({color: '#708c80', roughness: .3, metalness: .12});
    for (const e of grounds) remove(e.mesh);
    // Remove only old landscape blocks/path strips; preserve stairs, lamps and buildings.
    for (const {args: a, mesh: m} of boxes) if (['#6f8f55', '#86ad5e', '#b3aa98', '#cbbf9f'].includes(a[3])) remove(m);
    const geo = new T.PlaneGeometry(64, 64, 128, 128); geo.rotateX(-Math.PI / 2);
    const positions = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < positions.count; i++) { const x = positions.getX(i), z = positions.getZ(i); positions.setY(i, this.terrainHeight(x, z)); uv.setXY(i, x / 4, z / 4); }
    positions.needsUpdate = true; geo.computeVertexNormals(); const ground = mesh(this.content, geo, grass); ground.receiveShadow = true; ground.castShadow = false;
    this.groundMaterial = grass;
    // Use the actual triangulated lawn for walking and path vertices, not a second smooth approximation.
    this.terrainHeight = (x, z) => {
      const u = clamp((x + 32) * 2, 0, 128), v = clamp((z + 32) * 2, 0, 128);
      const col = Math.min(127, Math.floor(u)), row = Math.min(127, Math.floor(v));
      const tx = u - col, tz = v - row, a = row * 129 + col;
      const h00 = positions.getY(a), h10 = positions.getY(a + 1), h01 = positions.getY(a + 129), h11 = positions.getY(a + 130);
      return tx + tz <= 1 ? h00 + tx * (h10 - h00) + tz * (h01 - h00) : h11 + (1 - tx) * (h01 - h11) + (1 - tz) * (h10 - h11);
    };
    curvePath(this, [[2, 25.5], [1.5, 21], [2.4, 17], [3, 13.2]], 2.9, path);
    curvePath(this, [[3, 9.4], [4, 6], [5.4, 1], [5.7, -2], [7, -5.4]], 2.8, path);
    curvePath(this, [[7, -9.4], [7.7, -11], [9, -12.7]], 2.8, path);
    curvePath(this, [[-22, -8.6], [-16, -8.8], [-13.8, -12], [-13.5, -17], [-13.5, -21]], 2.25, path);
    const stupa = this.content.children.find(g => g.isGroup && Math.abs(g.position.x + 11) < .01 && Math.abs(g.position.z) < .01);
    const house = this.content.children.find(g => g.isGroup && Math.abs(g.position.x - 9) < .01 && Math.abs(g.position.z + 17) < .01);
    if (stupa) { stupa.position.y = this.terrainHeight(-11, 0) - .03; rebuildStupa(this, stupa, granite); } else granite.dispose();
    if (house) { house.position.y = this.terrainHeight(9, -17); refineHouse(this, house, wood, roof, glass); } else { wood.dispose(); roof.dispose(); glass.dispose(); }
    for (const record of this.trees || []) {
      const g = record.g; if (!g) continue; g.position.y = this.terrainHeight(g.position.x, g.position.z) + .03;
      if (record.kind !== 'pine') continue;
      for (const [i, leaf] of record.leaves.entries()) {
        const size = leaf.geometry.parameters?.radius || 1;
        leaf.geometry.dispose(); leaf.geometry = new T.IcosahedronGeometry(1, 1);
        leaf.scale.set(size * 1.12, size * .36, size * .83); leaf.position.x = (i % 2 ? .33 : -.25) * size;
        leaf.rotation.y = i + g.position.x * .3;
      }
    }
    // Keep edge boulders and flower masses grounded on the new lawn.
    for (const group of this.content.children) {
      if (!group.isGroup || group === stupa || group === house || (this.trees || []).some(t => t.g === group)) continue;
      const {x, z} = group.position;
      if (x || z) group.position.y = this.terrainHeight(x, z);
      for (const child of group.children.slice()) {
        if (!child.isMesh || !child.geometry?.parameters) continue;
        const parameters = child.geometry.parameters;
        if (parameters.radiusTop === .05 && parameters.radiusBottom === .05 && parameters.height === 2.9) {
          // Keep the string at y=4.5, with its right support beside (not through) the stair flight.
          if (child.position.x === 3 && child.position.z === 11.4) {
            child.position.x = 4.8;
            this.line([[3, 4.5, 11.4], [4.8, 4.5, 11.4]], '#6b6a5a', .02, group);
          }
          const base = this.terrainHeight(child.position.x + x, child.position.z + z) - group.position.y;
          const top = child.position.y + parameters.height / 2;
          child.geometry.dispose(); child.geometry = new T.CylinderGeometry(.05, .05, top - base, 6);
          child.position.y = (top + base) / 2;
        }
        const radius = child.geometry.parameters.radius;
        if (radius === .55) { remove(child); continue; }
        if (radius === .9) {
          child.position.y = this.terrainHeight(child.position.x + x, child.position.z + z) - group.position.y + (radius === .55 ? .15 : .36);
          child.scale.y = .58; child.material.dispose(); child.material = grass;
        }
      }
    }
    return value;
  };
  W.prototype.buildSeosan.photoGarden = true;
})();
