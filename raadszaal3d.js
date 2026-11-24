import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const KLEUR = { archmage: 0x9a7bff, engineer: 0xe08a3c, guardian_keeper: 0x5aa2ea, historian: 0xc99a5b, oracle: 0xee6aa8, beast_master: 0x6cc164, koning: 0xe5b04c, mens: 0xef6b6b };
const NAAM = { archmage: "Archmage", engineer: "Engineer", guardian_keeper: "Guardian Keeper", historian: "Historian", oracle: "Oracle", beast_master: "Beast Master", koning: "Koning", mens: "Mens" };
const GEWAAD = { archmage: 0x4b34a8, engineer: 0x6e4524, guardian_keeper: 0x8fa3b8, historian: 0x6b4a2b, oracle: 0x5a1a4c, beast_master: 0x3f6b35, koning: 0x8e1f3a, mens: 0x7c7598 };
const ROLLEN = ["archmage", "beast_master", "engineer", "guardian_keeper", "historian", "oracle"];
const HUID = 0xf1c9a5;
const rustig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const SPREEKPUNT = new THREE.Vector3(0, 0, 0.5);
const KONING_PLEK = new THREE.Vector3(0, 0, -4.1);
const STRAAL = 4.7;

const podium = document.querySelector(".podium");
const houder = document.getElementById("stage3d");
const hex = k => "#" + k.toString(16).padStart(6, "0");

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
houder.appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.domElement.className = "labels3d";
houder.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120f26);
scene.fog = new THREE.Fog(0x120f26, 16, 38);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
camera.position.set(0, 6.4, 11.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.1, -0.8);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 4.5;
controls.maxDistance = 20;
controls.maxPolarAngle = 1.38;
controls.autoRotate = !rustig;
controls.autoRotateSpeed = 0.28;
let laatsteAanraking = -99;
controls.addEventListener("start", () => { laatsteAanraking = klok.elapsedTime; });

const mat = (kleur, extra = {}) => new THREE.MeshStandardMaterial({ color: kleur, roughness: 0.72, metalness: 0.05, flatShading: true, ...extra });
const metaal = kleur => new THREE.MeshStandardMaterial({ color: kleur, roughness: 0.3, metalness: 0.85 });
const gloei = (kleur, sterkte = 1.8, extra = {}) => new THREE.MeshStandardMaterial({ color: kleur, emissive: kleur, emissiveIntensity: sterkte, roughness: 0.4, ...extra });
function stuk(geo, materiaal, x = 0, y = 0, z = 0, schaduw = true) {
  const m = new THREE.Mesh(geo, materiaal);
  m.position.set(x, y, z);
  m.castShadow = schaduw;
  m.receiveShadow = true;
  return m;
}

