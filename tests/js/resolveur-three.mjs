// Résolveur de modules pour les tests.
//
// Les modules du jeu importent `three` en spécificateur nu, résolu dans le
// navigateur par la carte d'imports de index.html. Node ne lit pas cette carte :
// sans ce crochet, tout test touchant à la physique ou au rendu échouerait sur
// « Cannot find package 'three' ».
//
// On pointe vers la copie déjà vendorée dans game/lib/ : aucune dépendance de
// développement à installer, et surtout on teste exactement la version que le
// joueur exécute.

import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));

const ALIAS = {
  three: pathToFileURL(resolve(ICI, '../../game/lib/three.module.js')).href,
};

export function resolve_(specifier, context, nextResolve) {
  const cible = ALIAS[specifier];
  if (cible) return { url: cible, shortCircuit: true };
  return nextResolve(specifier, context);
}

export { resolve_ as resolve };
