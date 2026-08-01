// audio.js — Ambiance sonore procédurale (WebAudio) + voix de synthèse française.
// Aucun fichier audio : tout est généré (ventilation, bourdonnement, alarmes, pas…).

let ac = null;
let master = null;
let ambientNodes = [];

export function initAudio() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain();
  master.gain.value = 0.5;
  master.connect(ac.destination);
  startAmbient();
}

export function resumeAudio() { if (ac && ac.state === 'suspended') ac.resume(); }

// ---------- ambiance de fond : ventilation + bourdonnement électrique ----------
function startAmbient() {
  // souffle de ventilation (bruit filtré)
  const noise = makeNoiseSource();
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.6;
  const g1 = ac.createGain(); g1.gain.value = 0.055;
  noise.connect(lp).connect(g1).connect(master);
  noise.start();

  // lente respiration du souffle
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.07;
  const lfoG = ac.createGain(); lfoG.gain.value = 90;
  lfo.connect(lfoG).connect(lp.frequency); lfo.start();

  // bourdonnement 50 Hz des néons
  const hum = ac.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 50;
  const humF = ac.createBiquadFilter(); humF.type = 'lowpass'; humF.frequency.value = 140;
  const g2 = ac.createGain(); g2.gain.value = 0.012;
  hum.connect(humF).connect(g2).connect(master); hum.start();

  ambientNodes = [noise, lfo, hum];
}

function makeNoiseSource() {
  const len = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf; src.loop = true;
  return src;
}

// ---------- effets ----------
function env(gainNode, t0, a, peak, d) {
  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.exponentialRampToValueAtTime(peak, t0 + a);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

export function sfxFootstep() {
  if (!ac) return;
  const t = ac.currentTime;
  const noise = makeNoiseSource();
  const f = ac.createBiquadFilter(); f.type = 'bandpass';
  f.frequency.value = 300 + Math.random() * 200; f.Q.value = 1.2;
  const g = ac.createGain();
  env(g, t, 0.005, 0.16, 0.09);
  noise.connect(f).connect(g).connect(master);
  noise.start(t); noise.stop(t + 0.15);
}

export function sfxJump() { tone(220, 0.12, 0.12, 'triangle', -80); }
export function sfxLand() { thud(90, 0.2); }
export function sfxDeny() { tone(140, 0.22, 0.18, 'square'); setTimeout(() => tone(110, 0.25, 0.18, 'square'), 140); }
export function sfxSuccess() { tone(523, 0.12, 0.14, 'sine'); setTimeout(() => tone(784, 0.2, 0.14, 'sine'), 130); }
export function sfxScan() { tone(880, 0.08, 0.06, 'sine'); setTimeout(() => tone(1320, 0.1, 0.05, 'sine'), 90); }
export function sfxPickup() { tone(660, 0.1, 0.12, 'triangle', 200); }

export function sfxDoorOpen() {
  if (!ac) return;
  const t = ac.currentTime;
  const noise = makeNoiseSource();
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(200, t);
  f.frequency.linearRampToValueAtTime(900, t + 1.1);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.15);
  g.gain.linearRampToValueAtTime(0.0001, t + 1.3);
  noise.connect(f).connect(g).connect(master);
  noise.start(t); noise.stop(t + 1.35);
  thud(60, 0.5, t + 1.05);
}

export function sfxGlassBreak() {
  if (!ac) return;
  const t = ac.currentTime;
  for (let i = 0; i < 10; i++) {
    const dt = Math.random() * 0.25;
    tone(1200 + Math.random() * 2600, 0.05 + Math.random() * 0.1, 0.06, 'triangle', 0, t + dt);
  }
  thud(120, 0.25, t);
}

export function sfxAlarm(times = 3) {
  if (!ac) return;
  for (let i = 0; i < times; i++) {
    const base = ac.currentTime + i * 0.85;
    sweep(600, 950, 0.4, 0.1, base);
  }
}

