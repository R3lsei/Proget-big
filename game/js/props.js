// props.js — Bibliothèque d'objets 3D détaillés du complexe NOVA-7.
// Tout est modélisé à partir de primitives assemblées : arêtes biseautées qui
// accrochent la lumière, proportions réelles, matériaux PBR. Rien n'est un
// simple cube posé là.

import * as THREE from 'three';

// ------------------------------------------------------------------
// Géométries de base
// ------------------------------------------------------------------

/** Boîte à arêtes arrondies : le biseau capte la lumière et supprime
 *  l'aspect « cube de programmeur » des angles parfaitement vifs. */
export function roundedBox(w, h, d, radius = 0.02, segments = 2) {
  const r = Math.min(radius, w / 2.05, h / 2.05, d / 2.05);
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d - r * 2,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelSegments: segments,
    curveSegments: segments + 2,
  });
  geo.translate(0, 0, -(d - r * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Profil tourné (verrerie, bidons, pieds de tabouret). */
export function lathe(points, segments = 24) {
  const geo = new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)), segments
  );
  geo.computeVertexNormals();
  return geo;
}

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------------
// Matériaux partagés (créés une seule fois)
// ------------------------------------------------------------------
let P = null;
export function initProps() {
  if (P) return P;
  P = {
    steel: new THREE.MeshStandardMaterial({ color: 0xc3c9cd, roughness: 0.28, metalness: 0.9 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x5a6167, roughness: 0.38, metalness: 0.85 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe4e9ec, roughness: 0.08, metalness: 1 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf2f5f6, roughness: 0.4, metalness: 0.05 }),
    worktop: new THREE.MeshStandardMaterial({ color: 0x2f3a3f, roughness: 0.22, metalness: 0.15 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xdff0f2, roughness: 0.03, metalness: 0, transmission: 0.92,
      thickness: 0.25, ior: 1.5, transparent: true, opacity: 0.5,
    }),
    liquid: new THREE.MeshPhysicalMaterial({
      color: 0x3fd6a4, roughness: 0.1, transmission: 0.6,
      thickness: 0.4, transparent: true, opacity: 0.75,
      emissive: 0x18a074, emissiveIntensity: 0.25,
    }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x23282b, roughness: 0.92, metalness: 0 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0xdfe4e6, roughness: 0.55, metalness: 0 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xe8b53a, roughness: 0.5, metalness: 0.3 }),
    screenOn: new THREE.MeshStandardMaterial({
      color: 0x0d1a17, emissive: 0x2fe0a0, emissiveIntensity: 0.8, roughness: 0.15,
    }),
  };
  return P;
}

// ------------------------------------------------------------------
// Verrerie de laboratoire
// ------------------------------------------------------------------

/** Bécher / erlenmeyer avec liquide à l'intérieur. */
export function beaker(height = 0.16, radius = 0.05, filled = true) {
  const g = new THREE.Group();
  const p = initProps();
  const glass = mesh(lathe([
    [0, 0], [radius, 0], [radius, 0.012],
    [radius * 0.94, 0.012], [radius * 0.94, height * 0.92],
    [radius * 1.04, height], [radius * 0.98, height],
    [radius * 0.88, height * 0.9], [radius * 0.88, 0.02], [0, 0.02],
  ], 20), p.glass);
  g.add(glass);
  if (filled) {
    const lvl = height * (0.3 + Math.random() * 0.35);
    const liq = mesh(new THREE.CylinderGeometry(radius * 0.87, radius * 0.87, lvl, 20), p.liquid.clone());
    liq.material.color = new THREE.Color().setHSL(0.25 + Math.random() * 0.5, 0.7, 0.5);
    liq.material.emissive = liq.material.color.clone().multiplyScalar(0.4);
    liq.position.y = 0.02 + lvl / 2;
    g.add(liq);
  }
  return g;
}

