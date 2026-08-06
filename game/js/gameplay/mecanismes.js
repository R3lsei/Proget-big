// mecanismes.js — Énigmes physiques : réceptacles, activation, circuits.
//
// Deuxième pilier du jeu, à côté du scan. Poser un objet lourd sur une plaque,
// ponter deux bornes avec du métal, glisser une carte dans une fente.
//
// ─── Pourquoi ce pilier existe ───────────────────────────────────────────────
// Le scan dépend entièrement de ce que le joueur a sous la main. Dans un train,
// dans un lit, sans rien à portée, le jeu s'arrêtait. Les énigmes physiques se
// jouent avec zéro objet réel : elles donnent au jeu un socle qui tient toujours.
//
// ─── Comment les deux piliers n'en font qu'un ────────────────────────────────
// Un réceptacle n'accepte pas « un cube ». Il accepte une CONDITION SUR DES
// PROPRIÉTÉS, exactement comme une affordance. La plaque de pression veut du
// `lourd` — un cube du décor convient, une brique montrée à la caméra aussi, une
// bouteille en plastique non. Le même vocabulaire sert aux deux systèmes, et rien
// n'est écrit deux fois.
//
// ─── Ce que le module ne fait pas ────────────────────────────────────────────
// Aucun déplacement, aucune collision, aucun rendu. Il répond à « cet objet
// active-t-il ce mécanisme, et cette porte s'ouvre-t-elle ? ». Le portage et la
// chute des objets appartiennent à `physics/`.

import { evaluer, feuilles, expliquer } from '../utils/conditions.js';

/**
 * Les réceptacles du complexe.
 *
 *   accepte          condition sur les propriétés de l'objet posé
 *   refuseLeJoueur   le poids du joueur ne suffit pas à l'activer
 *   permissif        accepte volontairement presque tout (facultatif)
 *   indice           formulation courte affichée à l'approche
 *
 * `permissif` déclare une intention plutôt que de la laisser deviner. Un
 * réceptacle qu'une grande partie du catalogue active n'exige plus rien du
 * joueur : c'est normalement un défaut de calibrage, et les tests le refusent.
 * Sauf pour le filet de sécurité, qui existe précisément pour ça — mais alors il
 * doit le dire, sinon un vrai défaut se cacherait un jour derrière la même
 * apparence.
 *
 * `refuseLeJoueur` est la mécanique fondatrice du genre : sans elle, le joueur
 * se tient sur la plaque, la porte s'ouvre, et il ne peut pas la franchir. C'est
 * précisément ce problème qui justifie l'existence du cube — l'énigme n'est pas
 * « trouver quelque chose de lourd », elle est « trouver quelque chose de lourd
 * QUI N'EST PAS SOI ».
 */
export const RECEPTACLES = Object.freeze({
  plaque_pression: {
    libelle: 'Plaque de pression',
    accepte: 'lourd',
    refuseLeJoueur: true,
    indice: 'Il faut la maintenir enfoncée par autre chose que soi.',
  },
  plaque_sensible: {
    libelle: 'Plaque sensible',
    // Se contente de n'importe quoi de posé : sert de tutoriel et de filet de
    // sécurité. Une salle dont toutes les plaques exigent du lourd devient
    // infranchissable pour un joueur qui n'a rien trouvé.
    accepte: { auMoins: ['lourd', 'rigide', 'contient_liquide'] },
    refuseLeJoueur: false,
    permissif: true,
    indice: 'Le moindre poids suffit.',
  },
  socle_conducteur: {
    libelle: 'Borne de pontage',
    // Deux bornes à ponter : il faut de quoi laisser passer le courant, et de
    // quoi couvrir la distance.
    accepte: { toutes: ['conducteur', { auMoins: ['allonge', 'mince'] }] },
    refuseLeJoueur: true,
    indice: 'Deux bornes nues. Quelque chose doit relier l\'une à l\'autre.',
  },
  fente_lecteur: {
    libelle: 'Fente de lecteur',
    accepte: { toutes: ['mince', 'plat'] },
    refuseLeJoueur: true,
    indice: 'Une fente étroite. Il y passerait quelque chose de fin et de plat.',
  },
  rail_magnetique: {
    libelle: 'Rail magnétique',
    accepte: 'magnetique',
    refuseLeJoueur: true,
    indice: 'Le rail retient ce que le métal attire.',
  },
  cellule_optique: {
    libelle: 'Cellule optique',
    // Une source de lumière, ou de quoi rediriger celle qui existe déjà.
    accepte: { auMoins: ['emet_lumiere', 'reflechissant'] },
    refuseLeJoueur: true,
    indice: 'La cellule attend un faisceau.',
  },
  bac_deversoir: {
    libelle: 'Déversoir',
    accepte: { toutes: ['contient_liquide', { sans: ['inflammable'] }] },
    refuseLeJoueur: true,
    indice: 'Le bac est sec. Il demande un liquide — et pas n\'importe lequel.',
  },
  brasero: {
    libelle: 'Brasero',
    accepte: { auMoins: ['inflammable', { toutes: ['contient_liquide', 'inflammable'] }] },
    refuseLeJoueur: true,
    indice: 'Il ne demande qu\'à brûler.',
  },
  mangeoire: {
    libelle: 'Mangeoire',
    accepte: 'appetissant_animal',
    refuseLeJoueur: true,
    indice: 'Quelque chose surveille cette gamelle.',
  },
  prise_secteur: {
    libelle: 'Prise de secours',
    accepte: 'alimente',
    refuseLeJoueur: true,
    indice: 'Le circuit est mort. Il lui faudrait sa propre source.',
  },
});

