// Enregistre le résolveur de modules avant l'exécution des tests.
// Chargé via `node --import` : voir le script `test` de package.json.

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./resolveur-three.mjs', pathToFileURL(import.meta.filename));