/** Tube à essai sur portoir. */
export function testTubeRack(count = 5) {
  const g = new THREE.Group();
  const p = initProps();
  const w = count * 0.045 + 0.03;
  g.add(mesh(roundedBox(w, 0.015, 0.06, 0.004), p.plastic, 0, 0.055, 0));
  g.add(mesh(roundedBox(w, 0.012, 0.06, 0.004), p.plastic, 0, 0.006, 0));
  for (const sx of [-w / 2 + 0.012, w / 2 - 0.012]) {
    g.add(mesh(roundedBox(0.012, 0.06, 0.06, 0.004), p.plastic, sx, 0.03, 0));
  }
  for (let i = 0; i < count; i++) {
    const x = -w / 2 + 0.03 + i * 0.045;
    const tube = mesh(lathe([
      [0, 0], [0.014, 0.006], [0.014, 0.1], [0.012, 0.1], [0.012, 0.008], [0, 0.004],
    ], 14), p.glass, x, 0.03, 0);
    g.add(tube);
    const liq = mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.035, 14), p.liquid.clone(), x, 0.05, 0);
    liq.material.color = new THREE.Color().setHSL(Math.random(), 0.75, 0.5);
    liq.material.emissive = liq.material.color.clone().multiplyScalar(0.35);
    g.add(liq);
  }
  return g;
}

/** Microscope : le prop qui « fait » laboratoire. */
export function microscope() {
  const g = new THREE.Group();
  const p = initProps();
  g.add(mesh(lathe([[0, 0], [0.07, 0], [0.07, 0.018], [0.05, 0.026], [0, 0.026]], 20), p.darkSteel));
  const arm = mesh(roundedBox(0.035, 0.16, 0.05, 0.012), p.darkSteel, 0.028, 0.1, -0.01);
  arm.rotation.x = -0.12;
  g.add(arm);
  g.add(mesh(roundedBox(0.075, 0.008, 0.07, 0.003), p.steel, -0.005, 0.085, 0.012));
  const tube = mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.1, 16), p.chrome, 0.005, 0.175, 0.01);
  tube.rotation.x = 0.28;
  g.add(tube);
  const eye = mesh(new THREE.CylinderGeometry(0.013, 0.017, 0.05, 16), p.darkSteel, -0.012, 0.222, -0.02);
  eye.rotation.x = -0.9;
  g.add(eye);
  const turret = mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.022, 16), p.darkSteel, 0.012, 0.122, 0.017);
  g.add(turret);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const obj = mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.035, 10), p.chrome,
      0.012 + Math.cos(a) * 0.014, 0.098, 0.017 + Math.sin(a) * 0.014);
    g.add(obj);
  }
  const knob = mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 14), p.steel, 0.05, 0.06, -0.01);
  knob.rotation.z = Math.PI / 2;
  g.add(knob);
  return g;
}

// ------------------------------------------------------------------
// Mobilier
// ------------------------------------------------------------------

/** Paillasse de laboratoire : plan de travail, tiroirs, piètement, plinthe. */
export function labBench(width = 2.4, depth = 0.75, height = 0.9) {
  const g = new THREE.Group();
  const p = initProps();
  // caisson
  g.add(mesh(roundedBox(width, height - 0.12, depth - 0.06, 0.01), p.white, 0, (height - 0.12) / 2 + 0.1, 0));
  // plan de travail débordant, chant marqué
  g.add(mesh(roundedBox(width + 0.04, 0.045, depth, 0.012), p.worktop, 0, height + 0.02, 0));
  // plinthe en retrait : le meuble « décolle » du sol
  g.add(mesh(roundedBox(width - 0.12, 0.1, depth - 0.16, 0.006), p.darkSteel, 0, 0.05, 0));
  // façades de tiroirs avec poignées
  const drawers = Math.max(1, Math.round(width / 0.6));
  const dw = (width - 0.06) / drawers;
  for (let i = 0; i < drawers; i++) {
    const x = -width / 2 + 0.03 + dw * (i + 0.5);
    for (let r = 0; r < 3; r++) {
      const y = 0.22 + r * 0.22;
      g.add(mesh(roundedBox(dw - 0.02, 0.19, 0.012, 0.006), p.white, x, y, (depth - 0.06) / 2 + 0.006));
      const handle = mesh(new THREE.CylinderGeometry(0.006, 0.006, dw * 0.45, 10), p.chrome,
        x, y + 0.06, (depth - 0.06) / 2 + 0.022);
      handle.rotation.z = Math.PI / 2;
      g.add(handle);
    }
  }
  return g;
}

