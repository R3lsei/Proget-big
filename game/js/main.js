// main.js — Assemblage : rendu Three.js, HUD, scanner caméra, boucle de jeu.

import * as THREE from 'three';
import {
  buildWorld, updateWorld, interactables, colliders, setFlashlight, isFlashlightOn,
  getSecuCamActive, getFireActive, getLasersActive, getDogCalm, getSteamActive,
  spawnGeneratedProp,
} from './world.js';
import { requestRealModel } from './tripo.js';
import { Player } from './player.js';
import { loadModel, openScanner, closeScanner, captureStableObject, onDetectionAnnounce } from './vision.js';
import { initAudio, resumeAudio, speak, sfxScan } from './audio.js';
import { bindUI, beginGame, materializeItem, interact, tick, state } from './story.js';
import { findItemWithCap, CAPS } from './items.js';

// ------------------------------------------------------------------
// Rendu
// ------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.domElement.className = 'game';
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 120);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

buildWorld(scene, camera);
const player = new Player(camera, renderer.domElement);

// Console de développement : NOVA.debug = true permet de jouer sans pointer lock.
window.NOVA = {
  player, state, colliders, debug: false,
  world: { getSecuCamActive, getFireActive, getLasersActive, getDogCalm, getSteamActive },
};

// ------------------------------------------------------------------
// Éléments d'interface
// ------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const elMenu = $('menu'), elHud = $('hud'), elScanner = $('scanner'), elInv = $('inventory');
const elBanner = $('chapter-banner'), elObjective = $('objective-text');
const elPrompt = $('interact-prompt'), elSub = $('subtitles'), elNotif = $('notif-stack');
const elHotbar = $('hotbar'), elFlash = $('damage-flash'), elEnding = $('ending');
const elKeypad = $('keypad'), padDisplay = $('pad-display'), padHint = $('pad-hint'), padHack = $('pad-hack');

let gameStarted = false;
let scannerOpen = false;
let invOpen = false;
let keypadOpen = false;
let subTimer = null;
let padCode = '';
let padOpts = null;

const ui = {
  banner(title, sub) {
    elBanner.innerHTML = `${title}<small>${sub}</small>`;
    elBanner.classList.remove('hidden');
    elBanner.style.animation = 'none';
    void elBanner.offsetWidth; // relance l'animation
    elBanner.style.animation = '';
  },
  objective(text) { elObjective.textContent = text; },
  subtitle(who, text) {
    elSub.innerHTML = `<span class="who">${who} :</span> ${text}`;
    elSub.classList.remove('hidden');
    clearTimeout(subTimer);
    subTimer = setTimeout(() => elSub.classList.add('hidden'), Math.max(5000, text.length * 55));
  },
  notify(html, bad = false) {
    const n = document.createElement('div');
    n.className = 'notif' + (bad ? ' bad' : '');
    n.innerHTML = html;
    elNotif.appendChild(n);
    setTimeout(() => n.remove(), 6100);
  },
  damageFlash() {
    elFlash.style.opacity = '1';
    setTimeout(() => (elFlash.style.opacity = '0'), 220);
  },
  fadeTeleport(fn) {
    elFlash.style.background = '#000';
    elFlash.style.opacity = '1';
    setTimeout(() => {
      fn();
      setTimeout(() => {
        elFlash.style.opacity = '0';
        setTimeout(() => {
          elFlash.style.background = '';
        }, 300);
      }, 350);
    }, 350);
  },
  onHandsFree() { player.enabled = true; },
  refreshInventory() { renderHotbar(); renderInvGrid(); },
  keypad(opts) {
    padOpts = opts;
    padCode = '';
    padHint.textContent = opts.hint;
    padDisplay.textContent = '····';
    padDisplay.classList.remove('error');
    padHack.disabled = !opts.canHack;
    padHack.textContent = opts.hackLabel || 'PIRATER LE CLAVIER';
    keypadOpen = true;
    elKeypad.classList.remove('hidden');
    document.exitPointerLock();
  },
  ending(text) {
    document.exitPointerLock();
    $('ending-text').textContent = text;
    elEnding.classList.remove('hidden');
    elHud.classList.add('hidden');
  },
};
bindUI(ui);

function renderHotbar() {
  elHotbar.innerHTML = '';
  for (const it of state.inventory.slice(0, 8)) {
    const d = document.createElement('div');
    d.className = 'hot-item';
    d.innerHTML = `${it.emoji}<small>${it.name.replace(/^(un |une |des |l')/, '')}</small>`;
    elHotbar.appendChild(d);
  }
  if (state.hasBadge) {
    const d = document.createElement('div');
    d.className = 'hot-item';
    d.innerHTML = `🪪<small>badge niv. 4</small>`;
    elHotbar.appendChild(d);
  }
}

