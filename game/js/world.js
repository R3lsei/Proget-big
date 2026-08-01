// world.js — Le complexe NOVA-7 : géométrie, matériaux, lumières, props animés.
// 5 zones : cellule → couloir de détention → laboratoire → salle serveurs → hangar de sortie.

import * as THREE from 'three';
import { GLTFLoader } from '../lib/GLTFLoader.js';

export const colliders = [];        // THREE.Box3 solides
export const interactables = [];    // { id, mesh, label, dist }
const animated = [];                // callbacks update(dt, t)

let scene, flashlight;

// ------------------------------------------------------------------
// Textures procédurales (canvas) : béton, métal, sol technique, grille
// ------------------------------------------------------------------
function canvasTexture(size, painter, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  painter(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function noisePaint(ctx, s, base, variance, count = 4000) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < count; i++) {
    const v = (Math.random() - 0.5) * variance;
    ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v)})`;
    const r = Math.random() * 3 + 0.5;
    ctx.fillRect(Math.random() * s, Math.random() * s, r, r);
  }
}

function makeMaterials() {
  // murs : panneaux laqués blancs d'un laboratoire propre, joints discrets
  const panelTex = canvasTexture(512, (ctx, s) => {
    noisePaint(ctx, s, '#eef1f2', 0.035, 2500);
    ctx.strokeStyle = 'rgba(150,160,165,0.35)';
    ctx.lineWidth = 2;
    const step = s / 2;
    for (let i = 0; i <= 2; i++) { // joints de panneaux
      ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, s); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, s * 0.72); ctx.lineTo(s, s * 0.72); ctx.stroke();
    // légère usure au bas des panneaux
    const g = ctx.createLinearGradient(0, s * 0.85, 0, s);
    g.addColorStop(0, 'rgba(120,130,135,0)');
    g.addColorStop(1, 'rgba(120,130,135,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }, [2, 1]);

  // sol : grands carreaux clairs légèrement satinés
  const floorTex = canvasTexture(512, (ctx, s) => {
    noisePaint(ctx, s, '#d4d9db', 0.05, 4000);
    ctx.strokeStyle = 'rgba(120,130,135,0.5)';
    ctx.lineWidth = 3;
    const step = s / 4;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(s, i * step); ctx.stroke();
    }
  }, [3, 3]);

  const metalTex = canvasTexture(256, (ctx, s) => {
    noisePaint(ctx, s, '#b8bec2', 0.06, 3000);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 40; i++) ctx.fillRect(0, Math.random() * s, s, 1); // brossé
  });

  const rustTex = canvasTexture(256, (ctx, s) => {
    noisePaint(ctx, s, '#8a7a68', 0.12, 4000);
  });

  return {
    concrete: new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.55, metalness: 0.02 }),
    floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.06 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf4f6f7, roughness: 0.9 }),
    metal: new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.35, metalness: 0.7 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x4b5257, roughness: 0.45, metalness: 0.75 }),
    rust: new THREE.MeshStandardMaterial({ map: rustTex, roughness: 0.85, metalness: 0.25 }),
    warn: new THREE.MeshStandardMaterial({ color: 0xe8b53a, roughness: 0.55 }),
    glassy: new THREE.MeshPhysicalMaterial({ color: 0xbfe0e4, transmission: 0.7, roughness: 0.12, transparent: true, opacity: 0.45 }),
    screenOff: new THREE.MeshStandardMaterial({ color: 0x1a2225, roughness: 0.3, metalness: 0.4 }),
  };
}
let M;

// ------------------------------------------------------------------
// Aides de construction
// ------------------------------------------------------------------
function box(w, h, d, mat, x, y, z, { solid = true, shadow = true, ry = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = shadow;
  m.receiveShadow = true;
  scene.add(m);
  if (solid) colliders.push(new THREE.Box3().setFromObject(m));
  return m;
}

function slab(w, d, mat, x, y, z) { // sol / plafond (non-collider : géré par gravité)
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

// sprite circulaire doux pour les particules (flammes, halos)
let glowTex = null;
function glowSprite() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,210,140,0.75)');
  g.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

function textSign(text, w, h, color = '#35e0a1', bg = '#101614') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.round(512 * (h / w));
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = color; ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.min(64, (c.width * 0.9) / (text.length * 0.58))}px monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.65 })
  );
  scene.add(m);
  return m;
}

function ceilLight(x, y, z, { color = 0xffffff, intensity = 22, dist = 14, shadow = false } = {}) {
  // dalle lumineuse encastrée, façon plafond de laboratoire
  box(1.3, 0.06, 0.7, M.metal, x, y + 0.05, z, { solid: false, shadow: false });
  const pane = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.03, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 2.6 })
  );
  pane.position.set(x, y, z);
  scene.add(pane);
  const light = new THREE.PointLight(color, intensity, dist, 1.6);
  light.position.set(x, y - 0.3, z);
  if (shadow) {
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.bias = -0.0006;
    light.shadow.normalBias = 0.08;
  }
  scene.add(light);
  return light;
}

function registerInteract(id, mesh, label, dist = 2.6) {
  interactables.push({ id, mesh, label, dist, enabled: true });
  return mesh;
}
export function setInteractEnabled(id, on) {
  const it = interactables.find((i) => i.id === id);
  if (it) it.enabled = on;
}
export function setInteractLabel(id, label) {
  const it = interactables.find((i) => i.id === id);
  if (it) it.label = label;
}

// ------------------------------------------------------------------
// Portes coulissantes
// ------------------------------------------------------------------
const doors = {};
function slidingDoor(id, x, z, { width = 1.5, height = 2.3, ry = 0, mat = null, label = 'Porte' } = {}) {
  const g = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.12), mat || M.metal);
  panel.castShadow = true; panel.receiveShadow = true;
  panel.position.y = height / 2;
  g.add(panel);
  // bande d'état (rouge = verrouillé)
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.7, 0.06, 0.13),
    new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2222, emissiveIntensity: 1.6 })
  );
  lamp.position.set(0, height - 0.25, 0.006);
  g.add(lamp);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  scene.add(g);
  // setFromObject ne recalcule pas la matrice du parent : sans cette mise à
  // jour, le collider du panneau reste à l'origine du monde (mur invisible
  // au milieu de la cellule de départ, et portes qui ne bloquent rien).
  g.updateMatrixWorld(true);
  const collider = new THREE.Box3().setFromObject(panel);
  colliders.push(collider);
  doors[id] = { group: g, panel, lamp, collider, open: false, height };
  registerInteract(id, panel, label, 2.8);
  return g;
}

export function openDoor(id) {
  const d = doors[id];
  if (!d || d.open) return;
  d.open = true;
  d.lamp.material.emissive.set(0x22ff66);
  const idx = colliders.indexOf(d.collider);
  if (idx >= 0) colliders.splice(idx, 1);
  const start = d.group.position.y;
  let p = 0;
  animated.push((dt) => { // la porte coulisse vers le haut
    if (p >= 1) return;
    p = Math.min(1, p + dt * 0.5);
    d.group.position.y = start + easeInOut(p) * (d.height - 0.12);
  });
  setInteractEnabled(id, false);
}
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ------------------------------------------------------------------
// Construction des zones
// ------------------------------------------------------------------
function buildCell() {
  // pièce 4×4, mur nord (z=-2) percé d'une porte
  slab(4.6, 4.6, M.floor, 0, -0.1, 0);
  slab(4.6, 4.6, M.ceiling, 0, 3, 0);
  box(4.6, 3, 0.3, M.concrete, 0, 1.5, 2.15);                    // sud
  box(0.3, 3, 4.6, M.concrete, -2.15, 1.5, 0);                   // ouest
  box(0.3, 3, 4.6, M.concrete, 2.15, 1.5, 0);                    // est
  box(1.55, 3, 0.3, M.concrete, -1.525, 1.5, -2.15);             // nord gauche
  box(1.55, 3, 0.3, M.concrete, 1.525, 1.5, -2.15);              // nord droit
  box(2.9, 0.7, 0.3, M.concrete, 0, 2.65, -2.15, { solid: false }); // linteau

  slidingDoor('porte_cellule', 0, -2.15, { label: 'Porte de cellule — serrure mécanique' });

  // lit de camp
  box(0.9, 0.32, 2, M.rust, -1.55, 0.16, 0.8);
  box(0.86, 0.1, 1.9, new THREE.MeshStandardMaterial({ color: 0x4a5a52, roughness: 1 }), -1.55, 0.38, 0.8, { solid: false });
  // lavabo + toilettes
  box(0.5, 0.5, 0.4, M.metal, 1.75, 0.7, 1.6);
  box(0.45, 0.45, 0.45, M.metal, 1.75, 0.25, 0.6);
  // grille d'aération (mur est, près du sol) → conduit vers le couloir
  const vent = box(0.06, 0.8, 1.1, M.darkMetal, 2.12, 0.55, -1.2, { solid: false });
  vent.material = new THREE.MeshStandardMaterial({ color: 0x1d2422, roughness: 0.6, metalness: 0.7 });
  registerInteract('grille_cellule', vent, 'Grille d\'aération — scellée', 2.2);
  doors._vent = vent;

  // inscriptions de l'ancien occupant
  const s = textSign('SUJET 23', 1.2, 0.4, '#8a8a8a', '#3f423f');
  s.position.set(0, 1.8, 1.98); s.rotation.y = Math.PI;

  ceilLight(0, 2.95, 0, { intensity: 18, dist: 10, shadow: true });
}

export function openVent() {
  const v = doors._vent;
  if (!v) return;
  let p = 0;
  animated.push((dt) => {
    if (p >= 1) return;
    p = Math.min(1, p + dt * 1.2);
    v.rotation.z = -easeInOut(p) * 1.4;
    v.position.y = 0.55 - easeInOut(p) * 0.25;
  });
  setInteractLabel('grille_cellule', 'Conduit d\'aération ouvert');
}

function buildCorridor() {
  // couloir x∈[-1.5,1.5], z de -2 à -21
  const L = 19, zc = -11.5;
  slab(3.6, L + 0.6, M.floor, 0, -0.1, zc);
  slab(3.6, L + 0.6, M.ceiling, 0, 3, zc);
  box(0.3, 3, L, M.concrete, -1.65, 1.5, zc);
  box(0.3, 3, L, M.concrete, 1.65, 1.5, zc);
  // mur de fond percé de la porte codée (z=-21)
  box(1.1, 3, 0.3, M.concrete, -1.25, 1.5, -21.15);
  box(1.1, 3, 0.3, M.concrete, 1.25, 1.5, -21.15);
  box(3.6, 0.7, 0.3, M.concrete, 0, 2.65, -21.15, { solid: false });
  slidingDoor('porte_code', 0, -21.15, { width: 1.4, label: 'Porte sécurisée — clavier à code' });

  // fausses portes de cellules le long du couloir
  for (let i = 0; i < 4; i++) {
    const z = -4.5 - i * 4;
    for (const side of [-1, 1]) {
      const d = box(0.12, 2.2, 1.1, M.darkMetal, side * 1.56, 1.1, z, { solid: false });
      const num = textSign(`C-${20 + i * 2 + (side > 0 ? 1 : 0)}`, 0.4, 0.22, '#c9d4cf', '#20261f');
      num.position.set(side * 1.56 - side * 0.02, 2.4, z);
      num.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
  }

  // tuyauterie au plafond
  for (const px of [-1.2, -0.9]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, L - 1.2, 10), M.rust);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(px, 2.8, zc - 0.3);
    scene.add(pipe);
  }

  // panneau de bloc
  const sign = textSign('BLOC DE DÉTENTION A', 2.2, 0.5);
  sign.position.set(0, 2.5, -3.2); sign.rotation.y = 0;

  // casier du gardien (secret optionnel : un peu d'histoire)
  const locker = box(0.55, 1.7, 0.45, M.darkMetal, 1.32, 0.85, -8.2);
  registerInteract('casier', locker, 'Casier du gardien — cadenassé', 2.4);

  // caméra de surveillance (plafond, avant la porte codée)
  const camG = new THREE.Group();
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), M.darkMetal);
  arm.position.y = 0.15;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.34), M.darkMetal);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.05, 0.05, 12),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff2222, emissiveIntensity: 2 })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -0.19;
  camG.add(arm, body, lens);
  camG.position.set(1.1, 2.75, -17.5);
  scene.add(camG);
  registerInteract('cam_secu', body, 'Caméra de surveillance', 3.2);
  doors._secucam = { group: camG, lens, active: true };
  animated.push((dt, t) => {
    if (!doors._secucam.active) return;
    camG.rotation.y = Math.sin(t * 0.6) * 0.7 + 0.4;
  });

  ceilLight(0, 2.95, -4.5, { intensity: 20, dist: 11 });
  ceilLight(0, 2.95, -9, { intensity: 20, dist: 11 });
  ceilLight(0, 2.95, -13.5, { intensity: 20, dist: 11 });
  ceilLight(0, 2.95, -17.5, { intensity: 20, dist: 11, shadow: true });
  ceilLight(0, 2.95, -20.3, { intensity: 14, dist: 9 });
}

export function disableSecuCam() {
  const c = doors._secucam;
  if (!c) return;
  c.active = false;
  c.lens.material.emissive.set(0x111111);
  c.lens.material.emissiveIntensity = 0;
  let p = 0;
  animated.push((dt) => { // la caméra retombe, inerte
    if (p >= 1) return;
    p = Math.min(1, p + dt * 2);
    c.group.rotation.x = easeInOut(p) * 0.9;
  });
  setInteractEnabled('cam_secu', false);
}

function buildLab() {
  // laboratoire x∈[-7,7], z∈[-21,-35]
  slab(14.6, 14.6, M.floor, 0, -0.1, -28);
  slab(14.6, 14.6, M.ceiling, 0, 3.6, -28);
  // mur nord : prolonge le mur du fond du couloir de part et d'autre de la porte codée
  box(5.5, 3.6, 0.3, M.concrete, -4.55, 1.8, -21.15);
  box(5.5, 3.6, 0.3, M.concrete, 4.55, 1.8, -21.15);
  box(3.6, 0.7, 0.3, M.concrete, 0, 3.25, -21.15, { solid: false }); // au-dessus du couloir
  box(0.3, 3.6, 14.6, M.concrete, -7.15, 1.8, -28);
  box(0.3, 3.6, 14.6, M.concrete, 7.15, 1.8, -28);
  box(6.2, 3.6, 0.3, M.concrete, -4.2, 1.8, -35.15);
  box(6.2, 3.6, 0.3, M.concrete, 4.2, 1.8, -35.15);
  box(2.4, 0.9, 0.3, M.concrete, 0, 3.15, -35.15, { solid: false });
  slidingDoor('porte_labo_srv', 0, -35.15, { width: 2.2, label: 'Sas de service' });

  // ---- conduite de vapeur crevée balayant l'accès au sas ----
  const steamPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.8, 10), M.rust);
  steamPipe.rotation.z = Math.PI / 2;
  steamPipe.position.set(0, 2.7, -34.45);
  scene.add(steamPipe);
  registerInteract('valve_vapeur', steamPipe, 'Conduite de vapeur crevée — valve grippée', 3.2);

  const sCount = 70;
  const sgeo = new THREE.BufferGeometry();
  const spos = new Float32Array(sCount * 3);
  const sseed = new Float32Array(sCount);
  for (let i = 0; i < sCount; i++) {
    spos[i * 3] = (Math.random() - 0.5) * 2.2;
    spos[i * 3 + 1] = 2.6 - Math.random() * 2.4;
    spos[i * 3 + 2] = -34.45 + (Math.random() - 0.5) * 0.5;
    sseed[i] = 0.6 + Math.random();
  }
  sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  const smat = new THREE.PointsMaterial({
    color: 0xcfd8d4, size: 0.34, map: glowSprite(), transparent: true,
    opacity: 0.35, depthWrite: false,
  });
  const steam = new THREE.Points(sgeo, smat);
  scene.add(steam);
  doors._steam = { active: true, on: true, points: steam, mat: smat };
  animated.push((dt, t) => {
    const S = doors._steam;
    if (!S.active) return;
    S.on = (t % 4) < 2.6; // jets cycliques : 2,6 s de vapeur, 1,4 s de répit
    const target = S.on ? 0.35 : 0.03;
    S.mat.opacity += (target - S.mat.opacity) * Math.min(1, dt * 5);
    const arr = S.points.geometry.attributes.position.array;
    for (let i = 0; i < sCount; i++) {
      arr[i * 3 + 1] -= dt * sseed[i] * 1.6;
      arr[i * 3] += (Math.random() - 0.5) * dt * 0.8;
      if (arr[i * 3 + 1] < 0.05) {
        arr[i * 3 + 1] = 2.6;
        arr[i * 3] = (Math.random() - 0.5) * 0.6;
      }
    }
    S.points.geometry.attributes.position.needsUpdate = true;
  });

  const sign = textSign('LABORATOIRE 3 — BIOCONTRÔLE', 3.2, 0.55);
  sign.position.set(0, 2.9, -21.32); sign.rotation.y = Math.PI;

  // paillasses avec verrerie
  for (const [bx, bz, bw] of [[-4, -24.5, 4.5], [4, -24.5, 4.5], [-4, -31.5, 4.5], [4, -31.5, 4.5]]) {
    box(bw, 0.9, 1.4, M.metal, bx, 0.45, bz);
    box(bw, 0.06, 1.5, new THREE.MeshStandardMaterial({ color: 0xdadfdd, roughness: 0.25, metalness: 0.1 }), bx, 0.93, bz, { solid: false });
    for (let i = 0; i < 5; i++) {
      const r = 0.05 + Math.random() * 0.06;
      const flask = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.3, 0.18 + Math.random() * 0.2, 10), M.glassy);
      flask.position.set(bx - bw / 2 + 0.4 + Math.random() * (bw - 0.8), 1.08, bz + (Math.random() - 0.5) * 0.9);
      scene.add(flask);
    }
  }

  // cuves de confinement (déco vivante : bulles lumineuses)
  for (const cx of [-6.2, 6.2]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.4, 18), M.glassy);
    tank.position.set(cx, 1.3, -28);
    scene.add(tank);
    colliders.push(new THREE.Box3().setFromObject(tank));
    const glow = new THREE.PointLight(0x3fd0a0, 5, 5, 2);
    glow.position.set(cx, 1.4, -28);
    scene.add(glow);
    animated.push((dt, t) => { glow.intensity = 4.2 + Math.sin(t * 2 + cx) * 1.2; });
  }

  // ---- zone en feu : fuite chimique enflammée barrant le passage (z≈-28) ----
  const fireGroup = new THREE.Group();
  const spill = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 24),
    new THREE.MeshStandardMaterial({ color: 0x341c08, roughness: 0.4, emissive: 0xff5500, emissiveIntensity: 0.5 })
  );
  spill.rotation.x = -Math.PI / 2;
  spill.position.y = 0.02;
  fireGroup.add(spill);

  const flameCount = 90;
  const fgeo = new THREE.BufferGeometry();
  const fpos = new Float32Array(flameCount * 3);
  const fseed = new Float32Array(flameCount);
  for (let i = 0; i < flameCount; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 1.4;
    fpos[i * 3] = Math.cos(a) * r;
    fpos[i * 3 + 1] = Math.random() * 1.2;
    fpos[i * 3 + 2] = Math.sin(a) * r;
    fseed[i] = Math.random() * 10;
  }
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const fmat = new THREE.PointsMaterial({ color: 0xff7722, size: 0.3, map: glowSprite(), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  const flames = new THREE.Points(fgeo, fmat);
  fireGroup.add(flames);

  const fireLight = new THREE.PointLight(0xff6a1a, 22, 11, 1.6);
  fireLight.position.y = 0.8;
  fireLight.castShadow = true;
  fireLight.shadow.mapSize.set(512, 512);
  fireLight.shadow.bias = -0.0006;
  fireLight.shadow.normalBias = 0.08;
  fireGroup.add(fireLight);
  fireGroup.position.set(0, 0, -28);
  scene.add(fireGroup);
  doors._fire = { group: fireGroup, light: fireLight, flames, active: true };
  registerInteract('feu', spill, 'Fuite chimique en feu', 3.4);
  // étagères effondrées de part et d'autre : le feu est le seul passage
  box(5.0, 1.7, 0.9, M.rust, -4.6, 0.85, -28, { ry: 0.12 });
  box(5.0, 1.7, 0.9, M.rust, 4.6, 0.85, -28, { ry: -0.09 });
  animated.push((dt, t) => {
    const F = doors._fire;
    if (!F.active) return;
    F.light.intensity = 18 + Math.sin(t * 11) * 4 + Math.random() * 4;
    const arr = F.flames.geometry.attributes.position.array;
    for (let i = 0; i < flameCount; i++) {
      arr[i * 3 + 1] += dt * (0.8 + (fseed[i] % 1));
      if (arr[i * 3 + 1] > 1.3) arr[i * 3 + 1] = 0.02;
    }
    F.flames.geometry.attributes.position.needsUpdate = true;
  });

  // armoire sécurisée (contient le badge d'accès)
  const cab = box(1.1, 2, 0.6, M.darkMetal, -6.4, 1, -33.8);
  const cabGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.3), M.glassy);
  cabGlass.position.set(-6.4, 1.15, -33.48);
  scene.add(cabGlass);
  doors._cabGlass = cabGlass;
  registerInteract('armoire', cab, 'Armoire sécurisée — vitre blindée', 2.6);
  const cs = textSign('ACCÈS NIVEAU 4', 0.9, 0.25, '#ffb347', '#241a08');
  cs.position.set(-6.4, 2.25, -33.45);

  ceilLight(-3.6, 3.55, -24, { intensity: 24, dist: 12 });
  ceilLight(3.6, 3.55, -24, { intensity: 24, dist: 12, shadow: true });
  ceilLight(-3.6, 3.55, -28, { intensity: 24, dist: 12 });
  ceilLight(3.6, 3.55, -28, { intensity: 24, dist: 12 });
  ceilLight(-3.6, 3.55, -32, { intensity: 24, dist: 12 });
  ceilLight(3.6, 3.55, -32, { intensity: 24, dist: 12 });
}

export function extinguishFire() {
  const F = doors._fire;
  if (!F) return;
  F.active = false;
  let p = 0;
  animated.push((dt) => {
    if (p >= 1) { F.group.visible = false; return; }
    p = Math.min(1, p + dt * 0.8);
    F.light.intensity = (1 - p) * 18;
    F.flames.material.opacity = (1 - p) * 0.85;
  });
  setInteractEnabled('feu', false);
}

export function breakCabinet() {
  if (doors._cabGlass) doors._cabGlass.visible = false;
  setInteractLabel('armoire', 'Armoire ouverte');
}

function buildServerRoom() {
  // salle serveurs x∈[-5,5], z∈[-35,-46] — pénombre rouge
  slab(10.6, 11.6, M.floor, 0, -0.1, -40.5);
  slab(10.6, 11.6, M.ceiling, 0, 3.4, -40.5);
  // (le mur nord est le mur sud du laboratoire, déjà construit)
  box(0.3, 3.4, 11.6, M.concrete, -5.15, 1.7, -40.5);
  box(0.3, 3.4, 11.6, M.concrete, 5.15, 1.7, -40.5);
  box(4.2, 3.4, 0.3, M.concrete, -3.08, 1.7, -45.85);
  box(4.2, 3.4, 0.3, M.concrete, 3.08, 1.7, -45.85);
  box(2.8, 0.9, 0.3, M.concrete, 0, 2.95, -45.85, { solid: false });
  slidingDoor('porte_srv_hangar', 0, -45.85, { width: 2.0, label: 'Sortie de la salle serveurs' });

  const sign = textSign('SALLE SERVEURS — CŒUR NOVA-7', 2.8, 0.5, '#ff6a6a', '#1a0808');
  sign.position.set(0, 2.8, -35.33); sign.rotation.y = Math.PI;

  // baies de serveurs avec LEDs vivantes
  const ledMats = [];
  for (const sx of [-3.6, 3.6]) {
    for (let i = 0; i < 4; i++) {
      const z = -37.5 - i * 2.1;
      box(1.1, 2.6, 1.5, M.darkMetal, sx, 1.3, z);
      const ledCanvas = document.createElement('canvas');
      ledCanvas.width = 64; ledCanvas.height = 128;
      const lc = ledCanvas.getContext('2d');
      const ledTex = new THREE.CanvasTexture(ledCanvas);
      const ledMat = new THREE.MeshStandardMaterial({ map: ledTex, emissive: 0xffffff, emissiveMap: ledTex, emissiveIntensity: 1.2 });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.3), ledMat);
      face.position.set(sx + (sx < 0 ? 0.56 : -0.56), 1.3, z);
      face.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(face);
      ledMats.push({ lc, ledTex });
    }
  }
  let ledTimer = 0;
  animated.push((dt) => {
    ledTimer += dt;
    if (ledTimer < 0.25) return;
    ledTimer = 0;
    for (const { lc, ledTex } of ledMats) {
      lc.fillStyle = '#050807'; lc.fillRect(0, 0, 64, 128);
      for (let y = 6; y < 122; y += 9) {
        for (let x = 6; x < 58; x += 10) {
          if (Math.random() < 0.55) {
            lc.fillStyle = Math.random() < 0.82 ? '#2fe08a' : '#ff9d2f';
            lc.fillRect(x, y, 5, 3);
          }
        }
      }
      ledTex.needsUpdate = true;
    }
  });

  // ---- grille laser barrant la salle (z=-41) ----
  const laserGroup = new THREE.Group();
  const lmat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 3, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 6; i++) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 9.6, 6), lmat);
    beam.rotation.z = Math.PI / 2;
    beam.position.y = 0.3 + i * 0.45;
    laserGroup.add(beam);
  }
  const laserLight = new THREE.PointLight(0xff2222, 8, 7, 1.8);
  laserLight.position.y = 1.4;
  laserGroup.add(laserLight);
  laserGroup.position.set(0, 0, -41);
  scene.add(laserGroup);
  doors._lasers = { group: laserGroup, active: true, mat: lmat, light: laserLight };
  animated.push((dt, t) => {
    const L = doors._lasers;
    if (!L.active) return;
    L.mat.opacity = 0.65 + Math.sin(t * 9) * 0.2;
  });

  // terminal central de pilotage
  const term = box(1.2, 1.1, 0.6, M.darkMetal, 3.9, 0.55, -40.2);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x061410, emissive: 0x35e0a1, emissiveIntensity: 0.9 })
  );
  screen.position.set(3.9, 1.28, -40.2);
  screen.rotation.x = -0.35;
  scene.add(screen);
  registerInteract('terminal_srv', term, 'Terminal de sécurité — session verrouillée', 2.6);

  // éclairage propre, avec un témoin rouge discret côté grille laser
  ceilLight(0, 3.35, -37.5, { intensity: 22, dist: 12 });
  ceilLight(0, 3.35, -43.5, { intensity: 22, dist: 12, shadow: true });
  const statut = new THREE.PointLight(0xff4433, 4, 6, 2);
  statut.position.set(0, 3, -41);
  scene.add(statut);
  animated.push((dt, t) => { statut.intensity = doors._lasers?.active ? 3.2 + Math.sin(t * 3.2) * 1.2 : 0; });
}

export function disableLasers() {
  const L = doors._lasers;
  if (!L) return;
  L.active = false;
  L.group.visible = false;
  L.light.intensity = 0;
  setInteractLabel('terminal_srv', 'Terminal — sécurité désactivée');
  setInteractEnabled('terminal_srv', false);
}

function buildHangar() {
  // couloir de jonction puis hangar x∈[-6,6], z∈[-46,-58]
  slab(4.6, 4.6, M.floor, 0, -0.1, -48);
  slab(4.6, 4.6, M.ceiling, 0, 3.4, -48);
  box(0.3, 3.4, 4.6, M.concrete, -2.15, 1.7, -48);
  box(0.3, 3.4, 4.6, M.concrete, 2.15, 1.7, -48);

  slab(12.6, 8.6, M.floor, 0, -0.1, -54);
  slab(12.6, 8.6, M.ceiling, 0, 4.6, -54);
  box(4.2, 4.6, 0.3, M.concrete, -4.2, 2.3, -49.85);
  box(4.2, 4.6, 0.3, M.concrete, 4.2, 2.3, -49.85);
  box(0.3, 4.6, 8.6, M.concrete, -6.15, 2.3, -54);
  box(0.3, 4.6, 8.6, M.concrete, 6.15, 2.3, -54);
  box(4.6, 4.6, 0.3, M.concrete, -4.3, 2.3, -58.15);
  box(4.6, 4.6, 0.3, M.concrete, 4.3, 2.3, -58.15);
  box(4.2, 1.4, 0.3, M.concrete, 0, 3.9, -58.15, { solid: false });

  const sign = textSign('HANGAR — ASCENSEUR DE SURFACE', 3.4, 0.55, '#ffd23f', '#211a04');
  sign.position.set(0, 3.5, -50.03); sign.rotation.y = Math.PI;

  // caisses, bidons — couverture "vivante"
  for (const [cx, cz, s, r] of [[-4.4, -52, 1.1, 0.3], [-3.4, -52.4, 0.8, 1.1], [4.5, -55, 1.2, 0.2], [3.6, -51.5, 0.7, 0.8], [-4.6, -56, 0.9, 0.5]]) {
    box(s, s, s, Math.random() < 0.5 ? M.rust : M.warn, cx, s / 2, cz, { ry: r });
  }
  for (const [cx, cz] of [[5.2, -52.5], [5.5, -53.3]]) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 14), M.warn);
    drum.position.set(cx, 0.45, cz);
    drum.castShadow = true;
    scene.add(drum);
    colliders.push(new THREE.Box3().setFromObject(drum));
  }

  // ---- le chien de garde ----
  const dog = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x3b2f24, roughness: 0.95 });
  const bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.36, 0.32), fur); bodyM.position.y = 0.48; dog.add(bodyM);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.24), fur); head.position.set(0.44, 0.62, 0); dog.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.12), fur); snout.position.set(0.6, 0.57, 0); dog.add(snout);
  for (const ex of [0.5]) for (const ez of [-0.07, 0.07]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), fur);
    ear.position.set(0.42, 0.78, ez); dog.add(ear);
  }
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff4422, emissiveIntensity: 1.5 }));
  eyes.position.set(0.57, 0.66, 0); dog.add(eyes);
  for (const lx of [-0.24, 0.24]) for (const lz of [-0.1, 0.1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.32, 0.09), fur);
    leg.position.set(lx, 0.16, lz); dog.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), fur);
  tail.position.set(-0.45, 0.6, 0); tail.rotation.z = 0.5; dog.add(tail);
  dog.position.set(0, 0, -53.5);
  dog.rotation.y = Math.PI / 2; // face au joueur qui arrive
  scene.add(dog);
  doors._dog = { group: dog, tail, eyes, calm: false, baseZ: -53.5 };
  registerInteract('chien', bodyM, 'Chien de garde — il grogne…', 5.5);
  animated.push((dt, t) => {
    const D = doors._dog;
    if (D.calm) {
      D.tail && (D.tail.rotation.z = 0.5 + Math.sin(t * 10) * 0.5); // remue la queue
      return;
    }
    dog.position.x = Math.sin(t * 0.9) * 1.6; // fait les cent pas
    dog.rotation.y = Math.PI / 2 + Math.cos(t * 0.9) * 0.5;
    bodyM.position.y = 0.48 + Math.abs(Math.sin(t * 6)) * 0.02;
  });

  // ---- porte blindée finale + lecteur de badge ----
  slidingDoor('porte_finale', 0, -58.15, {
    width: 4.0, height: 3.2, mat: M.rust, label: 'Porte blindée — ascenseur de surface',
  });
  const reader = box(0.18, 0.3, 0.1, M.darkMetal, 2.3, 1.3, -57.9, { solid: false });
  const readerLamp = new THREE.Mesh(new THREE.CircleGeometry(0.035, 10),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff2222, emissiveIntensity: 2 }));
  readerLamp.position.set(2.3, 1.42, -57.84);
  scene.add(readerLamp);
  doors._readerLamp = readerLamp;
  registerInteract('lecteur_badge', reader, 'Lecteur de badge — niveau 4 requis', 2.4);

  // derrière la porte : cabine d'ascenseur baignée de lumière
  slab(4.2, 3, M.metal, 0, -0.08, -60);
  const exitLight = new THREE.PointLight(0xcfe8ff, 30, 12, 1.4);
  exitLight.position.set(0, 3, -60);
  scene.add(exitLight);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(4, 3.6),
    new THREE.MeshBasicMaterial({ color: 0xeaf4ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending }));
  halo.position.set(0, 1.8, -60.5);
  scene.add(halo);

  ceilLight(-3, 4.55, -52, { intensity: 26, dist: 13 });
  ceilLight(3, 4.55, -52, { intensity: 26, dist: 13, shadow: true });
  ceilLight(-3, 4.55, -56, { intensity: 26, dist: 13 });
  ceilLight(3, 4.55, -56, { intensity: 26, dist: 13 });
  ceilLight(0, 3.35, -48, { intensity: 18, dist: 10 });
}

export function calmDog() {
  const D = doors._dog;
  if (!D) return;
  D.calm = true;
  D.eyes.material.emissive.set(0x222222);
  D.eyes.material.emissiveIntensity = 0.2;
  // le chien part manger dans un coin
  const start = D.group.position.clone();
  let p = 0;
  animated.push((dt) => {
    if (p >= 1) return;
    p = Math.min(1, p + dt * 0.35);
    D.group.position.lerpVectors(start, new THREE.Vector3(-4.8, 0, -51.4), easeInOut(p));
    D.group.rotation.y = Math.PI * 0.85;
  });
  setInteractLabel('chien', 'Le chien dévore son festin, la voie est libre');
  setInteractEnabled('chien', false);
}

export function validateBadge() {
  if (doors._readerLamp) doors._readerLamp.material.emissive.set(0x22ff66);
  openDoor('porte_finale');
  setInteractEnabled('lecteur_badge', false);
}

// ------------------------------------------------------------------
// Poussière en suspension (le complexe "respire")
// ------------------------------------------------------------------
function buildDust() {
  const n = 500;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = Math.random() * 3.4;
    pos[i * 3 + 2] = 4 - Math.random() * 66;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.015, transparent: true, opacity: 0.18, depthWrite: false,
  }));
  scene.add(dust);
  animated.push((dt, t) => {
    const a = dust.geometry.attributes.position.array;
    for (let i = 0; i < n; i++) {
      a[i * 3 + 1] -= dt * 0.045;
      a[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.02;
      if (a[i * 3 + 1] < 0) a[i * 3 + 1] = 3.3;
    }
    dust.geometry.attributes.position.needsUpdate = true;
  });
}

// ------------------------------------------------------------------
// API principale
// ------------------------------------------------------------------
export function buildWorld(sceneRef, camera) {
  scene = sceneRef;
  M = makeMaterials();

  scene.fog = new THREE.FogExp2(0xe2e7ea, 0.02);
  scene.background = new THREE.Color(0xe2e7ea);
  scene.add(new THREE.AmbientLight(0xffffff, 0.62));
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa4a8, 0.5);
  scene.add(hemi);

  buildCell();
  buildCorridor();
  buildLab();
  buildServerRoom();
  buildHangar();
  buildDust();

  // lampe torche (activée si un téléphone est matérialisé)
  flashlight = new THREE.SpotLight(0xf2f7ff, 0, 16, 0.5, 0.45, 1.2);
  flashlight.castShadow = false;
  camera.add(flashlight);
  camera.add(flashlight.target);
  flashlight.position.set(0.15, -0.1, 0);
  flashlight.target.position.set(0, 0, -5);
  scene.add(camera);
}

export function setFlashlight(on) { if (flashlight) flashlight.intensity = on ? 26 : 0; }
export function isFlashlightOn() { return flashlight && flashlight.intensity > 0; }

export function updateWorld(dt, t) {
  for (const fn of animated) fn(dt, t);
}

export function getFireActive() { return doors._fire?.active; }
export function getLasersActive() { return doors._lasers?.active; }
export function getDogCalm() { return doors._dog?.calm; }
export function getSecuCamActive() { return doors._secucam?.active; }
export function getDogPosition() { return doors._dog?.group.position; }
export function getSteamActive() { return doors._steam?.active; }
export function getSteamOn() { return doors._steam?.active && doors._steam?.on; }

export function neutralizeSteam() {
  const S = doors._steam;
  if (!S) return;
  S.active = false;
  let p = 0;
  animated.push((dt) => {
    if (p >= 1) { S.points.visible = false; return; }
    p = Math.min(1, p + dt * 1.5);
    S.mat.opacity = (1 - p) * S.mat.opacity;
  });
  setInteractLabel('valve_vapeur', 'Valve refermée — conduite inerte');
  setInteractEnabled('valve_vapeur', false);
}

export function openLocker() {
  setInteractLabel('casier', 'Casier ouvert — journal du gardien');
  setInteractEnabled('casier', false);
}

// ------------------------------------------------------------------
// Props générés par Tripo3D : l'objet réel scanné apparaît « physiquement »
// ------------------------------------------------------------------
const gltfLoader = new GLTFLoader();
export function spawnGeneratedProp(url, position, onDone) {
  gltfLoader.load(url, (gltf) => {
    const obj = gltf.scene;
    // normalise la taille à ~40 cm et pose l'objet au sol
    const bb = new THREE.Box3().setFromObject(obj);
    const size = bb.getSize(new THREE.Vector3());
    const scale = 0.4 / Math.max(size.x, size.y, size.z, 0.001);
    obj.scale.setScalar(scale);
    bb.setFromObject(obj);
    const center = bb.getCenter(new THREE.Vector3());
    obj.position.set(position.x - center.x, -bb.min.y + 0.02, position.z - center.z);
    obj.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    scene.add(obj);
    // halo de matérialisation
    const glow = new THREE.PointLight(0x35e0a1, 6, 3, 2);
    glow.position.set(position.x, 0.5, position.z);
    scene.add(glow);
    let life = 0;
    animated.push((dt, t) => {
      life += dt;
      glow.intensity = Math.max(0, 6 - life * 2) + Math.sin(t * 3) * 0.4;
      obj.rotation.y += dt * 0.4;
    });
    if (onDone) onDone();
  }, undefined, () => { /* modèle illisible : on ignore */ });
}
