import * as THREE from "three";

export function start(ctx) {
  const { scene, camera, renderer, controls, figuren, maakFiguur, stuk, mat, metaal, gloei, vonkenBij, schokgolf, toon, podium, spel, sterren, maanBol, composer, maan } = ctx;
  const R = 0.4, OOG = 1.72, START = new THREE.Vector3(0, 0, 58), HELI_PLEK = new THREE.Vector3(-41, 0.08, 0);
  const dozen = [], cirkels = [], stukken = [], emmers = new Map(), CEL = 6;
  const sleutel = (ix, iz) => (ix + 500) * 1000 + iz + 500;
  const emmer = (ix, iz) => { const k = sleutel(ix, iz); let e = emmers.get(k); if (!e) { e = { d: [], c: [] }; emmers.set(k, e); } return e; };
  function meldDozen(...lijst) {
    for (const d of lijst) {
      dozen.push(d);
      for (let ix = Math.floor((d.x0 - R) / CEL); ix <= Math.floor((d.x1 + R) / CEL); ix++) for (let iz = Math.floor((d.z0 - R) / CEL); iz <= Math.floor((d.z1 + R) / CEL); iz++) emmer(ix, iz).d.push(d);
    }
  }
  function meldCirkels(...lijst) {
    for (const c of lijst) {
      cirkels.push(c);
      for (let ix = Math.floor((c.x - c.r - R) / CEL); ix <= Math.floor((c.x + c.r + R) / CEL); ix++) for (let iz = Math.floor((c.z - c.r - R) / CEL); iz <= Math.floor((c.z + c.r + R) / CEL); iz++) emmer(ix, iz).c.push(c);
    }
  }
  const kasteel = new THREE.Group();
  scene.add(kasteel);
  let zaad = 7;
  const kans = () => { zaad = (zaad * 16807) % 2147483647; return zaad / 2147483647; };
  const STEEN = "steen";
  function doek(w, h, teken) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    teken(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  const steenTex = doek(256, 256, g => {
    g.fillStyle = "#55555c";
    g.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 8; r++) for (let k = -1; k < 4; k++) {
      g.fillStyle = `hsl(${220 + kans() * 25}, ${5 + kans() * 7}%, ${50 + Math.floor(kans() * 22)}%)`;
      g.fillRect(k * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28);
    }
  });
  steenTex.wrapS = steenTex.wrapT = THREE.RepeatWrapping;
  const steenMat = new THREE.MeshStandardMaterial({ map: steenTex, roughness: 0.95 });
  const steenVlak = () => steenMat;
  const doosCache = new Map();
  function steenGeo(w, h, d) {
    const k = Math.round(w * 20) + "_" + Math.round(h * 20) + "_" + Math.round(d * 20);
    let g = doosCache.get(k);
    if (!g) {
      g = new THREE.BoxGeometry(w, h, d);
      const uv = g.attributes.uv, maat = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let v = 0; v < 6; v++) for (let i = 0; i < 4; i++) uv.setXY(v * 4 + i, (uv.getX(v * 4 + i) * maat[v][0]) / 4, (uv.getY(v * 4 + i) * maat[v][1]) / 4);
      doosCache.set(k, g);
    }
    return g;
  }
  const wit = () => mat(0xe9e6de, { flatShading: false });
  const leisteen = () => mat(0x39404d);
  const hout = () => mat(0x6b4a2b);
  const rood = () => mat(0x8e1f3a);

  function blok(x0, x1, z0, z1, bodem, top, materiaal, vast = true) {
    const nx = Math.max(1, Math.ceil((x1 - x0) / 4.6)), nz = Math.max(1, Math.ceil((z1 - z0) / 4.6));
    let laatste = null;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const a0 = x0 + ((x1 - x0) * i) / nx, a1 = x0 + ((x1 - x0) * (i + 1)) / nx, b0 = z0 + ((z1 - z0) * j) / nz, b1 = z0 + ((z1 - z0) * (j + 1)) / nz;
      const m = stuk(materiaal === STEEN ? steenGeo(a1 - a0, top - bodem, b1 - b0) : new THREE.BoxGeometry(a1 - a0, top - bodem, b1 - b0), materiaal === STEEN ? steenMat : materiaal, (a0 + a1) / 2, (bodem + top) / 2, (b0 + b1) / 2, false);
      m.userData.stuk = true;
      kasteel.add(m);
      stukken.push({ mesh: m, x0: a0, x1: a1, z0: b0, z1: b1, y1: top, weg: false });
      if (vast) meldDozen({ x0: a0, x1: a1, z0: b0, z1: b1, bodem, top });
      laatste = m;
    }
    return laatste;
  }
  function ton(x, z, r, bodem, top, materiaal, vast = true, r2 = r) {
    const geo = new THREE.CylinderGeometry(r2, r, top - bodem, 16);
    if (materiaal === STEEN) {
      materiaal = steenMat;
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * 2 * Math.PI * r) / 4, (uv.getY(i) * (top - bodem)) / 4);
    }
    const m = stuk(geo, materiaal, x, (bodem + top) / 2, z, false);
    m.userData.stuk = true;
    kasteel.add(m);
    stukken.push({ mesh: m, x0: x - r, x1: x + r, z0: z - r, z1: z + r, y1: top, weg: false });
    if (vast) meldCirkels({ x, z, r, bodem, top });
    return m;
  }
  const inGracht = (x, z) => { const m = Math.max(Math.abs(x), Math.abs(z)); return m > 27.5 && m < 33; };
  const grond = (x, z) => inGracht(x, z) ? -0.5 : 0;
  function vloerHoogte(x, z, y) {
    let h = grond(x, z);
    const e = emmers.get(sleutel(Math.floor(x / CEL), Math.floor(z / CEL)));
    if (!e) return h;
    for (const d of e.d) if (!d.weg && x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1 && d.top <= y + 0.6 && d.top > h) h = d.top;
    for (const c of e.c) if (!c.weg && c.top <= y + 0.6 && c.top > h && Math.hypot(x - c.x, z - c.z) < c.r) h = c.top;
    return h;
  }
  function botst(x, z, y) {
    if (Math.hypot(x, z) > 150) return true;
    const e = emmers.get(sleutel(Math.floor(x / CEL), Math.floor(z / CEL)));
    if (!e) return false;
    for (const d of e.d) {
      if (d.weg || y >= d.top - 0.6 || y + 1.8 <= d.bodem) continue;
      const r = d.top - y <= 1.15 ? 0.02 : R;
      if (x > d.x0 - r && x < d.x1 + r && z > d.z0 - r && z < d.z1 + r) return true;
    }
    for (const c of e.c) if (!c.weg && y < c.top - 0.6 && y + 1.8 > c.bodem && Math.hypot(x - c.x, z - c.z) < c.r + (c.top - y <= 1.15 ? 0.02 : R)) return true;
    return false;
  }

  const gras = stuk(new THREE.CircleGeometry(175, 64), new THREE.MeshStandardMaterial({ color: 0x2a5a36, roughness: 1 }), 0, -0.03, 0, false);
  gras.rotation.x = -Math.PI / 2;
  kasteel.add(gras);
  const plein = stuk(new THREE.PlaneGeometry(48, 48), new THREE.MeshStandardMaterial({ color: 0x4a4668, roughness: 0.95 }), 0, -0.015, 0, false);
  plein.rotation.x = -Math.PI / 2;
  kasteel.add(plein);
  const pad = stuk(new THREE.PlaneGeometry(5, 60), new THREE.MeshStandardMaterial({ color: 0x4a3d2e, roughness: 1 }), 0, -0.02, 64, false);
  pad.rotation.x = -Math.PI / 2;
  kasteel.add(pad);
  const grachtVorm = new THREE.Shape([new THREE.Vector2(-33, -33), new THREE.Vector2(33, -33), new THREE.Vector2(33, 33), new THREE.Vector2(-33, 33)]);
  grachtVorm.holes.push(new THREE.Path([new THREE.Vector2(-27.5, -27.5), new THREE.Vector2(-27.5, 27.5), new THREE.Vector2(27.5, 27.5), new THREE.Vector2(27.5, -27.5)]));
  const water = new THREE.Mesh(new THREE.ShapeGeometry(grachtVorm), new THREE.MeshStandardMaterial({ color: 0x1d5c8a, emissive: 0x0a2a44, emissiveIntensity: 1, transparent: true, opacity: 0.82, roughness: 0.15, metalness: 0.3 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.02;
  kasteel.add(water);
  blok(-2.5, 2.5, 26, 34, -0.3, 0.1, hout());

  blok(-26, 26, -26, -24, 0, 6, STEEN);
  blok(-26, -24, -24, 24, 0, 6, STEEN);
  blok(24, 26, -24, 24, 0, 6, STEEN);
  blok(-26, -3, 24, 26, 0, 6, STEEN);
  blok(3, 26, 24, 26, 0, 6, STEEN);
  blok(-3, 3, 24, 26, 4.2, 6, STEEN);
  for (const s of [-1, 1]) {
    blok(s > 0 ? 3 : -6, s > 0 ? 6 : -3, 26, 28.5, 0, 8.5, STEEN);
    const dak = stuk(new THREE.ConeGeometry(2.6, 2.6, 4), rood(), s * 4.5, 9.8, 27.25, false);
    dak.rotation.y = Math.PI / 4;
    kasteel.add(dak);
  }
  for (let i = 0; i < 7; i++) blok(-2.6 + i * 0.8, -2.4 + i * 0.8, 24.9, 25.1, 3.2, 4.2, metaal(0x55555f), false);
  blok(-2.7, 2.7, 24.9, 25.1, 3.55, 3.7, metaal(0x55555f), false);

  const merlonPlekken = [];
  for (let a = -21; a <= 21; a += 2) {
    merlonPlekken.push([a, 6.85, -25.8, 0], [a, 6.85, 25.8, 0], [-25.8, 6.85, a, 1], [25.8, 6.85, a, 1]);
  }
  blok(-21, 21, -26, -25.6, 6, 6.5, STEEN, false);
  blok(-21, 21, 25.6, 26, 6, 6.5, STEEN, false);
  blok(-26, -25.6, -21, 21, 6, 6.5, STEEN, false);
  blok(25.6, 26, -21, 21, 6, 6.5, STEEN, false);
  meldDozen({ x0: -21, x1: 21, z0: -26, z1: -25.6, bodem: 6, top: 7.2 }, { x0: -21, x1: 21, z0: 25.6, z1: 26, bodem: 6, top: 7.2 }, { x0: -26, x1: -25.6, z0: -21, z1: 21, bodem: 6, top: 7.2 }, { x0: 25.6, x1: 26, z0: -21, z1: 21, bodem: 6, top: 7.2 });

  for (let i = 0; i < 20; i++) {
    blok(-24, -21.5, 10 - (i + 1) * 0.6, 10 - i * 0.6, 0, (i + 1) * 0.3, STEEN);
    blok(21.5, 24, 10 - (i + 1) * 0.6, 10 - i * 0.6, 0, (i + 1) * 0.3, STEEN);
  }

  const vlaggen = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 25, z = sz * 25;
    ton(x, z, 4, 0, 6, STEEN);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      ton(x + Math.sin(a) * 3.6, z + Math.cos(a) * 3.6, 0.25, 6, 9, STEEN, false);
    }
    ton(x, z, 4.2, 9, 10.2, STEEN, false);
    kasteel.add(stuk(new THREE.ConeGeometry(4.9, 4.4, 16), rood(), x, 12.4, z, false));
    kasteel.add(stuk(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), metaal(0xe5b04c), x, 15.6, z, false));
    const vlag = stuk(new THREE.PlaneGeometry(1.6, 0.9, 8, 1), new THREE.MeshStandardMaterial({ color: 0xe5b04c, side: THREE.DoubleSide, roughness: 0.8 }), x + 0.8, 16.2, z, false);
    vlag.userData.basis = Float32Array.from(vlag.geometry.attributes.position.array);
    kasteel.add(vlag);
    vlaggen.push(vlag);
  }

  blok(-9, 9, -24, -23, 0, 11, STEEN);
  blok(-9, -8, -23, -14, 0, 11, STEEN);
  blok(8, 9, -23, -14, 0, 11, STEEN);
  blok(-8, -1.5, -15, -14, 0, 11, STEEN);
  blok(1.5, 8, -15, -14, 0, 11, STEEN);
  blok(-1.5, 1.5, -15, -14, 3.6, 11, STEEN);
  blok(-9, 6, -24, -14, 10.4, 11, mat(0x2f2a52));
  blok(-9, 9, -24, -23, 11, 17, STEEN);
  blok(-9, -8, -23, -14, 11, 17, STEEN);
  blok(8, 9, -23, -14, 11, 17, STEEN);
  blok(-8, 8, -15, -14, 11, 17, STEEN);
  blok(-6, 9, -24, -14, 16.4, 17, mat(0x2f2a52));
  blok(-9, -6, -24, -21, 16.4, 17, mat(0x2f2a52));
  for (let i = 0; i < 12; i++) blok(-8, -6, -15.2 - (i + 1) * 0.4, -15.2 - i * 0.4, 11, 11 + (i + 1) * 0.5, STEEN);
  blok(5.85, 6, -20.8, -15, 11, 12, mat(0x6b4a2b));
  for (let i = 0; i < 8; i++) blok(-3 - (i + 1) * 0.7, -3 - i * 0.7, -23.6, -22, 17, 17 + (i + 1) * 0.5, STEEN);
  for (let i = 0; i < 22; i++) blok(6, 8, -15.2 - (i + 1) * 0.35, -15.2 - i * 0.35, 0, (i + 1) * 0.5, STEEN);
  meldDozen({ x0: -3, x1: 9, z0: -24, z1: -23.6, bodem: 17, top: 18.2 }, { x0: -9, x1: 9, z0: -14.4, z1: -14, bodem: 17, top: 18.2 }, { x0: -9, x1: -8.6, z0: -21, z1: -14, bodem: 17, top: 18.2 }, { x0: 8.6, x1: 9, z0: -24, z1: -14, bodem: 17, top: 18.2 });
  for (let a = -8; a <= 8; a += 2) { merlonPlekken.push([a, 17.6, -14.2, 0]); if (a > -3) merlonPlekken.push([a, 17.6, -23.8, 0]); }
  for (let a = -22; a <= -16; a += 2) { merlonPlekken.push([8.8, 17.6, a, 1]); if (a > -21) merlonPlekken.push([-8.8, 17.6, a, 1]); }
  blok(-51, 51, -51, -49, 0, 5, STEEN);
  blok(-51, -49, -49, 49, 0, 5, STEEN);
  blok(49, 51, -49, 49, 0, 5, STEEN);
  blok(-51, -3.5, 49, 51, 0, 5, STEEN);
  blok(3.5, 51, 49, 51, 0, 5, STEEN);
  blok(-3.5, 3.5, 49, 51, 3.9, 5, STEEN);
  for (const s2 of [-1, 1]) {
    blok(s2 > 0 ? 3.5 : -7, s2 > 0 ? 7 : -3.5, 48.5, 52.6, 0, 9, STEEN);
    const d2 = stuk(new THREE.ConeGeometry(3.2, 3, 4), leisteen(), s2 * 5.25, 10.5, 50.55, false);
    d2.rotation.y = Math.PI / 4;
    kasteel.add(d2);
  }
  for (let a = -47; a <= 47; a += 2) {
    merlonPlekken.push([a, 5.6, -50.8, 0], [-50.8, 5.6, a, 1], [50.8, 5.6, a, 1]);
    if (Math.abs(a) > 8) merlonPlekken.push([a, 5.6, 50.8, 0]);
  }
  meldDozen({ x0: -47, x1: 47, z0: -51, z1: -50.6, bodem: 5, top: 6.2 }, { x0: -47, x1: -8, z0: 50.6, z1: 51, bodem: 5, top: 6.2 }, { x0: 8, x1: 47, z0: 50.6, z1: 51, bodem: 5, top: 6.2 }, { x0: -51, x1: -50.6, z0: -47, z1: 47, bodem: 5, top: 6.2 }, { x0: 50.6, x1: 51, z0: -47, z1: 47, bodem: 5, top: 6.2 });
  for (const [x, z, r, h] of [[-50, -50, 4.6, 8], [50, -50, 4.6, 8], [-50, 50, 4.6, 8], [50, 50, 4.6, 8], [0, -50, 3.6, 7], [-50, 0, 3.6, 7], [50, 0, 3.6, 7]]) {
    ton(x, z, r, 0, h, STEEN);
    ton(x, z, r + 0.12, h - 0.2, h + 0.05, wit(), false);
    kasteel.add(stuk(new THREE.ConeGeometry(r + 0.7, 4.2, 14), leisteen(), x, h + 2.15, z, false));
  }
  for (let i = 0; i < 17; i++) blok(46.5, 49, 20 - (i + 1) * 0.6, 20 - i * 0.6, 0, Math.min(5, (i + 1) * 0.3), STEEN);
  for (let i = 0; i < 17; i++) blok(-49, -46.5, -20 + i * 0.6, -20 + (i + 1) * 0.6, 0, Math.min(5, (i + 1) * 0.3), STEEN);
  const merlons = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1.2, 0.4), steenMat, merlonPlekken.length);
  const kappen = new THREE.InstancedMesh(new THREE.BoxGeometry(1.14, 0.16, 0.54), wit(), merlonPlekken.length);
  const hulp = new THREE.Object3D();
  merlonPlekken.forEach(([x, y, z, draai], i) => {
    hulp.position.set(x, y, z);
    hulp.rotation.set(0, draai ? Math.PI / 2 : 0, 0);
    hulp.updateMatrix();
    merlons.setMatrixAt(i, hulp.matrix);
    hulp.position.y = y + 0.68;
    hulp.updateMatrix();
    kappen.setMatrixAt(i, hulp.matrix);
  });
  kasteel.add(merlons, kappen);
  const vuren = [];
  const bannerTex = doek(128, 300, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = "#a01d2f";
    g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(W / 2, H - 46); g.lineTo(0, H); g.closePath(); g.fill();
    g.strokeStyle = "#e5b04c"; g.lineWidth = 8;
    g.beginPath(); g.moveTo(8, 4); g.lineTo(W - 8, 4); g.lineTo(W - 8, H - 22); g.lineTo(W / 2, H - 62); g.lineTo(8, H - 22); g.closePath(); g.stroke();
    g.fillStyle = "#e5b04c";
    g.beginPath(); g.moveTo(30, 122); g.lineTo(34, 72); g.lineTo(50, 98); g.lineTo(64, 60); g.lineTo(78, 98); g.lineTo(94, 72); g.lineTo(98, 122); g.closePath(); g.fill();
    g.fillRect(30, 128, 68, 12);
    g.beginPath(); g.moveTo(64, 160); g.lineTo(88, 190); g.lineTo(64, 220); g.lineTo(40, 190); g.closePath(); g.fill();
  });
  const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
  const zetVlak = (geo, materiaal, x, y, z, ry = 0, rx = 0) => { const m = stuk(geo, materiaal, x, y, z, false); m.rotation.set(rx, ry, 0); kasteel.add(m); return m; };
  const banier = (x, y, z, ry = 0, b = 1.5, h = 3.6) => zetVlak(new THREE.PlaneGeometry(b, h), bannerMat, x, y, z, ry);
  const ruitTex = doek(64, 64, g => {
    g.fillStyle = "#ffc65a"; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = "#5a3a12"; g.lineWidth = 3;
    for (let k = -64; k <= 64; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 64); g.moveTo(k + 64, 0); g.lineTo(k, 64); g.stroke(); }
  });
  ruitTex.wrapS = ruitTex.wrapT = THREE.RepeatWrapping;
  ruitTex.repeat.set(2.4, 2.4);
  const ruitMat = new THREE.MeshStandardMaterial({ map: ruitTex, emissiveMap: ruitTex, emissive: 0xffffff, emissiveIntensity: 1.25, roughness: 0.6, side: THREE.DoubleSide });
  const glasTex = doek(128, 128, g => {
    const kleuren = ["#c2264b", "#2f7fd0", "#e5b04c", "#3fa35a", "#8a4fd0", "#e08a3c"];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = kleuren[Math.floor(kans() * 6)]; g.beginPath(); g.moveTo(i * 16 + 8, j * 16); g.lineTo(i * 16 + 16, j * 16 + 8); g.lineTo(i * 16 + 8, j * 16 + 16); g.lineTo(i * 16, j * 16 + 8); g.fill(); }
    g.strokeStyle = "#1a1420"; g.lineWidth = 2;
    for (let k = -128; k <= 128; k += 16) { g.beginPath(); g.moveTo(k + 8, 0); g.lineTo(k + 136, 128); g.moveTo(k + 120, 0); g.lineTo(k - 8, 128); g.stroke(); }
  });
  glasTex.wrapS = glasTex.wrapT = THREE.RepeatWrapping;
  glasTex.repeat.set(0.9, 0.9);
  const glasMat = new THREE.MeshStandardMaterial({ map: glasTex, emissiveMap: glasTex, emissive: 0xffffff, emissiveIntensity: 1.5, side: THREE.DoubleSide });
  function boog(w, h) {
    const v = new THREE.Shape();
    v.moveTo(-w / 2, 0); v.lineTo(w / 2, 0); v.lineTo(w / 2, h - w / 2);
    v.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
    v.lineTo(-w / 2, 0);
    return new THREE.ShapeGeometry(v, 10);
  }
  function raam(x, y, z, ry, w = 0.9, h = 1.9, materiaal = ruitMat) {
    const n = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
    zetVlak(boog(w + 0.3, h + 0.3), wit(), x - n.x * 0.01, y - 0.15, z - n.z * 0.01, ry).material.side = THREE.DoubleSide;
    zetVlak(boog(w, h), materiaal, x + n.x * 0.02, y, z + n.z * 0.02, ry);
  }
  function vuurkorf(x, y, z, metLicht) {
    kasteel.add(stuk(new THREE.CylinderGeometry(0.06, 0.1, 1.1, 6), metaal(0x33333a), x, y + 0.55, z, false));
    kasteel.add(stuk(new THREE.CylinderGeometry(0.38, 0.22, 0.3, 10), metaal(0x33333a), x, y + 1.2, z, false));
    const vlam = new THREE.Group();
    for (const [dx, dz, s] of [[0, 0, 1], [0.13, 0.05, 0.7], [-0.1, -0.08, 0.6]]) vlam.add(stuk(new THREE.ConeGeometry(0.2 * s, 0.7 * s, 7), gloei(0xff8a2a, 3.2), dx, 0.35 * s, dz, false));
    vlam.position.set(x, y + 1.3, z);
    kasteel.add(vlam);
    let licht = null;
    if (metLicht && y === 0 && z < 0) { licht = new THREE.PointLight(0xff9a45, 12, 13, 1.6); licht.position.set(x, y + 2, z); kasteel.add(licht); }
    vuren.push({ vlam, licht, sterkte: 12, fase: kans() * 10 });
  }
  const vakwerkCache = new Map();
  function vakwerk(w, h, metRamen = true) {
    const k = Math.round(w * 2) + "_" + Math.round(h * 2) + "_" + metRamen;
    if (!vakwerkCache.has(k)) vakwerkCache.set(k, maakVakwerk(w, h, metRamen));
    return vakwerkCache.get(k);
  }
  function maakVakwerk(w, h, metRamen) {
    const S = 32, W = Math.max(64, Math.round(w * S)), H = Math.max(64, Math.round(h * S));
    const lc = document.createElement("canvas");
    lc.width = W; lc.height = H;
    const L = lc.getContext("2d");
    L.fillStyle = "#000"; L.fillRect(0, 0, W, H);
    const map = doek(W, H, g => {
      g.fillStyle = "#e6dcc2"; g.fillRect(0, 0, W, H);
      for (let k = 0; k < 220; k++) { g.fillStyle = `rgba(120,100,70,${kans() * 0.07})`; g.fillRect(kans() * W, kans() * H, 14, 9); }
      const d = 0.2 * S, vakken = Math.max(2, Math.round(w / 1.6)), vb = W / vakken;
      g.strokeStyle = "#3a2a1e"; g.lineWidth = d;
      g.strokeRect(d / 2, d / 2, W - d, H - d);
      g.beginPath(); g.moveTo(0, H * 0.62); g.lineTo(W, H * 0.62); g.stroke();
      for (let i = 1; i < vakken; i++) { g.beginPath(); g.moveTo(i * vb, 0); g.lineTo(i * vb, H); g.stroke(); }
      for (let i = 0; i < vakken; i++) {
        if (metRamen && i % 2 === 1) {
          const rw = vb * 0.56, rh = H * 0.4, rx = i * vb + (vb - rw) / 2, ry = H * 0.14;
          g.fillStyle = "#3a2a1e"; g.fillRect(rx - 5, ry - 5, rw + 10, rh + 10);
          g.fillStyle = "#ffc65a"; g.fillRect(rx, ry, rw, rh);
          L.fillStyle = "#ffb84a"; L.fillRect(rx, ry, rw, rh);
          g.strokeStyle = "#5a3a12"; g.lineWidth = 2;
          for (let k = -rh; k < rw; k += 9) { g.beginPath(); g.moveTo(rx + Math.max(0, k), ry + Math.max(0, -k)); g.lineTo(rx + Math.min(rw, k + rh), ry + Math.min(rh, rh - (k + rh - Math.min(rw, k + rh)))); g.stroke(); }
          g.strokeStyle = "#3a2a1e"; g.lineWidth = d;
        } else {
          g.beginPath();
          if (i % 4 === 0) { g.moveTo(i * vb, H); g.lineTo((i + 1) * vb, H * 0.62); } else { g.moveTo((i + 1) * vb, H); g.lineTo(i * vb, H * 0.62); }
          g.stroke();
          g.beginPath(); g.moveTo(i * vb, H * 0.62); g.lineTo((i + 1) * vb, 0); g.stroke();
        }
      }
    });
    const em = new THREE.CanvasTexture(lc);
    em.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 0.9 });
  }
  function trapgevel(langsX, vast, midden, breedte, basis, hoogte, dikte = 0.5) {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const half = (breedte / 2) * (1 - i / n), y0 = basis + (i * hoogte) / n, y1 = basis + ((i + 1) * hoogte) / n;
      if (langsX) { blok(vast - dikte / 2, vast + dikte / 2, midden - half, midden + half, y0, y1, STEEN, false); blok(vast - dikte / 2 - 0.06, vast + dikte / 2 + 0.06, midden - half - 0.06, midden + half + 0.06, y1, y1 + 0.14, wit(), false); }
      else { blok(midden - half, midden + half, vast - dikte / 2, vast + dikte / 2, y0, y1, STEEN, false); blok(midden - half - 0.06, midden + half + 0.06, vast - dikte / 2 - 0.06, vast + dikte / 2 + 0.06, y1, y1 + 0.14, wit(), false); }
    }
  }
  function vakwerkhuis(x0, x1, z0, z1, hSteen, hVak, asX) {
    const b = x1 - x0, d = z1 - z0, dak = (asX ? d : b) * 0.62, top = hSteen + hVak;
    blok(x0, x1, z0, z1, 0, hSteen, STEEN, false);
    meldDozen({ x0, x1, z0, z1, bodem: 0, top: top + dak });
    blok(x0 - 0.12, x1 + 0.12, z0 - 0.12, z1 + 0.12, hSteen - 0.12, hSteen + 0.1, wit(), false);
    const o = 0.3, donker = mat(0x3a2a1e);
    const boven = stuk(new THREE.BoxGeometry(b + o * 2, hVak, d + o * 2), [vakwerk(d + o * 2, hVak), vakwerk(d + o * 2, hVak), donker, donker, vakwerk(b + o * 2, hVak), vakwerk(b + o * 2, hVak)], (x0 + x1) / 2, hSteen + hVak / 2, (z0 + z1) / 2, false);
    kasteel.add(boven);
    const half = (asX ? d : b) / 2 + o + 0.25, lengte = (asX ? b : d) + o * 2;
    const prisma = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(0, dak)]), { depth: lengte, bevelEnabled: false });
    const dakMesh = stuk(prisma, leisteen(), 0, top, 0, false);
    if (asX) { dakMesh.rotation.y = Math.PI / 2; dakMesh.position.set(x0 - o, top, (z0 + z1) / 2); }
    else dakMesh.position.set((x0 + x1) / 2, top, z0 - o);
    kasteel.add(dakMesh);
    if (asX) { trapgevel(true, x0 - o - 0.1, (z0 + z1) / 2, d + 1.4, top, dak + 0.9); trapgevel(true, x1 + o + 0.1, (z0 + z1) / 2, d + 1.4, top, dak + 0.9); }
    else { trapgevel(false, z0 - o - 0.1, (x0 + x1) / 2, b + 1.4, top, dak + 0.9); trapgevel(false, z1 + o + 0.1, (x0 + x1) / 2, b + 1.4, top, dak + 0.9); }
  }

  for (const [y0, y1] of [[5.9, 6.12]]) { blok(-26.1, 26.1, -26.1, -23.9, y0, y1, wit(), false); blok(-26.1, -23.9, -24, 24, y0, y1, wit(), false); blok(23.9, 26.1, -24, 24, y0, y1, wit(), false); blok(-26.1, -3, 23.9, 26.1, y0, y1, wit(), false); blok(3, 26.1, 23.9, 26.1, y0, y1, wit(), false); }
  blok(-9.1, 9.1, -24.1, -13.9, 10.9, 11.12, wit(), false);
  blok(-9.1, 9.1, -14.05, -13.9, 4.4, 4.62, wit(), false);
  zetVlak(boog(3.6, 4.4), wit(), 0, 0, -13.97, 0).material.side = THREE.DoubleSide;
  zetVlak(boog(3, 3.9), mat(0x14101e), 0, 0, -13.95, 0);
  banier(0, 7.6, -13.9, 0, 2.2, 5);
  for (const x of [-6.3, -3.6, 3.6, 6.3]) raam(x, 6.2, -13.98, 0, 0.95, 2.2);
  for (const x of [-5, 5]) raam(x, 1.6, -13.98, 0, 0.8, 1.6);
  vuurkorf(-2.6, 0, -13, true);
  vuurkorf(2.6, 0, -13, true);

  blok(-17, -9.1, -23.9, -16, 0, 19, STEEN);
  blok(-17.5, -8.6, -24.4, -15.5, 19, 21, STEEN, false);
  meldDozen({ x0: -17.5, x1: -8.6, z0: -24.4, z1: -15.5, bodem: 19, top: 21 });
  for (const y of [7, 13, 18.9, 20.9]) blok(-17.6, -8.5, -24.5, -15.4, y, y + 0.2, wit(), false);
  for (let k = 0; k < 5; k++) for (const [vast, langs] of [[-15.6, true], [-24.3, true], [-17.4, false], [-8.7, false]]) {
    const u = k * 2;
    if (langs) { blok(-17.3 + u, -16.3 + u, vast - 0.25, vast + 0.25, 21.1, 22.3, STEEN, false); blok(-17.36 + u, -16.24 + u, vast - 0.31, vast + 0.31, 22.3, 22.46, wit(), false); }
    else { blok(vast - 0.25, vast + 0.25, -24.2 + u, -23.2 + u, 21.1, 22.3, STEEN, false); blok(vast - 0.31, vast + 0.31, -24.26 + u, -23.14 + u, 22.3, 22.46, wit(), false); }
  }
  for (const [x, z] of [[-17.5, -24.4], [-8.6, -24.4], [-17.5, -15.5], [-8.6, -15.5]]) {
    ton(x, z, 1, 17.5, 23.2, STEEN, false);
    kasteel.add(stuk(new THREE.ConeGeometry(1.25, 2.2, 10), rood(), x, 24.3, z, false));
  }
  for (const y of [5, 10, 15]) { for (const x of [-15, -11.2]) raam(x, y, -15.97, 0, 1, 2.3); for (const z of [-22, -18]) raam(-9.07, y + 0.3, z, Math.PI / 2, 1, 2.3); }
  banier(-13.05, 11.5, -15.9, 0, 1.6, 4.4);

  vakwerkhuis(9.2, 20, -23.8, -15.2, 4.2, 4, true);
  vakwerkhuis(16.5, 23.6, 16, 23.2, 3.4, 3.4, false);
  vakwerkhuis(-23.6, -18.4, -22.4, -13.5, 3.4, 3.4, false);
  for (const [x, z, ry] of [[14.6, -15.17, 0], [20.05, 16.02, 0], [-21, -13.47, 0]]) { zetVlak(boog(1.5, 2.5), wit(), x, 0, z + 0.01, ry).material.side = THREE.DoubleSide; zetVlak(boog(1.2, 2.3), hout(), x, 0, z + 0.03, ry); }
  const erker = stuk(new THREE.BoxGeometry(12, 3.4, 2.5), [vakwerk(2.5, 3.4, false), vakwerk(2.5, 3.4, false), mat(0x3a2a1e), mat(0x3a2a1e), vakwerk(12, 3.4), vakwerk(12, 3.4)], 0, 10.2, 27.25, false);
  kasteel.add(erker);
  blok(-6, 6, 26, 28.5, 8.3, 8.5, wit(), false);
  trapgevel(false, 28.4, 0, 12.6, 11.9, 3.4);
  trapgevel(false, 26.1, 0, 12.6, 11.9, 3.4);
  const poortDak = stuk(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-1.5, 0), new THREE.Vector2(1.5, 0), new THREE.Vector2(0, 3)]), { depth: 12, bevelEnabled: false }), leisteen(), -6, 11.9, 27.25, false);
  poortDak.rotation.y = Math.PI / 2;
  kasteel.add(poortDak);
  banier(0, 6.3, 28.56, 0, 2, 4.6);
  for (const x of [-12, 12, -19, 19]) banier(x, 3.6, 26.06, 0);
  for (const z of [-12, 4]) { banier(-23.94, 3.7, z + 9, Math.PI / 2); banier(23.94, 3.7, z - 9 + 8, Math.PI / 2); }
  vuurkorf(-4.4, 0, 22.6, true);
  vuurkorf(4.4, 0, 22.6, true);
  vuurkorf(-3.6, 0.1, 33.4, false);
  vuurkorf(3.6, 0.1, 33.4, false);
  for (const [x, z] of [[-22, -25], [22, -25], [-25, 15], [25, 15], [-22, 25], [22, 25]]) vuurkorf(x, 6, z, false);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { ton(sx * 25, sz * 25, 4.12, 5.9, 6.14, wit(), false); ton(sx * 25, sz * 25, 4.3, 8.9, 9.12, wit(), false); }

  const goud = () => metaal(0xe5b04c);
  const vloerTex = doek(512, 256, g => {
    for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#d9d3c6" : "#3b3552"; g.fillRect(i * 32, j * 32, 32, 32); g.fillStyle = `rgba(255,255,255,${kans() * 0.08})`; g.fillRect(i * 32, j * 32, 32, 16); }
  });
  zetVlak(new THREE.PlaneGeometry(16, 8), new THREE.MeshStandardMaterial({ map: vloerTex, roughness: 0.3, metalness: 0.15 }), 0, 0.011, -19, 0, -Math.PI / 2);
  const loperTex = doek(128, 512, (g, W, H) => {
    g.fillStyle = "#8e1f3a"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#e5b04c"; g.lineWidth = 6; g.strokeRect(8, 8, W - 16, H - 16);
    g.lineWidth = 2; g.strokeRect(18, 18, W - 36, H - 36);
    g.fillStyle = "#e5b04c";
    for (let y = 60; y < H - 40; y += 56) { g.beginPath(); g.moveTo(W / 2, y - 16); g.lineTo(W / 2 + 14, y); g.lineTo(W / 2, y + 16); g.lineTo(W / 2 - 14, y); g.fill(); }
  });
  zetVlak(new THREE.PlaneGeometry(2.4, 6.6), new THREE.MeshStandardMaterial({ map: loperTex, roughness: 1 }), 0, 0.018, -17.9, 0, -Math.PI / 2);
  blok(-2.6, 2.6, -23, -21.2, 0, 0.3, mat(0x55506e));
  blok(-2.6, 2.6, -21.25, -21.2, 0.3, 0.36, goud(), false);
  blok(-0.7, 0.7, -22.7, -21.8, 0.3, 1.0, rood());
  blok(-0.86, 0.86, -22.96, -22.7, 0.3, 4.1, goud());
  for (const x of [-0.78, 0.78]) { blok(x - 0.1, x + 0.1, -22.7, -21.8, 1.0, 1.45, goud(), false); kasteel.add(stuk(new THREE.ConeGeometry(0.12, 0.5, 6), goud(), x, 4.35, -22.83, false)); }
  kasteel.add(stuk(new THREE.SphereGeometry(0.16, 12, 8), gloei(0xc2264b, 1.8), 0, 4.3, -22.83, false));
  blok(-1.9, 1.9, -23, -21.3, 4.9, 5.05, rood(), false);
  blok(-1.95, 1.95, -21.35, -21.28, 4.6, 5.05, goud(), false);
  for (const x of [-1.8, 1.8]) ton(x, -21.4, 0.07, 0.3, 4.9, goud(), false);
  const wandkleed = (kleur, teken) => new THREE.MeshStandardMaterial({ map: doek(128, 224, (g, W, H) => { g.fillStyle = kleur; g.fillRect(0, 0, W, H); g.strokeStyle = "#e5b04c"; g.lineWidth = 6; g.strokeRect(6, 6, W - 12, H - 12); g.fillStyle = "#e5b04c"; teken(g, W, H); for (let x = 10; x < W; x += 12) g.fillRect(x, H - 6, 5, 6); }), roughness: 1, side: THREE.DoubleSide });
  const kleedKroon = wandkleed("#1f3f7a", (g, W) => { g.beginPath(); g.moveTo(30, 120); g.lineTo(34, 70); g.lineTo(50, 96); g.lineTo(64, 58); g.lineTo(78, 96); g.lineTo(94, 70); g.lineTo(98, 120); g.fill(); g.fillRect(30, 126, 68, 12); g.beginPath(); g.arc(W / 2, 172, 14, 0, 7); g.fill(); });
  const kleedZon = wandkleed("#5a1a4c", (g, W) => { g.beginPath(); g.arc(W / 2, 104, 26, 0, 7); g.fill(); g.lineWidth = 5; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * 34, 104 + Math.sin(a) * 34); g.lineTo(W / 2 + Math.cos(a) * 50, 104 + Math.sin(a) * 50); g.stroke(); } });
  const kleedBoom = wandkleed("#1f5a3a", (g, W) => { g.fillRect(W / 2 - 5, 110, 10, 70); for (const [x, y, r] of [[64, 86, 30], [42, 104, 20], [86, 104, 20]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
  zetVlak(new THREE.PlaneGeometry(3.2, 4.6), kleedKroon, 0, 7.6, -22.97, 0);
  for (const x of [-5, 4.4]) raam(x, 4.6, -22.96, 0, 1.5, 4, glasMat);
  zetVlak(new THREE.PlaneGeometry(2, 3.5), kleedZon, -7.97, 5.6, -22, Math.PI / 2);
  zetVlak(new THREE.PlaneGeometry(2, 3.5), kleedBoom, -7.97, 5.6, -16.3, Math.PI / 2);
  zetVlak(new THREE.PlaneGeometry(2, 3.5), kleedZon, 4.2, 5.2, -15.03, Math.PI);
  zetVlak(new THREE.PlaneGeometry(2, 3.5), kleedBoom, -4.2, 6.4, -15.03, Math.PI);
  for (const x of [-2.7, 2.7]) for (const z of [-16.6, -20.2]) {
    ton(x, z, 0.3, 0, 10.4, mat(0xd9d3c6, { flatShading: false }));
    ton(x, z, 0.46, 0, 0.4, goud(), false);
    ton(x, z, 0.46, 9.9, 10.4, goud(), false);
    const fakkel = stuk(new THREE.ConeGeometry(0.1, 0.36, 7), gloei(0xffa040, 3), x - Math.sign(x) * 0.42, 3.3, z, false);
    kasteel.add(fakkel);
    vuren.push({ vlam: fakkel, licht: null, sterkte: 0, fase: kans() * 10 });
  }
  function luchter(x, z) {
    const g = new THREE.Group();
    const ring = stuk(new THREE.TorusGeometry(1.15, 0.06, 8, 32), goud(), 0, 0, 0, false);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const ring2 = stuk(new THREE.TorusGeometry(0.6, 0.05, 8, 24), goud(), 0, 0.5, 0, false);
    ring2.rotation.x = Math.PI / 2;
    g.add(ring2);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.add(stuk(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 6), mat(0xf6e7c4, { flatShading: false }), Math.sin(a) * 1.15, 0.17, Math.cos(a) * 1.15, false));
      const v = stuk(new THREE.ConeGeometry(0.045, 0.14, 6), gloei(0xffc266, 3.5), Math.sin(a) * 1.15, 0.38, Math.cos(a) * 1.15, false);
      g.add(v);
    }
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; const ketting = stuk(new THREE.CylinderGeometry(0.015, 0.015, 3.3, 4), metaal(0x8a6a2e), Math.sin(a) * 0.55, 1.65, Math.cos(a) * 0.55, false); ketting.rotation.z = Math.sin(a) * 0.33; ketting.rotation.x = -Math.cos(a) * 0.33; g.add(ketting); }
    g.position.set(x, 7.1, z);
    kasteel.add(g);
    const licht = new THREE.PointLight(0xffc27a, 16, 14, 1.5);
    licht.position.set(x, 6.6, z);
    kasteel.add(licht);
    vuren.push({ vlam: null, licht, sterkte: 16, fase: kans() * 10, luchter: g });
  }
  luchter(0, -17.2);
  luchter(0, -20.4);
  for (const z of [-16, -18, -20, -22]) blok(-8, 6, z - 0.15, z + 0.15, 10.05, 10.4, mat(0x3a2a1e), false);
  blok(-5.8, -3.9, -21.6, -16.4, 0.85, 1.0, hout());
  for (const x of [-5.6, -4.1]) for (const z of [-21.3, -16.7]) blok(x - 0.09, x + 0.09, z - 0.09, z + 0.09, 0, 0.85, hout(), false);
  blok(-6.35, -5.98, -21.4, -16.6, 0, 0.5, hout());
  blok(-3.72, -3.35, -21.4, -16.6, 0, 0.5, hout());
  zetVlak(new THREE.PlaneGeometry(0.7, 5), new THREE.MeshStandardMaterial({ color: 0x8e1f3a, roughness: 1 }), -4.85, 1.006, -19, 0, -Math.PI / 2);
  for (let k = 0; k < 5; k++) for (const x of [-5.45, -4.25]) {
    const z = -21 + k * 1;
    kasteel.add(stuk(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 14), goud(), x, 1.02, z, false));
    kasteel.add(stuk(new THREE.CylinderGeometry(0.06, 0.04, 0.2, 8), goud(), x + (x < -5 ? 0.24 : -0.24), 1.1, z + 0.22, false));
  }
  const gebraad = stuk(new THREE.SphereGeometry(0.3, 12, 8), mat(0x8a4a22, { flatShading: false }), -4.85, 1.2, -19, false);
  gebraad.scale.set(1.4, 0.7, 1);
  kasteel.add(gebraad);
  for (const [z, c] of [[-17.3, 0xc2264b], [-17.5, 0x6cc164], [-17.2, 0xe08a3c], [-20.6, 0x8a4fd0], [-20.8, 0xc2264b]]) kasteel.add(stuk(new THREE.SphereGeometry(0.1, 8, 6), mat(c, { flatShading: false }), -4.85 + (kans() - 0.5) * 0.3, 1.1, z, false));
  for (const z of [-18, -20]) {
    kasteel.add(stuk(new THREE.CylinderGeometry(0.03, 0.09, 0.5, 6), goud(), -4.85, 1.25, z, false));
    const v = stuk(new THREE.ConeGeometry(0.045, 0.15, 6), gloei(0xffc266, 3.5), -4.85, 1.6, z, false);
    kasteel.add(v);
    vuren.push({ vlam: v, licht: null, sterkte: 0, fase: kans() * 10 });
  }
  blok(-8, -7.25, -20.5, -19.9, 0, 2.6, STEEN);
  blok(-8, -7.25, -18.1, -17.5, 0, 2.6, STEEN);
  blok(-8, -7.1, -20.6, -17.4, 2.6, 3.05, wit());
  blok(-8, -7.5, -20.5, -17.5, 3.05, 6.4, STEEN, false);
  zetVlak(new THREE.PlaneGeometry(1.8, 2.6), mat(0x0c0a12), -7.96, 1.3, -19, Math.PI / 2);
  for (const [z, r] of [[-19.25, 0.5], [-18.75, -0.5]]) { const blokje = stuk(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6), mat(0x3a2414), -7.6, 0.14, z, false); blokje.rotation.z = Math.PI / 2; blokje.rotation.y = r; kasteel.add(blokje); }
  const haardVuur = new THREE.Group();
  for (const [dz, s] of [[0, 1], [0.25, 0.7], [-0.25, 0.75], [0.1, 0.5]]) haardVuur.add(stuk(new THREE.ConeGeometry(0.22 * s, 0.9 * s, 7), gloei(0xff7a22, 3.4), 0, 0.45 * s, dz, false));
  haardVuur.position.set(-7.6, 0.2, -19);
  kasteel.add(haardVuur);
  const haardLicht = new THREE.PointLight(0xff8a3a, 14, 11, 1.6);
  haardLicht.position.set(-6.9, 1.2, -19);
  kasteel.add(haardLicht);
  vuren.push({ vlam: haardVuur, licht: haardLicht, sterkte: 14, fase: 3 });
  const schild = stuk(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 6), rood(), -7.42, 4.7, -19, false);
  schild.rotation.z = Math.PI / 2;
  kasteel.add(schild);
  kasteel.add(stuk(new THREE.SphereGeometry(0.14, 10, 8), goud(), -7.36, 4.7, -19, false));
  for (const r of [-0.75, 0.75]) { const zwaard = stuk(new THREE.BoxGeometry(0.03, 2, 0.1), metaal(0xcfd6de), -7.44, 4.7, -19, false); zwaard.rotation.x = r; kasteel.add(zwaard); }
  blok(-7.8, -5.3, -15.48, -15, 0, 3.6, hout());
  for (let rij = 0; rij < 4; rij++) for (let k = 0; k < 11; k++) kasteel.add(stuk(new THREE.BoxGeometry(0.16, 0.5 + kans() * 0.2, 0.06), mat([0xc2264b, 0x2f7fd0, 0x3fa35a, 0xe5b04c, 0x8a4fd0, 0x6b4a2b][Math.floor(kans() * 6)]), -7.6 + k * 0.2, 0.55 + rij * 0.82, -15.5, false));
  for (const z of [-17.3, -20.5]) {
    ton(4.9, z, 0.5, 0, 0.25, mat(0x55506e));
    meldCirkels({ x: 4.9, z, r: 0.42, bodem: 0, top: 2.3 });
    kasteel.add(stuk(new THREE.CylinderGeometry(0.26, 0.32, 0.8, 10), metaal(0xb6c4d3), 4.9, 1.15, z, false));
    kasteel.add(stuk(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8), metaal(0x9fb0c2), 4.9, 0.5, z, false));
    kasteel.add(stuk(new THREE.SphereGeometry(0.2, 12, 8), metaal(0xb6c4d3), 4.9, 1.75, z, false));
    kasteel.add(stuk(new THREE.ConeGeometry(0.07, 0.4, 6), rood(), 4.9, 2.1, z, false));
    kasteel.add(stuk(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 6), hout(), 4.5, 1.5, z, false));
    kasteel.add(stuk(new THREE.ConeGeometry(0.1, 0.4, 4), metaal(0xdfe6ee), 4.5, 3, z, false));
  }
  blok(2.9, 4.3, -22.7, -21.8, 0, 0.8, hout());
  blok(2.88, 4.32, -22.72, -21.78, 0.3, 0.4, goud(), false);
  const deksel = stuk(new THREE.BoxGeometry(1.4, 0.12, 0.9), hout(), 3.6, 1.15, -22.75, false);
  deksel.rotation.x = -1.1;
  kasteel.add(deksel);
  kasteel.add(stuk(new THREE.ConeGeometry(0.6, 0.5, 12), gloei(0xe5b04c, 1.3), 3.6, 0.95, -22.25, false));
  kasteel.add(stuk(new THREE.ConeGeometry(0.9, 0.6, 14), gloei(0xe5b04c, 1.1), 5.1, 0.3, -22.2, false));
  for (const [x, y, z, c] of [[3.3, 1.15, -22.2, 0xc2264b], [3.9, 1.1, -22.3, 0x2f7fd0], [5.0, 0.62, -22.2, 0x3fa35a], [5.5, 0.2, -21.8, 0x8a4fd0], [4.7, 0.2, -21.7, 0xc2264b]]) kasteel.add(stuk(new THREE.OctahedronGeometry(0.12), gloei(c, 2.2), x, y, z, false));
  blok(-9.1, 9.1, -24.1, -13.9, 16.9, 17.12, wit(), false);
  for (const x of [-6, -2, 2, 6]) { raam(x, 12.4, -13.98, 0, 0.95, 2.4); raam(x, 12.4, -15.02, Math.PI, 0.95, 2.4); }
  for (const z of [-21, -17]) raam(9.02, 12.4, z, Math.PI / 2, 0.95, 2.4);
  zetVlak(new THREE.PlaneGeometry(9, 6), new THREE.MeshStandardMaterial({ map: loperTex, roughness: 1 }), 0.5, 11.012, -19, Math.PI / 2, -Math.PI / 2);
  blok(-5, -2.2, -22.8, -20.2, 11, 11.55, hout());
  blok(-4.9, -2.3, -22.7, -20.3, 11.55, 11.85, rood(), false);
  blok(-4.8, -2.4, -22.7, -22.1, 11.85, 12.05, wit(), false);
  for (const [x, z] of [[-4.95, -22.75], [-2.25, -22.75], [-4.95, -20.25], [-2.25, -20.25]]) blok(x - 0.08, x + 0.08, z - 0.08, z + 0.08, 11.55, 14.2, hout(), false);
  blok(-5.1, -2.1, -22.9, -20.1, 14.2, 14.35, rood(), false);
  blok(-0.5, 4.2, -22.98, -22.5, 11, 14.6, hout());
  for (let rij = 0; rij < 4; rij++) for (let k = 0; k < 21; k++) kasteel.add(stuk(new THREE.BoxGeometry(0.16, 0.5 + kans() * 0.2, 0.06), mat([0xc2264b, 0x2f7fd0, 0x3fa35a, 0xe5b04c, 0x8a4fd0, 0x6b4a2b][Math.floor(kans() * 6)]), -0.3 + k * 0.21, 11.55 + rij * 0.85, -22.46, false));
  blok(-1, 2.2, -19.6, -17.6, 11.85, 12, hout());
  for (const [x, z] of [[-0.8, -19.4], [2, -19.4], [-0.8, -17.8], [2, -17.8]]) blok(x - 0.08, x + 0.08, z - 0.08, z + 0.08, 11, 11.85, hout(), false);
  zetVlak(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshStandardMaterial({ color: 0xe6dcc2, roughness: 1 }), 0.6, 12.012, -18.6, 0, -Math.PI / 2);
  kasteel.add(stuk(new THREE.SphereGeometry(0.32, 16, 12), metaal(0x2f7fd0), 1.7, 12.5, -18.1, false));
  kasteel.add(stuk(new THREE.CylinderGeometry(0.05, 0.18, 0.3, 8), goud(), 1.7, 12.12, -18.1, false));
  for (const x of [-0.6, 0.2]) { kasteel.add(stuk(new THREE.CylinderGeometry(0.03, 0.08, 0.4, 6), goud(), x, 12.2, -19.2, false)); const v = stuk(new THREE.ConeGeometry(0.045, 0.15, 6), gloei(0xffc266, 3.5), x, 12.5, -19.2, false); kasteel.add(v); vuren.push({ vlam: v, licht: null, sterkte: 0, fase: kans() * 10 }); }
  for (const z of [-16.4, -18, -19.6]) { const sch = stuk(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 6), [rood(), mat(0x1f4f8e), mat(0x1f5a3a)][Math.round((z + 19.6) / 1.6)], 7.92, 13.6, z, false); sch.rotation.z = Math.PI / 2; kasteel.add(sch); }
  for (let k = 0; k < 5; k++) { const speer = stuk(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6), hout(), 3 + k * 0.5, 12.3, -15.25, false); speer.rotation.x = 0.12; kasteel.add(speer); kasteel.add(stuk(new THREE.ConeGeometry(0.08, 0.3, 4), metaal(0xdfe6ee), 3 + k * 0.5, 13.72, -15.42, false)); }
  blok(2.7, 5.5, -15.5, -15.1, 11, 11.4, hout());
  zetVlak(new THREE.PlaneGeometry(2, 3.5), kleedKroon, -7.97, 14.2, -22.2, Math.PI / 2);
  zetVlak(new THREE.PlaneGeometry(2, 3.5), kleedBoom, -3.5, 14, -22.97, 0);
  luchter(1, -18.6);
  vuren[vuren.length - 1].luchter.position.y = 15.2;
  vuren[vuren.length - 1].licht.position.y = 14.6;
  vuurkorf(7.6, 17, -14.9, false);
  vuurkorf(-7.6, 17, -14.9, false);
  kasteel.add(stuk(new THREE.CylinderGeometry(0.06, 0.06, 5, 6), goud(), 8.3, 19.5, -23.3, false));
  banier(7.4, 20.4, -23.3, 0, 1.6, 2.6);
  for (const x of [-2.3, 2.3]) { ton(x, -15.5, 0.3, 0, 0.7, mat(0x8a4a22), true, 0.22); for (let k = 0; k < 5; k++) { const blad = stuk(new THREE.ConeGeometry(0.12, 0.9, 5), mat(0x3fa35a), x + Math.sin(k * 1.3) * 0.18, 1.2, -15.5 + Math.cos(k * 1.3) * 0.18, false); blad.rotation.set(Math.cos(k * 1.3) * 0.4, 0, -Math.sin(k * 1.3) * 0.4); kasteel.add(blad); } }

  for (const [x0, x1] of [[-42, -35], [-31, -24], [-20, -13], [13, 20], [24, 31], [35, 42]]) vakwerkhuis(x0, x1, 37, 44, 3, 3, false);
  vakwerkhuis(37, 45, -22, -14, 3, 3, true);
  vakwerkhuis(37, 45, -6, 2, 3, 3, true);
  vakwerkhuis(-45, -37, -24, -16, 3, 3, true);
  vakwerkhuis(-45, -37, 14, 22, 3, 3, true);
  vakwerkhuis(-14, 14, -46, -38, 3, 2.6, true);
  banier(0, 6.2, 52.68, 0, 2, 4.4);
  for (const x of [-20, 20, -36, 36]) banier(x, 3.1, 51.06, 0);
  vuurkorf(-5.2, 0, 54.4, true);
  vuurkorf(5.2, 0, 54.4, true);
  for (const [x, z] of [[-9, 40], [9, 40], [34, 8], [-34, -10], [0, -35]]) vuurkorf(x, 0, z, false);
  const platform = stuk(new THREE.CylinderGeometry(5.2, 5.2, 0.08, 32), mat(0x2a2a33, { flatShading: false }), HELI_PLEK.x, 0.04, HELI_PLEK.z, false);
  platform.userData.blijft = true;
  kasteel.add(platform);
  const hRing = stuk(new THREE.RingGeometry(4.2, 4.6, 40), new THREE.MeshBasicMaterial({ color: 0xffd27a, side: THREE.DoubleSide }), HELI_PLEK.x, 0.09, HELI_PLEK.z, false);
  hRing.rotation.x = -Math.PI / 2;
  hRing.userData.blijft = true;
  kasteel.add(hRing);

  const SNEEUW = 900;
  const sneeuwPos = new Float32Array(SNEEUW * 3), sneeuwSnel = new Float32Array(SNEEUW);
  for (let i = 0; i < SNEEUW; i++) { sneeuwPos.set([(kans() - 0.5) * 80, kans() * 30, (kans() - 0.5) * 80], i * 3); sneeuwSnel[i] = 1.2 + kans() * 1.6; }
  const sneeuwGeo = new THREE.BufferGeometry();
  sneeuwGeo.setAttribute("position", new THREE.BufferAttribute(sneeuwPos, 3));
  const sneeuw = new THREE.Points(sneeuwGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.13, transparent: true, opacity: 0.9, depthWrite: false }));
  sneeuw.frustumCulled = false;
  scene.add(sneeuw);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 10;
    meldCirkels({ x: Math.sin(a) * 9, z: Math.cos(a) * 9, r: 0.55, bodem: 0, top: 7, blijft: true });
  }
  meldDozen({ x0: -0.9, x1: 0.9, z0: -5.5, z1: -4.2, bodem: 0, top: 3, blijft: true });
  meldCirkels({ x: 0, z: 0.5, r: 1.3, bodem: 0, top: 0.14, blijft: true });

  ton(14, 12, 1.2, 0, 1, STEEN);
  ton(14, 12, 1, 0.9, 1.02, new THREE.MeshStandardMaterial({ color: 0x1d5c8a, emissive: 0x0a2a44 }), false);
  for (const dx of [-1.1, 1.1]) blok(14 + dx - 0.08, 14 + dx + 0.08, 11.92, 12.08, 1, 2.6, hout(), false);
  const putDak = stuk(new THREE.ConeGeometry(1.7, 1, 4), rood(), 14, 3.1, 12, false);
  putDak.rotation.y = Math.PI / 4;
  kasteel.add(putDak);
  ton(-15, 13, 1.6, 0, 1.3, mat(0xd9b24a), true, 1.1);
  for (const [x, z] of [[10, 19], [11, 19.6], [-11, -11], [19, 3], [19.8, 3.8], [-19, 18]]) ton(x, z, 0.45, 0, 0.9, hout());
  blok(-18, -13, 17, 19, 0, 1, hout());
  for (const [x, z] of [[-17.8, 17.2], [-13.2, 17.2], [-17.8, 18.8], [-13.2, 18.8]]) blok(x - 0.07, x + 0.07, z - 0.07, z + 0.07, 1, 3, hout(), false);
  const luifel = stuk(new THREE.BoxGeometry(5.6, 0.08, 2.6), mat(0x2c5f9e), -15.5, 3.1, 18, false);
  luifel.rotation.x = 0.18;
  kasteel.add(luifel);
  for (const [x, c] of [[-17, 0xc2264b], [-15.5, 0xe08a3c], [-14, 0x6cc164]]) kasteel.add(stuk(new THREE.SphereGeometry(0.22, 10, 8), mat(c, { flatShading: false }), x, 1.2, 18, false));

  const boomPlekken = [];
  while (boomPlekken.length < 90) {
    const a = kans() * Math.PI * 2, r = 62 + kans() * 80;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (Math.abs(x) < 6 && z > 0) continue;
    boomPlekken.push([x, z, 0.8 + kans() * 0.7]);
    meldCirkels({ x, z, r: 0.5, bodem: 0, top: 6 });
  }
  const stammen = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.42, 2.2, 7), mat(0x4a3320), boomPlekken.length);
  const kruinen = new THREE.InstancedMesh(new THREE.ConeGeometry(2.1, 5.5, 7), mat(0x1f4d33), boomPlekken.length);
  boomPlekken.forEach(([x, z, s], i) => {
    hulp.rotation.set(0, 0, 0);
    hulp.scale.setScalar(s);
    hulp.position.set(x, 1.1 * s, z);
    hulp.updateMatrix();
    stammen.setMatrixAt(i, hulp.matrix);
    hulp.position.set(x, 4.6 * s, z);
    hulp.updateMatrix();
    kruinen.setMatrixAt(i, hulp.matrix);
  });
  hulp.scale.setScalar(1);
  kasteel.add(stammen, kruinen);

  const poppen = [];
  for (const [x, z] of [[16, -4], [18.5, -1], [16, 2]]) {
    const g = new THREE.Group();
    g.add(stuk(new THREE.CylinderGeometry(0.07, 0.07, 1.9, 8), hout(), 0, 0.95, 0, false));
    g.add(stuk(new THREE.CylinderGeometry(0.3, 0.36, 0.8, 10), mat(0xd9b24a), 0, 1.25, 0, false));
    g.add(stuk(new THREE.SphereGeometry(0.22, 10, 8), mat(0xd9b24a), 0, 1.9, 0, false));
    const arm = stuk(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), hout(), 0, 1.45, 0, false);
    arm.rotation.z = Math.PI / 2;
    g.add(arm);
    const schijf = stuk(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 16), mat(0xc2264b), 0, 1.25, 0.37, false);
    schijf.rotation.x = Math.PI / 2;
    g.add(schijf);
    g.position.set(x, 0, z);
    g.rotation.y = -Math.PI / 2;
    kasteel.add(g);
    const pop = { g, draai: 0 };
    g.userData.pop = pop;
    poppen.push(pop);
    meldCirkels({ x, z, r: 0.35, bodem: 0, top: 2.1 });
  }

  const kist = new THREE.Box3();
  for (const k of kasteel.children) {
    if (k.userData.stuk || k.userData.blijft || k.isInstancedMesh || k === gras || k === plein || k === pad || k === water) continue;
    kist.setFromObject(k);
    if (kist.isEmpty()) kist.setFromCenterAndSize(k.position, new THREE.Vector3(0.6, 0.6, 0.6));
    if (kist.max.y < 0.12) continue;
    stukken.push({ mesh: k, x0: kist.min.x, x1: kist.max.x, z0: kist.min.z, z1: kist.max.z, y1: kist.max.y, weg: false });
  }
  const beweegt = new Set();
  for (const v of vuren) { if (v.vlam) beweegt.add(v.vlam); if (v.luchter) beweegt.add(v.luchter); }
  for (const pp of poppen) beweegt.add(pp.g);
  kasteel.updateMatrixWorld(true);
  kasteel.traverse(o => { let n = o, vrij = false; while (n && n !== kasteel) { if (beweegt.has(n)) vrij = true; n = n.parent; } if (!vrij) { o.updateMatrix(); o.matrixAutoUpdate = false; } });
  const instanties = [
    { meshes: [merlons, kappen], plekken: merlonPlekken.map(([x, y, z]) => [x, y + 0.8, z]) },
    { meshes: [stammen, kruinen], plekken: boomPlekken.map(([x, z]) => [x, 7, z]) },
  ];
  for (const set of instanties) { set.origineel = set.meshes.map(m => Float32Array.from(m.instanceMatrix.array)); set.weg = new Uint8Array(set.plekken.length); }
  const NUL = new THREE.Matrix4().makeScale(0, 0, 0);
  const puin = [], knallen = [], raketten = [], rook = [], bijlen = [];
  const puinGeo = new THREE.BoxGeometry(0.45, 0.35, 0.4), rookGeo = new THREE.SphereGeometry(0.22, 6, 5), knalGeo = new THREE.SphereGeometry(1, 12, 8);
  const rookMat = new THREE.MeshBasicMaterial({ color: 0xbfbfc8, transparent: true, opacity: 0.4, depthWrite: false });
  const knalLichten = [0, 1].map(() => { const l = new THREE.PointLight(0xff9a3a, 0, 30, 1.4); l.userData.t = 9; scene.add(l); return l; });
  let knalNr = 0, gezocht = 0;
  const raakt = (x0, x1, z0, z1, y1, P, straalR) => Math.hypot(Math.max(x0 - P.x, 0, P.x - x1), Math.max(z0 - P.z, 0, P.z - z1)) < straalR && y1 > P.y - straalR * 1.3;
  let navVuil = true;
  function herstel() {
    for (const s2 of stukken) { s2.weg = false; s2.mesh.visible = true; }
    for (const d of dozen) d.weg = false;
    for (const c of cirkels) c.weg = false;
    for (const set of instanties) { set.weg.fill(0); set.meshes.forEach((m, i) => { m.instanceMatrix.array.set(set.origineel[i]); m.instanceMatrix.needsUpdate = true; }); }
    navVuil = true;
  }
  function ontplof(P, straalR = 4.6) {
    const bol = stuk(knalGeo, new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }), P.x, P.y, P.z, false);
    const licht = knalLichten[knalNr++ % knalLichten.length];
    licht.position.copy(P);
    licht.userData.t = 0;
    scene.add(bol);
    knallen.push({ bol, leeftijd: 0, straalR });
    gezocht = 30;
    vonkenBij(P, 0xffb347, 45);
    schokgolf(new THREE.Vector3(P.x, Math.max(0, grond(P.x, P.z)), P.z), 0xffb347, 9, 1);
    let aantal = 0;
    for (const s2 of stukken) if (!s2.weg && raakt(s2.x0, s2.x1, s2.z0, s2.z1, s2.y1, P, straalR)) { s2.weg = true; s2.mesh.visible = false; aantal++; }
    for (const d of dozen) if (!d.weg && !d.blijft && raakt(d.x0, d.x1, d.z0, d.z1, d.top, P, straalR)) d.weg = true;
    for (const c of cirkels) if (!c.weg && !c.blijft && raakt(c.x - c.r, c.x + c.r, c.z - c.r, c.z + c.r, c.top, P, straalR)) c.weg = true;
    for (const set of instanties) {
      let iets = false;
      set.plekken.forEach(([x, y, z], i) => { if (!set.weg[i] && Math.hypot(x - P.x, z - P.z) < straalR + 0.6 && y > P.y - straalR * 1.3) { set.weg[i] = 1; iets = true; aantal++; for (const m of set.meshes) m.setMatrixAt(i, NUL); } });
      if (iets) for (const m of set.meshes) m.instanceMatrix.needsUpdate = true;
    }
    const brokken = Math.min(12, 4 + aantal);
    for (let i = 0; i < brokken && puin.length < 70; i++) {
      const m = stuk(puinGeo, steenMat, P.x + (Math.random() - 0.5) * 2, P.y + Math.random() * 1.5, P.z + (Math.random() - 0.5) * 2, false);
      m.scale.setScalar(0.5 + Math.random() * 1.3);
      scene.add(m);
      puin.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 14, 4 + Math.random() * 11, (Math.random() - 0.5) * 14), w: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8), leeftijd: 0 });
    }
    for (const s2 of soldaten) if (s2.staat !== "neer" && s2.g.position.distanceTo(P) < straalR + 1.8) { s2.hp = 0; s2.staat = "neer"; s2.neer = 6; geveld++; }
    for (const f of Object.values(figuren)) if (f.g.visible && f.g.position.distanceTo(P) < straalR + 1) raakFiguur(f);
    for (const pp of poppen) if (pp.g.position.distanceTo(P) < straalR + 2) pp.draai = 22;
    const eigen = Math.hypot(pos.x - P.x, pos.y + 1 - P.y, pos.z - P.z);
    if (spel.actief && !heli.inzit && eigen < straalR) schade(8 + 30 * (1 - eigen / straalR));
    if (camera.position.distanceTo(P) < 40) schud = Math.max(schud, 0.45);
    toon(62, 0.7, "sawtooth", 0.22);
    toon(34, 1.1, "sine", 0.28);
    tekenHud();
    navVuil = true;
  }
  function vuurRaket(van, naar) {
    const g = new THREE.Group();
    const romp = stuk(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), mat(0x4a5a34), 0, 0, 0, false);
    romp.rotation.x = Math.PI / 2;
    const kop = stuk(new THREE.ConeGeometry(0.07, 0.24, 8), mat(0xc2264b), 0, 0, 0.47, false);
    kop.rotation.x = Math.PI / 2;
    g.add(romp, kop, stuk(new THREE.SphereGeometry(0.12, 8, 6), gloei(0xffa040, 4), 0, 0, -0.42, false));
    g.position.copy(van);
    g.lookAt(naar);
    scene.add(g);
    raketten.push({ g, van: van.clone(), naar: naar.clone(), t: 0, duur: Math.max(0.08, van.distanceTo(naar) / 58) });
    toon(180, 0.35, "sawtooth", 0.1);
    toon(90, 0.5, "triangle", 0.08);
  }
  const NG = 128, NH = 64, DI = [1, -1, 0, 0], DJ = [0, 0, 1, -1];
  const navAfstand = new Int16Array(NG * NG), navHoogte = new Float32Array(NG * NG), navRij = new Int32Array(NG * NG);
  let navTijd = 0;
  function berekenNav() {
    navAfstand.fill(-1);
    const si = Math.floor(pos.x + NH), sj = Math.floor(pos.z + NH);
    if (si < 0 || sj < 0 || si >= NG || sj >= NG) return;
    let kop = 0, staart = 0;
    const begin2 = si * NG + sj;
    navAfstand[begin2] = 0;
    navHoogte[begin2] = vloerHoogte(pos.x, pos.z, pos.y + 0.1);
    navRij[staart++] = begin2;
    while (kop < staart) {
      const c = navRij[kop++], ci = (c / NG) | 0, cj = c % NG, hc = navHoogte[c], dc = navAfstand[c];
      for (let r = 0; r < 4; r++) {
        const ni = ci + DI[r], nj = cj + DJ[r];
        if (ni < 0 || nj < 0 || ni >= NG || nj >= NG) continue;
        const n = ni * NG + nj;
        if (navAfstand[n] >= 0) continue;
        const x = ni - NH + 0.5, z = nj - NH + 0.5, hn = vloerHoogte(x, z, hc);
        if (hc - hn > 0.62 || botst(x, z, hn)) continue;
        navAfstand[n] = dc + 1;
        navHoogte[n] = hn;
        navRij[staart++] = n;
      }
    }
  }
  function werpBijl(s2) {
    const van = s2.g.position.clone().add(new THREE.Vector3(0, 1.8, 0));
    const naar = new THREE.Vector3(pos.x, pos.y + 1, pos.z);
    const T = Math.max(0.45, van.distanceTo(naar) / 17);
    const v = naar.sub(van).divideScalar(T);
    v.y += 0.5 * 14 * T;
    const m = new THREE.Group();
    m.add(stuk(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), hout(), 0, 0, 0, false));
    m.add(stuk(new THREE.BoxGeometry(0.04, 0.3, 0.34), metaal(0xcfd6de), 0, 0.26, 0.12, false));
    m.position.copy(van);
    scene.add(m);
    bijlen.push({ m, v, leeftijd: 0 });
    s2.werp = 2.4 + Math.random() * 2.2;
    s2.ra.rotation.x = -2.8;
    toon(420, 0.08, "triangle", 0.04);
  }
  function maakBazooka() {
    const g = new THREE.Group();
    const groen = () => mat(0x4a5a34);
    const langs = (r1, r2, lengte, z) => { const m = stuk(new THREE.CylinderGeometry(r1, r2, lengte, 12), groen(), 0, 0, z, false); m.rotation.x = -Math.PI / 2; g.add(m); };
    langs(0.07, 0.07, 1.3, -0.25);
    langs(0.1, 0.07, 0.14, -0.95);
    langs(0.07, 0.11, 0.16, 0.46);
    g.add(stuk(new THREE.BoxGeometry(0.04, 0.14, 0.05), mat(0x2a2a30), 0, -0.13, -0.1, false));
    g.add(stuk(new THREE.BoxGeometry(0.04, 0.14, 0.05), mat(0x2a2a30), 0, -0.13, -0.45, false));
    g.add(stuk(new THREE.BoxGeometry(0.03, 0.09, 0.14), mat(0x2a2a30), 0.06, 0.1, -0.3, false));
    const flits = stuk(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0, -1.05, false);
    g.add(flits);
    g.userData.flits = flits;
    return g;
  }
  function maakHeli() {
    const g = new THREE.Group();
    g.rotation.order = "YXZ";
    const groen = () => mat(0x3f4f2f, { flatShading: false }), donker = () => mat(0x25252b);
    const romp = stuk(new THREE.SphereGeometry(1.25, 18, 14), groen(), 0, 1.5, 0.3, false);
    romp.scale.set(1, 0.95, 1.9);
    g.add(romp);
    const glas = stuk(new THREE.SphereGeometry(1.0, 16, 12), new THREE.MeshStandardMaterial({ color: 0x7fd6ff, emissive: 0x16425a, roughness: 0.15, metalness: 0.4 }), 0, 1.75, 1.55, false);
    glas.scale.set(0.95, 0.75, 1.1);
    g.add(glas);
    const staart = stuk(new THREE.CylinderGeometry(0.16, 0.38, 4.4, 10), groen(), 0, 1.85, -3.9, false);
    staart.rotation.x = Math.PI / 2;
    g.add(staart);
    g.add(stuk(new THREE.BoxGeometry(0.1, 1.3, 0.8), groen(), 0, 2.5, -5.9, false));
    const staartRotor = stuk(new THREE.BoxGeometry(0.06, 1.7, 0.16), donker(), 0.22, 2.4, -5.9, false);
    g.add(staartRotor);
    g.add(stuk(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), donker(), 0, 2.95, 0.1, false));
    const rotor = new THREE.Group();
    rotor.add(stuk(new THREE.BoxGeometry(9.6, 0.05, 0.34), donker(), 0, 0, 0, false), stuk(new THREE.BoxGeometry(0.34, 0.05, 9.6), donker(), 0, 0, 0, false));
    rotor.position.set(0, 3.28, 0.1);
    g.add(rotor);
    for (const sx of [-1, 1]) {
      g.add(stuk(new THREE.BoxGeometry(1.5, 0.1, 0.7), groen(), sx * 1.5, 1.2, 0.2, false));
      const pod = stuk(new THREE.CylinderGeometry(0.26, 0.26, 1.5, 10), donker(), sx * 2, 0.95, 0.4, false);
      pod.rotation.x = Math.PI / 2;
      g.add(pod);
      const ski = stuk(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), donker(), sx * 0.95, 0.06, 0.3, false);
      ski.rotation.x = Math.PI / 2;
      g.add(ski);
      for (const z of [-0.6, 1.2]) g.add(stuk(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), donker(), sx * 0.9, 0.42, z, false));
    }
    g.position.copy(HELI_PLEK);
    scene.add(g);
    return { g, rotor, staartRotor, v: new THREE.Vector3(), inzit: false, toeren: 0, kant: 1 };
  }
  const heli = maakHeli();

  function maakAK() {
    const g = new THREE.Group();
    const zwart = () => metaal(0x2a2a30);
    const noten = () => mat(0x7a4a22);
    const langs = (r1, r2, lengte, materiaal, y, z) => { const m = stuk(new THREE.CylinderGeometry(r1, r2, lengte, 10), materiaal, 0, y, z, false); m.rotation.x = -Math.PI / 2; g.add(m); return m; };
    g.add(stuk(new THREE.BoxGeometry(0.055, 0.085, 0.36), zwart(), 0, 0, -0.04, false));
    const kolf = stuk(new THREE.BoxGeometry(0.045, 0.1, 0.32), noten(), 0, -0.035, 0.28, false);
    kolf.rotation.x = -0.12;
    g.add(kolf);
    const greep = stuk(new THREE.BoxGeometry(0.04, 0.13, 0.05), noten(), 0, -0.1, 0.1, false);
    greep.rotation.x = 0.35;
    g.add(greep);
    [[-0.1, -0.1, 0.2], [-0.175, -0.135, 0.45], [-0.24, -0.185, 0.7]].forEach(([y, z, r]) => { const m = stuk(new THREE.BoxGeometry(0.035, 0.09, 0.07), zwart(), 0, y, z, false); m.rotation.x = r; g.add(m); });
    g.add(stuk(new THREE.BoxGeometry(0.052, 0.065, 0.24), noten(), 0, -0.005, -0.34, false));
    langs(0.014, 0.014, 0.4, zwart(), 0, -0.64);
    langs(0.012, 0.012, 0.24, zwart(), 0.04, -0.36);
    langs(0.022, 0.018, 0.06, zwart(), 0, -0.86);
    g.add(stuk(new THREE.BoxGeometry(0.012, 0.06, 0.02), zwart(), 0, 0.045, -0.78, false));
    g.add(stuk(new THREE.BoxGeometry(0.03, 0.03, 0.05), zwart(), 0, 0.055, -0.1, false));
    const flits = stuk(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0, -0.95, false);
    g.add(flits);
    g.userData.flits = flits;
    return g;
  }

  const speler = maakFiguur("koning");
  const blauw = { 0x8e1f3a: 0x1f4f8e, 0x6f1630: 0x163a6f, 0xc2264b: 0x2f7fd0 };
  speler.g.traverse(o => { if (o.isMesh && o.material?.color) { const h = o.material.color.getHex(); if (blauw[h]) { o.material.color.setHex(blauw[h]); if (o.material.emissive?.getHex() === h) o.material.emissive.setHex(blauw[h]); } } });
  speler.tagEl.textContent = "Jij, de tweede Koning";
  speler.tagEl.style.visibility = "hidden";
  speler.leylijn.visible = false;
  speler.g.visible = false;
  scene.add(speler.g);
  scene.add(camera);
  const akFP = maakAK(), akTP = maakAK(), bazFP = maakBazooka(), bazTP = maakBazooka();
  bazFP.position.set(0.3, -0.2, -0.3);
  bazFP.visible = false;
  camera.add(bazFP);
  bazTP.position.set(0, -0.52, 0.08);
  bazTP.rotation.x = -Math.PI / 2;
  bazTP.scale.setScalar(1.2);
  bazTP.visible = false;
  speler.ra.add(bazTP);
  let wapenNr = 0;
  akFP.position.set(0.24, -0.23, -0.42);
  akFP.visible = false;
  camera.add(akFP);
  akTP.position.set(0, -0.52, 0.08);
  akTP.rotation.x = -Math.PI / 2;
  akTP.scale.setScalar(1.25);
  speler.ra.add(akTP);
  const buitenLicht = new THREE.DirectionalLight(0xcfd8ff, 0);
  buitenLicht.position.set(-20, 40, 30);
  const omgevingsLicht = new THREE.AmbientLight(0x9a94c8, 0);
  scene.add(buitenLicht, omgevingsLicht);
  const flitsLicht = new THREE.PointLight(0xffc266, 0, 9, 1.6);
  scene.add(flitsLicht);

  const soldaten = [];
  const POSTEN = [[-2.2, 21.5], [2.2, 21.5], [-3.2, -12.5], [3.2, -12.5], [18, 14], [-18, -8], [-4.6, 47], [4.6, 47], [-22, 35], [22, 35], [40, -10], [-30, -40], [0, -33], [34, 30]];
  function wapen(soort) {
    const w = new THREE.Group();
    const staal = () => metaal(0xb8c2cc);
    const steel = (lengte) => { const m = stuk(new THREE.CylinderGeometry(0.045, 0.045, lengte, 8), hout(), 0, 0, lengte / 2 - 0.2, false); m.rotation.x = Math.PI / 2; w.add(m); };
    if (soort === 0) {
      steel(2.5);
      for (const s of [-1, 1]) { const blad = stuk(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 18, 1, false, 0, Math.PI), staal(), 0, s * 0.08, 2.05, false); blad.rotation.set(0, 0, Math.PI / 2); blad.rotation.x = s > 0 ? 0 : Math.PI; w.add(blad); }
    } else if (soort === 1) {
      steel(2.3);
      w.add(stuk(new THREE.BoxGeometry(0.5, 0.5, 0.85), staal(), 0, 0, 2.1, false));
    } else if (soort === 2) {
      w.add(stuk(new THREE.BoxGeometry(0.04, 0.16, 2.2), staal(), 0, 0, 1.25, false));
      w.add(stuk(new THREE.BoxGeometry(0.06, 0.6, 0.08), metaal(0xe5b04c), 0, 0, 0.12, false));
      steel(0.4);
    } else {
      steel(1.9);
      w.add(stuk(new THREE.SphereGeometry(0.3, 12, 10), staal(), 0, 0, 1.85, false));
      for (let k = 0; k < 8; k++) { const p = stuk(new THREE.ConeGeometry(0.07, 0.24, 6), staal(), 0, 0, 1.85, false); p.rotation.set(k * 0.9, k * 1.7, 0); p.translateY(0.36); w.add(p); }
    }
    return w;
  }
  function maakSoldaat(i) {
    const g = new THREE.Group(), lijf = new THREE.Group();
    g.add(lijf);
    const staal = () => metaal(0x8f9aa8);
    const been = x => { const p = new THREE.Group(); p.position.set(x, 0.6, 0); p.add(stuk(new THREE.CapsuleGeometry(0.1, 0.36, 4, 8), mat(0x2a2a33), 0, -0.3, 0, false)); lijf.add(p); return p; };
    const arm = x => { const p = new THREE.Group(); p.position.set(x, 1.32, 0); p.add(stuk(new THREE.CapsuleGeometry(0.085, 0.4, 4, 8), staal(), 0, -0.26, 0, false)); lijf.add(p); return p; };
    const lb = been(-0.14), rb = been(0.14);
    lijf.add(stuk(new THREE.CylinderGeometry(0.3, 0.37, 0.82, 12), staal(), 0, 1.0, 0, false));
    lijf.add(stuk(new THREE.BoxGeometry(0.36, 0.72, 0.03), rood(), 0, 0.98, 0.34, false));
    const la = arm(-0.38), ra = arm(0.38);
    lijf.add(stuk(new THREE.SphereGeometry(0.21, 14, 10), mat(0xf1c9a5, { flatShading: false }), 0, 1.62, 0, false));
    lijf.add(stuk(new THREE.SphereGeometry(0.25, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), staal(), 0, 1.65, 0, false));
    lijf.add(stuk(new THREE.BoxGeometry(0.04, 0.2, 0.04), staal(), 0, 1.62, 0.23, false));
    for (const x of [-0.08, 0.08]) lijf.add(stuk(new THREE.SphereGeometry(0.03, 8, 6), mat(0x1a120c), x, 1.63, 0.195, false));
    const w = wapen(i % 4);
    w.position.set(0, -0.5, 0);
    ra.add(w);
    const sterren = new THREE.Group();
    for (let k = 0; k < 3; k++) sterren.add(stuk(new THREE.OctahedronGeometry(0.09), gloei(0xffd977, 2.5), Math.sin(k * 2.1) * 0.35, 0, Math.cos(k * 2.1) * 0.35, false));
    sterren.visible = false;
    g.add(sterren);
    const post = new THREE.Vector3(POSTEN[i][0], 0, POSTEN[i][1]);
    g.position.copy(post);
    scene.add(g);
    const s = { g, lijf, lb, rb, la, ra, sterren, post, hp: 3, staat: "wacht", slagT: 0, rust: 0, neer: 0, sloeg: false, vast: 0, werp: 2 + i * 0.4, fase: i * 1.7 };
    g.userData.soldaat = s;
    return s;
  }
  for (let i = 0; i < POSTEN.length; i++) soldaten.push(maakSoldaat(i));

  const hud = document.createElement("div");
  hud.className = "spel-hud";
  hud.innerHTML = `<div class="vizier"></div><div class="schade"></div>
    <div class="spel-boven"><div class="leven"><i></i></div><span class="spel-teller"></span></div>
    <div class="spel-wapen">AK-47 <b>∞</b></div>
    <div class="spel-melding"></div>
    <div class="spel-hulp">ZQSD of WASD lopen · muis kijken · klik (houd in) schieten · 1 AK-47, 2 bazooka · E helikopter in/uit (Spatie omhoog, Shift omlaag) · V wissel 1e/3e persoon · Shift rennen · Esc pauze, nog eens Esc stoppen</div>
    <div class="spel-pauze">Klik in de zaal om te spelen · Esc om te stoppen</div>`;
  podium.appendChild(hud);
  const knop = document.getElementById("speel");
  const el = k => hud.querySelector(k);
  let geraakt = 0, geveld = 0, leven = 100, laatsteSchade = -99, dood = 0, meldingTot = 0, wasGezocht = false;
  function tekenHud() {
    el(".leven i").style.width = Math.max(0, leven) + "%";
    el(".spel-teller").textContent = `Raadsleden geraakt: ${geraakt} · Soldaten geveld: ${geveld}`;
  }
  function melding(tekst, duur = 3) { el(".spel-melding").textContent = tekst; el(".spel-melding").classList.add("zichtbaar"); meldingTot = nu + duur; }

  const toetsen = new Set();
  const canvas = renderer.domElement;
  let yaw = 0, pitch = 0, vy = 0, opGrond = true, eerstePersoon = false, vuurt = false, afkoel = 0, terugslag = 0, nu = 0, schud = 0, camAfstand = 5.6;
  const pos = speler.g.position;
  const straal = new THREE.Raycaster();
  const kogels = [];

  function zichtbaarEnRaakbaar(o) {
    for (let n = o; n; n = n.parent) {
      if (!n.visible || n === speler.g || n === camera || n === heli.g) return false;
    }
    return true;
  }
  const eigenaar = (o, sleutel) => { for (let n = o; n; n = n.parent) if (n.userData?.[sleutel]) return n.userData[sleutel]; return null; };
  for (const f of Object.values(figuren)) { f.g.userData.figuur = f; f.voetRing.raycast = () => {}; }

  function mik(minAfstand) {
    straal.setFromCamera(new THREE.Vector2(0, 0), camera);
    straal.far = 240;
    for (const h of straal.intersectObjects(scene.children, true)) {
      const o = h.object;
      if (!o.isMesh || !zichtbaarEnRaakbaar(o)) continue;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (m.transparent && (m.blending === THREE.AdditiveBlending || m.opacity < 0.25)) continue;
      if (h.distance < minAfstand) continue;
      return h;
    }
    return null;
  }
  function toonWapens() {
    akFP.visible = eerstePersoon && !heli.inzit && wapenNr === 0;
    bazFP.visible = eerstePersoon && !heli.inzit && wapenNr === 1;
    akTP.visible = wapenNr === 0;
    bazTP.visible = wapenNr === 1;
    speler.g.visible = spel.actief && !eerstePersoon && !heli.inzit;
    speler.tagEl.style.visibility = speler.g.visible ? "" : "hidden";
    el(".spel-wapen").innerHTML = heli.inzit ? "Raketten <b>∞</b>" : wapenNr ? "Bazooka <b>∞</b>" : "AK-47 <b>∞</b>";
  }
  function schiet() {
    if (gezocht <= 0) melding("Je vuurt in het kasteel: de wacht valt aan!", 3);
    gezocht = Math.max(gezocht, 25);
    const doel = mik(heli.inzit ? (eerstePersoon ? 4 : 14) : eerstePersoon ? 0 : camAfstand + 0.6);
    const punt = doel ? doel.point.clone() : straal.ray.at(170, new THREE.Vector3());
    if (heli.inzit) {
      afkoel = 0.2;
      heli.kant *= -1;
      vuurRaket(heli.g.localToWorld(new THREE.Vector3(heli.kant * 2, 0.95, 1.4)), punt);
      return;
    }
    if (wapenNr === 1) {
      afkoel = 0.8;
      const b2 = eerstePersoon ? bazFP : bazTP;
      vuurRaket(b2.localToWorld(new THREE.Vector3(0, 0, -1.05)), punt);
      b2.userData.flits.material.opacity = 1;
      terugslag = 2.2;
      return;
    }
    afkoel = 0.095;
    punt.x += (Math.random() - 0.5) * 0.25; punt.y += (Math.random() - 0.5) * 0.25; punt.z += (Math.random() - 0.5) * 0.25;
    const ak = eerstePersoon ? akFP : akTP;
    const loop = ak.localToWorld(new THREE.Vector3(0, 0, -0.92));
    const spoor = stuk(new THREE.BoxGeometry(0.035, 0.035, 1.1), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0, 0, false);
    spoor.position.copy(loop);
    spoor.lookAt(punt);
    scene.add(spoor);
    kogels.push({ m: spoor, van: loop, naar: punt, t: 0, duur: Math.max(0.03, loop.distanceTo(punt) / 130), figuur: doel && eigenaar(doel.object, "figuur"), soldaat: doel && eigenaar(doel.object, "soldaat"), pop: doel && eigenaar(doel.object, "pop") });
    ak.userData.flits.material.opacity = 1;
    ak.userData.flits.scale.setScalar(0.7 + Math.random() * 0.9);
    flitsLicht.position.copy(loop);
    flitsLicht.intensity = 26;
    terugslag = 1;
    toon(95 + Math.random() * 25, 0.09, "sawtooth", 0.11);
    toon(48, 0.14, "square", 0.06);
  }

  function raakFiguur(f) {
    if (f.neer > 0) return;
    f.neer = 4.2;
    geraakt++;
    tekenHud();
    toon(520, 0.25, "triangle", 0.08);
    if (!f.ballonEl.classList.contains("zichtbaar")) { f.ballonEl.textContent = "Au!"; f.ballonEl.classList.remove("denkt"); f.ballonEl.classList.add("zichtbaar"); }
    if (Object.values(figuren).filter(x => x.g.visible).every(x => x.neer > 0)) melding("Staatsgreep! De hele Raad ligt neer… ze staan zo weer op.", 4);
  }
  spel.neer = (f, dt, t) => {
    if (!f.duizel) {
      f.duizel = new THREE.Group();
      for (let k = 0; k < 3; k++) f.duizel.add(stuk(new THREE.OctahedronGeometry(0.09), gloei(0xffd977, 2.5), Math.sin(k * 2.1) * 0.38, 0, Math.cos(k * 2.1) * 0.38, false));
      f.g.add(f.duizel);
    }
    f.neer -= dt;
    const sinds = 4.2 - f.neer;
    const e = f.neer < 0.7 ? Math.max(0, f.neer / 0.7) : Math.min(1, sinds * 4);
    f.lijf.rotation.x = -1.45 * e;
    f.lijf.position.y = Math.sin(Math.min(1, sinds * 2.2) * Math.PI) * 0.5 + 0.14 * e;
    f.duizel.visible = f.neer > 0.4;
    f.duizel.position.set(0, 0.8, -1.5 * e);
    f.duizel.rotation.y = t * 5;
    if (f.neer <= 0) {
      f.neer = 0;
      f.lijf.rotation.x = 0;
      f.duizel.visible = false;
      if (f.ballonEl.textContent === "Au!") f.ballonEl.classList.remove("zichtbaar");
    }
  };

  function raakSoldaat(s, richting) {
    if (s.staat === "neer") return;
    s.hp--;
    s.g.position.addScaledVector(richting, 0.35);
    if (s.hp <= 0) { s.staat = "neer"; s.neer = 6; geveld++; tekenHud(); toon(220, 0.3, "triangle", 0.08); }
  }
  function schade(n) {
    if (dood > 0) return;
    leven -= n;
    laatsteSchade = nu;
    schud = 0.35;
    el(".schade").classList.remove("flits");
    void el(".schade").offsetWidth;
    el(".schade").classList.add("flits");
    toon(140, 0.25, "sawtooth", 0.12);
    if (leven <= 0) { leven = 0; dood = 2.8; melding("Je bent geveld! Even bekomen…", 2.8); }
    tekenHud();
  }
  function zetSoldatenTerug() {
    for (const s of soldaten) { s.g.position.copy(s.post); s.hp = 3; s.staat = "wacht"; s.neer = 0; s.lijf.rotation.x = 0; s.sterren.visible = false; s.ra.rotation.set(0, 0, 0); s.g.rotation.y = 0; }
  }
  function opnieuw() {
    pos.copy(START);
    yaw = 0; pitch = 0; vy = 0; leven = 100; gezocht = 0;
    heli.inzit = false; heli.v.set(0, 0, 0); heli.g.position.copy(HELI_PLEK); heli.g.rotation.set(0, 0, 0); heli.g.visible = true;
    toonWapens();
    zetSoldatenTerug();
    tekenHud();
  }

  function wisselBeeld() {
    eerstePersoon = !eerstePersoon;
    heli.g.visible = !(heli.inzit && eerstePersoon);
    toonWapens();
  }
  function helikopterToets() {
    const hp = heli.g.position;
    if (heli.inzit) {
      if (hp.y - vloerHoogte(hp.x, hp.z, hp.y + 0.4) > 0.7) { melding("Land eerst om uit te stappen", 2); return; }
      heli.inzit = false;
      heli.v.set(0, 0, 0);
      heli.g.visible = true;
      const zij = botst(hp.x + Math.cos(yaw) * 2.6, hp.z - Math.sin(yaw) * 2.6, hp.y) ? -1 : 1;
      pos.set(hp.x + Math.cos(yaw) * 2.6 * zij, hp.y, hp.z - Math.sin(yaw) * 2.6 * zij);
      vy = 0;
    } else if (pos.distanceTo(hp) < 5.5) {
      heli.inzit = true;
      heli.g.visible = !eerstePersoon;
      melding("Spatie omhoog · Shift omlaag · klik: raketten · E uitstappen", 5);
    } else { melding("De helikopter staat op het platform in de westelijke voorburcht", 3); return; }
    toonWapens();
  }
  function vliegHeli(dt) {
    const hp = heli.g.position;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const v = (toetsen.has("KeyW") || toetsen.has("ArrowUp") ? 1 : 0) - (toetsen.has("KeyS") || toetsen.has("ArrowDown") ? 1 : 0);
    const o = (toetsen.has("KeyD") ? 1 : 0) - (toetsen.has("KeyA") ? 1 : 0);
    const op = (toetsen.has("Space") ? 1 : 0) - (toetsen.has("ShiftLeft") || toetsen.has("ShiftRight") || toetsen.has("KeyC") ? 1 : 0);
    if (toetsen.has("ArrowLeft")) yaw += 1.8 * dt;
    if (toetsen.has("ArrowRight")) yaw -= 1.8 * dt;
    heli.v.x += ((fx * v + rx * o) * 24 - heli.v.x) * Math.min(1, dt * 1.6);
    heli.v.z += ((fz * v + rz * o) * 24 - heli.v.z) * Math.min(1, dt * 1.6);
    heli.v.y += (op * 12 - heli.v.y) * Math.min(1, dt * 2.6);
    if (!botst(hp.x + heli.v.x * dt, hp.z, hp.y)) hp.x += heli.v.x * dt; else heli.v.x = 0;
    if (!botst(hp.x, hp.z + heli.v.z * dt, hp.y)) hp.z += heli.v.z * dt; else heli.v.z = 0;
    hp.y = Math.min(75, hp.y + heli.v.y * dt);
    const h = vloerHoogte(hp.x, hp.z, hp.y + 0.4) + 0.08;
    if (hp.y < h) { hp.y = h; heli.v.y = Math.max(0, heli.v.y); }
    heli.g.rotation.set((heli.v.x * fx + heli.v.z * fz) * 0.013, yaw + Math.PI, -(heli.v.x * rx + heli.v.z * rz) * 0.013);
    pos.copy(hp);
    if (nu - laatsteSchade > 4 && leven < 100) { leven = Math.min(100, leven + 6 * dt); tekenHud(); }
    afkoel -= dt;
    if (vuurt && afkoel <= 0) schiet();
  }
  function begin() {
    if (spel.actief) return;
    spel.actief = true;
    controls.enabled = false;
    podium.classList.add("spel");
    knop.textContent = "Stop met spelen";
    scene.fog.near = 55; scene.fog.far = 185;
    camera.far = 420; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.shadowMap.autoUpdate = false;
    sterren.scale.setScalar(3.2);
    herstel();
    buitenLicht.intensity = 1.7; omgevingsLicht.intensity = 1.1;
    scene.background.setHex(0x46536e); scene.fog.color.setHex(0x46536e);
    camera.rotation.order = "YXZ";
    eerstePersoon = false;
    wapenNr = 0;
    opnieuw();
    melding("Je bent de tweede Koning. Gedraag je, dan laat de wacht je met rust.", 5);
    canvas.requestPointerLock?.()?.catch?.(() => {});
  }
  function stop() {
    if (!spel.actief) return;
    spel.actief = false;
    vuurt = false;
    toetsen.clear();
    controls.enabled = true;
    podium.classList.remove("spel", "pauze");
    knop.textContent = "Speel mee als 2e Koning";
    scene.fog.near = 16; scene.fog.far = 38;
    camera.far = 120; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.autoUpdate = true;
    gezocht = 0; podium.classList.remove("gezocht");
    sterren.scale.setScalar(1); sterren.position.set(0, 0, 0); maanBol.position.set(-14, 17, -30);
    heli.inzit = false; heli.g.position.copy(HELI_PLEK); heli.g.rotation.set(0, 0, 0); heli.g.visible = true; heli.v.set(0, 0, 0);
    for (const r of raketten.splice(0)) scene.remove(r.g);
    for (const b2 of bijlen.splice(0)) scene.remove(b2.m);
    herstel();
    bazFP.visible = false;
    buitenLicht.intensity = 0; omgevingsLicht.intensity = 0;
    scene.background.setHex(0x120f26); scene.fog.color.setHex(0x120f26);
    camera.rotation.order = "XYZ";
    camera.position.set(0, 6.4, 11.5);
    speler.g.visible = false;
    speler.tagEl.style.visibility = "hidden";
    akFP.visible = false;
    zetSoldatenTerug();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }
  knop.addEventListener("click", () => spel.actief ? stop() : begin());
  document.addEventListener("pointerlockchange", () => { if (spel.actief) { podium.classList.toggle("pauze", document.pointerLockElement !== canvas); if (document.pointerLockElement !== canvas) vuurt = false; } });
  document.addEventListener("mousemove", e => {
    if (!spel.actief || document.pointerLockElement !== canvas) return;
    yaw -= e.movementX * 0.0023;
    pitch = Math.max(-1.25, Math.min(1.25, pitch - e.movementY * 0.0023));
  });
  canvas.addEventListener("mousedown", e => {
    if (!spel.actief || e.button !== 0) return;
    if (document.pointerLockElement !== canvas) { canvas.requestPointerLock?.()?.catch?.(() => {}); return; }
    vuurt = true;
  });
  window.addEventListener("mouseup", () => { vuurt = false; });
  window.addEventListener("keydown", e => {
    if (!spel.actief) return;
    if (e.code === "Escape") { stop(); return; }
    if (e.code === "KeyV" && !e.repeat) wisselBeeld();
    if (e.code === "KeyE" && !e.repeat && dood <= 0) helikopterToets();
    if (e.code === "Digit1" || e.code === "Numpad1") { wapenNr = 0; toonWapens(); }
    if (e.code === "Digit2" || e.code === "Numpad2") { wapenNr = 1; toonWapens(); }
    toetsen.add(e.code);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  });
  window.addEventListener("keyup", e => toetsen.delete(e.code));
  window.addEventListener("blur", () => { toetsen.clear(); vuurt = false; });

  function beweeg(p, dx, dz, y) {
    let bewogen = false;
    if (dx && !botst(p.x + dx, p.z, y)) { p.x += dx; bewogen = true; }
    if (dz && !botst(p.x, p.z + dz, y)) { p.z += dz; bewogen = true; }
    return bewogen;
  }

  const tmp = new THREE.Vector3(), kijk = new THREE.Vector3();
  spel.tik = (dt, t) => {
    nu = t;
    for (let i = kogels.length - 1; i >= 0; i--) {
      const k = kogels[i];
      k.t += dt / k.duur;
      k.m.position.lerpVectors(k.van, k.naar, Math.min(1, k.t));
      if (k.t >= 1) {
        scene.remove(k.m);
        kogels.splice(i, 1);
        vonkenBij(k.naar, 0xffcf7a, 10);
        if (k.figuur) raakFiguur(k.figuur);
        if (k.soldaat) raakSoldaat(k.soldaat, tmp.subVectors(k.naar, k.van).setY(0).normalize());
        if (k.pop) k.pop.draai = 16;
      }
    }
    for (const p of poppen) if (p.draai > 0.05) { p.g.rotation.y += p.draai * dt; p.draai *= Math.pow(0.25, dt); }
    for (const ak of [akFP, akTP, bazFP, bazTP]) ak.userData.flits.material.opacity *= Math.pow(0.0001, dt);
    for (let i = raketten.length - 1; i >= 0; i--) {
      const r = raketten[i];
      r.t += dt / r.duur;
      r.g.position.lerpVectors(r.van, r.naar, Math.min(1, r.t));
      r.rookT = (r.rookT || 0) - dt;
      if (r.rookT <= 0 && rook.length < 70) { r.rookT = 0.035; const m = stuk(rookGeo, rookMat, r.g.position.x, r.g.position.y, r.g.position.z, false); scene.add(m); rook.push({ m, leeftijd: 0 }); }
      if (r.t >= 1) { scene.remove(r.g); raketten.splice(i, 1); ontplof(r.naar); }
    }
    for (let i = rook.length - 1; i >= 0; i--) {
      const r = rook[i];
      r.leeftijd += dt;
      r.m.scale.setScalar(r.leeftijd < 0.5 ? 1 + r.leeftijd * 2.4 : Math.max(0.01, 2.2 * (1 - (r.leeftijd - 0.5) / 0.5)));
      if (r.leeftijd > 1) { scene.remove(r.m); rook.splice(i, 1); }
    }
    for (let i = knallen.length - 1; i >= 0; i--) {
      const k = knallen[i];
      k.leeftijd += dt;
      k.bol.scale.setScalar(0.6 + k.leeftijd * k.straalR * 3.2);
      k.bol.material.opacity = Math.max(0, 0.95 - k.leeftijd * 2.2);
      if (k.leeftijd > 0.5) { scene.remove(k.bol); k.bol.material.dispose(); knallen.splice(i, 1); }
    }
    for (const l of knalLichten) { l.userData.t += dt; l.intensity = Math.max(0, 90 * (1 - l.userData.t * 2.4)); }
    for (let i = puin.length - 1; i >= 0; i--) {
      const b2 = puin[i];
      b2.leeftijd += dt;
      b2.v.y -= 20 * dt;
      b2.m.position.addScaledVector(b2.v, dt);
      b2.m.rotation.x += b2.w.x * dt; b2.m.rotation.y += b2.w.y * dt;
      const g2 = grond(b2.m.position.x, b2.m.position.z) + 0.15;
      if (b2.m.position.y < g2) { b2.m.position.y = g2; b2.v.y *= -0.3; b2.v.x *= 0.6; b2.v.z *= 0.6; b2.w.multiplyScalar(0.5); }
      if (b2.leeftijd > 5) { scene.remove(b2.m); puin.splice(i, 1); }
    }
    for (let i = bijlen.length - 1; i >= 0; i--) {
      const b2 = bijlen[i];
      b2.leeftijd += dt;
      b2.v.y -= 14 * dt;
      b2.m.position.addScaledVector(b2.v, dt);
      b2.m.rotation.x += 15 * dt;
      const raakAfstand = Math.hypot(b2.m.position.x - pos.x, b2.m.position.y - pos.y - 1, b2.m.position.z - pos.z);
      const trof = spel.actief && dood <= 0 && raakAfstand < (heli.inzit ? 2.6 : 0.9);
      if (trof) schade(heli.inzit ? 6 : 10);
      if (trof || b2.leeftijd > 5 || b2.m.position.y < grond(b2.m.position.x, b2.m.position.z)) { scene.remove(b2.m); bijlen.splice(i, 1); }
    }
    heli.toeren += ((heli.inzit ? 34 : 0) - heli.toeren) * Math.min(1, dt * 1.2);
    heli.rotor.rotation.y += heli.toeren * dt;
    heli.staartRotor.rotation.x += heli.toeren * 1.6 * dt;
    if (spel.actief) {
      navTijd -= dt;
      if (gezocht > 0 && (navTijd <= 0 || navVuil)) { navTijd = 0.55; navVuil = false; berekenNav(); }
      sterren.position.copy(camera.position);
      maanBol.position.set(camera.position.x - 45, camera.position.y + 50, camera.position.z - 95);
    }
    flitsLicht.intensity *= Math.pow(0.0001, dt);
    water.material.emissiveIntensity = 1 + Math.sin(t * 1.3) * 0.35;
    for (const v of vuren) {
      const f = 0.8 + Math.sin(t * 12 + v.fase) * 0.1 + Math.sin(t * 27 + v.fase * 2) * 0.07 + Math.random() * 0.06;
      if (v.vlam) v.vlam.scale.set(1, f, 1);
      if (v.licht) v.licht.intensity = v.sterkte * f;
      if (v.luchter) v.luchter.rotation.z = Math.sin(t * 0.7 + v.fase) * 0.015;
    }
    const sx = spel.actief ? pos.x : 0, sz = spel.actief ? pos.z : 0;
    for (let i = 0; i < SNEEUW; i++) {
      let x = sneeuwPos[i * 3] + Math.sin(t * 0.6 + i) * dt * 0.5, y = sneeuwPos[i * 3 + 1] - sneeuwSnel[i] * dt, z = sneeuwPos[i * 3 + 2];
      if (x - sx > 40) x -= 80; else if (x - sx < -40) x += 80;
      if (z - sz > 40) z -= 80; else if (z - sz < -40) z += 80;
      if (y < 0 || (y < 17 && x > -9 && x < 9 && z > -24 && z < -14)) y = y < 0 ? 30 : 17 + 13 * Math.random();
      sneeuwPos[i * 3] = x; sneeuwPos[i * 3 + 1] = y; sneeuwPos[i * 3 + 2] = z;
    }
    sneeuwGeo.attributes.position.needsUpdate = true;
    for (const v of vlaggen) {
      const p = v.geometry.attributes.position, b = v.userData.basis;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(t * 4 + b[i * 3] * 3) * 0.12 * (b[i * 3] + 0.8));
      p.needsUpdate = true;
    }
    if (el(".spel-melding").classList.contains("zichtbaar") && t > meldingTot) el(".spel-melding").classList.remove("zichtbaar");

    for (const s of soldaten) {
      const sp = s.g.position;
      if (s.staat === "neer") {
        s.neer -= dt;
        const e = s.neer < 0.6 ? Math.max(0, s.neer / 0.6) : Math.min(1, (6 - s.neer) * 4);
        s.lijf.rotation.x = -1.45 * e;
        s.sterren.visible = true;
        s.sterren.position.set(0, 0.8, -1.5 * e);
        s.sterren.rotation.y = t * 5;
        if (s.neer <= 0) { s.staat = spel.actief ? "jaag" : "wacht"; s.hp = 3; s.lijf.rotation.x = 0; s.sterren.visible = false; sp.copy(s.post); }
        continue;
      }
      if (!spel.actief || dood > 0 || gezocht <= 0) {
        s.staat = "wacht";
        const doelX = s.post.x + Math.sin(t * 0.25 + s.fase) * 2.2, doelZ = s.post.z + Math.cos(t * 0.25 + s.fase) * 2.2;
        const px = doelX - sp.x, pz = doelZ - sp.z, pa = Math.hypot(px, pz);
        if (pa > 0.25 && spel.actief) {
          const stap = Math.min(pa, (pa > 4 ? 3.4 : 0.9) * dt);
          if (!beweeg(sp, (px / pa) * stap, (pz / pa) * stap, sp.y)) { s.vast += dt; if (s.vast > 3) { sp.copy(s.post); s.vast = 0; } } else s.vast = 0;
          s.g.rotation.y += Math.atan2(Math.sin(Math.atan2(px, pz) - s.g.rotation.y), Math.cos(Math.atan2(px, pz) - s.g.rotation.y)) * Math.min(1, dt * 5);
          const zw = Math.sin(t * (pa > 4 ? 11 : 5) + s.fase);
          s.lb.rotation.x = zw * 0.4; s.rb.rotation.x = -zw * 0.4;
          const hh = vloerHoogte(sp.x, sp.z, sp.y);
          sp.y = sp.y < hh ? Math.min(hh, sp.y + 6 * dt) : Math.max(hh, sp.y - 12 * dt);
        } else { s.lb.rotation.x *= 0.8; s.rb.rotation.x *= 0.8; }
        s.ra.rotation.x += (-0.5 - s.ra.rotation.x) * Math.min(1, dt * 4);
        s.lijf.position.y = Math.sin(t * 2 + s.fase) * 0.012;
        continue;
      }
      if (s.staat === "wacht") s.staat = "jaag";
      const dx = pos.x - sp.x, dz = pos.z - sp.z, afstand = Math.hypot(dx, dz), dy = Math.abs(pos.y - sp.y);
      s.g.rotation.y += Math.atan2(Math.sin(Math.atan2(dx, dz) - s.g.rotation.y), Math.cos(Math.atan2(dx, dz) - s.g.rotation.y)) * Math.min(1, dt * 8);
      s.rust -= dt;
      if (s.staat === "slaat") {
        s.slagT += dt;
        const u = s.slagT / 0.55;
        s.ra.rotation.x = u < 0.45 ? -2.9 * (u / 0.45) : -2.9 + 3.4 * Math.min(1, (u - 0.45) / 0.3);
        if (u > 0.62 && !s.sloeg) { s.sloeg = true; if (afstand < 2.6 && dy < 1.6) schade(18); toon(160, 0.12, "square", 0.05); }
        if (u >= 1.25) { s.staat = "jaag"; s.rust = 0.5; }
      } else if (afstand < 2.0 && dy < 1.6 && s.rust <= 0) {
        s.staat = "slaat"; s.slagT = 0; s.sloeg = false;
      } else if (afstand > 1.6) {
        const stap = 3.7 * dt;
        let tx = dx / afstand, tz = dz / afstand, bereikbaar = false;
        const ci = Math.floor(sp.x + NH), cj = Math.floor(sp.z + NH);
        if (ci >= 1 && cj >= 1 && ci < NG - 1 && cj < NG - 1) {
          const c = ci * NG + cj, dc = navAfstand[c];
          if (dc >= 0 && Math.abs(navHoogte[c] - sp.y) < 1.3) {
            bereikbaar = true;
            if (dc > 2) {
              let best = dc, bi = 0, bj = 0;
              for (let r = 0; r < 4; r++) { const n = (ci + DI[r]) * NG + cj + DJ[r]; if (navAfstand[n] >= 0 && navAfstand[n] < best && Math.abs(navHoogte[n] - sp.y) < 1.3) { best = navAfstand[n]; bi = DI[r]; bj = DJ[r]; } }
              if (bi || bj) { const gx = ci + bi - NH + 0.5 - sp.x, gz = cj + bj - NH + 0.5 - sp.z, gl = Math.hypot(gx, gz) || 1; tx = gx / gl; tz = gz / gl; }
            }
          }
        }
        let ok = bereikbaar || afstand < 40 ? beweeg(sp, tx * stap, tz * stap, sp.y) : true;
        if (!ok) ok = beweeg(sp, tz * stap * (s.fase % 2 > 1 ? 1 : -1), -tx * stap * (s.fase % 2 > 1 ? 1 : -1), sp.y);
        if (vuurt && afstand < 40 && (dx / afstand) * -kijk.x + (dz / afstand) * -kijk.z > 0.985) { const zij = Math.sin(t * 3 + s.fase) > 0 ? 1 : -1; beweeg(sp, tz * zij * 3.2 * dt, -tx * zij * 3.2 * dt, sp.y); }
        s.werp -= dt;
        if (s.werp <= 0 && afstand > 5 && afstand < 34 && (!bereikbaar || dy > 1.6 || afstand > 11)) werpBijl(s);
        const zwaai = Math.sin(t * 11 + s.fase);
        s.lb.rotation.x = zwaai * 0.6; s.rb.rotation.x = -zwaai * 0.6;
        s.lijf.position.y = Math.abs(zwaai) * 0.05;
        s.ra.rotation.x += (-1.9 - s.ra.rotation.x) * Math.min(1, dt * 5);
      }
      for (const a of soldaten) if (a !== s && a.staat !== "neer") {
        const ax = sp.x - a.g.position.x, az = sp.z - a.g.position.z, d = Math.hypot(ax, az);
        if (d > 0.01 && d < 0.95) beweeg(sp, (ax / d) * (0.95 - d) * 0.5, (az / d) * (0.95 - d) * 0.5, sp.y);
      }
      const h = vloerHoogte(sp.x, sp.z, sp.y);
      sp.y = sp.y < h ? Math.min(h, sp.y + 6 * dt) : Math.max(h, sp.y - 12 * dt);
    }

    if (!spel.actief) return;
    if (gezocht > 0) { gezocht -= dt; if (gezocht <= 0) melding("De wacht is weer gerust. Gedraag je!", 3); }
    if ((gezocht > 0) !== wasGezocht) { wasGezocht = gezocht > 0; podium.classList.toggle("gezocht", wasGezocht); }
    if (dood > 0) {
      dood -= dt;
      pitch += (-1.1 - pitch) * Math.min(1, dt * 2);
      if (dood <= 0) { opnieuw(); melding("Je staat weer op. Pas op voor de bijlen!", 3); }
    } else if (heli.inzit) {
      vliegHeli(dt);
    } else {
      if (nu - laatsteSchade > 4 && leven < 100) { leven = Math.min(100, leven + 6 * dt); tekenHud(); }
      if (toetsen.has("ArrowLeft")) yaw += 2.2 * dt;
      if (toetsen.has("ArrowRight")) yaw -= 2.2 * dt;
      const vooruit = (toetsen.has("KeyW") || toetsen.has("ArrowUp") ? 1 : 0) - (toetsen.has("KeyS") || toetsen.has("ArrowDown") ? 1 : 0);
      const opzij = (toetsen.has("KeyD") ? 1 : 0) - (toetsen.has("KeyA") ? 1 : 0);
      const lengte = Math.hypot(vooruit, opzij) || 1;
      const snel = (toetsen.has("ShiftLeft") || toetsen.has("ShiftRight") ? 9 : 5.2) * (inGracht(pos.x, pos.z) && pos.y < 0 ? 0.55 : 1);
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      beweeg(pos, ((fx * vooruit + rx * opzij) / lengte) * snel * dt, ((fz * vooruit + rz * opzij) / lengte) * snel * dt, pos.y);
      const h = vloerHoogte(pos.x, pos.z, pos.y);
      if (pos.y < h) { pos.y = Math.min(h, pos.y + Math.max(6 * dt, (h - pos.y) * 0.35)); vy = 0; opGrond = true; }
      else { vy -= 18 * dt; pos.y += vy * dt; if (pos.y <= h) { pos.y = h; vy = 0; opGrond = true; } else opGrond = pos.y - h < 0.05; }
      if (toetsen.has("Space") && opGrond) { vy = 6.6; opGrond = false; }
      afkoel -= dt;
      if (vuurt && afkoel <= 0) schiet();
      const loopt = (vooruit || opzij) && opGrond;
      const zwaai = loopt ? Math.sin(t * 11) : 0;
      speler.lb.rotation.x = zwaai * 0.65; speler.rb.rotation.x = -zwaai * 0.65;
      speler.la.rotation.x = -zwaai * 0.5;
      speler.lijf.position.y = Math.abs(zwaai) * 0.05;
      akFP.position.set(0.24 + Math.sin(t * 5.5) * (loopt ? 0.012 : 0.003), -0.23 + Math.abs(zwaai) * 0.012, -0.42 + terugslag * 0.06);
      akFP.rotation.x = terugslag * 0.06;
      bazFP.position.z = -0.3 + Math.min(1.5, terugslag) * 0.09;
    }
    terugslag *= Math.pow(0.0005, dt);
    speler.g.rotation.y = yaw + Math.PI;
    speler.ra.rotation.x = -1.5 - pitch;
    kijk.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const oog = tmp.set(pos.x, pos.y + OOG, pos.z);
    if (heli.inzit) {
      const hp = heli.g.position;
      if (eerstePersoon) camera.position.set(hp.x - Math.sin(yaw) * 1.4, hp.y + 1.5, hp.z - Math.cos(yaw) * 1.4);
      else { camera.position.set(hp.x, hp.y + 3.2, hp.z).addScaledVector(kijk, -13); camera.position.y = Math.max(0.6, camera.position.y); }
    } else if (eerstePersoon) {
      camera.position.copy(oog);
    } else {
      let doelAfstand = 5.6;
      for (let a = 0.6; a <= 5.6; a += 0.5) { const cy = oog.y - kijk.y * a - 1.2; if (botst(oog.x - kijk.x * a, oog.z - kijk.z * a, cy) || cy + 1.2 < vloerHoogte(oog.x - kijk.x * a, oog.z - kijk.z * a, pos.y + 0.3) + 0.2) { doelAfstand = Math.max(0.8, a - 0.5); break; } }
      camAfstand += (doelAfstand - camAfstand) * Math.min(1, dt * 12);
      camera.position.copy(oog).addScaledVector(kijk, -camAfstand);
      camera.position.y += 0.9;
      camera.position.x += Math.cos(yaw) * 0.8;
      camera.position.z += -Math.sin(yaw) * 0.8;
    }
    if (schud > 0) { schud -= dt; camera.position.x += (Math.random() - 0.5) * 0.12; camera.position.y += (Math.random() - 0.5) * 0.12; }
    camera.rotation.set(pitch + terugslag * 0.012, yaw, 0);
  };

  spel.begin = begin;
  spel.stop = stop;
  spel.wisselBeeld = wisselBeeld;
  spel.vuur = aan => { vuurt = aan; };
  spel.kijkNaar = (x, y, z) => { const dx = x - pos.x, dy = y - (pos.y + OOG), dz = z - pos.z; yaw = Math.atan2(-dx, -dz); pitch = Math.atan2(dy, Math.hypot(dx, dz)); };
  spel.staat = () => ({ gezocht: Math.round(gezocht), x: pos.x, y: pos.y, z: pos.z, leven, geraakt, geveld, eerstePersoon, wapenNr, inHeli: heli.inzit, kapot: stukken.filter(x => x.weg).length, stukken: stukken.length });
  spel.toets = c => window.dispatchEvent(new KeyboardEvent("keydown", { code: c }));
  spel.ontplof = (x, y, z) => ontplof(new THREE.Vector3(x, y, z));
  spel.zetPlek = (x, y, z) => { pos.set(x, y, z); vy = 0; };
  tekenHud();
}
