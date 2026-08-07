// camera.js — Acquisition du flux vidéo et cycle de vie.
//
// ─── Ce que ce module garantit au joueur ─────────────────────────────────────
// La caméra ne s'allume que sur une action explicite, et s'éteint réellement
// quand on ferme le scanner : les pistes sont arrêtées, pas seulement détachées.
// Une webcam dont le voyant reste allumé après qu'on a fermé un panneau détruit
// la confiance, et aucune promesse écrite ailleurs ne la rétablit.
//
// Aucune image ne quitte l'ordinateur. L'inférence est locale, et ce module
// n'expose aucun moyen d'envoyer quoi que ce soit.

/** Résolution demandée : assez pour reconnaître, assez peu pour rester fluide. */
export const RESOLUTION = Object.freeze({ width: 640, height: 480 });

/**
 * Ouvre la caméra.
 *
 * Ne masque pas le refus de permission : renvoyer un flux vide ferait croire à
 * une panne, là où le joueur a simplement dit non et peut revenir sur sa
 * décision.
 */
export async function ouvrir({ media = navigator.mediaDevices } = {}) {
  if (!media?.getUserMedia) {
    return { ok: false, raison: 'Ce navigateur ne donne pas accès à la caméra.' };
  }
  try {
    const flux = await media.getUserMedia({ video: RESOLUTION, audio: false });
    return { ok: true, flux };
  } catch (erreur) {
    const raison = erreur?.name === 'NotAllowedError'
      ? 'Accès à la caméra refusé. Vous pouvez l\'autoriser puis réessayer.'
      : `Caméra indisponible : ${erreur?.message ?? erreur}`;
    return { ok: false, raison };
  }
}

/**
 * Ferme la caméra pour de bon.
 *
 * Arrêter chaque piste, et pas seulement vider l'élément vidéo : détacher le
 * flux sans l'arrêter laisse la webcam allumée, voyant compris. C'est le défaut
 * le plus courant de ce genre de code, et le plus difficile à faire pardonner.
 */
export function fermer(flux) {
  if (!flux) return false;
  for (const piste of flux.getTracks?.() ?? []) piste.stop();
  return true;
}

/** La caméra est-elle réellement active ? */
export function estActive(flux) {
  return Boolean(flux?.getTracks?.().some((piste) => piste.readyState === 'live'));
}
