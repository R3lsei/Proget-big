// portage.js — Prendre, transporter et poser un objet du décor.
//
// C'est ce qui rend jouables les mécanismes de `gameplay/mecanismes.js` : sans
// portage, une plaque de pression n'est qu'une règle qu'on ne peut pas déclencher.
//
// ─── Objets contraints, décision assumée ─────────────────────────────────────
// Aucune rotation, aucun empilement libre, aucun roulement. Un objet garde son
// orientation et tombe droit. C'est l'approche de Portal, et pour la même raison :
// dans un jeu d'énigmes, un objet parti rouler sous un décor rend la salle
// insoluble. C'est le pire bug possible — le joueur ne sait même pas qu'il est
// bloqué par un bug plutôt que par sa propre réflexion.
//
// ─── Ce que le module ne décide pas ──────────────────────────────────────────
// Il ne dit pas QUELS objets sont transportables. Une propriété physique décrit
// un objet en général, pas l'exemplaire posé dans une salle : `lourd` vaut pour
// un réfrigérateur comme pour une brique. C'est le niveau qui déclare ses objets
// mobiles, et les propriétés qui disent ce qu'ils accomplissent une fois posés.
// Confondre les deux ferait soulever la machine à laver.

import { deplacerSurAxe, boiteDuCorps } from './collision.js';

/** Distance à laquelle l'objet flotte devant les yeux. */
export const DISTANCE_PORTAGE = 1.5;

/**
 * Au-delà de cette distance entre l'objet et sa cible, il est lâché.
 *
 * Sans rupture, un objet coincé derrière un mur resterait « tenu » à travers la
 * géométrie et se téléporterait auprès du joueur au premier dégagement. La
 * rupture transforme un bug de traversée en geste lisible : l'objet tombe.
 */
export const DISTANCE_RUPTURE = 2.4;

/** Portée maximale pour saisir un objet. */
export const PORTEE_SAISIE = 2.2;

/** Accélération de la pesanteur, en unités par seconde carrée. */
export const GRAVITE = -18;

/** Vitesse de rattrapage de l'objet vers sa position de portage. */
export const REACTIVITE = 14;

/** Un objet lourd freine celui qui le porte. */
export const RALENTISSEMENT_LOURD = 0.6;

/**
 * Direction du regard, convention du joueur : lacet nul regarde vers -Z.
 *
 * Le tangage est pris en compte pour que l'objet monte et descende avec la vue —
 * sans lui, viser le sol pour poser quelque chose donnerait l'impression de le
 * pousser dans le décor plutôt que de le déposer.
 */
export function directionRegard({ yaw, pitch = 0 }) {
  const cosTangage = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * cosTangage,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cosTangage,
  };
}

/** Position que l'objet porté cherche à atteindre, devant les yeux du porteur. */
export function positionDePortage(porteur, distance = DISTANCE_PORTAGE) {
  const direction = directionRegard(porteur);
  const yeux = porteur.y + (porteur.hauteurYeux ?? 1.6);
  return {
    x: porteur.x + direction.x * distance,
    y: yeux + direction.y * distance,
    z: porteur.z + direction.z * distance,
  };
}