scene.add(new THREE.HemisphereLight(0xa99cf0, 0x2a2350, 1.5));
const haard = new THREE.PointLight(0xffd9a0, 40, 22, 1.5);
haard.position.set(0, 6, 0.5);
scene.add(haard);
const sterGeo = new THREE.BufferGeometry();
const sterPos = new Float32Array(900 * 3);
for (let i = 0; i < 900; i++) {
  const u = Math.random() * Math.PI * 2, v = Math.acos(Math.random() * 0.95);
  sterPos.set([Math.sin(v) * Math.cos(u) * 45, Math.cos(v) * 45, Math.sin(v) * Math.sin(u) * 45], i * 3);
}
sterGeo.setAttribute("position", new THREE.BufferAttribute(sterPos, 3));
const sterren = new THREE.Points(sterGeo, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 0.22, fog: false, transparent: true, opacity: 0.9 }));
scene.add(sterren);
const maanBol = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 24), new THREE.MeshBasicMaterial({ color: 0xfff1cf, fog: false }));
maanBol.position.set(-14, 17, -30);
scene.add(maanBol);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.6, 0.72);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const maan = new THREE.DirectionalLight(0xaebcff, 1.1);
maan.position.set(6, 13, 7);
maan.castShadow = true;
maan.shadow.mapSize.set(1024, 1024);
Object.assign(maan.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
maan.shadow.bias = -0.0008;
scene.add(maan);
const spreekLicht = new THREE.SpotLight(0xfff0d0, 0, 14, 0.42, 0.6, 1.2);
spreekLicht.position.set(0, 8, 2.5);
spreekLicht.target.position.copy(SPREEKPUNT);
scene.add(spreekLicht, spreekLicht.target);
const koningsLicht = new THREE.SpotLight(0xffcf7a, 0, 16, 0.38, 0.5, 1.1);
koningsLicht.position.set(0, 9, -1.5);
koningsLicht.target.position.copy(KONING_PLEK);
scene.add(koningsLicht, koningsLicht.target);

function vloerTextuur() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d");
  g.fillStyle = "#26224a";
  g.fillRect(0, 0, 1024, 1024);
  for (let ring = 0; ring < 9; ring++) {
    const r1 = 60 + ring * 52, r2 = r1 + 52, stukken = 10 + ring * 6;
    for (let s = 0; s < stukken; s++) {
      const a1 = (s / stukken) * Math.PI * 2, a2 = ((s + 1) / stukken) * Math.PI * 2;
      const l = 30 + Math.random() * 10;
      g.fillStyle = `hsl(${248 + Math.random() * 10}, 28%, ${l * 0.5}%)`;
      g.beginPath();
      g.arc(512, 512, r2 - 2, a1 + 0.004, a2 - 0.004);
      g.arc(512, 512, r1 + 2, a2 - 0.004, a1 + 0.004, true);
      g.closePath();
      g.fill();
    }
  }
  g.fillStyle = "#1f1b3d";
  g.beginPath(); g.arc(512, 512, 60, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const vloer = stuk(new THREE.CircleGeometry(10, 72), new THREE.MeshStandardMaterial({ map: vloerTextuur(), roughness: 0.92 }), 0, 0, 0, false);
vloer.rotation.x = -Math.PI / 2;
scene.add(vloer);

const runeMat = new THREE.MeshBasicMaterial({ color: 0x5fe1d9, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
const runeRing = new THREE.Mesh(new THREE.RingGeometry(3.35, 3.45, 160), runeMat);
runeRing.rotation.x = -Math.PI / 2;
runeRing.position.y = 0.012;
scene.add(runeRing);
const runen = new THREE.Group();
for (let i = 0; i < 36; i++) {
  const a = (i / 36) * Math.PI * 2;
  const r = stuk(new THREE.BoxGeometry(i % 3 ? 0.06 : 0.12, 0.012, 0.22), runeMat, Math.sin(a) * 3.05, 0.012, Math.cos(a) * 3.05, false);
  r.rotation.y = a;
  runen.add(r);
}
scene.add(runen);
const dais = stuk(new THREE.CylinderGeometry(1.25, 1.38, 0.14, 48), mat(0x3a345f, { flatShading: false }), SPREEKPUNT.x, 0.07, SPREEKPUNT.z);
scene.add(dais);
const daisRing = new THREE.Mesh(new THREE.RingGeometry(1.02, 1.12, 96), new THREE.MeshBasicMaterial({ color: 0xffcf7a, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
daisRing.rotation.x = -Math.PI / 2;
daisRing.position.set(SPREEKPUNT.x, 0.145, SPREEKPUNT.z);
scene.add(daisRing);

function maakTroon() {
  const t = new THREE.Group();
  const goud = metaal(0xd9a441);
  t.add(stuk(new THREE.BoxGeometry(1.7, 0.3, 1.2), mat(0x3a345f), 0, 0.15, 0));
  t.add(stuk(new THREE.BoxGeometry(1.25, 0.5, 0.9), mat(0x6f1630), 0, 0.55, 0.05));
  t.add(stuk(new THREE.BoxGeometry(1.3, 2.6, 0.22), mat(0x6f1630), 0, 1.6, -0.42));
  t.add(stuk(new THREE.BoxGeometry(1.42, 0.12, 0.28), goud, 0, 2.95, -0.42));
  for (const x of [-0.71, 0.71]) {
    t.add(stuk(new THREE.BoxGeometry(0.1, 2.7, 0.28), goud, x, 1.6, -0.42));
    t.add(stuk(new THREE.BoxGeometry(0.16, 0.5, 0.9), mat(0x4a1222), x * 0.95, 0.75, 0.05));
  }
  for (const [x, h] of [[-0.45, 0.35], [0, 0.55], [0.45, 0.35]]) t.add(stuk(new THREE.ConeGeometry(0.11, h, 6), goud, x, 3.05 + h / 2, -0.42));
  t.add(stuk(new THREE.SphereGeometry(0.1, 12, 8), gloei(0xc2264b, 1.2), 0, 3.4, -0.42));
  t.position.copy(KONING_PLEK).add(new THREE.Vector3(0, 0, -0.75));
  return t;
}
scene.add(maakTroon());

const kaarsLichten = [];
for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2 + Math.PI / 10;
  const x = Math.sin(a) * 9, z = Math.cos(a) * 9;
  const zuil = new THREE.Group();
  zuil.add(stuk(new THREE.CylinderGeometry(0.34, 0.42, 7, 10), mat(0x2f2a52), 0, 3.5, 0));
  zuil.add(stuk(new THREE.BoxGeometry(1, 0.25, 1), mat(0x3a345f), 0, 0.12, 0));
  zuil.add(stuk(new THREE.CylinderGeometry(0.28, 0.2, 0.12, 10), metaal(0x8a6a2e), 0, 2.2, 0.42));
  zuil.add(stuk(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), mat(0xf6e7c4, { flatShading: false }), 0, 2.4, 0.42));
  const vlam = stuk(new THREE.ConeGeometry(0.05, 0.16, 8), gloei(0xffb347, 3), 0, 2.63, 0.42, false);
  zuil.add(vlam);
  zuil.position.set(x, 0, z);
  zuil.lookAt(0, 0, 0);
  scene.add(zuil);
  if (i % 2 === 0) {
    const l = new THREE.PointLight(0xffb565, 2.4, 9, 1.6);
    l.position.set(x * 0.94, 2.75, z * 0.94);
    scene.add(l);
    kaarsLichten.push({ licht: l, vlam, fase: Math.random() * 10 });
  } else kaarsLichten.push({ licht: null, vlam, fase: Math.random() * 10 });
}

const stofGeo = new THREE.BufferGeometry();
const STOF = rustig ? 160 : 520;
const stofPos = new Float32Array(STOF * 3), stofKleur = new Float32Array(STOF * 3), stofSnel = new Float32Array(STOF);
const kleurA = new THREE.Color(0x5fe1d9), kleurB = new THREE.Color(0xffcf7a), kleurC = new THREE.Color(0xee6aa8);
for (let i = 0; i < STOF; i++) {
  const r = Math.sqrt(Math.random()) * 8.5, a = Math.random() * Math.PI * 2;
  stofPos.set([Math.sin(a) * r, Math.random() * 6, Math.cos(a) * r], i * 3);
  const k = [kleurA, kleurB, kleurC][i % 3];
  stofKleur.set([k.r, k.g, k.b], i * 3);
  stofSnel[i] = 0.08 + Math.random() * 0.25;
}
stofGeo.setAttribute("position", new THREE.BufferAttribute(stofPos, 3));
stofGeo.setAttribute("color", new THREE.BufferAttribute(stofKleur, 3));
const stof = new THREE.Points(stofGeo, new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(stof);

const KRISTAL_PLEK = new THREE.Vector3(0, 5.3, 0.5);
const kristal = new THREE.Group();
const kristalKern = stuk(new THREE.OctahedronGeometry(0.42), gloei(0x5fe1d9, 2.2, { flatShading: true }), 0, 0, 0, false);
kristal.add(kristalKern);
const kristalRingen = [0.75, 0.92, 1.1].map((r, i) => {
  const m = stuk(new THREE.TorusGeometry(r, 0.018, 8, 64), metaal(0xe5b04c), 0, 0, 0, false);
  m.rotation.set(i * 1.1, i * 0.7, 0);
  kristal.add(m);
  return m;
});
const kristalLicht = new THREE.PointLight(0x5fe1d9, 6, 9, 1.8);
kristal.add(kristalLicht);
kristal.position.copy(KRISTAL_PLEK);
scene.add(kristal);
const band = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x5fe1d9, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
band.frustumCulled = false;
scene.add(band);
let kristalPuls = 0, volgendeSter = 4;
const kristalKleur = new THREE.Color(0x5fe1d9), doelKleur = new THREE.Color();
const gemmen = [], vallend = [];

function wimpelTextuur(rol) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 280;
  const g = c.getContext("2d");
  g.fillStyle = hex(GEWAAD[rol] ?? 0x555555);
  g.fillRect(0, 0, 128, 280);
  g.fillStyle = hex(KLEUR[rol] ?? 0x999999);
  g.fillRect(0, 0, 128, 18);
  g.beginPath(); g.moveTo(0, 250); g.lineTo(64, 280); g.lineTo(128, 250); g.lineTo(128, 280); g.lineTo(0, 280); g.fill();
  g.beginPath(); g.arc(64, 110, 38, 0, Math.PI * 2); g.lineWidth = 7; g.strokeStyle = hex(KLEUR[rol] ?? 0x999999); g.stroke();
  g.font = "bold 46px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText((NAAM[rol] || "?")[0], 64, 113);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function maakFiguur(rol) {
  const kleur = KLEUR[rol] ?? 0x999999, gewaad = GEWAAD[rol] ?? 0x7c7598;
  const g = new THREE.Group(), lijf = new THREE.Group();
  g.add(lijf);
  const been = x => {
    const p = new THREE.Group();
    p.position.set(x, 0.56, 0);
    p.add(stuk(new THREE.CapsuleGeometry(0.085, 0.34, 4, 8), mat(0x2b2240), 0, -0.28, 0));
    p.add(stuk(new THREE.BoxGeometry(0.15, 0.08, 0.25), mat(0x3a2a1c), 0, -0.52, 0.04));
    lijf.add(p);
    return p;
  };
  const lb = been(-0.12), rb = been(0.12);
  lijf.add(stuk(new THREE.CylinderGeometry(0.27, 0.45, 0.88, 18), mat(gewaad), 0, 0.86, 0));
  const schouders = stuk(new THREE.SphereGeometry(0.31, 18, 12), mat(gewaad), 0, 1.24, 0);
  schouders.scale.set(1, 0.72, 0.9);
  lijf.add(schouders);
  const riem = stuk(new THREE.TorusGeometry(0.33, 0.035, 8, 26), mat(kleur, { flatShading: false }), 0, 0.98, 0);
  riem.rotation.x = Math.PI / 2;
  lijf.add(riem);
  const arm = x => {
    const p = new THREE.Group();
    p.position.set(x, 1.27, 0);
    p.add(stuk(new THREE.CapsuleGeometry(0.075, 0.4, 4, 8), mat(gewaad), 0, -0.26, 0));
    p.add(stuk(new THREE.SphereGeometry(0.078, 10, 8), mat(HUID, { flatShading: false }), 0, -0.52, 0));
    lijf.add(p);
    return p;
  };
  const la = arm(-0.34), ra = arm(0.34);
  const nek = new THREE.Group();
  nek.position.y = 1.42;
  lijf.add(nek);
  const huid = rol === "oracle" ? 0xc9a0b8 : HUID;
  nek.add(stuk(new THREE.SphereGeometry(0.26, 22, 16), mat(huid, { flatShading: false }), 0, 0.22, 0));
  const oogMat = rol === "oracle" ? gloei(0x9ff7ff, 3) : new THREE.MeshStandardMaterial({ color: 0x241811, roughness: 0.3 });
  const ogen = [-0.09, 0.09].map(x => { const o = stuk(new THREE.SphereGeometry(rol === "oracle" ? 0.045 : 0.034, 10, 8), oogMat, x, 0.25, 0.232, false); nek.add(o); return o; });
  const mond = stuk(new THREE.SphereGeometry(0.035, 8, 6), mat(0x5a2a22, { flatShading: false }), 0, 0.12, rol === "koning" || rol === "archmage" ? 0.275 : 0.25, false);
  mond.scale.set(1.3, 0.3, 0.5);
  nek.add(mond);
  if (rol !== "oracle") nek.add(stuk(new THREE.SphereGeometry(0.04, 8, 6), mat(0xe0a88a, { flatShading: false }), 0, 0.19, 0.255, false));
  const extra = {};
  const goud = metaal(0xe5b04c);

  if (rol === "koning") {
    const kroon = new THREE.Group();
    kroon.add(stuk(new THREE.CylinderGeometry(0.2, 0.22, 0.11, 18, 1, true), goud, 0, 0, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      kroon.add(stuk(new THREE.ConeGeometry(0.045, 0.15, 6), goud, Math.sin(a) * 0.2, 0.12, Math.cos(a) * 0.2));
      kroon.add(stuk(new THREE.SphereGeometry(0.028, 8, 6), gloei(i % 2 ? 0x2f7fd0 : 0xc2264b, 0.8), Math.sin(a) * 0.215, 0, Math.cos(a) * 0.215, false));
    }
    kroon.position.y = 0.44;
    nek.add(kroon);
    const baard = stuk(new THREE.ConeGeometry(0.2, 0.42, 14), mat(0xece6de), 0, 0.03, 0.12);
    baard.rotation.x = Math.PI;
    nek.add(baard);
    const kraag = stuk(new THREE.TorusGeometry(0.29, 0.085, 8, 22), mat(0xf4efe6, { flatShading: false }), 0, 1.37, 0);
    kraag.rotation.x = Math.PI / 2;
    lijf.add(kraag);
    const mantel = stuk(new THREE.CylinderGeometry(0.34, 0.66, 1.2, 22, 1, true, Math.PI * 0.6, Math.PI * 0.8), mat(0x6f1630, { side: THREE.DoubleSide }), 0, 0.82, -0.02);
    lijf.add(mantel);
    ra.add(stuk(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), goud, 0, -0.42, 0.08));
    ra.add(stuk(new THREE.SphereGeometry(0.075, 12, 8), gloei(0xc2264b, 1.4), 0, -0.05, 0.08));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 8, 40), gloei(0xffcf7a, 3, { transparent: true, opacity: 0 }));
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.78;
    nek.add(halo);
    extra.halo = halo;
  }
  if (rol === "archmage") {
    const rand = stuk(new THREE.CylinderGeometry(0.44, 0.44, 0.03, 26), mat(0x3b2690), 0, 0.42, 0);
    nek.add(rand);
    const hoed = stuk(new THREE.ConeGeometry(0.27, 0.8, 18), mat(0x5a3fd0), 0.04, 0.82, -0.02);
    hoed.rotation.z = -0.16;
    nek.add(hoed);
    for (const [x, y, z] of [[0.12, 0.7, 0.18], [-0.1, 0.9, 0.12], [0.04, 1.05, 0.06]]) nek.add(stuk(new THREE.OctahedronGeometry(0.045), gloei(0xffd977, 1.6), x, y, z, false));
    const baard = stuk(new THREE.ConeGeometry(0.2, 0.66, 14), mat(0xf2f0ea), 0, -0.07, 0.12);
    baard.rotation.x = Math.PI;
    nek.add(baard);
    la.add(stuk(new THREE.CylinderGeometry(0.035, 0.04, 1.85, 8), mat(0x8a5a2b), 0, -0.32, 0.06));
    const bol = stuk(new THREE.SphereGeometry(0.11, 16, 12), gloei(0xb9f6ff, 2.6), 0, 0.66, 0.06, false);
    la.add(bol);
    const l = new THREE.PointLight(0x9ff7ff, 1.4, 3.5, 2);
    l.position.set(0, 0.66, 0.06);
    la.add(l);
    extra.bol = bol;
  }
  if (rol === "engineer") {
    for (let i = 0; i < 7; i++) {
      const a = -1.2 + i * 0.4;
      const p = stuk(new THREE.ConeGeometry(0.06, 0.18, 6), mat(0x7a2e1a), Math.sin(a) * 0.17, 0.43, Math.cos(a) * 0.05 - 0.04);
      p.rotation.z = -a * 0.5;
      nek.add(p);
    }
    const band = stuk(new THREE.TorusGeometry(0.262, 0.025, 6, 26), mat(0x3b2a1e), 0, 0.33, 0);
    band.rotation.x = Math.PI / 2 - 0.15;
    nek.add(band);
    for (const x of [-0.1, 0.1]) {
      const lens = stuk(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 16), gloei(0x6fd6e6, 0.8), x, 0.37, 0.21, false);
      lens.rotation.x = Math.PI / 2 - 0.3;
      nek.add(lens);
      const rand = stuk(new THREE.TorusGeometry(0.078, 0.02, 6, 16), metaal(0xb8873a), x, 0.37, 0.215, false);
      rand.rotation.x = -0.3;
      nek.add(rand);
    }
    lijf.add(stuk(new THREE.BoxGeometry(0.4, 0.52, 0.03), mat(0x8f5b30), 0, 0.82, 0.37));
    const tandwiel = stuk(new THREE.TorusGeometry(0.075, 0.03, 6, 10), metaal(0xe0b25a), 0, 1.14, 0.29);
    lijf.add(tandwiel);
    extra.tandwiel = tandwiel;
    ra.add(stuk(new THREE.BoxGeometry(0.045, 0.46, 0.045), metaal(0x9aa4ae), 0, -0.68, 0.06));
    ra.add(stuk(new THREE.TorusGeometry(0.06, 0.022, 6, 12, Math.PI * 1.5), metaal(0x9aa4ae), 0, -0.94, 0.06));
  }
  if (rol === "guardian_keeper") {
    const helm = stuk(new THREE.SphereGeometry(0.29, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), metaal(0xb6c4d3), 0, 0.24, 0);
    nek.add(helm);
    nek.add(stuk(new THREE.BoxGeometry(0.04, 0.2, 0.04), metaal(0x9fb0c2), 0, 0.25, 0.285));
    const pluim = stuk(new THREE.CapsuleGeometry(0.06, 0.36, 4, 8), mat(0x3d7fd6), 0, 0.6, -0.12);
    pluim.rotation.x = -0.95;
    nek.add(pluim);
    for (const x of [-0.34, 0.34]) {
      const s = stuk(new THREE.SphereGeometry(0.15, 12, 8), metaal(0xa9bccf), x, 1.33, 0);
      s.scale.set(1, 0.7, 1);
      lijf.add(s);
    }
    const schild = stuk(new THREE.CylinderGeometry(0.29, 0.29, 0.05, 22), mat(0x2c5f9e), -0.05, -0.36, 0.2);
    schild.rotation.x = Math.PI / 2;
    la.add(schild);
    la.add(stuk(new THREE.SphereGeometry(0.07, 10, 8), goud, -0.05, -0.36, 0.24));
    ra.add(stuk(new THREE.CylinderGeometry(0.022, 0.022, 2, 8), mat(0x8a5a2b), 0, -0.25, 0.07));
    ra.add(stuk(new THREE.ConeGeometry(0.06, 0.22, 8), metaal(0xdfe6ee), 0, 0.85, 0.07));
  }
  if (rol === "historian") {
    for (const x of [-0.23, 0.23]) {
      const pluk = stuk(new THREE.SphereGeometry(0.09, 10, 8), mat(0xf2efe8), x, 0.2, -0.04);
      pluk.scale.set(0.8, 1, 1.2);
      nek.add(pluk);
    }
    for (const x of [-0.09, 0.09]) nek.add(stuk(new THREE.TorusGeometry(0.058, 0.012, 6, 18), metaal(0x3a2a1c), x, 0.25, 0.25, false));
    nek.add(stuk(new THREE.BoxGeometry(0.06, 0.012, 0.012), metaal(0x3a2a1c), 0, 0.25, 0.255, false));
    const veer = stuk(new THREE.ConeGeometry(0.035, 0.36, 6), mat(0xffffff), 0.27, 0.36, -0.02);
    veer.rotation.z = -0.55;
    nek.add(veer);
    const rol_ = stuk(new THREE.CylinderGeometry(0.07, 0.07, 0.52, 14), mat(0xefe3c6, { flatShading: false }), 0, -0.56, 0.12);
    rol_.rotation.z = Math.PI / 2;
    la.add(rol_);
    la.add(stuk(new THREE.CylinderGeometry(0.074, 0.074, 0.06, 14), mat(0xb3263d), 0, -0.56, 0.12));
    const kraag = stuk(new THREE.TorusGeometry(0.27, 0.05, 8, 22), mat(0xefe3c6), 0, 1.37, 0);
    kraag.rotation.x = Math.PI / 2;
    lijf.add(kraag);
  }
  if (rol === "oracle") {
    const kap = stuk(new THREE.SphereGeometry(0.36, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(0x5a1a4c, { side: THREE.DoubleSide }), 0, 0.22, -0.03);
    kap.scale.set(1, 1.18, 1.05);
    kap.rotation.x = -0.25;
    nek.add(kap);
    nek.add(stuk(new THREE.OctahedronGeometry(0.045), gloei(0xee6aa8, 2.4), 0, 0.37, 0.24, false));
    const bol = stuk(new THREE.SphereGeometry(0.15, 22, 16), gloei(0x7fe6ff, 1.6, { transparent: true, opacity: 0.88 }), 0, 1.02, 0.5, false);
    lijf.add(bol);
    const l = new THREE.PointLight(0x7fe6ff, 1.6, 3.5, 2);
    l.position.copy(bol.position);
    lijf.add(l);
    extra.bol = bol;
    extra.bolLicht = l;
    la.rotation.x = -0.85;
    ra.rotation.x = -0.85;
    extra.armen = -0.85;
  }
  if (rol === "beast_master") {
    const tak = (zijde) => {
      const t = new THREE.Group();
      const kleurGewei = mat(0xd9b27a);
      const hoofdTak = stuk(new THREE.CylinderGeometry(0.022, 0.03, 0.5, 6), kleurGewei, 0, 0.25, 0);
      t.add(hoofdTak);
      for (const [y, h] of [[0.2, 0.22], [0.36, 0.18]]) {
        const s = stuk(new THREE.CylinderGeometry(0.015, 0.02, h, 6), kleurGewei, zijde * 0.06, y + h / 3, 0);
        s.rotation.z = -zijde * 0.9;
        t.add(s);
      }
      t.position.set(zijde * 0.14, 0.4, 0);
      t.rotation.z = -zijde * 0.55;
      nek.add(t);
    };
    tak(-1); tak(1);
    const vacht = stuk(new THREE.TorusGeometry(0.3, 0.1, 8, 22), mat(0x8a6239), 0, 1.36, 0);
    vacht.rotation.x = Math.PI / 2;
    lijf.add(vacht);
    const baard = stuk(new THREE.SphereGeometry(0.17, 12, 10), mat(0x6d4a2a), 0, 0.1, 0.15);
    baard.scale.set(1, 0.8, 0.6);
    nek.add(baard);
    const uil = new THREE.Group();
    uil.add(stuk(new THREE.SphereGeometry(0.12, 14, 10), mat(0x9a7350), 0, 0, 0));
    const kop = new THREE.Group();
    kop.position.y = 0.14;
    kop.add(stuk(new THREE.SphereGeometry(0.095, 14, 10), mat(0x9a7350), 0, 0, 0));
    for (const x of [-0.042, 0.042]) {
      kop.add(stuk(new THREE.SphereGeometry(0.036, 10, 8), mat(0xfff8e1, { flatShading: false }), x, 0.01, 0.075, false));
      kop.add(stuk(new THREE.SphereGeometry(0.018, 8, 6), mat(0x1a120c), x, 0.01, 0.104, false));
      const oor = stuk(new THREE.ConeGeometry(0.025, 0.07, 5), mat(0x9a7350), x * 1.6, 0.09, 0);
      kop.add(oor);
    }
    const bek = stuk(new THREE.ConeGeometry(0.018, 0.04, 5), mat(0xf2a33a), 0, -0.025, 0.1, false);
    bek.rotation.x = Math.PI / 2 + 0.4;
    kop.add(bek);
    uil.add(kop);
    uil.position.set(0.36, 1.5, 0);
    lijf.add(uil);
    extra.uilKop = kop;
    const blad = stuk(new THREE.ConeGeometry(0.06, 0.2, 4), mat(0x7fcf6a), -0.36, 1.42, 0.05);
    blad.rotation.z = 1.1;
    lijf.add(blad);
  }

  const tagEl = document.createElement("div");
  tagEl.className = "tag3d";
  tagEl.style.setProperty("--kleur", hex(kleur));
  tagEl.textContent = NAAM[rol] || rol;
  const tag = new CSS2DObject(tagEl);
  tag.position.set(0, rol === "archmage" ? 2.7 : rol === "koning" ? 2.45 : 2.3, 0);
  g.add(tag);
  const ballonEl = document.createElement("div");
  ballonEl.className = "ballon3d";
  ballonEl.style.setProperty("--kleur", hex(kleur));
  const ballon = new CSS2DObject(ballonEl);
  ballon.center.set(0.5, 1);
  ballon.position.set(0, rol === "archmage" ? 3.05 : 2.75, 0);
  g.add(ballon);

  const voetRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 48), new THREE.MeshBasicMaterial({ color: kleur, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  voetRing.rotation.x = -Math.PI / 2;
  voetRing.position.y = 0.03;
  g.add(voetRing);

  const leylijn = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 1), new THREE.MeshBasicMaterial({ color: kleur, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false }));
  leylijn.visible = rol !== "koning";
  scene.add(leylijn);
  return { ogen, mond, hop: 0, juich: 0, stapTijd: 0, leylijn, rol, g, lijf, lb, rb, la, ra, nek, extra, tagEl, ballonEl, voetRing, thuis: new THREE.Vector3(), kijkThuis: 0, doel: new THREE.Vector3(), wachters: [], spreekt: 0, leest: 0, loopt: false, fase: Math.random() * 10, zichtbaar: true, decor: null, boek: null };
}

function maakDecor(rol) {
  const d = new THREE.Group();
  d.add(stuk(new THREE.CylinderGeometry(0.34, 0.38, 0.46, 18), mat(0x3a345f), 0, 0.23, 0));
  d.add(stuk(new THREE.CylinderGeometry(0.33, 0.33, 0.1, 18), mat(KLEUR[rol] ?? 0x888888, { flatShading: false }), 0, 0.5, 0));
  d.add(stuk(new THREE.CylinderGeometry(0.04, 0.05, 3.3, 8), metaal(0x8a6a2e), 0, 1.65, -1.25));
  d.add(stuk(new THREE.SphereGeometry(0.08, 10, 8), metaal(0xe5b04c), 0, 3.35, -1.25));
  const wimpelGeo = new THREE.PlaneGeometry(0.9, 1.9, 1, 10);
  const wimpel = stuk(wimpelGeo, new THREE.MeshStandardMaterial({ map: wimpelTextuur(rol), side: THREE.DoubleSide, roughness: 0.85 }), 0.47, 2.2, -1.25);
  d.add(wimpel);
  d.userData.wimpel = wimpel;
  d.userData.basis = Float32Array.from(wimpelGeo.attributes.position.array);
  return d;
}

function maakBoek() {
  const b = new THREE.Group();
  const kaft = stuk(new THREE.BoxGeometry(0.5, 0.04, 0.36), mat(0x6b2a2a), 0, 0, 0, false);
  b.add(kaft);
  for (const s of [-1, 1]) {
    const blad = stuk(new THREE.BoxGeometry(0.23, 0.02, 0.32), gloei(0xfff3d1, 0.6), s * 0.12, 0.03, 0, false);
    blad.rotation.z = s * -0.18;
    b.add(blad);
  }
  const l = new THREE.PointLight(0xffe7a8, 1.2, 2.5, 2);
  l.position.y = 0.15;
  b.add(l);
  b.position.y = 2.15;
  b.visible = false;
  return b;
}

const figuren = {};
for (const rol of [...ROLLEN, "koning"]) {
  const f = maakFiguur(rol);
  figuren[rol] = f;
  scene.add(f.g);
  f.boek = maakBoek();
  f.g.add(f.boek);
  if (rol !== "koning") { f.decor = maakDecor(rol); scene.add(f.decor); }
}
const koning = figuren.koning;
koning.thuis.copy(KONING_PLEK);
koning.kijkThuis = 0;
koning.g.position.copy(KONING_PLEK);
koning.doel.copy(KONING_PLEK);
koning.kijkNa = 0;

function hoekenVoor(n) {
  if (n <= 0) return [];
  const links = Math.ceil(n / 2), rechts = n - links;
  const reeks = (k, van, tot) => k === 1 ? [(van + tot) / 2] : Array.from({ length: k }, (_, i) => van + (tot - van) * i / (k - 1));
  return [...reeks(links, -120, -50), ...reeks(rechts, 50, 120)];
}

function plaatsRaad(rollen) {
  const actief = rollen.filter(r => figuren[r]);
  const hoeken = hoekenVoor(actief.length);
  for (const r of ROLLEN) {
    const f = figuren[r];
    const i = actief.indexOf(r);
    f.zichtbaar = i >= 0;
    f.g.visible = f.zichtbaar;
    f.decor.visible = f.zichtbaar;
    f.leylijn.visible = f.zichtbaar;
    f.tagEl.style.visibility = f.zichtbaar ? "" : "hidden";
    if (i < 0) continue;
    const a = THREE.MathUtils.degToRad(hoeken[i]);
    f.thuis.set(Math.sin(a) * STRAAL, 0, -Math.cos(a) * STRAAL);
    f.kijkThuis = Math.atan2(-f.thuis.x, -f.thuis.z);
    f.g.position.copy(f.thuis);
    f.doel.copy(f.thuis);
    f.g.rotation.y = f.kijkThuis;
    f.kijkNa = f.kijkThuis;
    f.leylijn.visible = true;
    f.leylijn.position.set((f.thuis.x + SPREEKPUNT.x) / 2, 0.02, (f.thuis.z + SPREEKPUNT.z) / 2);
    f.leylijn.scale.z = f.thuis.distanceTo(SPREEKPUNT);
    f.leylijn.lookAt(f.thuis.x, 0.02, f.thuis.z);
    f.decor.position.set(Math.sin(a) * (STRAAL + 0.85), 0, -Math.cos(a) * (STRAAL + 0.85));
    f.decor.rotation.y = f.kijkThuis;
  }
}
plaatsRaad(ROLLEN);

let audio = null, geluidAan = false;
function toon(freq, duur = 0.6, type = "sine", volume = 0.12, vertraging = 0) {
  if (!geluidAan) return;
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  const t0 = audio.currentTime + vertraging;
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duur);
  o.connect(g).connect(audio.destination);
  o.start(t0);
  o.stop(t0 + duur + 0.05);
}
const klank = {
  roep: () => { toon(660, 0.5, "triangle", 0.1); toon(990, 0.8, "triangle", 0.08, 0.13); },
  stap: () => toon(180 + Math.random() * 40, 0.08, "sine", 0.03),
  spreek: () => { toon(523, 0.3, "sine", 0.06); toon(784, 0.4, "sine", 0.04, 0.08); },
  boek: () => toon(1320, 0.18, "sine", 0.035),
  stop: () => { toon(392, 0.6, "triangle", 0.08); toon(523, 0.9, "triangle", 0.07, 0.2); },
  verdict: () => { for (const [i, f] of [130.8, 196, 261.6, 329.6, 392].entries()) toon(f, 3.2, "sine", 0.09, i * 0.05); },
  bliksem: () => { toon(70, 0.5, "sawtooth", 0.06); toon(110, 0.3, "square", 0.03, 0.05); },
};

const orbs = [], vonken = [], bliksems = [], golven = [];
function gem(f) {
  const m = stuk(new THREE.OctahedronGeometry(0.09), gloei(KLEUR[f.rol] ?? 0xffffff, 3), 0, 0, 0, false);
  const van = borst(f);
  m.position.copy(van);
  scene.add(m);
  gemmen.push({ m, van, t: 0, zij: (Math.random() - 0.5) * 2 });
}
function vuurwerk() {
  const kleuren = [0xe5b04c, 0x9a7bff, 0xee6aa8, 0x5aa2ea, 0x6cc164, 0xe08a3c, 0x5fe1d9];
  const gen = generatie;
  for (let i = 0; i < 9; i++) setTimeout(() => {
    if (gen !== generatie) return;
    vonkenBij(new THREE.Vector3((Math.random() - 0.5) * 9, 3.5 + Math.random() * 3, -2 + (Math.random() - 0.5) * 6), kleuren[i % kleuren.length], 70);
    toon(200 + Math.random() * 300, 0.25, "triangle", 0.05);
  }, 300 + i * 520);
}
function intocht() {
  if (rustig) return;
  const gen = generatie;
  ROLLEN.filter(r => figuren[r].zichtbaar).forEach((r, i) => {
    const f = figuren[r];
    if (f.g.position.distanceTo(SPREEKPUNT) < 0.1) return;
    const deur = new THREE.Vector3(f.thuis.x * 0.25, 0, 9.4 + i * 0.5);
    f.g.position.copy(deur);
    f.doel.copy(deur);
    f.g.rotation.y = Math.PI;
    setTimeout(() => { if (gen === generatie && f.doel.distanceTo(deur) < 0.01) { f.doel.copy(f.thuis); f.kijkNa = f.kijkThuis; } }, 300 + i * 380);
  });
}
function schokgolf(pos, kleur, groei = 5, begin = 1) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 64), new THREE.MeshBasicMaterial({ color: kleur, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, 0.05, pos.z);
  scene.add(ring);
  ring.scale.setScalar(begin);
  golven.push({ ring, leeftijd: 0, groei, begin });
}
let confetti = null, straalBundel = null;

