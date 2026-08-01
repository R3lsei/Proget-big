// world.js — Le complexe NOVA-7 : géométrie, matériaux, lumières, props animés.
// 5 zones : cellule → couloir de détention → laboratoire → salle serveurs → hangar de sortie.

import * as THREE from 'three';
import { GLTFLoader } from '../lib/GLTFLoader.js';
import {
  initProps, roundedBox, beaker, testTubeRack, microscope, labBench, labStool,
  terminal, serverRack, crate, drum, pipeRun, securityCamera, badgeReader,
  sink, cot, cabinet, badge, vent as ventGrille, guardDog, trolley,
} from './props.js';

/** Plinthe sombre au pied d'un mur : casse le blanc et ancre la pièce. */
function skirting(x, z, length, { horizontal = false } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x46525a, roughness: 0.5, metalness: 0.25 });
  const m = new THREE.Mesh(
    horizontal ? new THREE.BoxGeometry(length, 0.12, 0.05) : new THREE.BoxGeometry(0.05, 0.12, length),
    mat
  );
  m.position.set(x, 0.06, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

/** Bande de guidage colorée au sol : repère visuel et respiration graphique. */
function floorStripe(x, z, length, color = 0x2fb98a, width = 0.16) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, length),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1, envMapIntensity: 0.4 })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.003, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

/** Pose un groupe de props dans la scène, avec collider optionnel. */
function place(group, x, y, z, { ry = 0, solid = false, scale = 1 } = {}) {
  group.position.set(x, y, z);
  group.rotation.y = ry;
  if (scale !== 1) group.scale.setScalar(scale);
  group.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  scene.add(group);
  if (solid) {
    group.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(group));
  }
  return group;
}

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

  // sol : grands carreaux clairs légèrement satinés, joints marqués
  const floorTex = canvasTexture(512, (ctx, s) => {
    noisePaint(ctx, s, '#b9c1c4', 0.06, 4000);
    ctx.strokeStyle = 'rgba(90,100,106,0.65)';
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
    // envMapIntensity faible sur les grandes surfaces mates : le reflet
    // d'environnement doit servir le métal et le verre, pas délaver les murs.
    concrete: new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.6, metalness: 0.02, envMapIntensity: 0.35 }),
    floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.32, metalness: 0.06, envMapIntensity: 0.5 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xe8ecee, roughness: 0.92, envMapIntensity: 0.25 }),
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

// Chaque plafonnier est un « point lumineux » déclaré, pas une PointLight :
// le rendu forward de three évalue TOUTES les lumières sur TOUS les matériaux.
// Un pool de lumières réelles suit le joueur et se réaffecte aux luminaires les
// plus proches — coût de shader constant, quel que soit le nombre de dalles.
const lightSpots = [];
const LIGHT_POOL_SIZE = 6;
const lightPool = [];

function ceilLight(x, y, z, { color = 0xffffff, intensity = 11, dist = 14, shadow = false } = {}) {
  // dalle lumineuse encastrée, façon plafond de laboratoire
  box(1.3, 0.06, 0.7, M.metal, x, y + 0.05, z, { solid: false, shadow: false });
  const pane = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.03, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 1.35 })
  );
  pane.position.set(x, y, z);
  scene.add(pane);
  lightSpots.push({ pos: new THREE.Vector3(x, y - 0.3, z), color, intensity, dist, shadow });
}

function buildLightPool() {
  for (let i = 0; i < LIGHT_POOL_SIZE; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 14, 1.6);
    if (i < 2) { // seules les deux plus proches projettent des ombres
      l.castShadow = true;
      l.shadow.mapSize.set(768, 768);
      l.shadow.bias = -0.0006;
      l.shadow.normalBias = 0.08;
      l.shadow.camera.far = 18;
    }
    scene.add(l);
    lightPool.push(l);
  }
}