/** Tabouret de labo à vérin, assise ronde et piètement étoile. */
export function labStool(height = 0.62) {
  const g = new THREE.Group();
  const p = initProps();
  g.add(mesh(lathe([[0, 0], [0.02, 0], [0.02, 0.03], [0.05, 0.035], [0.05, 0.05], [0, 0.05]], 20), p.darkSteel));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = mesh(roundedBox(0.19, 0.022, 0.035, 0.008), p.darkSteel,
      Math.cos(a) * 0.11, 0.028, Math.sin(a) * 0.11);
    leg.rotation.y = -a;
    g.add(leg);
    const caster = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.016, 12), p.rubber,
      Math.cos(a) * 0.2, 0.022, Math.sin(a) * 0.2);
    caster.rotation.z = Math.PI / 2;
    caster.rotation.y = -a;
    g.add(caster);
  }
  g.add(mesh(new THREE.CylinderGeometry(0.022, 0.026, height - 0.14, 16), p.chrome, 0, height / 2, 0));
  g.add(mesh(lathe([
    [0, 0], [0.15, 0], [0.16, 0.012], [0.16, 0.045], [0.145, 0.055], [0, 0.055],
  ], 24), p.rubber, 0, height - 0.09, 0));
  return g;
}

/** Terminal informatique : écran incliné sur pied, clavier, unité centrale. */
export function terminal(screenW = 0.52, screenH = 0.33) {
  const g = new THREE.Group();
  const p = initProps();
  g.add(mesh(lathe([[0, 0], [0.11, 0], [0.11, 0.014], [0.05, 0.02], [0, 0.02]], 20), p.darkSteel));
  const stem = mesh(roundedBox(0.05, 0.16, 0.035, 0.012), p.darkSteel, 0, 0.1, -0.02);
  g.add(stem);
  const bezel = mesh(roundedBox(screenW, screenH, 0.028, 0.008), p.darkSteel, 0, 0.19 + screenH / 2, 0);
  bezel.rotation.x = -0.14;
  g.add(bezel);
  const glass = mesh(new THREE.PlaneGeometry(screenW - 0.03, screenH - 0.03), p.screenOn.clone(), 0, 0, 0.016);
  bezel.add(glass);
  g.userData.screen = glass;
  // clavier incliné devant
  const kb = mesh(roundedBox(0.4, 0.016, 0.15, 0.005), p.plastic, 0, 0.012, 0.24);
  kb.rotation.x = -0.05;
  g.add(kb);
  return g;
}

/** Baie de serveurs : montants, façades ventilées, poignée, roulettes. */
export function serverRack(width = 0.62, height = 2.1, depth = 1.0) {
  const g = new THREE.Group();
  const p = initProps();
  g.add(mesh(roundedBox(width, height, depth, 0.012), p.darkSteel, 0, height / 2, 0));
  // porte avant grillagée
  g.add(mesh(roundedBox(width - 0.04, height - 0.12, 0.02, 0.006), p.steel, 0, height / 2, depth / 2 + 0.012));
  const handle = mesh(roundedBox(0.02, 0.16, 0.03, 0.008), p.chrome, width / 2 - 0.06, height / 2, depth / 2 + 0.035);
  g.add(handle);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 12), p.rubber,
      sx * (width / 2 - 0.06), 0.026, sz * (depth / 2 - 0.08));
    c.rotation.z = Math.PI / 2;
    g.add(c);
  }
  return g;
}

/** Caisse de transport cerclée métal. */
export function crate(size = 0.9) {
  const g = new THREE.Group();
  const p = initProps();
  const body = new THREE.MeshStandardMaterial({ color: 0x6f6047, roughness: 0.88, metalness: 0.05 });
  g.add(mesh(roundedBox(size, size, size, size * 0.02), body, 0, size / 2, 0));
  const t = size * 0.045;
  for (const sy of [size * 0.22, size * 0.78]) {
    for (const [w, d] of [[size + 0.008, t], [t, size + 0.008]]) {
      const band = mesh(new THREE.BoxGeometry(w, t, d === t ? size + 0.008 : t), p.darkSteel, 0, sy, 0);
      g.add(band);
    }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(mesh(roundedBox(t * 1.4, size, t * 1.4, 0.004), p.darkSteel,
      sx * size / 2, size / 2, sz * size / 2));
  }
  return g;
}

