// Barrière de résolubilité : refuse de livrer une salle impossible à terminer.
//
//   node tools/verifier-salles.mjs
//
// Sort en code 1 si une salle est insoluble, ce qui fait échouer la CI. C'est
// délibérément aussi bloquant qu'un test rouge : une salle impossible ne plante
// pas, ne lève rien, et ne se voit qu'après des heures de jeu perdues.

import { SALLES } from '../game/js/gameplay/salles.js';
import { chercher } from '../game/js/perception/base/index.js';
import { verifierParcours } from '../game/js/gameplay/resolubilite.js';

const BLEU = '[36m';
const ROUGE = '[31m';
const VERT = '[32m';
const NEUTRE = '[0m';

if (SALLES.length === 0) {
  // « Zéro salle, zéro échec » n'est pas une preuve. Sans cet avertissement, le
  // jour où le chargeur de salles oublierait de les déclarer, la barrière
  // resterait verte tout en ne vérifiant plus rien.
  console.log(`${BLEU}Résolubilité${NEUTRE} : aucune salle déclarée dans `
    + 'game/js/gameplay/salles.js.');
  console.log('  Rien n\'a été vérifié — ce n\'est pas un succès, seulement un vide.');
  process.exit(0);
}

const { resoluble, echecs } = verifierParcours(SALLES, chercher);

if (resoluble) {
  console.log(`${VERT}Résolubilité${NEUTRE} : ${SALLES.length} salle(s) prouvée(s) `
    + 'franchissables avec leurs seuls objets.');
  process.exit(0);
}

console.error(`${ROUGE}Résolubilité : ${echecs.length} salle(s) impossible(s)${NEUTRE}\n`);
for (const echec of echecs) {
  console.error(`  ${ROUGE}✗${NEUTRE} ${echec.salle} — ${echec.raison}`);
}
console.error('\n  Une salle impossible ne plante pas : le joueur cherche, puis abandonne.');
process.exit(1);
