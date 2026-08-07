// salles.js — Déclaration des salles du jeu, au format vérifiable.
//
// Toute salle listée ici est passée au vérificateur de résolubilité avant chaque
// livraison (`npm run verifier`). Une salle impossible fait échouer la CI, au
// même titre qu'un test rouge.
//
// ─── Format ──────────────────────────────────────────────────────────────────
//   id           identifiant court, apparaît dans les messages d'échec
//   objets       noms d'objets présents, tels qu'ils figurent dans la base curatée
//   receptacles  instance → type de réceptacle (voir mecanismes.js)
//   sortie       condition sur les instances, dans la grammaire de utils/conditions
//   epreuves     [{ id, affordance }] outils nécessaires, utilisés brièvement
//
// ─── Règle de conception ─────────────────────────────────────────────────────
// Les objets listés sont ceux QUE LA SALLE CONTIENT. Ce que le joueur montre à
// la caméra ne compte pas : la salle doit être franchissable sans caméra, sinon
// un joueur sans rien sous la main reste bloqué. La caméra ajoute des solutions,
// elle n'en remplace jamais.

/**
 * Salles du jeu.
 *
 * Simple réexport : les chambres sont déclarées dans `chambres.js`, au format
 * que le bâtisseur 3D lit également. C'est tout l'intérêt — la barrière protège
 * exactement les chambres que le joueur parcourt, pas une copie tenue à jour à
 * la main qui finirait par diverger.
 */
export { CHAMBRES as SALLES } from './chambres.js';