/** Bidon métallique nervuré. */
export function drum(height = 0.88, radius = 0.29) {
  const p = initProps();
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8a828, roughness: 0.42, metalness: 0.55 });
  g.add(mesh(lathe([
    [0, 0], [radius * 0.95, 0], [radius * 0.95, 0.03], [radius, 0.05],
    [radius, height * 0.25], [radius * 1.03, height * 0.3], [radius, height * 0.35],
    [radius, height * 0.65], [radius * 1.03, height * 0.7], [radius, height * 0.75],
    [radius, height - 0.05], [radius * 0.95, height - 0.03], [radius * 0.95, height], [0, height],
  ], 28), mat));
  return g;
}

/** Tuyauterie avec coudes et colliers de fixation. */
export function pipeRun(length, radius = 0.06, mat = null) {
  const p = initProps();
  const m = mat || p.steel;
  const g = new THREE.Group();
  const tube = mesh(new THREE.CylinderGeometry(radius, radius, length, 16), m);
  tube.rotation.x = Math.PI / 2;
  g.add(tube);
  const clamps = Math.max(2, Math.floor(length / 3));
  for (let i = 0; i < clamps; i++) {
    const z = -length / 2 + (length / (clamps - 1 || 1)) * i;
    const c = mesh(new THREE.TorusGeometry(radius * 1.18, radius * 0.22, 8, 18), p.darkSteel, 0, 0, z);
    c.rotation.y = Math.PI / 2;
    c.rotation.x = Math.PI / 2;
    g.add(c);
  }
  return g;
}

/** Caméra de surveillance sur rotule. */
export function securityCamera() {
  const g = new THREE.Group();
  const p = initProps();
  g.add(mesh(lathe([[0, 0], [0.055, 0], [0.055, 0.012], [0.03, 0.018], [0, 0.018]], 18), p.white));
  const arm = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.12, 12), p.white, 0, -0.06, 0);
  g.add(arm);
  const head = new THREE.Group();
  head.position.y = -0.13;
  const body = mesh(roundedBox(0.13, 0.12, 0.26, 0.025), p.white, 0, 0, -0.04);
  head.add(body);
  const hood = mesh(roundedBox(0.15, 0.03, 0.2, 0.012), p.white, 0, 0.07, -0.02);
  head.add(hood);
  const barrel = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.06, 20), p.darkSteel, 0, 0, -0.19);
  barrel.rotation.x = Math.PI / 2;
  head.add(barrel);
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1418, roughness: 0.03, metalness: 0.2, clearcoat: 1,
  });
  const lens = mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.01, 20), lensMat, 0, 0, -0.222);
  lens.rotation.x = Math.PI / 2;
  head.add(lens);
  const led = mesh(new THREE.SphereGeometry(0.009, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2222, emissiveIntensity: 3 }),
    0.045, 0.045, -0.16);
  head.add(led);
  g.add(head);
  g.userData.head = head;
  g.userData.led = led;
  return g;
}

/** Lecteur de badge mural. */
export function badgeReader() {
  const g = new THREE.Group();
  const p = initProps();
  g.add(mesh(roundedBox(0.13, 0.2, 0.045, 0.014), p.white, 0, 0, 0));
  g.add(mesh(roundedBox(0.09, 0.055, 0.01, 0.006), p.darkSteel, 0, -0.04, 0.026));
  const led = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 16),
    new THREE.MeshStandardMaterial({ color: 0x200000, emissive: 0xff2222, emissiveIntensity: 2.5 }),
    0, 0.055, 0.026);
  led.rotation.x = Math.PI / 2;
  g.add(led);
  g.userData.led = led;
  return g;
}

