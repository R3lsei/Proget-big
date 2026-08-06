// Verrouille la garantie de résolubilité (T-014).
//
// Ce module est le filet du projet : c'est lui qui empêchera de livrer une salle
// impossible. Un filet troué est pire que pas de filet — il donne l'assurance
// sans la protection. Ces tests vérifient donc autant qu'il ACCEPTE les salles
// solubles qu'il REFUSE les insolubles, avec une attention particulière au cas
// qui distingue une vraie preuve d'une vérification naïve : un seul objet pour
// deux mécanismes simultanés.

import test from 'node:test';
import assert from 'node:assert/strict';

import { chercher } from '../../game/js/perception/base/index.js';
import {
  MAX_RECEPTACLES, objetsCapables, coupler, verifierSalle, verifierParcours,
} from '../../game/js/gameplay/resolubilite.js';

const catalogue = (...noms) => noms.map(chercher);

// ─── Couplage ───────────────────────────────────────────────────────────────

test('deux exigences reçoivent deux objets distincts', () => {
  const affectation = coupler([
    { id: 'a', candidats: ['brique', 'caillou'] },
    { id: 'b', candidats: ['brique', 'caillou'] },
  ]);
  assert.equal(affectation.size, 2);
  assert.notEqual(affectation.get('a'), affectation.get('b'));
});

test('deux exigences pour un seul objet restent incomplètes', () => {
  // Le cas fondateur : chaque exigence est satisfaisable seule, l'ensemble ne
  // l'est pas. Une vérification naïve dirait « solubles toutes les deux ».
  const affectation = coupler([
    { id: 'a', candidats: ['brique'] },
    { id: 'b', candidats: ['brique'] },
  ]);
  assert.equal(affectation.size, 1);
});

test('le couplage reloge un occupant plutôt que d\'échouer', () => {
  // Une affectation gloutonne donnerait « brique » à `a`, puis échouerait sur
  // `b` qui n'accepte que « brique ». Le chemin augmentant déplace `a` sur
  // « caillou » et sauve la salle.
  const affectation = coupler([
    { id: 'a', candidats: ['brique', 'caillou'] },
    { id: 'b', candidats: ['brique'] },
  ]);
  assert.equal(affectation.size, 2);
  assert.equal(affectation.get('b'), 'brique');
  assert.equal(affectation.get('a'), 'caillou');
});

test('le couplage supporte des chaînes de relogement', () => {
  const affectation = coupler([
    { id: 'a', candidats: ['x', 'y', 'z'] },
    { id: 'b', candidats: ['x', 'y'] },
    { id: 'c', candidats: ['x'] },
  ]);
  assert.equal(affectation.size, 3);
  assert.equal(affectation.get('c'), 'x');
});

test('le couplage d\'une liste vide est vide, sans lever', () => {
  assert.equal(coupler([]).size, 0);
});

// ─── Objets capables ────────────────────────────────────────────────────────

test('un besoin se résout par affordance ou par réceptacle', () => {
  const cat = catalogue('couteau', 'brique', 'éponge');
  assert.deepEqual(
    objetsCapables({ affordance: 'couper' }, cat).map((e) => e.nom), ['couteau']);
  assert.deepEqual(
    objetsCapables({ receptacle: 'plaque_pression' }, cat).map((e) => e.nom), ['brique']);
});

test('un besoin mal formé lève plutôt que de passer pour satisfait', () => {
  // Silence ici produirait une salle « prouvée » sans qu'aucune preuve n'ait eu
  // lieu : le pire résultat possible pour un filet de sécurité.
  assert.throws(() => objetsCapables({ machin: 'couper' }, []), /mal formé/);
});

// ─── Salles solubles ────────────────────────────────────────────────────────

