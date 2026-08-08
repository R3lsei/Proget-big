// tripo.js — Pont optionnel vers Tripo3D (integrations/tripo du dépôt).
// Si le jeu est servi par `python serve.py` avec une TRIPO_API_KEY, chaque objet
// réel scanné est régénéré en vrai modèle 3D et apparaît physiquement dans le
// complexe. Sans backend ni clé, ce module se désactive silencieusement.

let available = null; // null = inconnu, false = pas de backend/clé
const pending = new Set();

export async function requestRealModel(item, getPosition, ui, spawn) {
  if (available === false || pending.has(item.cocoClass)) return;
  pending.add(item.cocoClass);
  try {
    const res = await fetch('/api/tripo3d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cls: item.cocoClass, name: item.name }),
    });
    if ([404, 405, 501, 503].includes(res.status)) { available = false; return; }
    if (!res.ok) return;
    available = true;
    const { url } = await res.json();
    const pos = getPosition();
    spawn(url, pos, () => {
      ui.notify(`🌀 Matérialisation physique achevée : ${item.name} vient d'apparaître devant vous <small>(généré par Tripo3D)</small>.`);
    });
  } catch (_) {
    available = false;
  } finally {
    pending.delete(item.cocoClass);
  }
}
