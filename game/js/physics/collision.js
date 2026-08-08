// Résolution de collisions d'un corps capsulaire contre des boîtes statiques.
//
// Fonctions pures : on passe un corps, on récupère un corps. Aucun état global,
// aucune dépendance au rendu. C'est ce qui permet de tester en CI, en
// millisecondes, un comportement qui autrement ne se vérifierait qu'en jouant.
//
// Historique — voir KNOWN_BUGS.md B-001. Ce module encode deux corrections
// durement acquises ; les tests de tests/js/collision.test.js les verrouillent.

import { depuisCentre, seChevauchent, borneMin, borneMax } from './aabb.js';

/**
 * En dessous de ce seuil, un déplacement est ignoré.
 *
 * Ce n'est pas une micro-optimisation, c'est une correction de bug. La
 * direction du regard se calcule avec des sinus : `Math.sin(Math.PI)` vaut
 * 1,2e-16 et non zéro. En marchant droit en arrière, ce résidu produisait un
 * déplacement latéral infime qui déclenchait quand même la correction de
 * collision — laquelle plaquait le joueur sur le bord opposé de l'obstacle,
 * l'éjectant du décor en cascade.
 */
export const SEUIL_DEPLACEMENT = 1e-6;

/** Marge de dégagement après correction, pour ne pas rester au contact exact. */
const MARGE = 0.002;

/** Hauteur maximale d'une surface sur laquelle on peut se poser en tombant. */
const TOLERANCE_APPUI = 0.02;

/**
 * @typedef {{x:number, y:number, z:number, vy:number, auSol:boolean}} Corps
 * @typedef {{rayon:number, hauteur:number}} Gabarit
 */

/** Boîte englobante d'un corps : une capsule approximée par une boîte. */
export function boiteDuCorps(corps, gabarit) {
  return depuisCentre(
    corps.x, corps.y + gabarit.hauteur / 2, corps.z,
    gabarit.rayon * 2, gabarit.hauteur, gabarit.rayon * 2
  );
}

/**
 * Déplace un corps sur UN SEUL axe et résout les collisions sur ce même axe.
 *
 * Résoudre axe par axe — plutôt que d'appliquer un déplacement 3D puis de
 * corriger — garantit qu'on repousse toujours le corps du côté d'où il vient.
 * Une correction multi-axes ne sait pas de quel côté elle arrive et peut
 * traverser l'obstacle.
 *
 * @param {Corps} corps      modifié sur place
 * @param {'x'|'y'|'z'} axe
 * @param {number} distance  déplacement signé
 * @param {Aabb[]} obstacles
 * @param {Gabarit} gabarit
 * @returns {Corps} le corps, pour chaîner
 */
export function deplacerSurAxe(corps, axe, distance, obstacles, gabarit) {
  if (!Number.isFinite(distance) || Math.abs(distance) < SEUIL_DEPLACEMENT) {
    return corps;
  }

  // Un déplacement plus grand que le corps peut franchir un obstacle sans
  // jamais le chevaucher : la collision n'est testée qu'à l'arrivée. À 120 FPS
  // cela n'arrive pas, mais un à-coup de 100 ms suffit à traverser un mur.
  // On découpe donc en sous-pas bornés par le gabarit.
  const pasMax = Math.max(gabarit.rayon, 0.05);
  if (Math.abs(distance) > pasMax) {
    const nb = Math.ceil(Math.abs(distance) / pasMax);
    const pas = distance / nb;
    for (let i = 0; i < nb; i++) deplacerSurAxe(corps, axe, pas, obstacles, gabarit);
    return corps;
  }

  const piedsAvant = corps.y;
  corps[axe] += distance;
  let boite = boiteDuCorps(corps, gabarit);

  for (const obstacle of obstacles) {
    if (!seChevauchent(boite, obstacle)) continue;

    if (axe === 'y') {
      if (distance < 0) {
        // On ne se pose que sur une surface qui était déjà sous nos pieds.
        // Sans ce garde-fou, frôler un mur en tombant téléporterait le joueur
        // à son sommet.
        if (obstacle.maxY > piedsAvant + TOLERANCE_APPUI) continue;
        corps.y = obstacle.maxY + MARGE;
        corps.vy = 0;
        corps.auSol = true;
      } else {
        corps.y = obstacle.minY - gabarit.hauteur - MARGE;
        corps.vy = 0;
      }
    } else if (distance > 0) {
      corps[axe] = borneMin(obstacle, axe) - gabarit.rayon - MARGE;
    } else {
      corps[axe] = borneMax(obstacle, axe) + gabarit.rayon + MARGE;
    }

    boite = boiteDuCorps(corps, gabarit);
  }

  return corps;
}

/**
 * Ramène un corps sorti des limites du niveau à sa dernière position valide.
 *
 * Filet de sécurité : même avec une résolution correcte, une géométrie
 * dégénérée ou un déplacement téléporté pourrait sortir le joueur. Mieux vaut
 * une position légèrement en arrière qu'un joueur flottant hors du décor.
 *
 * @returns {boolean} vrai si le corps a dû être ramené
 */
export function contraindreAuxLimites(corps, limites, derniereValide) {
  const dehors = corps.x < limites.minX || corps.x > limites.maxX
              || corps.y < limites.minY || corps.y > limites.maxY
              || corps.z < limites.minZ || corps.z > limites.maxZ;

  if (dehors) {
    corps.x = derniereValide.x;
    corps.y = derniereValide.y;
    corps.z = derniereValide.z;
    corps.vy = 0;
    return true;
  }
  return false;
}
