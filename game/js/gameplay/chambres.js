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
//   receptacles  instance → { type, x, z } — type dans mecanismes.js, position en modules
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
  receptacles: {
    plaque_gauche: { type: 'plaque_pression', x: -3, z: -1 },
    plaque_droite: { type: 'plaque_pression', x: 3, z: -1 },
  },
  sortie: { toutes: ['plaque_gauche', 'plaque_droite'] },
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
