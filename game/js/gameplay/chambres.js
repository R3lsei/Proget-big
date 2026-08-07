// chambres.js — Les chambres du complexe, déclarées une seule fois.
//
// Ce fichier est lu par DEUX programmes qui n'ont rien à voir l'un avec l'autre :
//
//     batisseur.js      → construit la pièce en 3D
//     resolubilite.js   → prouve qu'elle est franchissable
//
// C'est délibéré et c'est le cœur de T-022. Ailleurs, un niveau vit dans un
// fichier et sa validation dans un autre ; on déplace un objet dans l'un, on
// oublie l'autre, et la salle validée n'est plus celle qu'on joue. Ici il n'y a
// rien à synchroniser, donc rien à oublier.
//
// ─── Format ──────────────────────────────────────────────────────────────────
//   id           identifiant court, apparaît dans les messages d'échec
//   titre        nom affiché au joueur
//   etat         'soigne' | 'envahi' — décide des matières et de l'ambiance
//   taille       { largeur, profondeur } en modules de 1,2 m
//   objets       objets PRÉSENTS dans la pièce, noms de la base curatée
//   poses        objet → { x, z } en modules — où il repose au départ
//   receptacles  instance → { type, x, z } — maintenu par une PRÉSENCE
//   terminaux    instance → { type, x, z } — déclenché par une ACTION, reste acquis
//   passerelles  [{ id, x, z, largeur, longueur, condition }] — franchissables une fois sorties
//   gouffre      { xMin, xMax, zMin, zMax } en modules — le sol y est absent
//   zones        zone → condition d'accès ; « depart » est toujours atteignable
//   dans         objet | mécanisme → zone où il se trouve (défaut : « depart »)
//   sortie       condition sur les instances (grammaire de utils/conditions)
//   epreuves     [{ id, affordance }] outils nécessaires
//   porte        { mur, ouverture }
//   decor        éléments non bloquants : jardinières, lierre
//
// ─── Règle absolue ───────────────────────────────────────────────────────────
// `objets` liste ce que LA CHAMBRE contient. Ce que le joueur montre à la caméra
// n'y figure jamais : une chambre doit être franchissable sans caméra, sinon un
// joueur sans rien sous la main reste bloqué. La caméra ajoute des solutions,
// elle n'en remplace aucune.

/** Chambre 1 — le réveil. Tutoriel du portage et de la plaque de pression. */
const REVEIL = {
  id: 'c01_reveil',
  titre: 'Salle de réveil',
  etat: 'soigne',
  taille: { largeur: 8, profondeur: 8 },
  // Deux objets lourds pour une seule plaque : la chambre reste franchissable
  // même si le joueur en perd un, et il découvre que plusieurs choses marchent.
  objets: ['brique', 'caillou', 'couteau', 'éponge'],
  poses: {
    brique: { x: -1.8, z: 1.2 },
    caillou: { x: 1.9, z: 0.4 },
    couteau: { x: 0.6, z: 2.4 },
    'éponge': { x: -2.4, z: 2.6 },
  },
  receptacles: {
    plaque: { type: 'plaque_pression', x: 0, z: -1.5 },
  },
  sortie: 'plaque',
  epreuves: [{ id: 'liens', affordance: 'couper' }],
  porte: { mur: 'nord', ouverture: 2 },
  decor: [
    { type: 'jardiniere', largeur: 2, x: -2.6, z: -3.2 },
    { type: 'jardiniere', largeur: 2, x: 2.6, z: 3.2, rotation: Math.PI },
  ],
};

/** Chambre 2 — la serre abandonnée. Deux mécanismes simultanés. */
const SERRE = {
  id: 'c02_serre',
  titre: 'Serre abandonnée',
  etat: 'envahi',
  taille: { largeur: 10, profondeur: 8 },
  // Deux plaques à maintenir en même temps : il faut donc deux objets lourds
  // DISTINCTS. C'est précisément le cas que le vérificateur de résolubilité sait
  // détecter, et la raison pour laquelle il ne se contente pas d'une suite de
  // vérifications indépendantes.
  objets: ['brique', 'pot de fleurs', 'tournevis', 'arrosoir'],
  // `tournevis` est conducteur et allongé : il ponte le boîtier. Aucun objet de
  // la salle n'est programmable — la console est donc la voie de qui montre un
  // téléphone à la caméra, le boîtier celle de qui n'en a pas.
  poses: {
    brique: { x: -1.4, z: 2.2 },
    'pot de fleurs': { x: 1.6, z: 2.4 },
    tournevis: { x: 0.2, z: 1.2 },
    arrosoir: { x: 3.6, z: 0.6 },
  },
  // La plate-forme du fond n'est atteignable qu'une fois le pont sorti. Les
  // OUTILS qui sortent le pont doivent donc rester du côté du départ : les
  // placer au-delà rendrait la salle impossible tout en la laissant « prouvée »
  // par un vérificateur qui ignore l'espace.
  // Le gouffre rend la séparation RÉELLE. Sans lui, les zones ne seraient que
  // des mots et le joueur marcherait jusqu'aux plaques sur un sol plein.
  gouffre: { xMin: -5, xMax: 5, zMin: -3.6, zMax: -1.6 },
  zones: {
    plateforme: 'pont',
  },
  dans: {
    plaque_gauche: 'plateforme',
    plaque_droite: 'plateforme',
  },
  receptacles: {
    plaque_gauche: { type: 'plaque_pression', x: -3, z: -0.8 },
    plaque_droite: { type: 'plaque_pression', x: 3, z: -0.8 },
  },
  terminaux: {
    // DEUX voies pour la même passerelle : la console demande de l'informatique,
    // le boîtier seulement de quoi ponter deux contacts. Un joueur sans appareil
    // programmable n'est donc jamais bloqué — c'est la règle des solutions
    // multiples appliquée au piratage.
    console: { type: 'console_reseau', x: -4, z: -2.6 },
    boitier: { type: 'boitier_commande', x: 4, z: -2.6 },
  },
  passerelles: [
    {
      id: 'pont',
      x: 0, z: -2.6, largeur: 2, longueur: 2,
      condition: { auMoins: ['console', 'boitier'] },
    },
  ],
  // La sortie exige les deux plaques ET la passerelle : sans elle, les plaques
  // sont hors d'atteinte de l'autre côté du gouffre.
  sortie: { toutes: ['plaque_gauche', 'plaque_droite', 'pont'] },
  epreuves: [{ id: 'trappe', affordance: 'faire_levier' }],
  porte: { mur: 'nord', ouverture: 2 },
  decor: [
    { type: 'lierre', largeur: 10, densite: 90, graine: 12, x: 0, z: 3.6 },
    { type: 'lierre', largeur: 8, densite: 70, graine: 31, x: -4.6, z: 0, rotation: Math.PI / 2 },
    { type: 'jardiniere', largeur: 3, x: 3.2, z: 2.6 },
  ],
};

/** Chambres du jeu, dans l'ordre de progression. */
export const CHAMBRES = Object.freeze([REVEIL, SERRE]);
