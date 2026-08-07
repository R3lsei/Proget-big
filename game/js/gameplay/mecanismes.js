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
import { permet } from '../perception/affordances.js';

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
 * `occupations` associe une INSTANCE de réceptacle à son occupant :
 *   { type: 'plaque_pression', proprietes: [...], estLeJoueur: false }
 * ou `null` si rien n'y repose.
 *
 * Le type est obligatoire et distinct de l'instance. Une chambre nomme ses
 * mécanismes librement — « plaque_gauche », « plaque_droite » — et rien ne dit
 * de quel type ils sont. Confondre les deux fait chercher un réceptacle nommé
 * « plaque_gauche » dans le catalogue, où il n'existe pas : le mécanisme ne
 * s'active jamais et rien ne le signale. C'est ce qu'a révélé le premier
 * assemblage complet du jeu.
 *
 * Renvoie un `Set`, directement évaluable par la grammaire de conditions : c'est
 * ce qui permet à une porte de s'exprimer en `{ toutes: ['plaque_a', 'plaque_b'] }`
 * sans une ligne de code supplémentaire.
 */
export function receptaclesActifs(occupations) {
  const actifs = new Set();
  for (const [instance, occupant] of Object.entries(occupations ?? {})) {
    if (!occupant) continue;
    if (activePar(occupant.type, occupant.proprietes, { estLeJoueur: occupant.estLeJoueur })) {
      actifs.add(instance);
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

/**
 * Terminaux : mécanismes déclenchés par une ACTION, et qui restent enclenchés.
 *
 * ─── Pourquoi ce n'est pas un réceptacle ─────────────────────────────────────
 * Une plaque se maintient par une présence : on retire l'objet, elle retombe.
 * Un terminal piraté reste piraté. Les confondre obligerait le joueur à rester
 * planté devant la console, téléphone en main, pendant que la passerelle est
 * sortie — ce qui n'a aucun sens et l'empêcherait de l'emprunter.
 *
 *   requiert   affordance nécessaire (voir perception/affordances.js)
 *   verrouille l'état reste acquis une fois obtenu
 */
export const TERMINAUX = Object.freeze({
  console_reseau: {
    libelle: 'Console réseau',
    requiert: 'pirater',
    verrouille: true,
    indice: 'Une console vivante. Elle attend qu\'on lui parle son langage.',
  },
  boitier_commande: {
    libelle: 'Boîtier de commande',
    // Le boîtier est ouvert : le forcer ne demande pas d'informatique, seulement
    // de quoi ponter deux contacts. Deux voies pour une même porte.
    requiert: 'conduire',
    verrouille: true,
    indice: 'Le capot pend. Deux contacts nus, à réunir.',
  },
  lecteur_optique: {
    libelle: 'Lecteur optique',
    requiert: 'eclairer',
    verrouille: true,
    indice: 'La cellule est morte. Il lui faudrait de la lumière.',
  },
  serrure_mecanique: {
    libelle: 'Serrure mécanique',
    requiert: 'crocheter',
    verrouille: true,
    indice: 'Une serrure d\'un autre âge — donc sans électronique à pirater.',
  },
});

/** Identifiants des terminaux, dans l'ordre de déclaration. */
export const IDS_TERMINAUX = Object.freeze(Object.keys(TERMINAUX));

/**
 * Un objet permet-il de déclencher ce terminal ?
 *
 * Le terminal ne demande pas un objet précis mais une CAPACITÉ : pirater, ponter,
 * éclairer. Un téléphone, un ordinateur ou n'importe quoi de programmable et
 * communicant ouvre la même console — y compris un objet montré à la caméra.
 */
export function declenchePar(idTerminal, proprietes) {
  const terminal = TERMINAUX[idTerminal];
  if (!terminal) return false;
  return permet(terminal.requiert, proprietes);
}

/**
 * Terminaux enclenchés, à partir de ceux déjà acquis et d'une nouvelle action.
 *
 * Fonction pure : on lui passe l'état, elle renvoie le suivant. L'état verrouillé
 * doit survivre à une sauvegarde et à un rechargement — le garder dans une
 * variable de module le perdrait au premier retour au menu.
 */
export function enclencher(acquis, instance) {
  const suivant = new Set(acquis);
  suivant.add(instance);
  return suivant;
}

/** Indice d'un terminal, formulé en capacité et jamais en objet. */
export function indiceTerminal(idTerminal) {
  return TERMINAUX[idTerminal]?.indice ?? '';
}

/**
 * Assemble tous les faits vrais d'une chambre, en un seul ensemble.
 *
 * Trois natures s'y mêlent — réceptacles maintenus, terminaux enclenchés,
 * passerelles déployées — mais la grammaire de conditions n'en voit qu'un
 * ensemble de noms. C'est ce qui permet à une sortie d'exiger
 * `{ toutes: ['plaque_gauche', 'plaque_droite', 'pont'] }` sans que rien ne sache
 * que ces trois-là ne sont pas de même espèce.
 *
 * Fonction unique et partagée : le jeu et les tests doivent calculer les faits
 * de la même façon, sinon on vérifie un état que le joueur ne connaîtra jamais.
 *
 * @param {Set<string>} actifs       réceptacles occupés
 * @param {Set<string>} enclenches   terminaux déjà déclenchés
 * @param {Iterable<[string, {condition: object}]>} passerelles
 */
export function faitsDeChambre(actifs, enclenches, passerelles = []) {
  const faits = new Set([...(actifs ?? []), ...(enclenches ?? [])]);
  // Une passerelle dépend de terminaux, jamais d'une autre passerelle : un seul
  // passage suffit. Autoriser l'enchaînement demanderait un point fixe, et
  // surtout ouvrirait la porte aux dépendances circulaires.
  for (const [id, pont] of passerelles) {
    if (evaluer(pont.condition, faits)) faits.add(id);
  }
  return faits;
}