function vuurOrb(van, naar, kleur = 0x5fe1d9) {
  return new Promise(klaar => {
    const bol = stuk(new THREE.SphereGeometry(0.13, 16, 12), gloei(kleur, 3), 0, 0, 0, false);
    const licht = new THREE.PointLight(kleur, 3, 4, 2);
    bol.add(licht);
    scene.add(bol);
    const midden = van.clone().lerp(naar, 0.5).add(new THREE.Vector3(0, 2.6, 0));
    const curve = new THREE.QuadraticBezierCurve3(van.clone(), midden, naar.clone());
    const spoor = Array.from({ length: 14 }, (_, i) => {
      const s = stuk(new THREE.SphereGeometry(0.07 * (1 - i / 16), 8, 6), new THREE.MeshBasicMaterial({ color: kleur, transparent: true, opacity: 0.6 * (1 - i / 14), blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0, 0, false);
      scene.add(s);
      return s;
    });
    orbs.push({ bol, curve, spoor, t: 0, duur: 1.25, klaar, geschiedenis: [] });
  });
}

function vonkenBij(pos, kleur, aantal = 26) {
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(aantal * 3), v = [];
  for (let i = 0; i < aantal; i++) {
    p.set([pos.x, pos.y, pos.z], i * 3);
    v.push(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const punten = new THREE.Points(geo, new THREE.PointsMaterial({ color: kleur, size: 0.09, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(punten);
  vonken.push({ punten, v, leeftijd: 0 });
}

function startConfetti(rond) {
  if (confetti) scene.remove(confetti.punten);
  const n = rustig ? 120 : 420;
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3), k = new Float32Array(n * 3), v = [];
  const kleuren = [0xe5b04c, 0xffcf7a, 0x9a7bff, 0xee6aa8, 0x5aa2ea, 0x6cc164, 0xe08a3c, 0x5fe1d9].map(c => new THREE.Color(c));
  for (let i = 0; i < n; i++) {
    p.set([rond.x + (Math.random() - 0.5) * 6, 5 + Math.random() * 3, rond.z + (Math.random() - 0.5) * 6], i * 3);
    const c = kleuren[i % kleuren.length];
    k.set([c.r, c.g, c.b], i * 3);
    v.push(0.6 + Math.random() * 1.4);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(k, 3));
  const punten = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 1, depthWrite: false }));
  scene.add(punten);
  confetti = { punten, v, leeftijd: 0 };
}

function gouden_straal(aan) {
  if (!straalBundel) {
    straalBundel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.5, 14, 36, 1, true), new THREE.MeshBasicMaterial({ color: 0xffcf7a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    scene.add(straalBundel);
  }
  straalBundel.userData.doel = aan ? 0.28 : 0;
}

function bliksem(a, b) {
  const geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 14 }, () => new THREE.Vector3()));
  const lijn = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }));
  scene.add(lijn);
  const licht = new THREE.PointLight(0xff6b6b, 3, 6, 2);
  scene.add(licht);
  bliksems.push({ lijn, licht, a, b, leeftijd: 0, duur: 2.4 });
  klank.bliksem();
}

