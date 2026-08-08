// conditions.js — Grammaire de conditions booléennes, sans domaine.
//
// Écrite d'abord pour les affordances (« tranchant et rigide »), elle s'est
// révélée valable pour tout ensemble de faits. Une porte qui s'ouvre quand deux
// plaques sont enfoncées s'exprime exactement pareil : { toutes: ['plaque_a',
// 'plaque_b'] }, évalué contre l'ensemble des plaques actives.
//
// Elle vit donc dans `utils/`, que tout le monde peut connaître, plutôt que dans
// `perception/`, ce qui aurait forcé le gameplay à dépendre de la perception pour
// une simple structure logique.
//
// ─── Grammaire ───────────────────────────────────────────────────────────────
//   'fait'                  le fait est présent
//   { toutes: [...] }       toutes les sous-conditions
//   { auMoins: [...] }      au moins une sous-condition
//   { sans: [...] }         aucune des sous-conditions
//
// Les formes se composent librement et sans limite de profondeur.
//
// ─── Pourquoi des données plutôt que des fonctions ───────────────────────────
// `(f) => f.has('tranchant') && f.has('rigide')` serait plus court et fermerait
// trois portes : traduire la règle en indice pour le joueur, l'inverser pour
// vérifier qu'une énigme a une solution, et la lire sans l'exécuter. Une
// condition déclarative se lit, se retourne et s'explique.

/** La condition est-elle satisfaite par cet ensemble de faits ? */
export function evaluer(condition, faits) {
  if (typeof condition === 'string') return faits.has(condition);
  if (condition.toutes) return condition.toutes.every((c) => evaluer(c, faits));
  if (condition.auMoins) return condition.auMoins.some((c) => evaluer(c, faits));
  if (condition.sans) return !condition.sans.some((c) => evaluer(c, faits));
  throw new Error(`Condition mal formée : ${JSON.stringify(condition)}`);
}

/**
 * Faits cités par une condition, quelle que soit sa profondeur.
 *
 * Sert aux vérifications de résolubilité et aux indices : savoir de quoi parle
 * une règle sans avoir à l'exécuter sur toutes les combinaisons possibles.
 */
export function feuilles(condition, accumulateur = new Set()) {
  if (typeof condition === 'string') {
    accumulateur.add(condition);
    return accumulateur;
  }
  for (const branche of condition.toutes ?? condition.auMoins ?? condition.sans ?? []) {
    feuilles(branche, accumulateur);
  }
  return accumulateur;
}

/**
 * Traduit une condition en français.
 *
 * Le jeu ne dira jamais « il vous faut un couteau » — ce serait avouer que la
 * réponse était dans une liste. Il dira « quelque chose de tranchant et de
 * rigide », ce qui laisse au joueur le mérite de trouver l'objet et lui ouvre
 * toutes les solutions plutôt qu'une seule.
 */
export function expliquer(condition, libelleDe = (id) => id) {
  if (typeof condition === 'string') return libelleDe(condition);
  const sous = (branches) => branches.map((c) => parentheser(c, libelleDe));
  if (condition.toutes) return joindre(sous(condition.toutes), 'et');
  if (condition.auMoins) return joindre(sous(condition.auMoins), 'ou');
  if (condition.sans) {
    const morceaux = sous(condition.sans);
    // « pas X » au singulier, « ni X ni Y » au pluriel : le français ne tolère
    // pas « ni lourd » tout seul.
    return morceaux.length === 1 ? `pas ${morceaux[0]}` : `ni ${morceaux.join(' ni ')}`;
  }
  throw new Error(`Condition mal formée : ${JSON.stringify(condition)}`);
}

/**
 * Parenthèse une sous-condition composée.
 *
 * Sans elles, « magnétique ou électronique et communicant » se lit exactement à
 * l'envers de ce que la règle exige. Un indice qui trompe est pire que pas
 * d'indice : le joueur cherche alors dans la mauvaise direction, avec la
 * conviction d'avoir compris.
 */
function parentheser(condition, libelleDe) {
  const texte = expliquer(condition, libelleDe);
  const composee = typeof condition === 'object'
    && (condition.toutes ?? condition.auMoins ?? []).length > 1;
  return composee ? `(${texte})` : texte;
}

function joindre(morceaux, liaison) {
  if (morceaux.length === 0) return '';
  if (morceaux.length === 1) return morceaux[0];
  return `${morceaux.slice(0, -1).join(', ')} ${liaison} ${morceaux.at(-1)}`;
}