test('une salle simple est déclarée soluble', () => {
  const verdict = verifierSalle({
    id: 'cellule',
    objets: ['brique', 'couteau'],
    receptacles: { plaque: 'plaque_pression' },
    sortie: 'plaque',
    epreuves: [{ id: 'liens', affordance: 'couper' }],
  }, chercher);
  assert.equal(verdict.resoluble, true, verdict.raison);
  assert.deepEqual(verdict.combinaison, ['plaque']);
});

test('une salle à deux plaques et deux objets lourds est soluble', () => {
  const verdict = verifierSalle({
    id: 'double',
    objets: ['brique', 'caillou'],
    receptacles: { a: 'plaque_pression', b: 'plaque_pression' },
    sortie: { toutes: ['a', 'b'] },
  }, chercher);
  assert.equal(verdict.resoluble, true, verdict.raison);
});

test('une sortie alternative n\'exige qu\'un seul chemin', () => {
  const verdict = verifierSalle({
    id: 'alternative',
    objets: ['brique'],
    receptacles: { a: 'plaque_pression', b: 'rail_magnetique' },
    sortie: { auMoins: ['a', 'b'] },
  }, chercher);
  assert.equal(verdict.resoluble, true, verdict.raison);
});

test('la solution rapportée est la plus économique', () => {
  // Discriminant : ici les DEUX mécanismes sont activables simultanément, donc
  // la combinaison complète est elle aussi valide. Ne retenir que la minimale
  // est un choix — c'est la solution que le joueur trouvera, et celle qui laisse
  // le plus d'objets libres pour les épreuves. Sans ce test, l'ordre pouvait
  // s'inverser sans que rien ne le signale.
  const verdict = verifierSalle({
    id: 'economie',
    objets: ['brique', 'aimant'],
    receptacles: { a: 'plaque_pression', b: 'rail_magnetique' },
    sortie: { auMoins: ['a', 'b'] },
  }, chercher);
  assert.equal(verdict.resoluble, true, verdict.raison);
  assert.equal(verdict.combinaison.length, 1,
    `solution à ${verdict.combinaison.length} mécanismes : ${verdict.combinaison}`);
});

test('le couplage libère un objet pour l\'outil quand c\'est possible', () => {
  // « couteau suisse » sert de coupe ET est magnétique. S'il part sur le rail,
  // plus rien ne coupe — mais l'aimant peut le remplacer sur le rail.
  const verdict = verifierSalle({
    id: 'arbitrage',
    objets: ['couteau suisse', 'aimant'],
    receptacles: { rail: 'rail_magnetique' },
    sortie: 'rail',
    epreuves: [{ id: 'liens', affordance: 'couper' }],
  }, chercher);
  assert.equal(verdict.resoluble, true, verdict.raison);
});

// ─── Salles insolubles ──────────────────────────────────────────────────────