function renderInvGrid() {
  const grid = $('inv-grid');
  grid.innerHTML = '';
  const all = [...state.inventory];
  if (!all.length && !state.hasBadge) {
    grid.innerHTML = '<div class="inv-empty">Aucun objet matérialisé.<br>Appuyez sur <kbd>C</kbd> et montrez un objet réel à votre caméra.</div>';
    return;
  }
  for (const it of all) {
    const d = document.createElement('div');
    d.className = 'inv-item';
    d.innerHTML = `<div class="emoji">${it.emoji}</div><div class="name">${it.name}</div>` +
      `<div class="caps">${it.caps.map((c) => CAPS[c].icon + ' ' + CAPS[c].label).join('<br>')}</div>`;
    grid.appendChild(d);
  }
  if (state.hasBadge) {
    const d = document.createElement('div');
    d.className = 'inv-item';
    d.innerHTML = `<div class="emoji">🪪</div><div class="name">Badge niveau 4</div><div class="caps">🚪 Ouvre la porte blindée</div>`;
    grid.appendChild(d);
  }
}

// ------------------------------------------------------------------
// Démarrage : chargement du modèle puis lancement
// ------------------------------------------------------------------
const btnStart = $('btn-start');
const loadStatus = $('load-status');

loadModel((s) => (loadStatus.textContent = s))
  .then(() => {
    btnStart.disabled = false;
    btnStart.textContent = 'COMMENCER L\'ÉVASION';
    loadStatus.textContent = 'Autorisez l\'accès à la caméra quand le jeu le demandera : c\'est votre seule arme.';
  })
  .catch((e) => {
    loadStatus.textContent = 'Échec du chargement du modèle (connexion requise). Rechargez la page. ' + e.message;
  });

btnStart.addEventListener('click', () => {
  initAudio();
  elMenu.classList.remove('visible');
  elMenu.classList.add('hidden');
  elHud.classList.remove('hidden');
  gameStarted = true;
  player.requestLock();
  beginGame();
});

$('btn-restart').addEventListener('click', () => window.location.reload());

renderer.domElement.addEventListener('click', () => {
  if (gameStarted && !scannerOpen && !invOpen && !state.finished) player.requestLock();
});

// ------------------------------------------------------------------
// Scanner caméra
// ------------------------------------------------------------------
onDetectionAnnounce((probe) => {
  sfxScan();
  speak(`Ça, c'est ${probe.name}.`, { rate: 1.05 });
});

async function toggleScanner() {
  if (!gameStarted || state.finished) return;
  if (scannerOpen) {
    closeScanner();
    elScanner.classList.add('hidden');
    scannerOpen = false;
    player.requestLock();
    return;
  }
  if (invOpen) toggleInventory();
  document.exitPointerLock();
  elScanner.classList.remove('hidden');
  scannerOpen = true;
  try {
    await openScanner();
  } catch (e) {
    scannerOpen = false;
    elScanner.classList.add('hidden');
    ui.notify('📷 Caméra inaccessible : ' + e.message + '<br>Vérifiez les autorisations du navigateur.', true);
    speak('Liaison optique impossible. Vérifie les autorisations de ta caméra.');
  }
}

function captureItem() {
  const item = captureStableObject();
  if (!item) return;
  materializeItem(item);
  // pont Tripo3D : l'objet apparaîtra physiquement devant le joueur (si backend)
  requestRealModel(item, () => {
    const f = player.forwardDir.multiplyScalar(1.4);
    return { x: player.position.x + f.x, z: player.position.z + f.z };
  }, ui, spawnGeneratedProp);
  closeScanner();
  elScanner.classList.add('hidden');
  scannerOpen = false;
  player.requestLock();
}

$('btn-capture').addEventListener('click', captureItem);
$('btn-close-scan').addEventListener('click', toggleScanner);