const borst = f => f.g.position.clone().add(new THREE.Vector3(0, 1.25, 0));
const hand = f => { const v = new THREE.Vector3(0.35, 1.0, 0.25); return f.g.localToWorld(v); };

let generatie = 0, tijdschaal = 1, focus = null, verdictActief = false, denker = null;
const wachtrij = [];
let verwerker = null;

function slaap(ms) {
  const gen = generatie;
  return new Promise(r => setTimeout(() => r(gen === generatie), ms / tijdschaal));
}

function loopNaar(f, doel, kijk = null) {
  f.doel.copy(doel);
  f.kijkNa = kijk;
  if (f.g.position.distanceTo(doel) < 0.05) return Promise.resolve();
  return new Promise(r => f.wachters.push(r));
}

function zeg(f, tekst, duur) {
  f.ballonEl.textContent = tekst;
  f.ballonEl.classList.toggle("denkt", tekst === "…");
  f.ballonEl.classList.add("zichtbaar");
  f.spreekt = duur;
}
function zwijg(f) {
  f.ballonEl.classList.remove("zichtbaar", "denkt");
  f.spreekt = 0;
}

const schoon = t => String(t ?? "").replace(/```[\s\S]*?```/g, " ").replace(/[#*`|>_]/g, " ").replace(/\s+/g, " ").trim();
const kort = (t, n) => { const s = schoon(t); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const hoeksnelheid = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

async function speelBeurt(b, trace) {
  const gen = generatie;
  const f = figuren[b.spreker];
  if (b.soort === "bestand" || b.soort === "toolcall") {
    if (!f) return;
    f.leest = Math.max(f.leest, b.soort === "bestand" ? 0.9 : 1.6);
    klank.boek();
    await slaap(b.soort === "bestand" ? 180 : 650);
    return;
  }
  if (b.soort === "routering") {
    focus = koning;
    koning.wijst = 1.6;
    if (b.aan && figuren[b.aan]) {
      const doel = figuren[b.aan];
      klank.roep();
      zeg(koning, `De ${NAAM[b.aan]}, ${kort(b.vraag, 110)}`, 3.2 / tijdschaal);
      await vuurOrb(hand(koning), borst(doel));
      if (gen !== generatie) return;
      vonkenBij(borst(doel), KLEUR[b.aan] ?? 0x5fe1d9, 40);
      schokgolf(doel.g.position, KLEUR[b.aan] ?? 0x5fe1d9);
      doel.hop = 0.75;
      for (const r of ROLLEN) if (r !== b.aan && figuren[r].g.position.distanceTo(figuren[r].thuis) > 0.2) loopNaar(figuren[r], figuren[r].thuis, figuren[r].kijkThuis);
      focus = doel;
      await loopNaar(doel, SPREEKPUNT, null);
      if (gen !== generatie) return;
      zwijg(koning);
    } else {
      klank.stop();
      zeg(koning, "Ik sluit het debat.", 3 / tijdschaal);
      for (const r of ROLLEN) loopNaar(figuren[r], figuren[r].thuis, figuren[r].kijkThuis);
      await slaap(2200);
      zwijg(koning);
    }
    return;
  }
  if (b.soort === "bericht" && b.spreker === "koning") {
    focus = koning;
    verdictActief = true;
    for (const r of ROLLEN) loopNaar(figuren[r], figuren[r].thuis, figuren[r].kijkThuis);
    await loopNaar(koning, KONING_PLEK.clone().add(new THREE.Vector3(0, 0, 1.6)), 0);
    if (gen !== generatie) return;
    klank.verdict();
    gouden_straal(true);
    startConfetti(koning.g.position);
    vuurwerk();
    for (const r of ROLLEN) { figuren[r].juich = 6; figuren[r].hop = 6; }
    for (let i = 0; i < 3; i++) setTimeout(() => schokgolf(koning.g.position, 0xffcf7a), i * 450);
    zeg(koning, "Het Verdict: " + kort(b.tekst, 190), 9 / tijdschaal);
    await slaap(5200);
    if (gen !== generatie) return;
    const twisten = (trace?.geschillen || []).map(g => Object.keys(g.standpunten || {}).filter(r => figuren[r]?.zichtbaar)).filter(rs => rs.length >= 2);
    for (const rs of twisten.slice(0, 4)) {
      bliksem(figuren[rs[0]], figuren[rs[1]]);
      if (!(await slaap(1300))) return;
    }
    await slaap(2500);
    gouden_straal(false);
    await loopNaar(koning, KONING_PLEK, 0);
    zwijg(koning);
    verdictActief = false;
    return;
  }
  if (b.soort === "bericht" && f) {
    if (f.g.position.distanceTo(SPREEKPUNT) > 0.3 && f.rol !== "koning") await loopNaar(f, SPREEKPUNT, null);
    if (gen !== generatie) return;
    focus = f;
    klank.spreek();
    const tekst = kort(b.tekst, 230);
    const duur = Math.min(9, Math.max(4, tekst.length / 34));
    zeg(f, tekst, duur / tijdschaal);
    vonkenBij(borst(f), KLEUR[f.rol] ?? 0xffffff, 18);
    schokgolf(SPREEKPUNT, KLEUR[f.rol] ?? 0xffffff);
    const aantal = Math.min(8, (b.bewijs || []).length);
    for (let i = 0; i < aantal; i++) setTimeout(() => { if (gen === generatie) gem(f); }, (600 + i * 320) / tijdschaal);
    if ((b.onbevestigd || []).length) setTimeout(() => { if (gen === generatie) { vonkenBij(borst(f), 0xff4040, 40); klank.bliksem(); } }, 900 / tijdschaal);
    await slaap(duur * 1000);
    if (gen !== generatie) return;
    zwijg(f);
    loopNaar(f, f.thuis, f.kijkThuis);
    await slaap(700);
    focus = null;
  }
}

function start_verwerker(trace) {
  if (verwerker) return;
  const token = {};
  verwerker = token;
  (async () => {
    const gen = generatie;
    while (wachtrij.length && gen === generatie) {
      tijdschaal = herbeleven ? snelheid : Math.min(6, 1 + Math.max(0, wachtrij.length - 3) * 0.8);
      const b = wachtrij.shift();
      try { await speelBeurt(b, trace); } catch (e) { console.error(e); }
    }
    if (verwerker === token) verwerker = null;
    if (gen !== generatie) return;
    tijdschaal = 1;
    if (herbeleven) eindeHerbeleven();
    synchroniseerStatus();
  })();
}

function zetThuis(alles = true) {
  for (const r of [...ROLLEN, "koning"]) {
    const f = figuren[r];
    f.g.position.copy(f.thuis);
    f.doel.copy(f.thuis);
    f.g.rotation.y = f.kijkThuis;
    f.kijkNa = f.kijkThuis;
    for (const w of f.wachters.splice(0)) w();
    zwijg(f);
    f.leest = 0;
    f.boek.visible = false;
  }
  if (alles) {
    for (const o of orbs.splice(0)) { scene.remove(o.bol); for (const s of o.spoor) scene.remove(s); o.klaar(); }
    for (const b of bliksems.splice(0)) { scene.remove(b.lijn, b.licht); }
    for (const g of golven.splice(0)) scene.remove(g.ring);
    for (const g of gemmen.splice(0)) scene.remove(g.m);
    for (const r of ROLLEN) { figuren[r].juich = 0; figuren[r].hop = 0; }
    gouden_straal(false);
    if (confetti) { scene.remove(confetti.punten); confetti = null; }
    verdictActief = false;
    focus = null;
  }
}

let huidigeRun = null, verwerkt = 0, laatsteTrace = null, herbeleven = false, snelheid = 1;
const herbeleefKnop = document.getElementById("herbeleef");

function nieuweRun(trace, snap) {
  generatie++;
  wachtrij.length = 0;
  verwerker = null;
  huidigeRun = trace.run_id;
  plaatsRaad(trace.raadsleden?.length ? trace.raadsleden : ROLLEN);
  zetThuis();
  verwerkt = snap ? (trace.beurten || []).length : 0;
  if (snap) {
    const beurten = trace.beurten || [];
    const laatsteRoute = [...beurten].reverse().find(b => b.soort === "routering");
    if (trace.status === "bezig" && laatsteRoute?.aan && figuren[laatsteRoute.aan]) {
      const nr = laatsteRoute.nr;
      const sprak = beurten.some(b => b.nr > nr && b.soort === "bericht" && b.spreker === laatsteRoute.aan);
      if (!sprak) {
        const f = figuren[laatsteRoute.aan];
        f.g.position.copy(SPREEKPUNT);
        f.doel.copy(SPREEKPUNT);
        focus = f;
      }
    }
  }
}

function synchroniseerStatus() {
  const t = laatsteTrace?.trace;
  if (!t || herbeleven) return;
  const wie = t.status === "bezig" ? t.aan_het_woord : null;
  denker = wie;
  for (const r of ROLLEN) {
    const f = figuren[r];
    if (wie === r && !f.spreekt && !wachtrij.length && f.g.position.distanceTo(SPREEKPUNT) < 0.3) zeg(f, "…", 9999);
    else if (f.ballonEl.classList.contains("denkt") && wie !== r) zwijg(f);
  }
}

function ontvang(detail) {
  laatsteTrace = detail;
  const trace = detail?.trace;
  if (!trace) return;
  if (herbeleven) return;
  const beurten = trace.beurten || [];
  if (trace.run_id !== huidigeRun) {
    const eerste = huidigeRun === null;
    nieuweRun(trace, eerste);
    intocht();
  } else if (beurten.length < verwerkt) {
    nieuweRun(trace, true);
  }
  for (let i = verwerkt; i < beurten.length; i++) wachtrij.push(beurten[i]);
  verwerkt = beurten.length;
  if (wachtrij.length) start_verwerker(trace);
  synchroniseerStatus();
  herbeleefKnop.disabled = trace.status === "bezig";
  herbeleefKnop.title = trace.status === "bezig" ? "Kan pas als de run klaar is" : "Speel het hele debat opnieuw af in de raadszaal";
}

function herbeleef() {
  const trace = laatsteTrace?.trace;
  if (!trace) return;
  if (herbeleven) { eindeHerbeleven(); nieuweRun(trace, true); return; }
  herbeleven = true;
  snelheid = Number(document.getElementById("snelheid")?.value || 1.4);
  herbeleefKnop.textContent = "Stop het afspelen";
  podium.classList.add("speelt");
  nieuweRun(trace, false);
  herbeleven = true;
  intocht();
  wachtrij.push(...(trace.beurten || []));
  verwerkt = (trace.beurten || []).length;
  start_verwerker(trace);
}
function eindeHerbeleven() {
  herbeleven = false;
  herbeleefKnop.textContent = "Herbeleef het debat";
  podium.classList.remove("speelt");
}
herbeleefKnop.addEventListener("click", herbeleef);
document.getElementById("snelheid")?.addEventListener("change", e => { snelheid = Number(e.target.value); if (herbeleven) tijdschaal = snelheid; });

const cameraKnop = document.getElementById("camerastand");
let cameraStand = rustig ? "vast" : "regie";
function zetCamera(stand) {
  cameraStand = stand;
  controls.autoRotate = stand === "rond";
  cameraKnop.textContent = { regie: "Camera: regie", rond: "Camera: draait rond", volg: "Camera: volgt de spreker", vast: "Camera: stil" }[stand];
}
cameraKnop.addEventListener("click", () => zetCamera({ regie: "rond", rond: "volg", volg: "vast", vast: "regie" }[cameraStand]));
zetCamera(cameraStand);
const geluidKnop = document.getElementById("geluid");
geluidKnop.addEventListener("click", () => { geluidAan = !geluidAan; geluidKnop.textContent = geluidAan ? "Geluid: aan" : "Geluid: uit"; if (geluidAan) klank.spreek(); });
document.getElementById("volscherm").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else podium.requestFullscreen?.().catch(() => {});
});

const klok = new THREE.Clock();
const spel = { actief: false };
const INTRO_VAN = new THREE.Vector3(9, 15, 24), INTRO_NAAR = new THREE.Vector3(0, 6.4, 11.5);
let volgendeGlitch = 10 + Math.random() * 10, glitchTot = 0;
const tijdelijk = new THREE.Vector3();

function animeer() {
  const dt = Math.min(klok.getDelta(), 0.05);
  const t = klok.elapsedTime;
  for (const r of [...ROLLEN, "koning"]) {
    const f = figuren[r];
    if (!f.g.visible) continue;
    if (f.neer > 0 && spel.neer) { spel.neer(f, dt, t); continue; }
    const pos = f.g.position;
    tijdelijk.copy(f.doel).sub(pos);
    tijdelijk.y = 0;
    const afstand = tijdelijk.length();
    const snel = 1.9 * Math.min(tijdschaal, 3);
    if (afstand > 0.04) {
      const stapje = Math.min(afstand, snel * dt);
      tijdelijk.normalize();
      pos.addScaledVector(tijdelijk, stapje);
      const richting = Math.atan2(tijdelijk.x, tijdelijk.z);
      f.g.rotation.y += hoeksnelheid(f.g.rotation.y, richting) * Math.min(1, dt * 10);
      f.loopt = true;
      const zwaai = Math.sin(t * 10 * Math.min(tijdschaal, 2));
      f.lb.rotation.x = zwaai * 0.65;
      f.rb.rotation.x = -zwaai * 0.65;
      if (f.extra.armen === undefined) { f.la.rotation.x = -zwaai * 0.5; f.ra.rotation.x = zwaai * 0.5; }
      f.lijf.position.y = Math.abs(Math.sin(t * 10)) * 0.05;
      if (Math.random() < dt * 4) klank.stap();
      f.stapTijd -= dt;
      if (f.stapTijd <= 0) { f.stapTijd = 0.22; schokgolf(pos, KLEUR[r] ?? 0xffffff, 0.9, 0.3); }
    } else {
      if (f.loopt) { f.loopt = false; for (const w of f.wachters.splice(0)) w(); }
      f.lb.rotation.x *= 0.8; f.rb.rotation.x *= 0.8;
      f.lijf.position.y = Math.sin(t * 2 + f.fase) * 0.012 + (f.hop > 0 ? Math.abs(Math.sin(f.hop * 9 + f.fase)) * 0.28 * Math.min(1, f.hop) : 0);
      let doelHoek = f.kijkNa;
      if (f.spreekt > 0 && r !== "koning") doelHoek = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z);
      if (doelHoek === null || doelHoek === undefined) doelHoek = Math.atan2(KONING_PLEK.x - pos.x, KONING_PLEK.z - pos.z);
      f.g.rotation.y += hoeksnelheid(f.g.rotation.y, doelHoek) * Math.min(1, dt * 4);
      const rustArm = f.extra.armen ?? 0;
      if (f.juich > 0) {
        f.ra.rotation.x += (-2.7 + Math.sin(t * 9 + f.fase) * 0.3 - f.ra.rotation.x) * Math.min(1, dt * 8);
        f.la.rotation.x += (-2.7 + Math.cos(t * 9 + f.fase) * 0.3 - f.la.rotation.x) * Math.min(1, dt * 8);
      } else if (f.spreekt > 0) {
        f.ra.rotation.x = -0.9 + Math.sin(t * 3.2 + f.fase) * 0.45;
        f.ra.rotation.z = 0.25 + Math.sin(t * 2.1) * 0.15;
        f.la.rotation.x = rustArm - 0.2 + Math.sin(t * 2.6 + 1) * 0.2;
      } else if (r === "koning" && f.wijst > 0) {
        f.ra.rotation.x += (-1.5 - f.ra.rotation.x) * Math.min(1, dt * 8);
      } else if (r === "koning" && verdictActief) {
        f.ra.rotation.x += (-2.6 - f.ra.rotation.x) * Math.min(1, dt * 4);
        f.la.rotation.x += (-2.6 - f.la.rotation.x) * Math.min(1, dt * 4);
      } else {
        f.ra.rotation.x += (rustArm - f.ra.rotation.x) * Math.min(1, dt * 4);
        f.la.rotation.x += (rustArm - f.la.rotation.x) * Math.min(1, dt * 4);
        f.ra.rotation.z *= 0.9;
      }
    }
    if (f.wijst > 0) f.wijst -= dt;
    if (f.hop > 0) f.hop -= dt;
    if (f.juich > 0) f.juich -= dt;
    const knip = Math.sin(t * 0.9 + f.fase * 3) > 0.985 ? 0.1 : 1;
    for (const o of f.ogen) o.scale.y = knip;
    f.mond.scale.y = f.spreekt > 0 ? 0.3 + Math.abs(Math.sin(t * 14 + f.fase)) * 0.9 : 0.3;
    f.tagEl.classList.toggle("actief", f.spreekt > 0 || denker === r);
    if (f.spreekt > 0) f.spreekt -= dt;
    let nekDoel = 0;
    if (focus && focus !== f) {
      const fp = focus.g.position;
      const wereld = Math.atan2(fp.x - pos.x, fp.z - pos.z);
      nekDoel = THREE.MathUtils.clamp(hoeksnelheid(f.g.rotation.y, wereld), -0.9, 0.9);
    }
    f.nek.rotation.y += (nekDoel - f.nek.rotation.y) * Math.min(1, dt * 5);
    f.nek.rotation.x = f.spreekt > 0 ? Math.sin(t * 6) * 0.06 : 0;
    const ringDoel = f.spreekt > 0 ? 0.9 : (denker === r ? 0.6 : 0);
    f.voetRing.material.opacity += (ringDoel * (0.7 + 0.3 * Math.sin(t * 4)) - f.voetRing.material.opacity) * Math.min(1, dt * 6);
    f.voetRing.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
    if (f.leest > 0) {
      f.leest -= dt;
      f.boek.visible = true;
      f.boek.rotation.y += dt * 1.5;
      f.boek.position.y = 2.15 + Math.sin(t * 3) * 0.06 + (r === "archmage" ? 0.4 : 0);
      f.boek.children.slice(1, 3).forEach((blad, i) => { blad.rotation.z = (i ? -1 : 1) * (0.18 + Math.abs(Math.sin(t * 9 + i)) * 0.5); });
    } else f.boek.visible = false;
    if (f.extra.bol) {
      f.extra.bol.position.y = (r === "oracle" ? 1.02 : 0.66) + Math.sin(t * 2.2) * 0.04;
      f.extra.bol.material.emissiveIntensity = 1.6 + Math.sin(t * 3) * 0.6 + (f.spreekt > 0 ? 1.2 : 0);
    }
    if (f.extra.tandwiel) f.extra.tandwiel.rotation.z += dt * 2;
    if (f.extra.uilKop) f.extra.uilKop.rotation.y = Math.sin(t * 0.7) > 0.6 ? 1.2 : Math.sin(t * 0.7) < -0.6 ? -1.2 : 0;
    if (f.extra.halo) {
      const doel = denker === "koning" || verdictActief ? 1 : 0;
      f.extra.halo.material.opacity += (doel - f.extra.halo.material.opacity) * Math.min(1, dt * 3);
      f.extra.halo.rotation.z += dt * 2;
      f.extra.halo.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    }
    const lijnDoel = (f.loopt || f.spreekt > 0 || focus === f) ? 0.95 : 0.14 + Math.sin(t * 1.5 + f.fase) * 0.05;
    f.leylijn.material.opacity += (lijnDoel - f.leylijn.material.opacity) * Math.min(1, dt * 4);
    if (f.decor) {
      const w = f.decor.userData.wimpel, basis = f.decor.userData.basis, p = w.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = basis[i * 3 + 1];
        p.setZ(i, Math.sin(t * 2 + y * 2 + f.fase) * 0.06 * (1.1 - (y + 0.95) / 1.9));
      }
      p.needsUpdate = true;
    }
  }
  koningsLicht.intensity += ((denker === "koning" || verdictActief ? 26 : 6) - koningsLicht.intensity) * Math.min(1, dt * 3);
  koningsLicht.target.position.copy(koning.g.position);
  const iemandSpreekt = ROLLEN.some(r => figuren[r].g.visible && figuren[r].g.position.distanceTo(SPREEKPUNT) < 0.4);
  spreekLicht.intensity += ((iemandSpreekt ? 30 : 0) - spreekLicht.intensity) * Math.min(1, dt * 3);
  daisRing.material.opacity = 0.35 + (iemandSpreekt ? 0.35 : 0) + Math.sin(t * 2) * 0.1;

  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.t += (dt * Math.min(tijdschaal, 3)) / o.duur;
    const p = o.curve.getPoint(Math.min(1, o.t));
    o.bol.position.copy(p);
    o.geschiedenis.unshift(p.clone());
    o.geschiedenis.length = Math.min(o.geschiedenis.length, o.spoor.length);
    o.spoor.forEach((s, k) => { if (o.geschiedenis[k]) s.position.copy(o.geschiedenis[k]); });
    if (o.t >= 1) {
      scene.remove(o.bol);
      for (const s of o.spoor) scene.remove(s);
      orbs.splice(i, 1);
      o.klaar();
    }
  }
  for (let i = vonken.length - 1; i >= 0; i--) {
    const v = vonken[i];
    v.leeftijd += dt;
    const p = v.punten.geometry.attributes.position;
    for (let k = 0; k < v.v.length; k++) {
      v.v[k].y -= 4 * dt;
      p.setXYZ(k, p.getX(k) + v.v[k].x * dt, p.getY(k) + v.v[k].y * dt, p.getZ(k) + v.v[k].z * dt);
    }
    p.needsUpdate = true;
    v.punten.material.opacity = Math.max(0, 1 - v.leeftijd / 1.1);
    if (v.leeftijd > 1.1) { scene.remove(v.punten); vonken.splice(i, 1); }
  }
  if (confetti) {
    confetti.leeftijd += dt;
    const p = confetti.punten.geometry.attributes.position;
    for (let k = 0; k < confetti.v.length; k++) {
      p.setY(k, p.getY(k) - confetti.v[k] * dt);
      p.setX(k, p.getX(k) + Math.sin(t * 3 + k) * 0.01);
      if (p.getY(k) < 0.05) p.setY(k, 0.05);
    }
    p.needsUpdate = true;
    confetti.punten.material.opacity = Math.max(0, Math.min(1, 7 - confetti.leeftijd) / 2);
    if (confetti.leeftijd > 7) { scene.remove(confetti.punten); confetti = null; }
  }
  if (straalBundel) {
    straalBundel.position.set(koning.g.position.x, 7, koning.g.position.z);
    straalBundel.material.opacity += ((straalBundel.userData.doel || 0) * (0.85 + 0.15 * Math.sin(t * 5)) - straalBundel.material.opacity) * Math.min(1, dt * 2);
    straalBundel.rotation.y += dt * 0.5;
  }
  for (let i = bliksems.length - 1; i >= 0; i--) {
    const b = bliksems[i];
    b.leeftijd += dt;
    const a = borst(b.a), c = borst(b.b);
    const p = b.lijn.geometry.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const f = k / (p.count - 1);
      const punt = a.clone().lerp(c, f);
      const schok = Math.sin(f * Math.PI) * 0.45;
      punt.add(new THREE.Vector3((Math.random() - 0.5) * schok, (Math.random() - 0.3) * schok + Math.sin(f * Math.PI) * 0.8, (Math.random() - 0.5) * schok));
      p.setXYZ(k, punt.x, punt.y, punt.z);
    }
    p.needsUpdate = true;
    b.licht.position.copy(a.clone().lerp(c, 0.5)).add(new THREE.Vector3(0, 0.8, 0));
    b.lijn.material.opacity = Math.random() > 0.2 ? Math.max(0, 1 - b.leeftijd / b.duur) : 0.1;
    b.licht.intensity = b.lijn.material.opacity * 4;
    if (b.leeftijd > b.duur) { scene.remove(b.lijn, b.licht); bliksems.splice(i, 1); }
  }

  doelKleur.setHex(focus ? (KLEUR[focus.rol] ?? 0x5fe1d9) : 0x5fe1d9);
  kristalKleur.lerp(doelKleur, Math.min(1, dt * 2));
  kristalKern.material.color.copy(kristalKleur);
  kristalKern.material.emissive.copy(kristalKleur);
  kristalLicht.color.copy(kristalKleur);
  kristalPuls = Math.max(0, kristalPuls - dt * 2);
  kristalKern.material.emissiveIntensity = 2 + Math.sin(t * 2) * 0.5 + kristalPuls * 3;
  kristal.position.y = KRISTAL_PLEK.y + Math.sin(t * 0.9) * 0.15;
  kristalKern.rotation.y += dt * 0.6;
  kristalKern.scale.setScalar(1 + kristalPuls * 0.25 + (t < glitchTot ? (Math.random() - 0.5) * 0.5 : 0));
  kristalRingen.forEach((m, i) => { m.rotation.x += dt * (0.3 + i * 0.2); m.rotation.y += dt * (0.5 - i * 0.15); });
  band.material.color.copy(kristalKleur);
  band.material.opacity += ((focus && focus.spreekt > 0 ? 0.8 : 0) - band.material.opacity) * Math.min(1, dt * 4);
  if (focus) {
    const bp = band.geometry.attributes.position, h = focus.g.position;
    bp.setXYZ(0, kristal.position.x, kristal.position.y, kristal.position.z);
    bp.setXYZ(1, h.x, h.y + 2.2, h.z);
    bp.needsUpdate = true;
  }
  for (let i = gemmen.length - 1; i >= 0; i--) {
    const g = gemmen[i];
    g.t += dt / 1.4;
    const e = Math.min(1, g.t);
    g.m.position.lerpVectors(g.van, kristal.position, e * e);
    g.m.position.x += Math.sin(e * Math.PI) * g.zij;
    g.m.rotation.y += dt * 6;
    if (g.t >= 1) { scene.remove(g.m); gemmen.splice(i, 1); kristalPuls = 1; klank.boek(); }
  }
  if (!rustig && t > volgendeSter) {
    volgendeSter = t + 4 + Math.random() * 7;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.4), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true }));
    const links = Math.random() < 0.5;
    m.position.set((links ? -1 : 1) * (6 + Math.random() * 16), 13 + Math.random() * 7, -30);
    const v = new THREE.Vector3((links ? 1 : -1) * (9 + Math.random() * 6), -4 - Math.random() * 3, 0);
    m.lookAt(m.position.clone().add(v));
    scene.add(m);
    vallend.push({ m, v, leeftijd: 0 });
  }
  for (let i = vallend.length - 1; i >= 0; i--) {
    const s = vallend[i];
    s.leeftijd += dt;
    s.m.position.addScaledVector(s.v, dt);
    s.m.material.opacity = Math.max(0, 1 - s.leeftijd / 1.1);
    if (s.leeftijd > 1.1) { scene.remove(s.m); vallend.splice(i, 1); }
  }
  for (let i = golven.length - 1; i >= 0; i--) {
    const g = golven[i];
    g.leeftijd += dt;
    g.ring.scale.setScalar(g.begin + g.leeftijd * g.groei);
    g.ring.material.opacity = Math.max(0, 0.9 - g.leeftijd / 1.2);
    if (g.leeftijd > 1.2) { scene.remove(g.ring); golven.splice(i, 1); }
  }
  sterren.rotation.y += dt * 0.004;
  if (!rustig && t < 3.4 && laatsteAanraking < 0 && !spel.actief) {
    const e = 1 - Math.pow(1 - t / 3.4, 3);
    camera.position.lerpVectors(INTRO_VAN, INTRO_NAAR, e);
  }
  const sp = stof.geometry.attributes.position;
  for (let i = 0; i < STOF; i++) {
    let y = sp.getY(i) + stofSnel[i] * dt;
    if (y > 6) y = 0;
    sp.setY(i, y);
  }
  sp.needsUpdate = true;
  stof.rotation.y += dt * 0.02;
  for (const k of kaarsLichten) {
    const flik = 0.82 + Math.sin(t * 11 + k.fase) * 0.08 + Math.sin(t * 23 + k.fase * 2) * 0.06 + Math.random() * 0.05;
    if (k.licht) k.licht.intensity = 2.4 * flik;
    k.vlam.scale.set(1, flik, 1);
  }
  runen.rotation.y += dt * 0.05;

  if (!rustig) {
    if (t > volgendeGlitch) { glitchTot = t + 0.22; volgendeGlitch = t + 12 + Math.random() * 12; }
    const glitch = t < glitchTot;
    runeMat.color.setHex(glitch ? 0xee6aa8 : 0x5fe1d9);
    renderer.domElement.style.filter = glitch ? "hue-rotate(35deg) saturate(1.7) contrast(1.15)" : "";
    if (glitch) camera.position.x += (Math.random() - 0.5) * 0.12;
  }

  spel.tik?.(dt, t);
  if (!spel.actief) {
  const sindsAanraking = t - laatsteAanraking;
  if ((cameraStand === "volg" || cameraStand === "regie") && sindsAanraking > 4) {
    const doel = focus ? focus.g.position.clone().add(new THREE.Vector3(0, 1.2, 0)) : new THREE.Vector3(0, 1.1, -0.8);
    controls.target.lerp(doel, Math.min(1, dt * 1.5));
    if (cameraStand === "regie" && focus && t > 3.6) {
      const fp = focus.g.position;
      camera.position.lerp(new THREE.Vector3(fp.x + Math.sin(t * 0.25) * 2.5, verdictActief ? 2.4 : 3.3, fp.z + (verdictActief ? 6.2 : 7.2)), Math.min(1, dt * 0.9));
    }
  } else if (cameraStand !== "volg" && sindsAanraking > 4) {
    controls.target.lerp(new THREE.Vector3(0, 1.1, -0.8), Math.min(1, dt * 0.8));
  }
  controls.autoRotate = (cameraStand === "rond" || (cameraStand === "regie" && !focus)) && sindsAanraking > 6;
  controls.update();
  }
  composer.render();
  labels.render(scene, camera);
}

function pasGrootteAan() {
  const b = houder.clientWidth, h = houder.clientHeight;
  if (!b || !h) return;
  renderer.setSize(b, h, false);
  composer.setSize(b, h);
  labels.setSize(b, h);
  camera.aspect = b / h;
  camera.fov = b < 600 ? 52 : 40;
  camera.updateProjectionMatrix();
}
new ResizeObserver(pasGrootteAan).observe(houder);
podium.classList.add("drie-d");
pasGrootteAan();
renderer.setAnimationLoop(animeer);
window.addEventListener("council-trace", e => ontvang(e.detail));
if (window.laatsteCouncil) ontvang(window.laatsteCouncil);
window.raadszaal = { herbeleef, figuren, scene, camera, spel };
import("./kasteelspel.js").then(m => m.start({ scene, camera, renderer, controls, figuren, maakFiguur, stuk, mat, metaal, gloei, vonkenBij, schokgolf, toon, podium, spel, sterren, maanBol, composer, maan })).catch(e => console.error("kasteelspel", e));
