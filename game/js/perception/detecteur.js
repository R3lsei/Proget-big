// detecteur.js — Frontière étanche entre le jeu et la reconnaissance d'images.
//
// Le jeu ne connaît QUE cette interface : une image entre, des noms français de
// la base curatée sortent. Le modèle qui se trouve derrière — COCO-SSD
// aujourd'hui, open-vocabulary demain — est remplaçable sans qu'une ligne de
// gameplay ne change. C'était l'engagement pris au tout début du projet, et
// c'est le seul endroit où il se tient ou se rompt.
//
// ─── Deux traductions, jamais une ────────────────────────────────────────────
// Un détecteur parle sa propre langue : COCO-SSD renvoie « cell phone ». Le jeu
// parle celle de la base curatée : « téléphone ». La correspondance vit dans le
// détecteur, jamais dans le gameplay — sinon chaque changement de modèle
// obligerait à réécrire les règles.

import { chercher } from './base/index.js';

/**
 * Nombre d'images consécutives où un objet doit apparaître avant d'être retenu.
 *
 * Sans stabilisation, une reconnaissance qui hésite une image sur deux ferait
 * clignoter le résultat et mémoriserait n'importe quoi. Trois images valent une
 * demi-seconde à la cadence d'un détecteur lent : assez pour lever le doute,
 * assez court pour ne pas donner l'impression que rien ne se passe.
 */
export const IMAGES_STABLES = 3;

/** Confiance en dessous de laquelle une détection est ignorée. */
export const CONFIANCE_MINIMALE = 0.55;

/**
 * Suit les détections dans le temps et ne retient que ce qui se confirme.
 *
 * Fonction d'état pure quant à ses entrées : on lui passe l'état précédent, elle
 * renvoie le suivant. Aucune variable de module — un scanner ouvert deux fois
 * dans la même partie repartirait sinon avec les hésitations de la fois d'avant.
 */
export function creerStabilisateur({ images = IMAGES_STABLES } = {}) {
  return { candidat: null, serie: 0, images, confirme: null };
}

/**
 * Intègre une détection brute.
 *
 * @param {object} etat        issu de `creerStabilisateur`
 * @param {?string} nomFrancais nom de la base, ou null si rien n'est reconnu
 * @returns {object} l'état suivant ; `confirme` porte le nom quand il est acquis
 */
export function stabiliser(etat, nomFrancais) {
  if (!nomFrancais) {
    return { ...etat, candidat: null, serie: 0, confirme: null };
  }
  const serie = etat.candidat === nomFrancais ? etat.serie + 1 : 1;
  return {
    ...etat,
    candidat: nomFrancais,
    serie,
    confirme: serie >= etat.images ? nomFrancais : null,
  };
}

/**
 * Traduit une détection brute en entrée de la base curatée.
 *
 * Renvoie `null` pour ce qui est trop incertain ou hors base — les deux sont des
 * situations NORMALES, pas des erreurs. Un objet inconnu est même la promesse du
 * jeu : le repli sémantique (T-013) prendra le relais.
 */
export function versEntree(detection, traduire, confiance = CONFIANCE_MINIMALE) {
  if (!detection || detection.score < confiance) return null;
  const nomFrancais = traduire(detection.label);
  if (!nomFrancais) return null;
  return chercher(nomFrancais);
}

/**
 * Meilleure détection d'une liste, ou `null`.
 *
 * La plus sûre, pas la plus grande : un objet tenu près de l'objectif occupe
 * l'image sans être forcément celui qu'on montre. C'est la confiance du modèle
 * qui décide, jamais la surface.
 */
export function meilleure(detections) {
  let gagnante = null;
  for (const detection of detections ?? []) {
    if (!gagnante || detection.score > gagnante.score) gagnante = detection;
  }
  return gagnante;
}