export function sfxDogBark() {
  if (!ac) return;
  const t = ac.currentTime;
  for (let i = 0; i < 2; i++) {
    const t0 = t + i * 0.28;
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(160, t0);
    o.frequency.exponentialRampToValueAtTime(90, t0 + 0.12);
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.8;
    const g = ac.createGain(); env(g, t0, 0.01, 0.3, 0.14);
    o.connect(f).connect(g).connect(master);
    o.start(t0); o.stop(t0 + 0.2);
  }
}

export function sfxFire(on) {
  if (!ac) return;
  if (!on) return stopFire();
  if (fireNodes) return;
  const noise = makeNoiseSource();
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 0.4;
  const g = ac.createGain(); g.gain.value = 0.05;
  const lfo = ac.createOscillator(); lfo.frequency.value = 7;
  const lg = ac.createGain(); lg.gain.value = 0.025;
  lfo.connect(lg).connect(g.gain);
  noise.connect(f).connect(g).connect(master);
  noise.start(); lfo.start();
  fireNodes = [noise, lfo];
}
let fireNodes = null;
function stopFire() {
  if (!fireNodes) return;
  fireNodes.forEach((n) => { try { n.stop(); } catch (_) {} });
  fireNodes = null;
}

function tone(freq, dur, vol = 0.15, type = 'sine', bend = 0, at = null) {
  if (!ac) return;
  const t = at ?? ac.currentTime;
  const o = ac.createOscillator();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (bend) o.frequency.linearRampToValueAtTime(Math.max(30, freq + bend), t + dur);
  const g = ac.createGain(); env(g, t, 0.01, vol, dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function sweep(f0, f1, dur, vol, at) {
  const t = at ?? ac.currentTime;
  const o = ac.createOscillator(); o.type = 'square';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.linearRampToValueAtTime(f1, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.04);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function thud(freq, dur, at = null) {
  if (!ac) return;
  const t = at ?? ac.currentTime;
  const o = ac.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(35, t + dur);
  const g = ac.createGain(); env(g, t, 0.008, 0.35, dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

// ---------- voix ----------
// Une réplique doublée par ElevenLabs (voices/<id>.mp3) est jouée si elle
// existe ; sinon on retombe sur la synthèse du navigateur. Le jeu reste donc
// entièrement jouable sans avoir généré la moindre voix.

/** Identifiant de fichier d'une réplique — FNV-1a, identique côté Python
 *  (integrations/elevenlabs/client.py). Doit rester synchrone : c'est ce qui
 *  interdit crypto.subtle, asynchrone par nature. */
export function lineId(text) {
  let h = 0x811c9dc5;
  const bytes = new TextEncoder().encode(text.trim());
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

let voiceManifest = null;   // Set des ids disponibles, ou null si non chargé
let currentVoice = null;    // HTMLAudioElement en cours
export const spokenLines = []; // journal, pour générer les voix manquantes

/** Charge voices/manifest.json s'il existe. Sans lui, tout passe en synthèse. */
export async function loadVoiceManifest() {
  try {
    const res = await fetch('voices/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return false;
    const data = await res.json();
    voiceManifest = new Set(Object.values(data.lines || {}));
    return voiceManifest.size > 0;
  } catch (_) {
    return false;
  }
}

let frVoice = undefined;
function pickVoice() {
  if (frVoice !== undefined) return frVoice;
  const voices = speechSynthesis.getVoices();
  frVoice = voices.find((v) => v.lang.startsWith('fr')) || null;
  return frVoice;
}
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => { frVoice = undefined; pickVoice(); };
}

export function speak(text, { rate = 1.02, pitch = 0.85 } = {}) {
  if (!spokenLines.includes(text)) spokenLines.push(text);

  const id = lineId(text);
  if (voiceManifest && voiceManifest.has(id + '.mp3')) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (currentVoice) { currentVoice.pause(); currentVoice = null; }
    const el = new Audio(`voices/${id}.mp3`);
    el.volume = 0.95;
    currentVoice = el;
    // si le fichier est illisible, on ne laisse pas la réplique muette
    el.play().catch(() => browserSpeak(text, rate, pitch));
    return;
  }
  browserSpeak(text, rate, pitch);
}

function browserSpeak(text, rate, pitch) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = rate; u.pitch = pitch; u.volume = 0.95;
  speechSynthesis.speak(u);
}