// ------------------------------------------------------------------
// Clavier à code
// ------------------------------------------------------------------
function padPress(d) {
  if (!keypadOpen || padCode.length >= 4) return;
  padCode += d;
  padDisplay.classList.remove('error');
  padDisplay.textContent = padCode.padEnd(4, '·');
}
function padClear() {
  padCode = '';
  padDisplay.classList.remove('error');
  padDisplay.textContent = '····';
}
function padValidate() {
  if (!keypadOpen || padCode.length < 4) return;
  if (padOpts.check(padCode)) {
    closeKeypad();
    padOpts.onSuccess(false);
  } else {
    padDisplay.classList.add('error');
    padCode = '';
    setTimeout(() => { if (keypadOpen) padDisplay.textContent = '····'; }, 450);
    padOpts.onFail();
  }
}
function padDoHack() {
  if (!keypadOpen || padHack.disabled) return;
  // le code s'extrait chiffre par chiffre de la mémoire du clavier
  padHack.disabled = true;
  const target = padOpts.answer;
  let i = 0;
  padCode = '';
  const step = setInterval(() => {
    padCode += target[i++];
    padDisplay.textContent = padCode.padEnd(4, '·');
    if (i >= 4) {
      clearInterval(step);
      setTimeout(() => { closeKeypad(); padOpts.onSuccess(true); }, 450);
    }
  }, 380);
}
function closeKeypad() {
  keypadOpen = false;
  elKeypad.classList.add('hidden');
  player.requestLock();
}
document.querySelectorAll('.pad-grid button[data-d]').forEach((b) =>
  b.addEventListener('click', () => padPress(b.dataset.d)));
$('pad-clear').addEventListener('click', padClear);
$('pad-ok').addEventListener('click', padValidate);
$('pad-hack').addEventListener('click', padDoHack);
$('pad-close').addEventListener('click', closeKeypad);

function toggleInventory() {
  if (!gameStarted || state.finished) return;
  invOpen = !invOpen;
  elInv.classList.toggle('hidden', !invOpen);
  if (invOpen) {
    renderInvGrid();
    document.exitPointerLock();
  } else {
    player.requestLock();
  }
}

// ------------------------------------------------------------------
// Clavier global
// ------------------------------------------------------------------
document.addEventListener('keydown', (e) => {
  if (!gameStarted) return;
  resumeAudio();
  if (keypadOpen) {
    if (/^(Digit|Numpad)\d$/.test(e.code)) padPress(e.code.slice(-1));
    else if (e.code === 'Backspace') padClear();
    else if (e.code === 'Enter' || e.code === 'NumpadEnter') padValidate();
    else if (e.code === 'Escape' || e.code === 'KeyE') closeKeypad();
    return;
  }
  switch (e.code) {
    case 'KeyC': toggleScanner(); break;
    case 'Enter': if (scannerOpen) captureItem(); break;
    case 'Tab': e.preventDefault(); toggleInventory(); break;
    case 'KeyE': if (currentTarget && (player.locked || window.NOVA.debug)) interact(currentTarget.id, player); break;
    case 'KeyF': {
      if (findItemWithCap(state.inventory, 'eclairer')) {
        setFlashlight(!isFlashlightOn());
      } else if (player.locked || window.NOVA.debug) {
        ui.notify('🔦 Aucune source de lumière. Un <b>téléphone</b> ferait une lampe torche.', true);
      }
      break;
    }
  }
});

// ------------------------------------------------------------------
// Détection de la cible d'interaction (raycast)
// ------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
let currentTarget = null;

function updateInteractPrompt() {
  currentTarget = null;
  if ((!player.locked && !window.NOVA.debug) || state.finished) { elPrompt.classList.add('hidden'); return; }

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const enabled = interactables.filter((i) => i.enabled && i.mesh.visible);
  const meshes = enabled.map((i) => i.mesh);
  const hits = raycaster.intersectObjects(meshes, false);

  for (const h of hits) {
    const it = enabled.find((i) => i.mesh === h.object);
    if (it && h.distance <= it.dist) { currentTarget = it; break; }
  }
  // le chien s'interagit aussi de loin sans viser précisément
  if (!currentTarget) {
    for (const it of enabled) {
      if (it.id !== 'chien') continue;
      const wp = new THREE.Vector3();
      it.mesh.getWorldPosition(wp);
      if (wp.distanceTo(camera.position) < it.dist) currentTarget = it;
    }
  }

  if (currentTarget) {
    elPrompt.innerHTML = `<span class="ok">[E]</span> ${currentTarget.label}`;
    elPrompt.classList.remove('hidden');
  } else {
    elPrompt.classList.add('hidden');
  }
}

// ------------------------------------------------------------------
// Boucle de jeu
// ------------------------------------------------------------------
const clock = new THREE.Clock();

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (gameStarted && !scannerOpen && !invOpen && !keypadOpen) {
    player.update(dt);
    tick(dt, player);
  }
  updateWorld(dt, t);
  updateInteractPrompt();
  renderer.render(scene, camera);
}
loop();
