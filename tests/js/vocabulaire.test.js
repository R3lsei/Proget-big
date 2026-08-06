// Verrouille le vocabulaire de propriétés (T-010).
//
// Ces tests ne vérifient pas que le code « marche » — il n'y a presque pas de
// code. Ils verrouillent un CONTRAT : la base curatée (T-011), le repli
// sémantique (T-013) et les sauvegardes référencent ces identifiants. Une
// suppression ou un renommage silencieux les casserait tous les trois, et le
// symptôme n'apparaîtrait qu'en jeu, sous la forme d'un objet devenu inutile.
//
// D'où deux familles de tests :
//   - INVARIANTS  : ce qui doit rester vrai quelles que soient les évolutions
//   - EMPREINTE   : la liste exacte, qui doit faire mal à changer

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  VERSION, FAMILLES, PROPRIETES, IDS,
  estPropriete, proprietesDeFamille, trierProprietes,
} from '../../game/js/perception/vocabulaire.js';

// ─── Invariants de structure ────────────────────────────────────────────────

test('le vocabulaire est gelé en profondeur', () => {
  assert.ok(Object.isFrozen(PROPRIETES));
  assert.ok(Object.isFrozen(FAMILLES));
  assert.ok(Object.isFrozen(IDS));
  // Un ajout à chaud produirait un vocabulaire différent selon l'ordre de
  // chargement des modules : la base curatée validerait des propriétés que le
  // repli sémantique ignore.
  assert.throws(() => { PROPRIETES.nouvelle = {}; }, TypeError);
  // Le gel doit atteindre les entrées elles-mêmes. Le critère est le contrat
  // commun aux deux sources de propriétés : le modifier à chaud les ferait
  // diverger sans aucun signe visible.
  for (const id of IDS) {
    assert.ok(Object.isFrozen(PROPRIETES[id]), `l'entrée ${id} n'est pas gelée`);
  }
  assert.throws(() => { PROPRIETES.tranchant.critere = 'autre chose ?'; }, TypeError);
});

test('chaque propriété déclare une famille existante', () => {
  for (const id of IDS) {
    const famille = PROPRIETES[id].famille;
    assert.ok(famille in FAMILLES, `${id} déclare la famille inconnue « ${famille} »`);
  }
});

test('chaque famille contient au moins une propriété', () => {
  for (const famille of Object.keys(FAMILLES)) {
    assert.notEqual(proprietesDeFamille(famille).length, 0,
      `la famille « ${famille} » est vide : la retirer ou la remplir`);
  }
});

test('chaque propriété porte un libellé et un critère non vides', () => {
  for (const id of IDS) {
    const { libelle, critere } = PROPRIETES[id];
    assert.equal(typeof libelle, 'string');
    assert.notEqual(libelle.trim(), '', `${id} n'a pas de libellé`);
    assert.equal(typeof critere, 'string');
    assert.notEqual(critere.trim(), '', `${id} n'a pas de critère`);
  }
});

// ─── Invariants de conception ───────────────────────────────────────────────

test('chaque critère est une question fermée', () => {
  // Le critère est le contrat commun à la base curatée et au repli sémantique.
  // Une formulation ouverte (« décrire la matière ») recevrait deux réponses
  // incomparables et rendrait l'objet utilisable de façon aléatoire.
  for (const id of IDS) {
    assert.ok(PROPRIETES[id].critere.endsWith('?'),
      `le critère de ${id} n'est pas une question : « ${PROPRIETES[id].critere} »`);
  }
});

test('aucun identifiant ne décrit une action plutôt qu\'une observation', () => {
  // Garde-fou contre la dérive qui viderait toute l'architecture de son sens :
  // une propriété nommée `peutCouper` réintroduit la table objet → action.
  const PREFIXES_INTERDITS = ['peut', 'sert', 'utilisable', 'permet', 'capable'];
  for (const id of IDS) {
    for (const prefixe of PREFIXES_INTERDITS) {
      assert.ok(!id.startsWith(prefixe),
        `« ${id} » nomme un usage, pas une observation — cela appartient aux affordances`);
    }
  }
});

test('les identifiants sont en minuscules ASCII, sans accent ni tiret', () => {
  // Ils voyagent dans les sauvegardes, les fichiers de base et les requêtes au
  // modèle : tout caractère composé finit par se faire normaliser différemment
  // quelque part sur le chemin.
  for (const id of IDS) {
    assert.match(id, /^[a-z][a-z0-9_]*$/, `identifiant non conforme : ${id}`);
  }
});

