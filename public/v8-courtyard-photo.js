/* v8 only: photo-informed surfaces, not a second layout model.
 * Sources and boundaries: docs/V8_COURTYARD_PHOTO_2026-11-14.md.
 * Loaded after upgrade.js and before app.js; no UI/network/avatar hooks.
 */
(function () {
  'use strict';
  const W = window.HanmaumWorld, T = window.THREE;
  if (!W || !T || W.prototype.buildSite.photoSurfaces) return;
  const build = W.prototype.buildSite;

  function texture(world, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    draw(canvas.getContext('2d'));
    const tx = new T.CanvasTexture(canvas);
    tx.colorSpace = T.SRGBColorSpace;
    tx.wrapS = tx.wrapT = T.RepeatWrapping;
    world._textures.push(tx);
    return tx;
  }
  function grain(q, light, dark) {
    for (let i = 0; i < 1800; i++) {
      q.fillStyle = i % 2 ? light : dark;
      q.fillRect((i * 73) % 256, (i * 151 + Math.floor(i / 256) * 13) % 256, 1, 1);
    }
  }
  function pavingTexture(q) {
    q.fillStyle = '#d1cec6'; q.fillRect(0, 0, 256, 256);
    const colors = ['#cecdc6', '#d2d0c9', '#cfcdc7', '#d4d1ca'];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      q.fillStyle = row === 1 && col === 2 ? '#c9bcb1' : colors[(row * 3 + col) % 4];
      q.fillRect(col * 64 + 1, row * 64 + 1, 62, 62);
    }
    grain(q, '#ffffff24', '#6d6b661b');
  }
  function roofTexture(q) {
    q.fillStyle = '#384340'; q.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) {
      q.fillStyle = '#232d2c'; q.fillRect(x, 0, 5, 256);
      q.fillStyle = '#59615a'; q.fillRect(x + 6, 0, 3, 256);
      for (let y = 0; y < 256; y += 64) {
        q.fillStyle = '#6b71664f'; q.fillRect(x + 4, y, 26, 2);
      }
    }
    grain(q, '#ffffff12', '#00000016');
  }
  function stoneTexture(q) {
    q.fillStyle = '#d6c8bd'; q.fillRect(0, 0, 256, 256);
    grain(q, '#ffffff40', '#76665928');
    q.strokeStyle = '#9b90836b'; q.lineWidth = 1;
    for (let a = 0; a <= 256; a += 64) {
      q.beginPath(); q.moveTo(a, 0); q.lineTo(a, 256); q.stroke();
      q.beginPath(); q.moveTo(0, a); q.lineTo(256, a); q.stroke();
    }
  }
  function dancheongTexture(q) {
    q.fillStyle = '#305e51'; q.fillRect(0, 0, 256, 256);
    for (const y of [10, 48, 208, 244]) { q.fillStyle = '#c5ab76'; q.fillRect(0, y, 256, 4); }
    for (let x = 0; x < 256; x += 64) {
      q.fillStyle = '#8f5144'; q.fillRect(x + 8, 64, 48, 128);
      q.strokeStyle = '#d6c19a'; q.lineWidth = 3;
      q.beginPath(); q.moveTo(x + 32, 76); q.lineTo(x + 52, 128); q.lineTo(x + 32, 180); q.lineTo(x + 12, 128); q.closePath(); q.stroke();
      q.fillStyle = '#638c78'; q.beginPath(); q.arc(x + 32, 128, 9, 0, Math.PI * 2); q.fill();
    }
  }
  function uvBox(w, h, d, mode) {
    const geo = new T.BoxGeometry(w, h, d), uv = geo.attributes.uv;
    // BoxGeometry has six four-vertex faces: +/-x, +/-y, +/-z.
    for (let face = 0; face < 6; face++) {
      const horizontal = face === 2 || face === 3;
      const a = horizontal ? w : face < 2 ? d : w;
      const b = horizontal ? d : h;
      const scale = mode === 'paving' ? 6.8 : 8;
      for (let i = face * 4; i < face * 4 + 4; i++) uv.setXY(i, uv.getX(i) * a / scale, mode === 'band' ? uv.getY(i) : uv.getY(i) * b / scale);
    }
    return geo;
  }
  function addMesh(parent, geometry, material, x, y, z) {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }

  W.prototype.buildSite = function (...args) {
    const world = this, originals = {}, descriptors = {}, cache = new Map();
    const material = (name, draw, roughness = .9) => {
      if (!cache.has(name)) cache.set(name, new T.MeshStandardMaterial({color: '#ffffff', map: texture(world, draw), roughness}));
      return cache.get(name);
    };
    const methods = ['paving', 'roof', 'stoneMaterial', 'tree'];
    for (const key of methods) { originals[key] = this[key]; descriptors[key] = Object.getOwnPropertyDescriptor(this, key); }
    this.paving = function (x, z, w, d, y = .06) {
      return addMesh(this.content, uvBox(w, .12, d, 'paving'), material('paving', pavingTexture), x, y, z);
    };
    this.stoneMaterial = function () { return material('stone', stoneTexture); };
    this.roof = function (w, d, h, x, y, z, parent, color) {
      const group = originals.roof.call(this, w, d, h, x, y, z, parent, color);
      // Red neighbor roofs and the stone pagoda canopy retain their original treatment.
      if (color !== '#36474a') return group;
      const panel = group.children.find(child => child.isMesh && child.geometry?.attributes.position?.count > 24);
      if (panel) {
        const geo = panel.geometry, pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / 2; uv[i * 2 + 1] = pos.getZ(i) / 2; }
        geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
        panel.material.dispose(); panel.material = material('roof', roofTexture, .85);
      }
      // Thin fascia at the existing eave; geometry stays within the roof footprint.
      const band = material('dancheong', dancheongTexture);
      for (const side of [-1, 1]) {
        addMesh(group, uvBox(w * .91, .27, .05, 'band'), band, 0, -.06, side * d * .44);
      }
      return group;
    };
    this.tree = function (x, z, s = 1, kind = 'round') {
      const group = originals.tree.call(this, x, z, s, kind);
      if (kind !== 'pine') return group;
      const record = this.trees?.find(t => t.g === group);
      for (const [i, leaf] of (record?.leaves || []).entries()) {
        leaf.geometry.dispose(); leaf.geometry = new T.IcosahedronGeometry(1, 1);
        leaf.scale.set((1.3 - i * .16) * s, .43 * s, (.93 - i * .1) * s);
        leaf.position.set((i % 2 ? .42 : -.24) * s, (1.85 + i * .55) * s, (i % 2 ? .13 : -.12) * s);
        leaf.rotation.y = x * .3 + z * .2 + i;
      }
      return group;
    };
    try {
      return build.apply(this, args);
    } finally {
      // No helper changes survive into halls/workshop/seosan, even if a build fails.
      for (const key of methods) {
        if (descriptors[key]) Object.defineProperty(this, key, descriptors[key]);
        else delete this[key];
      }
    }
  };
  W.prototype.buildSite.photoSurfaces = true;
})();
