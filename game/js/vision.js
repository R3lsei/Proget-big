// vision.js — Liaison optique neurale : webcam + détection d'objets (COCO-SSD).
// Le joueur montre un objet réel ; le jeu le reconnaît, l'annonce et le matérialise.

import { analyzeObject, describeCaps } from './items.js';

const video = document.getElementById('scan-video');
const canvas = document.getElementById('scan-canvas');
const ctx = canvas.getContext('2d');
const resultName = document.getElementById('scan-result-name');
const resultCaps = document.getElementById('scan-result-caps');
const btnCapture = document.getElementById('btn-capture');

let model = null;
let stream = null;
let running = false;
let rafId = 0;
let lastSpokenClass = null;

// Détection stabilisée : il faut plusieurs images consécutives de la même classe.
let candidateClass = null;
let candidateStreak = 0;
let stableDetection = null; // { class, score }

export async function loadModel(onStatus) {
  onStatus('Chargement du réseau de neurones (COCO-SSD)…');
  // Un modèle placé dans lib/model/ permet de jouer 100 % hors-ligne ;
  // sinon, les poids sont récupérés depuis le dépôt officiel tfjs-models.
  try {
    const local = await fetch('lib/model/model.json', { method: 'HEAD' });
    if (!local.ok) throw new Error('pas de modèle local');
    model = await cocoSsd.load({ modelUrl: 'lib/model/model.json' });
  } catch (_) {
    model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
  }
  onStatus('Module de reconnaissance prêt.');
}

export async function openScanner() {
  if (!model) throw new Error('Modèle non chargé');
  if (!stream) {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: 'environment' },
      audio: false,
    });
    video.srcObject = stream;
    await new Promise((res) => (video.onloadedmetadata = res));
    await video.play();
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  running = true;
  candidateClass = null;
  candidateStreak = 0;
  stableDetection = null;
  lastSpokenClass = null;
  btnCapture.disabled = true;
  resultName.textContent = 'Recherche d\'objets…';
  resultCaps.innerHTML = '';
  detectLoop();
}

export function closeScanner() {
  running = false;
  cancelAnimationFrame(rafId);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function releaseCamera() {
  closeScanner();
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
  }
}

/** Renvoie l'objet de jeu correspondant à la détection stable courante (ou null). */
export function captureStableObject() {
  if (!stableDetection) return null;
  return analyzeObject(stableDetection.class);
}

export function onDetectionAnnounce(cb) { announceCb = cb; }
let announceCb = null;

async function detectLoop() {
  if (!running) return;
  let predictions = [];
  try {
    predictions = await model.detect(video, 5, 0.55);
  } catch (_) { /* frame pas prête */ }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // On ignore les personnes : c'est vous, pas un objet à matérialiser.
  const objects = predictions.filter((p) => p.class !== 'person');
  const best = objects.sort((a, b) => b.score - a.score)[0] || null;

  for (const p of objects) drawBox(p, p === best);

  if (best && best.class === candidateClass) {
    candidateStreak++;
  } else {
    candidateClass = best ? best.class : null;
    candidateStreak = best ? 1 : 0;
  }

  if (candidateClass && candidateStreak >= 4) {
    if (!stableDetection || stableDetection.class !== candidateClass) {
      stableDetection = { class: candidateClass, score: best.score };
      showResult(stableDetection);
    }
  } else if (!candidateClass && stableDetection) {
    stableDetection = null;
    btnCapture.disabled = true;
    resultName.textContent = 'Recherche d\'objets…';
    resultCaps.innerHTML = '';
  }

  rafId = requestAnimationFrame(detectLoop);
}

function showResult(det) {
  const probe = analyzeObject(det.class);
  const pct = Math.round(det.score * 100);
  resultName.innerHTML =
    `${probe.emoji} Ça, c'est <span class="cls">${probe.name}</span> ` +
    `<small style="color:#7a8a84">(certitude ${pct}%)</small>`;
  resultCaps.innerHTML =
    `<div style="margin-bottom:4px;color:#8aa79c">Critères logiques établis :</div>` +
    describeCaps(probe.caps).map((l) => `<div class="cap">${l}</div>`).join('') +
    `<div style="margin-top:6px;font-style:italic;color:#7a8a84">« ${probe.logic} »</div>`;
  btnCapture.disabled = false;

  if (announceCb && lastSpokenClass !== det.class) {
    lastSpokenClass = det.class;
    announceCb(probe);
  }
}

function drawBox(p, isBest) {
  const [x, y, w, h] = p.bbox;
  ctx.strokeStyle = isBest ? '#35e0a1' : 'rgba(255,255,255,0.35)';
  ctx.lineWidth = isBest ? 3 : 1.5;
  ctx.strokeRect(x, y, w, h);
  // coins façon "viseur"
  if (isBest) {
    ctx.fillStyle = 'rgba(53,224,161,0.9)';
    ctx.font = 'bold 15px monospace';
    // le canvas est miroir (scaleX(-1) en CSS) : on redessine le texte à l'endroit
    ctx.save();
    ctx.scale(-1, 1);
    ctx.fillText(`${p.class} ${(p.score * 100) | 0}%`, -(x + w), Math.max(16, y - 6));
    ctx.restore();
  }
}