/** Lavabo inox avec robinet col-de-cygne. */
export function sink() {
  const g = new THREE.Group();
  const p = initProps();
  g.add(mesh(roundedBox(0.5, 0.4, 0.42, 0.02), p.white, 0, 0.55, 0));
  g.add(mesh(lathe([
    [0, 0.06], [0.19, 0.06], [0.2, 0.07], [0.2, 0.1], [0.19, 0.1],
    [0.18, 0.09], [0.18, 0.02], [0.05, 0], [0, 0],
  ], 22), p.steel, 0, 0.76, 0));
  const spout = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -0.14), new THREE.Vector3(0, 0.14, -0.14),
      new THREE.Vector3(0, 0.2, -0.08), new THREE.Vector3(0, 0.19, 0),
    ]), 20, 0.012, 10),
    p.chrome
  );
  spout.position.y = 0.86;
  spout.castShadow = true;
  g.add(spout);
  return g;
}

/** Lit de cellule : cadre tubulaire, matelas, couverture. */
export function cot(length = 1.95, width = 0.82) {
  const g = new THREE.Group();
  const p = initProps();
  const frame = p.darkSteel;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 10), frame,
      sx * (width / 2 - 0.05), 0.15, sz * (length / 2 - 0.06)));
  }
  g.add(mesh(roundedBox(width, 0.05, length, 0.012), frame, 0, 0.32, 0));
  const mattress = new THREE.MeshStandardMaterial({ color: 0xb9c3c0, roughness: 0.96, metalness: 0 });
  g.add(mesh(roundedBox(width - 0.06, 0.1, length - 0.08, 0.04), mattress, 0, 0.4, 0));
  const blanket = new THREE.MeshStandardMaterial({ color: 0x5d6f75, roughness: 1, metalness: 0 });
  g.add(mesh(roundedBox(width - 0.04, 0.045, length * 0.55, 0.03), blanket, 0, 0.463, length * 0.2));
  const pillow = new THREE.MeshStandardMaterial({ color: 0xe8edee, roughness: 0.95 });
  g.add(mesh(roundedBox(width * 0.55, 0.07, 0.3, 0.05), pillow, 0, 0.475, -length / 2 + 0.24));
  return g;
}

/** Armoire vitrée sécurisée. */
export function cabinet(w = 1.05, h = 2.0, d = 0.5) {
  const g = new THREE.Group();
  const p = initProps();
  g.add(mesh(roundedBox(w, h, d, 0.012), p.white, 0, h / 2, 0));
  const frame = mesh(roundedBox(w - 0.1, h * 0.66, 0.03, 0.008), p.darkSteel, 0, h * 0.56, d / 2 + 0.005);
  g.add(frame);
  const pane = mesh(new THREE.PlaneGeometry(w - 0.18, h * 0.62), p.glass, 0, h * 0.56, d / 2 + 0.028);
  pane.castShadow = false;
  g.add(pane);
  g.userData.pane = pane;
  const handle = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.22, 10), p.chrome, w / 2 - 0.09, h * 0.42, d / 2 + 0.04);
  g.add(handle);
  g.add(mesh(roundedBox(w - 0.1, 0.03, d - 0.08, 0.006), p.darkSteel, 0, h * 0.2, 0.01));
  return g;
}

/** Badge d'accès posé dans l'armoire. */
export function badge() {
  const g = new THREE.Group();
  const p = initProps();
  const card = new THREE.MeshStandardMaterial({ color: 0xf0c33c, roughness: 0.35, metalness: 0.2 });
  g.add(mesh(roundedBox(0.086, 0.054, 0.004, 0.006), card));
  g.add(mesh(roundedBox(0.03, 0.022, 0.002, 0.003), p.chrome, -0.02, 0.008, 0.003));
  return g;
}

/** Grille d'aération à lames. */
export function vent(w = 0.55, h = 0.8) {
  const g = new THREE.Group();
  const p = initProps();
  g.add(mesh(roundedBox(w, h, 0.02, 0.008), p.darkSteel));
  const slats = Math.floor(h / 0.07);
  for (let i = 0; i < slats; i++) {
    const s = mesh(roundedBox(w - 0.07, 0.035, 0.022, 0.004), p.steel,
      0, -h / 2 + 0.05 + i * 0.07, 0.012);
    s.rotation.x = -0.42;
    g.add(s);
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const screw = mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.008, 8), p.chrome,
      sx * (w / 2 - 0.022), sy * (h / 2 - 0.028), 0.014);
    screw.rotation.x = Math.PI / 2;
    g.add(screw);
  }
  return g;
}