/** Identifiants des réceptacles, dans l'ordre de déclaration. */
export const IDS_RECEPTACLES = Object.freeze(Object.keys(RECEPTACLES));

/** Le joueur lui-même, tel que vu par un réceptacle sur lequel il monte. */
export const PROPRIETES_JOUEUR = Object.freeze(['lourd']);

/**
 * Un objet aux propriétés données active-t-il ce réceptacle ?
 *
 * `estLeJoueur` distingue le corps du joueur d'un objet posé. Sans ce paramètre,
 * il faudrait inventer une propriété « je suis vivant » dans un vocabulaire qui
 * décrit des faits physiques — et la première plaque de pression rendrait
 * l'énigme du cube caduque.
 */
export function activePar(idReceptacle, proprietes, { estLeJoueur = false } = {}) {
  const receptacle = RECEPTACLES[idReceptacle];
  if (!receptacle) return false;
  if (estLeJoueur && receptacle.refuseLeJoueur) return false;
  const faits = proprietes instanceof Set ? proprietes : new Set(proprietes ?? []);
  return evaluer(receptacle.accepte, faits);
}

/**
 * Réceptacles actifs, à partir de ce qui repose sur chacun.
 *
 * `occupations` associe un identifiant de réceptacle à son occupant :
 *   { proprietes: [...], estLeJoueur: false }  — ou `null` si rien n'y repose.
 *
 * Renvoie un `Set`, directement évaluable par la grammaire de conditions : c'est
 * ce qui permet à une porte de s'exprimer en `{ toutes: ['plaque_a', 'plaque_b'] }`
 * sans une ligne de code supplémentaire.
 */
export function receptaclesActifs(occupations) {
  const actifs = new Set();
  for (const [id, occupant] of Object.entries(occupations ?? {})) {
    if (!occupant) continue;
    if (activePar(id, occupant.proprietes, { estLeJoueur: occupant.estLeJoueur })) {
      actifs.add(id);
    }
  }
  return actifs;
}

/**
 * Le circuit est-il satisfait par les réceptacles actifs ?
 *
 * Aucun code propre à cette question : c'est la grammaire du socle, appliquée à
 * un autre ensemble de faits. Une porte s'écrit donc comme une affordance, et
 * s'explique avec la même fonction.
 */
export function circuitOuvert(condition, actifs) {
  return evaluer(condition, actifs instanceof Set ? actifs : new Set(actifs ?? []));
}

/** Réceptacles cités par un circuit, quelle que soit sa profondeur. */
export function receptaclesRequis(condition) {
  return feuilles(condition);
}

/**
 * Indice destiné au joueur : ce que le réceptacle réclame, en français.
 *
 * Jamais le nom d'un objet. « Quelque chose de lourd » laisse ouvertes toutes
 * les solutions ; « un cube » n'en laisse qu'une et transforme la réflexion en
 * chasse au trésor.
 */
export function indiceDe(idReceptacle, libelleDe = (id) => id) {
  const receptacle = RECEPTACLES[idReceptacle];
  if (!receptacle) return '';
  return `${receptacle.indice} (${expliquer(receptacle.accepte, libelleDe)})`;
}

/**
 * Objets d'un catalogue capables d'activer un réceptacle.
 *
 * Prend le catalogue en paramètre : le test de résolubilité doit pouvoir poser
 * la question sur les seuls objets présents dans une salle, pas sur la base
 * entière.
 */
export function objetsActivant(idReceptacle, entrees) {
  if (!RECEPTACLES[idReceptacle]) return [];
  return entrees.filter((entree) => activePar(idReceptacle, entree.proprietes));
}