/** Distance au carré entre deux points. Évite une racine dans les comparaisons. */
function distanceCarree(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * L'objet est-il assez proche du porteur pour être saisi ?
 *
 * Mesuré depuis les yeux, pas depuis les pieds : le joueur vise avec la caméra,
 * et un objet posé sur une table serait autrement jugé plus loin qu'il n'y paraît.
 */
export function aPortee(porteur, objet, portee = PORTEE_SAISIE) {
  const yeux = { x: porteur.x, y: porteur.y + (porteur.hauteurYeux ?? 1.6), z: porteur.z };
  return distanceCarree(yeux, objet) <= portee * portee;
}

/**
 * Facteur de rattrapage indépendant de la fréquence d'images.
 *
 * Un simple `position += (cible - position) * 0.2` avance deux fois plus vite à
 * 120 images par seconde qu'à 60 : l'objet porté collerait à la vue chez les uns
 * et traînerait chez les autres. L'exponentielle donne le même mouvement réel
 * quelle que soit la machine, ce qui compte d'autant plus que le jeu vise 120 FPS
 * sans l'imposer.
 */
export function facteurLissage(reactivite, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return 0;
  return 1 - Math.exp(-reactivite * dt);
}

/**
 * Fait suivre au porteur l'objet qu'il tient, en respectant les obstacles.
 *
 * L'objet est déplacé axe par axe par le même résolveur que le joueur : il ne
 * peut donc pas entrer dans un mur, ni servir à traverser la géométrie en le
 * poussant devant soi.
 *
 * @returns {{ lache: boolean }} vrai si l'objet a rompu et doit tomber
 */
export function suivrePorteur(objet, porteur, obstacles, gabarit, dt, options = {}) {
  const { reactivite = REACTIVITE, distance = DISTANCE_PORTAGE } = options;
  const cible = positionDePortage(porteur, distance);
  const facteur = facteurLissage(reactivite, dt);

  // Axe par axe, et non par un vecteur : c'est ce qui garantit de repousser
  // l'objet du côté d'où il vient (voir collision.js).
  deplacerSurAxe(objet, 'x', (cible.x - objet.x) * facteur, obstacles, gabarit);
  deplacerSurAxe(objet, 'y', (cible.y - objet.y) * facteur, obstacles, gabarit);
  deplacerSurAxe(objet, 'z', (cible.z - objet.z) * facteur, obstacles, gabarit);

  // Un objet porté ne tombe pas : sa vitesse verticale doit repartir de zéro
  // quand on le lâche, sinon il plonge comme s'il chutait depuis le plafond.
  objet.vy = 0;
  objet.auSol = false;

  return { lache: distanceCarree(objet, cible) > DISTANCE_RUPTURE * DISTANCE_RUPTURE };
}

/**
 * Applique la pesanteur à un objet libre et résout sa chute.
 *
 * La vitesse est bornée : sur une image longue — un chargement, un onglet remis
 * au premier plan — une chute non bornée franchirait plusieurs mètres d'un coup.
 * Le découpage en sous-pas de `deplacerSurAxe` empêche déjà la traversée, mais
 * l'objet finirait tout de même au fond d'une salle qu'il n'a jamais parcourue.
 */
export function appliquerGravite(objet, dt, obstacles, gabarit, gravite = GRAVITE) {
  if (!Number.isFinite(dt) || dt <= 0) return objet;
  const pas = Math.min(dt, 0.1);
  objet.vy = (objet.vy ?? 0) + gravite * pas;
  objet.auSol = false;
  deplacerSurAxe(objet, 'y', objet.vy * pas, obstacles, gabarit);
  return objet;
}

/**
 * Un objet posé repose-t-il sur ce réceptacle ?
 *
 * Le chevauchement horizontal suffit : exiger un contact vertical exact rendrait
 * l'activation dépendante d'une marge de deux millimètres, et le joueur verrait
 * son cube « presque » posé sans comprendre pourquoi rien ne se passe.
 */
export function reposeSur(objet, gabarit, receptacle, tolerance = 0.15) {
  const boite = boiteDuCorps(objet, gabarit);
  const chevauche = boite.minX < receptacle.maxX && boite.maxX > receptacle.minX
                 && boite.minZ < receptacle.maxZ && boite.maxZ > receptacle.minZ;
  if (!chevauche) return false;
  const ecart = boite.minY - receptacle.maxY;
  return ecart >= -tolerance && ecart <= tolerance;
}

/**
 * Centre l'objet sur un réceptacle et le pose dessus.
 *
 * L'aimantation évite le geste ingrat du cube posé de travers qui glisse à
 * côté. Elle n'accorde rien : la condition d'activation reste entière, seule la
 * précision manuelle exigée disparaît.
 */
export function poserSur(objet, gabarit, receptacle) {
  objet.x = (receptacle.minX + receptacle.maxX) / 2;
  objet.z = (receptacle.minZ + receptacle.maxZ) / 2;
  objet.y = receptacle.maxY;
  objet.vy = 0;
  objet.auSol = true;
  return objet;
}

/** Un objet lourd ralentit son porteur ; un objet léger ne coûte rien. */
export function facteurVitesse(proprietes) {
  const faits = proprietes instanceof Set ? proprietes : new Set(proprietes ?? []);
  return faits.has('lourd') ? RALENTISSEMENT_LOURD : 1;
}