/** Berger allemand stylisé mais anatomiquement crédible. */
export function guardDog() {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x4a3a29, roughness: 0.95, metalness: 0 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x241b13, roughness: 0.96, metalness: 0 });

  const torso = mesh(lathe([
    [0, -0.34], [0.1, -0.33], [0.15, -0.2], [0.16, 0], [0.145, 0.2], [0.1, 0.32], [0, 0.34],
  ], 18), fur, 0, 0.52, 0);
  torso.rotation.z = Math.PI / 2;
  g.add(torso);
  g.add(mesh(roundedBox(0.2, 0.24, 0.26, 0.09), dark, -0.12, 0.5, 0)); // arrière-train

  const neck = mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.18, 14), fur, 0.32, 0.6, 0);
  neck.rotation.z = -0.7;
  g.add(neck);
  const head = mesh(roundedBox(0.17, 0.14, 0.13, 0.045), fur, 0.44, 0.68, 0);
  g.add(head);
  const muzzle = mesh(lathe([[0, 0], [0.05, 0], [0.045, 0.09], [0.032, 0.13], [0, 0.13]], 14), dark, 0.52, 0.655, 0);
  muzzle.rotation.z = -Math.PI / 2;
  g.add(muzzle);
  g.add(mesh(new THREE.SphereGeometry(0.017, 10, 8), dark, 0.658, 0.658, 0)); // truffe
  for (const ez of [-0.05, 0.05]) {
    const ear = mesh(new THREE.ConeGeometry(0.038, 0.1, 4), fur, 0.4, 0.775, ez);
    ear.rotation.x = ez > 0 ? 0.12 : -0.12;
    g.add(ear);
  }
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0a0805, roughness: 0.15, emissive: 0x140800 });
  const eyes = [];
  for (const ez of [-0.052, 0.052]) {
    const e = mesh(new THREE.SphereGeometry(0.016, 10, 8), eyeMat, 0.505, 0.702, ez);
    g.add(e); eyes.push(e);
  }

  const legs = [];
  for (const [lx, lz, front] of [[0.24, -0.09, 1], [0.24, 0.09, 1], [-0.19, -0.09, 0], [-0.19, 0.09, 0]]) {
    const leg = new THREE.Group();
    leg.position.set(lx, 0.44, lz);
    const upper = mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.24, 10), fur, 0, -0.12, 0);
    leg.add(upper);
    const lower = mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.18, 10), fur, 0, -0.31, front ? 0 : 0.02);
    leg.add(lower);
    leg.add(mesh(roundedBox(0.07, 0.045, 0.095, 0.02), dark, 0, -0.415, front ? 0.012 : 0.03));
    g.add(leg);
    legs.push(leg);
  }

  const tail = new THREE.Group();
  tail.position.set(-0.31, 0.55, 0);
  const tailMesh = mesh(new THREE.CylinderGeometry(0.035, 0.014, 0.36, 10), fur, -0.15, -0.06, 0);
  tailMesh.rotation.z = 1.15;
  tail.add(tailMesh);
  g.add(tail);

  g.userData = { legs, tail, eyes };
  return g;
}

/** Chariot médical à roulettes (habille les couloirs). */
export function trolley() {
  const g = new THREE.Group();
  const p = initProps();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.72, 10), p.chrome,
      sx * 0.24, 0.36, sz * 0.17));
    const c = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.018, 12), p.rubber,
      sx * 0.24, 0.032, sz * 0.17);
    c.rotation.z = Math.PI / 2;
    g.add(c);
  }
  for (const y of [0.34, 0.72]) {
    g.add(mesh(roundedBox(0.56, 0.022, 0.42, 0.008), p.steel, 0, y, 0));
  }
  const bar = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 10), p.chrome, 0, 0.86, -0.17);
  bar.rotation.z = Math.PI / 2;
  g.add(bar);
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 10), p.chrome, sx * 0.25, 0.79, -0.17));
  }
  return g;
}