test('aucun libellé n\'est dupliqué', () => {
  const vus = new Map();
  for (const id of IDS) {
    const libelle = PROPRIETES[id].libelle;
    assert.equal(vus.has(libelle), false,
      `« ${libelle} » sert pour ${vus.get(libelle)} et ${id} : indistinguables à l'écran`);
    vus.set(libelle, id);
  }
});

test('aucun critère n\'est dupliqué', () => {
  // Deux propriétés qui posent la même question sont la même propriété : la base
  // curatée les remplirait toujours ensemble, et l'une des deux serait morte.
  const vus = new Map();
  for (const id of IDS) {
    const critere = PROPRIETES[id].critere;
    assert.equal(vus.has(critere), false,
      `${id} et ${vus.get(critere)} posent la même question`);
    vus.set(critere, id);
  }
});

// ─── Empreinte : la liste exacte ────────────────────────────────────────────

test('le vocabulaire correspond exactement à la version 1.0.0', () => {
  // Ce test DOIT échouer quand on touche au vocabulaire. Son rôle est d'obliger
  // à mettre à jour VERSION et à se demander si une migration est nécessaire.
  assert.equal(VERSION, '1.0.0');
  assert.deepEqual([...IDS], [
    'tranchant', 'pointu', 'allonge', 'mince', 'creux', 'plat',
    'rigide', 'souple', 'cassant', 'absorbant', 'conducteur', 'inflammable',
    'isolant_thermique',
    'lourd', 'leger', 'tenable_une_main',
    'electronique', 'alimente', 'communicant', 'programmable', 'mesure_temps',
    'magnetique', 'reflechissant',
    'contient_liquide', 'porte_texte',
    'comestible', 'appetissant_animal',
    'emet_lumiere', 'emet_son', 'odorant',
  ]);
});

// ─── Comportement des fonctions ─────────────────────────────────────────────

test('estPropriete reconnaît le vocabulaire et rien d\'autre', () => {
  assert.equal(estPropriete('tranchant'), true);
  assert.equal(estPropriete('licorne'), false);
  assert.equal(estPropriete(''), false);
  // Piège classique : les membres hérités d'Object répondraient `true` à un
  // simple `id in PROPRIETES`, laissant passer « toString » comme propriété.
  assert.equal(estPropriete('toString'), false);
  assert.equal(estPropriete('constructor'), false);
});

test('proprietesDeFamille ne renvoie que la famille demandée', () => {
  const formes = proprietesDeFamille('forme');
  assert.ok(formes.includes('tranchant'));
  assert.ok(!formes.includes('lourd'));
  for (const id of formes) assert.equal(PROPRIETES[id].famille, 'forme');
});

test('proprietesDeFamille renvoie une liste vide pour une famille inconnue', () => {
  assert.deepEqual(proprietesDeFamille('inexistante'), []);
});

test('les familles partitionnent le vocabulaire sans reste ni recouvrement', () => {
  const parFamille = Object.keys(FAMILLES).flatMap(proprietesDeFamille);
  assert.equal(parFamille.length, IDS.length);
  assert.deepEqual(new Set(parFamille).size, IDS.length);
});

test('trierProprietes sépare le connu de l\'inventé', () => {
  // Le modèle de langage du repli sémantique peut proposer une propriété
  // plausible mais absente : on doit pouvoir jouer avec le reste.
  const { connues, inconnues } = trierProprietes(
    ['tranchant', 'phosphorescent', 'rigide', 'toString']);
  assert.deepEqual(connues, ['tranchant', 'rigide']);
  assert.deepEqual(inconnues, ['phosphorescent', 'toString']);
});

test('trierProprietes accepte une liste vide', () => {
  assert.deepEqual(trierProprietes([]), { connues: [], inconnues: [] });
});

test('trierProprietes conserve les doublons sans les fusionner', () => {
  // Un dédoublonnage ici masquerait un modèle qui répète la même propriété,
  // signe d'une requête mal formulée. C'est à l'appelant de décider.
  const { connues } = trierProprietes(['rigide', 'rigide']);
  assert.deepEqual(connues, ['rigide', 'rigide']);
});
