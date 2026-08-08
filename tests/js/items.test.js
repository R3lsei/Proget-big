// Moteur de règles objet → capacités.
//
// Ce module est l'ancêtre direct de perception/affordances.js. Le tester
// maintenant verrouille son comportement avant la migration : toute
// divergence pendant la restructuration sera détectée ici, pas en playtest.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  CAPS, analyzeObject, describeCaps, findItemWithCap,
} from '../../game/js/items.js';

describe('analyzeObject — objets connus', () => {
  test('déduit les capacités d\'un objet répertorié', () => {
    const o = analyzeObject('scissors');
    assert.equal(o.name, 'des ciseaux');
    assert.ok(o.caps.includes('couper'));
    assert.ok(o.caps.includes('crocheter'));
    assert.equal(o.known, true);
  });

  test('attribue un identifiant unique à chaque matérialisation', () => {
    const a = analyzeObject('knife');
    const b = analyzeObject('knife');
    assert.notEqual(a.id, b.id, 'deux couteaux scannés doivent être distinguables');
  });

  test('chaque capacité déclarée existe dans le vocabulaire', () => {
    // Un nom de capacité mal orthographié rendrait une énigme insoluble
    // sans jamais lever d'erreur : c'est exactement ce que ce test attrape.
    for (const cls of ['scissors', 'cell phone', 'bottle', 'banana', 'umbrella']) {
      for (const cap of analyzeObject(cls).caps) {
        assert.ok(CAPS[cap], `capacité inconnue « ${cap} » sur ${cls}`);
      }
    }
  });
});

describe('analyzeObject — objets inconnus', () => {
  test('un objet hors base reste utilisable', () => {
    // Pilier P3 : rien ne doit être un cul-de-sac.
    const o = analyzeObject('licorne-en-plastique');
    assert.equal(o.known, false);
    assert.ok(o.caps.length > 0, 'un objet inconnu doit garder au moins une capacité');
    assert.ok(o.caps.includes('distraire'));
  });

  test('les classes COCO non répertoriées gardent un nom lisible', () => {
    const o = analyzeObject('dog');
    assert.equal(o.name, 'un chien');
  });
});

describe('consommables', () => {
  test('les liquides et la nourriture ont un usage unique', () => {
    assert.equal(analyzeObject('bottle').usesLeft, 1);
    assert.equal(analyzeObject('banana').usesLeft, 1);
  });

  test('les outils sont réutilisables indéfiniment', () => {
    assert.equal(analyzeObject('scissors').usesLeft, Infinity);
    assert.equal(analyzeObject('cell phone').usesLeft, Infinity);
  });
});

describe('findItemWithCap', () => {
  test('trouve un objet porteur de la capacité demandée', () => {
    const inv = [analyzeObject('book'), analyzeObject('scissors')];
    assert.equal(findItemWithCap(inv, 'couper').cocoClass, 'scissors');
  });

  test('renvoie null si aucun objet ne convient', () => {
    assert.equal(findItemWithCap([analyzeObject('book')], 'liquide'), null);
  });

  test('ignore un consommable épuisé', () => {
    // Sans cette règle, un joueur ayant vidé sa bouteille croirait pouvoir
    // encore éteindre le feu.
    const bouteille = analyzeObject('bottle');
    bouteille.usesLeft = 0;
    assert.equal(findItemWithCap([bouteille], 'liquide'), null);
  });

  test('sur un inventaire vide', () => {
    assert.equal(findItemWithCap([], 'couper'), null);
  });
});

describe('describeCaps', () => {
  test('produit une description par capacité', () => {
    const lignes = describeCaps(['couper', 'crocheter']);
    assert.equal(lignes.length, 2);
    assert.match(lignes[0], /Couper/);
  });

  test('sur une liste vide', () => {
    assert.deepEqual(describeCaps([]), []);
  });
});

describe('cohérence du vocabulaire de capacités', () => {
  test('chaque capacité a une icône, un libellé et une description', () => {
    for (const [nom, cap] of Object.entries(CAPS)) {
      assert.ok(cap.icon, `${nom} sans icône`);
      assert.ok(cap.label, `${nom} sans libellé`);
      assert.ok(cap.desc, `${nom} sans description`);
    }
  });

  test('aucune capacité déclarée n\'est orpheline', () => {
    // Une capacité que plus aucun objet ne porte est du code mort : soit on
    // l'utilise dans une énigme, soit on la supprime.
    const portees = new Set();
    for (const cls of [
      'scissors', 'knife', 'fork', 'spoon', 'toothbrush', 'cell phone', 'laptop',
      'keyboard', 'mouse', 'remote', 'tv', 'book', 'bottle', 'cup', 'wine glass',
      'bowl', 'clock', 'banana', 'apple', 'orange', 'sandwich', 'carrot',
      'broccoli', 'pizza', 'donut', 'cake', 'hot dog', 'sports ball', 'frisbee',
      'teddy bear', 'tie', 'umbrella', 'vase', 'hair drier', 'backpack', 'handbag',
    ]) {
      for (const c of analyzeObject(cls).caps) portees.add(c);
    }
    const orphelines = Object.keys(CAPS).filter((c) => !portees.has(c));
    assert.deepEqual(orphelines, [], `capacités portées par aucun objet : ${orphelines}`);
  });
});