/** Réaffecte le pool aux luminaires les plus proches du joueur. */
function updateLightPool(playerPos) {
  if (!lightPool.length || !playerPos) return;
  const near = lightSpots
    .map((s) => ({ s, d: s.pos.distanceToSquared(playerPos) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, LIGHT_POOL_SIZE);
  for (let i = 0; i < lightPool.length; i++) {
    const l = lightPool[i];
    const hit = near[i];
    if (!hit) { l.intensity = 0; continue; }
    l.position.copy(hit.s.pos);
    l.color.set(hit.s.color);
    l.distance = hit.s.dist;
    l.intensity = hit.s.intensity;
  }
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

  // lit de camp, lavabo : props modélisés (cadre tubulaire, robinet col-de-cygne…)
  place(cot(), -1.5, 0, 0.7, { ry: 0, solid: true });
  place(sink(), 1.72, 0, 1.5, { ry: -Math.PI / 2, solid: true });

  // grille d'aération à lames (mur est, près du sol) → conduit vers le couloir
  const grille = place(ventGrille(0.75, 0.85), 2.0, 0.62, -1.2, { ry: -Math.PI / 2 });
  registerInteract('grille_cellule', grille.children[0], 'Grille d\'aération — scellée', 2.4);
  doors._vent = grille;

  // inscriptions de l'ancien occupant
  const s = textSign('SUJET 23', 1.2, 0.4, '#8a8a8a', '#3f423f');
  s.position.set(0, 1.8, 1.98); s.rotation.y = Math.PI;

  ceilLight(0, 2.95, 0, { intensity: 9, dist: 10, shadow: true });
}

export function openVent() {
  const v = doors._vent;
  if (!v) return;
  let p = 0;
  animated.push((dt) => {
    if (p >= 1) return;
    p = Math.min(1, p + dt * 1.2);
    v.rotation.z = -easeInOut(p) * 1.4;    // la grille bascule sur ses gonds
    v.position.y = 0.62 - easeInOut(p) * 0.28;
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

  // plinthes + bandes de guidage : le couloir cesse d'être un tunnel blanc
  for (const sx of [-1.48, 1.48]) skirting(sx, zc, L);
  floorStripe(-0.55, zc, L, 0x2fb98a);
  floorStripe(0.55, zc, L, 0xd8a828);

  // tuyauterie au plafond, avec colliers de fixation
  const P = initProps();
  for (const [px, r, mat] of [[-1.25, 0.07, P.steel], [-0.98, 0.05, P.steel], [1.3, 0.045, M.warn]]) {
    const run = pipeRun(L - 1.2, r, mat);
    place(run, px, 2.78, zc - 0.3);
  }

  // panneau de bloc
  const sign = textSign('BLOC DE DÉTENTION A', 2.2, 0.5);
  sign.position.set(0, 2.5, -3.2); sign.rotation.y = 0;

  // chariots abandonnés : le couloir respire
  place(trolley(), -1.05, 0, -6.4, { ry: 0.3, solid: true });
  place(trolley(), 1.0, 0, -14.2, { ry: -0.5, solid: true });

  // casier du gardien (secret optionnel : un peu d'histoire)
  const locker = new THREE.Group();
  const lockerBody = new THREE.Mesh(roundedBox(0.58, 1.75, 0.45, 0.012), M.metal);
  lockerBody.position.y = 0.875;
  locker.add(lockerBody);
  for (let i = 0; i < 4; i++) { // fentes d'aération en haut de porte
    const slot = new THREE.Mesh(roundedBox(0.3, 0.014, 0.01, 0.004), M.darkMetal);
    slot.position.set(0, 1.5 + i * 0.045, 0.228);
    locker.add(slot);
  }
  const hasp = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.009, 8, 16, Math.PI), P.chrome);
  hasp.position.set(0.17, 0.98, 0.245);
  locker.add(hasp);
  const padlock = new THREE.Mesh(roundedBox(0.055, 0.07, 0.022, 0.012), P.darkSteel);
  padlock.position.set(0.17, 0.925, 0.25);
  locker.add(padlock);
  place(locker, 1.3, 0, -8.2, { ry: -Math.PI / 2, solid: true });
  registerInteract('casier', lockerBody, 'Casier du gardien — cadenassé', 2.4);

  // caméra de surveillance sur rotule (plafond, avant la porte codée)
  const cam = place(securityCamera(), 1.1, 2.92, -17.5);
  const head = cam.userData.head;
  registerInteract('cam_secu', head.children[0], 'Caméra de surveillance', 3.4);
  doors._secucam = { group: cam, head, lens: cam.userData.led, active: true };
  animated.push((dt, t) => {
    if (!doors._secucam.active) return;
    head.rotation.y = Math.sin(t * 0.6) * 0.7 + 0.4;
  });

  ceilLight(0, 2.95, -4.5, { intensity: 10, dist: 11 });
  ceilLight(0, 2.95, -9, { intensity: 10, dist: 11 });
  ceilLight(0, 2.95, -13.5, { intensity: 10, dist: 11 });
  ceilLight(0, 2.95, -17.5, { intensity: 10, dist: 11, shadow: true });
  ceilLight(0, 2.95, -20.3, { intensity: 7, dist: 9 });
}

export function disableSecuCam() {
  const c = doors._secucam;
  if (!c) return;
  c.active = false;
  c.lens.material.emissive.set(0x111111);
  c.lens.material.emissiveIntensity = 0;
  let p = 0;
  animated.push((dt) => { // la tête retombe, inerte
    if (p >= 1) return;
    p = Math.min(1, p + dt * 2);
    c.head.rotation.x = easeInOut(p) * 0.9;
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

  // plinthes périmétriques + marquage au sol de la zone de sécurité
  for (const sx of [-6.98, 6.98]) skirting(sx, -28, 14);
  for (const sz of [-21.0, -35.0]) skirting(0, sz, 14, { horizontal: true });
  for (const sx of [-2.3, 2.3]) floorStripe(sx, -28, 13.6, 0xd8a828, 0.12);

  // paillasses équipées : verrerie, portoirs à tubes, microscopes, tabourets
  for (const [bx, bz, bw] of [[-4, -24.5, 4.5], [4, -24.5, 4.5], [-4, -31.5, 4.5], [4, -31.5, 4.5]]) {
    place(labBench(bw, 0.78, 0.9), bx, 0, bz, { solid: true });
    const top = 0.94;
    for (let i = 0; i < 4; i++) {
      const x = bx - bw / 2 + 0.5 + Math.random() * (bw - 1.0);
      const z = bz + (Math.random() - 0.5) * 0.4;
      place(beaker(0.12 + Math.random() * 0.09, 0.04 + Math.random() * 0.025), x, top, z,
        { ry: Math.random() * 3 });
    }
    place(testTubeRack(5), bx + bw * 0.28, top, bz - 0.16, { ry: 0.1 });
    place(microscope(), bx - bw * 0.3, top, bz, { ry: -0.4 + Math.random() * 0.8 });
    place(labStool(), bx + (Math.random() - 0.5) * bw * 0.5, 0,
      bz + (bz < -28 ? -0.95 : 0.95), { ry: Math.random() * 6, solid: true });
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

  // rayonnages renversés de part et d'autre : le feu est le seul passage
  for (const [sx, ry] of [[-4.6, 0.12], [4.6, -0.09]]) {
    const shelf = new THREE.Group();
    const PS = initProps();
    const part = (geo, mat, px, py, pz) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      m.castShadow = true; m.receiveShadow = true;
      shelf.add(m);
    };
    for (const ex of [-2.4, 2.4]) part(roundedBox(0.06, 1.75, 0.85, 0.01), PS.darkSteel, ex, 0.88, 0);
    for (let i = 0; i < 4; i++) part(roundedBox(4.9, 0.04, 0.8, 0.008), PS.steel, 0, 0.22 + i * 0.5, 0);
    for (let i = 0; i < 9; i++) { // cartons et bidons dessus
      const bx = -2.1 + Math.random() * 4.2;
      const by = 0.24 + Math.floor(Math.random() * 3) * 0.5;
      const c = new THREE.Mesh(roundedBox(0.3, 0.24, 0.3, 0.012),
        new THREE.MeshStandardMaterial({ color: 0xbfae90, roughness: 0.9 }));
      c.position.set(bx, by + 0.14, (Math.random() - 0.5) * 0.3);
      c.rotation.y = Math.random();
      c.castShadow = true; c.receiveShadow = true;
      shelf.add(c);
    }
    place(shelf, sx, 0, -28, { ry, solid: true });
  }
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

  // armoire sécurisée vitrée (contient le badge d'accès, visible derrière la vitre)
  const cab = place(cabinet(1.05, 2.0, 0.5), -6.4, 0, -33.8, { ry: 0 });
  doors._cabGlass = cab.userData.pane;
  registerInteract('armoire', cab.children[0], 'Armoire sécurisée — vitre blindée', 2.8);
  const theBadge = place(badge(), -6.4, 0.63, -33.72, { ry: 0.25 });
  theBadge.rotation.x = -Math.PI / 2;
  animated.push((dt, t) => { theBadge.rotation.z = Math.sin(t * 0.5) * 0.1; });
  const cs = textSign('ACCÈS NIVEAU 4', 0.9, 0.25, '#ffb347', '#241a08');
  cs.position.set(-6.4, 2.25, -33.45);

  ceilLight(-3.6, 3.55, -24, { intensity: 12, dist: 12 });
  ceilLight(3.6, 3.55, -24, { intensity: 12, dist: 12, shadow: true });
  ceilLight(-3.6, 3.55, -28, { intensity: 12, dist: 12 });
  ceilLight(3.6, 3.55, -28, { intensity: 12, dist: 12 });
  ceilLight(-3.6, 3.55, -32, { intensity: 12, dist: 12 });
  ceilLight(3.6, 3.55, -32, { intensity: 12, dist: 12 });
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
      place(serverRack(0.95, 2.5, 1.4), sx, 0, z, { ry: sx < 0 ? Math.PI / 2 : -Math.PI / 2, solid: true });
      const ledCanvas = document.createElement('canvas');
      ledCanvas.width = 64; ledCanvas.height = 128;
      const lc = ledCanvas.getContext('2d');
      const ledTex = new THREE.CanvasTexture(ledCanvas);
      const ledMat = new THREE.MeshStandardMaterial({ map: ledTex, emissive: 0xffffff, emissiveMap: ledTex, emissiveIntensity: 1.2 });
      // posée juste devant la porte de la baie (demi-profondeur 0.7 + porte)
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 2.25), ledMat);
      face.position.set(sx + (sx < 0 ? 0.735 : -0.735), 1.28, z);
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

  // ---- grille laser barrant la salle (z=-41), avec ses émetteurs muraux ----
  const laserGroup = new THREE.Group();
  const lmat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 3, transparent: true, opacity: 0.8 });
  const PS = initProps();
  for (let i = 0; i < 6; i++) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 9.6, 6), lmat);
    beam.rotation.z = Math.PI / 2;
    beam.position.y = 0.3 + i * 0.45;
    laserGroup.add(beam);
  }
  for (const sx of [-4.85, 4.85]) { // rails d'émetteurs de part et d'autre
    const rail = new THREE.Mesh(roundedBox(0.12, 2.9, 0.18, 0.02), PS.darkSteel);
    rail.position.set(sx, 1.45, 0);
    rail.castShadow = true;
    laserGroup.add(rail);
    for (let i = 0; i < 6; i++) {
      const emit = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.05, 12), PS.chrome);
      emit.rotation.z = Math.PI / 2;
      emit.position.set(sx + (sx < 0 ? 0.07 : -0.07), 0.3 + i * 0.45, 0);
      laserGroup.add(emit);
    }
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

  // terminal central de pilotage, sur son bureau
  place(labBench(1.5, 0.7, 0.78), 3.85, 0, -40.2, { ry: -Math.PI / 2, solid: true });
  const term = place(terminal(0.56, 0.36), 3.85, 0.82, -40.2, { ry: -Math.PI / 2 });
  registerInteract('terminal_srv', term.children[2], 'Terminal de sécurité — session verrouillée', 2.8);
  place(labStool(), 2.9, 0, -40.2, { ry: 1.2, solid: true });

  // éclairage propre, avec un témoin rouge discret côté grille laser
  ceilLight(0, 3.35, -37.5, { intensity: 11, dist: 12 });
  ceilLight(0, 3.35, -43.5, { intensity: 11, dist: 12, shadow: true });
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

  // caisses cerclées et bidons nervurés — le hangar respire
  for (const [cx, cz, s, r] of [[-4.4, -52, 1.05, 0.3], [-3.35, -52.4, 0.78, 1.1],
    [4.5, -55, 1.15, 0.2], [3.6, -51.5, 0.7, 0.8], [-4.6, -56, 0.9, 0.5]]) {
    place(crate(s), cx, 0, cz, { ry: r, solid: true });
  }
  place(crate(0.7), -4.4, 1.05, -52, { ry: 0.9, solid: false }); // empilée
  for (const [cx, cz, r] of [[5.2, -52.5, 0.2], [5.55, -53.35, 1.1], [5.1, -54.2, 2.2]]) {
    place(drum(), cx, 0, cz, { ry: r, solid: true });
  }

  // ---- le chien de garde (berger allemand articulé) ----
  const dog = guardDog();
  place(dog, 0, 0, -53.5, { ry: Math.PI / 2 }); // face au joueur qui arrive
  const { legs, tail, eyes } = dog.userData;
  doors._dog = { group: dog, tail, eyes, calm: false, baseZ: -53.5 };
  registerInteract('chien', dog.children[0], 'Chien de garde — il grogne…', 5.5);
  animated.push((dt, t) => {
    const D = doors._dog;
    if (D.calm) {
      tail.rotation.y = Math.sin(t * 11) * 0.7;          // remue la queue
      legs.forEach((l) => { l.rotation.z = 0; });
      dog.position.y = 0;
      return;
    }
    dog.position.x = Math.sin(t * 0.9) * 1.6;            // fait les cent pas
    dog.rotation.y = Math.PI / 2 + Math.cos(t * 0.9) * 0.5;
    dog.position.y = Math.abs(Math.sin(t * 5.4)) * 0.022; // léger rebond de marche
    // le chien regarde vers +X : les pattes balancent autour de Z, en diagonale
    legs.forEach((l, i) => {
      const diagonal = (i === 0 || i === 3) ? 0 : Math.PI;
      l.rotation.z = Math.sin(t * 5.4 + diagonal) * 0.38;
    });
    tail.rotation.y = Math.sin(t * 2.2) * 0.22;
  });

  // ---- porte blindée finale + lecteur de badge ----
  slidingDoor('porte_finale', 0, -58.15, {
    width: 4.0, height: 3.2, mat: M.metal, label: 'Porte blindée — ascenseur de surface',
  });
  const reader = place(badgeReader(), 2.3, 1.35, -57.92);
  doors._readerLamp = reader.userData.led;
  registerInteract('lecteur_badge', reader.children[0], 'Lecteur de badge — niveau 4 requis', 2.6);

  // derrière la porte : cabine d'ascenseur baignée de lumière
  slab(4.2, 3, M.metal, 0, -0.08, -60);
  const exitLight = new THREE.PointLight(0xcfe8ff, 30, 12, 1.4);
  exitLight.position.set(0, 3, -60);
  scene.add(exitLight);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(4, 3.6),
    new THREE.MeshBasicMaterial({ color: 0xeaf4ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending }));
  halo.position.set(0, 1.8, -60.5);
  scene.add(halo);

  ceilLight(-3, 4.55, -52, { intensity: 12, dist: 13 });
  ceilLight(3, 4.55, -52, { intensity: 12, dist: 13, shadow: true });
  ceilLight(-3, 4.55, -56, { intensity: 12, dist: 13 });
  ceilLight(3, 4.55, -56, { intensity: 12, dist: 13 });
  ceilLight(0, 3.35, -48, { intensity: 9, dist: 10 });
}

export function calmDog() {
  const D = doors._dog;
  if (!D) return;
  D.calm = true;
  // le chien a deux yeux : D.eyes est un tableau de meshes
  for (const e of D.eyes) {
    e.material.emissive.set(0x241a10);
    e.material.emissiveIntensity = 0.15;
  }
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
  // L'éclairage d'environnement (main.js) fournit déjà le remplissage : ambiante
  // et hémisphère restent discrètes, sinon tout part en surexposition blanche.
  scene.add(new THREE.AmbientLight(0xffffff, 0.16));
  const hemi = new THREE.HemisphereLight(0xdceaf2, 0x8f9aa0, 0.22);
  scene.add(hemi);

  buildCell();
  buildCorridor();
  buildLab();
  buildServerRoom();
  buildHangar();
  buildDust();
  buildLightPool();

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

export function updateWorld(dt, t, playerPos) {
  updateLightPool(playerPos);
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