test('une salle sans objet capable est refusée', () => {
  const verdict = verifierSalle({
    id: 'vide',
    objets: ['éponge', 'mouchoir'],
    receptacles: { plaque: 'plaque_pression' },
    sortie: 'plaque',
  }, chercher);
  assert.equal(verdict.resoluble, false);
  assert.match(verdict.raison, /rien n'active/);
});

test('deux plaques et un seul objet lourd : refusée', () => {
  // LE cas qui justifie tout ce module. Chaque plaque a une solution ; la salle
  // n'en a pas. Une vérification exigence par exigence la déclarerait soluble.
  const verdict = verifierSalle({
    id: 'piege',
    objets: ['brique', 'éponge'],
    receptacles: { a: 'plaque_pression', b: 'plaque_pression' },
    sortie: { toutes: ['a', 'b'] },
  }, chercher);
  assert.equal(verdict.resoluble, false);
  assert.match(verdict.raison, /pas assez d'objets distincts/);
});

test('l\'unique objet mobilisé prive l\'épreuve de sa solution : refusée', () => {
  // Le couteau suisse est le seul objet magnétique ET le seul coupant. Posé sur
  // le rail, il ne coupe plus. Rien ne peut le remplacer.
  const verdict = verifierSalle({
    id: 'dilemme',
    objets: ['couteau suisse', 'éponge'],
    receptacles: { rail: 'rail_magnetique' },
    sortie: 'rail',
    epreuves: [{ id: 'liens', affordance: 'couper' }],
  }, chercher);
  assert.equal(verdict.resoluble, false);
  assert.match(verdict.raison, /plus d'objet disponible/);
});

test('une épreuve sans aucune solution est refusée', () => {
  const verdict = verifierSalle({
    id: 'sans-outil',
    objets: ['éponge', 'mouchoir'],
    receptacles: {},
    sortie: { toutes: [] },
    epreuves: [{ id: 'liens', affordance: 'couper' }],
  }, chercher);
  assert.equal(verdict.resoluble, false);
  assert.match(verdict.raison, /aucun objet ne permet/);
});

test('une sortie que rien ne peut satisfaire est refusée', () => {
  const verdict = verifierSalle({
    id: 'impossible',
    objets: ['brique'],
    receptacles: { a: 'plaque_pression' },
    sortie: { toutes: ['a', { sans: ['a'] }] },
  }, chercher);
  assert.equal(verdict.resoluble, false);
  assert.match(verdict.raison, /aucune combinaison/);
});

// ─── Erreurs de conception attrapées tôt ────────────────────────────────────

test('un objet absent de la base est signalé, pas ignoré', () => {
  // Une faute de frappe dans une salle rendrait l'objet inexistant : la salle
  // deviendrait insoluble en jeu, et « prouvée » ici si on l'ignorait.
  const verdict = verifierSalle({
    id: 'faute',
    objets: ['brike'],
    receptacles: { a: 'plaque_pression' },
    sortie: 'a',
  }, chercher);
  assert.equal(verdict.resoluble, false);
  assert.match(verdict.raison, /objets absents de la base/);
});

test('un réceptacle inconnu est signalé', () => {
  const verdict = verifierSalle({
    id: 'faute',
    objets: ['brique'],
    receptacles: { a: 'plaque_de_pression' },
    sortie: 'a',
  }, chercher);
  assert.equal(verdict.resoluble, false);
  assert.match(verdict.raison, /réceptacle inconnu/);
});

test('une salle trop complexe lève plutôt que de mentir', () => {
  // Au-delà de la borne, l'énumération n'est plus exhaustive : mieux vaut
  // refuser de conclure qu'annoncer une preuve qui n'en est pas une.
  const receptacles = {};
  for (let i = 0; i <= MAX_RECEPTACLES; i++) receptacles[`r${i}`] = 'plaque_pression';
  assert.throws(() => verifierSalle({
    id: 'usine', objets: ['brique'], receptacles, sortie: { toutes: ['r0'] },
  }, chercher), /ne peut plus être prouvée/);
});

// ─── Parcours ───────────────────────────────────────────────────────────────

test('un parcours rassemble tous les échecs, pas seulement le premier', () => {
  // Un concepteur qui corrige veut la liste complète, pas cinq allers-retours.
  const { resoluble, echecs } = verifierParcours([
    { id: 'ok', objets: ['brique'], receptacles: { a: 'plaque_pression' }, sortie: 'a' },
    { id: 'ko1', objets: ['éponge'], receptacles: { a: 'plaque_pression' }, sortie: 'a' },
    { id: 'ko2', objets: ['éponge'], receptacles: { b: 'rail_magnetique' }, sortie: 'b' },
  ], chercher);
  assert.equal(resoluble, false);
  assert.deepEqual(echecs.map((e) => e.salle), ['ko1', 'ko2']);
});

test('un parcours entièrement soluble est déclaré soluble', () => {
  const { resoluble, echecs } = verifierParcours([
    { id: 'a', objets: ['brique'], receptacles: { p: 'plaque_pression' }, sortie: 'p' },
    { id: 'b', objets: ['aimant'], receptacles: { r: 'rail_magnetique' }, sortie: 'r' },
  ], chercher);
  assert.equal(resoluble, true);
  assert.deepEqual(echecs, []);
});
