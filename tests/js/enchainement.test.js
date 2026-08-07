// Verrouille le franchissement de la porte et l'enchaînement des chambres.
//
// Le défaut corrigé ici n'était pas subtil : la porte s'ouvrait sur le VIDE. Il
// n'y a pas de sol au-delà du mur, si bien que le joueur qui venait de résoudre
// la salle tombait, et que le jeu lui répondait « Vous êtes tombé ». La
// récompense d'avoir gagné était une chute — et la deuxième chambre n'était
// atteignable qu'en tapant une adresse à la main, ce qu'aucun joueur ne devine.
//
// Aucun test ne pouvait le voir : tous s'arrêtaient à « la porte s'ouvre ».
// Personne ne regardait ce qu'il y avait derrière.

import test from 'node:test';
import assert from 'node:assert/strict';

import { CHAMBRES } from '../../game/js/gameplay/chambres.js';
import { aFranchi, seuilDe, departDe } from '../../game/js/rendering/batisseur.js';
import { MODULE } from '../../game/js/rendering/kit.js';

/** Un point à `avance` mètres le long de la normale de sortie, `lateral` de côté. */
function point(chambre, avance, lateral = 0) {
  const { nx, nz } = seuilDe(chambre);
  return {
    x: nx * avance + -nz * lateral,
    z: nz * avance + nx * lateral,
  };
}

// ─── Le seuil ───────────────────────────────────────────────────────────────

test('le départ n\'est jamais déjà franchi', () => {
  // Sinon la chambre s'enchaînerait sur la suivante au premier pas de
  // simulation, et le joueur traverserait le jeu sans jamais le voir.
  for (const chambre of CHAMBRES) {
    assert.equal(aFranchi(departDe(chambre), chambre), false, chambre.id);
  }
});

test('le centre de la pièce n\'est pas franchi', () => {
  for (const chambre of CHAMBRES) {
    assert.equal(aFranchi({ x: 0, z: 0 }, chambre), false, chambre.id);
  }
});

test('passer le plan du mur par l\'ouverture franchit', () => {
  for (const chambre of CHAMBRES) {
    const { distance } = seuilDe(chambre);
    assert.equal(aFranchi(point(chambre, distance + 0.1), chambre), true, chambre.id);
  }
});

test('rester un cheveu en deçà ne franchit pas', () => {
  // Le seuil doit être net : une marge trop généreuse changerait de chambre
  // pendant que le joueur est encore dans la sienne, devant une porte fermée.
  for (const chambre of CHAMBRES) {
    const { distance } = seuilDe(chambre);
    assert.equal(aFranchi(point(chambre, distance - 0.05), chambre), false, chambre.id);
  }
});

test('traverser le mur loin de la porte ne franchit pas', () => {
  // Le mur est solide, donc ce cas ne devrait pas se produire — mais si une
  // future collision laisse passer, on ne veut pas que le bogue devienne une
  // progression silencieuse. Il vaut mieux rester coincé que gagner par erreur.
  for (const chambre of CHAMBRES) {
    const { distance, ouverture } = seuilDe(chambre);
    const loin = ouverture / 2 + MODULE;
    assert.equal(aFranchi(point(chambre, distance + 0.1, loin), chambre), false, chambre.id);
    assert.equal(aFranchi(point(chambre, distance + 0.1, -loin), chambre), false, chambre.id);
  }
});

test('le seuil suit le mur déclaré, quel qu\'il soit', () => {
  // La convention cardinale s'est déjà contredite une fois dans ce projet, et le
  // joueur démarrait alors nez à la porte. On vérifie donc les quatre murs.
  const base = CHAMBRES[0];
  for (const mur of ['nord', 'est', 'sud', 'ouest']) {
    const chambre = { ...base, porte: { ...base.porte, mur } };
    const { distance } = seuilDe(chambre);
    assert.equal(aFranchi(departDe(chambre), chambre), false, `${mur} : départ franchi`);
    assert.equal(aFranchi(point(chambre, distance + 0.1), chambre), true, `${mur} : sortie ratée`);
  }
});

test('le seuil est le plan du mur, pas une valeur écrite à la main', () => {
  // S'il dérivait de la taille sans passer par la même conversion en mètres, il
  // tomberait à l'intérieur ou à l'extérieur de la pièce dès qu'une chambre
  // change de dimensions.
  for (const chambre of CHAMBRES) {
    const { nx, distance } = seuilDe(chambre);
    const cote = nx !== 0 ? chambre.taille.largeur : chambre.taille.profondeur;
    assert.equal(distance, (cote * MODULE) / 2, chambre.id);
  }
});

// ─── L'enchaînement ─────────────────────────────────────────────────────────

test('chaque chambre sauf la dernière en a une suivante', () => {
  // La règle que le jeu applique : franchir mène à `index + 1`. Si la liste est
  // vide ou d'une seule chambre, la « progression » n'existe pas.
  assert.ok(CHAMBRES.length >= 2, 'il faut au moins deux chambres pour enchaîner');
  for (let i = 0; i < CHAMBRES.length - 1; i++) {
    assert.ok(CHAMBRES[i + 1], `pas de chambre après ${CHAMBRES[i].id}`);
    assert.notEqual(CHAMBRES[i + 1].id, CHAMBRES[i].id, 'deux chambres portent le même id');
  }
});

test('les chambres sont ordonnées et identifiables', () => {
  // L'ordre du tableau EST l'ordre de progression : rien d'autre ne le déclare.
  const ids = CHAMBRES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants dupliqués');
  for (const chambre of CHAMBRES) {
    assert.ok(chambre.titre, `${chambre.id} n'a pas de titre affichable`);
  }
});
