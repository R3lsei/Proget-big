// Vérifie que le harnais de test lui-même fonctionne.
//
// Sans ce test, si la copie vendorée de three était déplacée ou renommée, tous
// les tests touchant à la physique échoueraient sur un « Cannot find package »
// obscur. Ici l'erreur est explicite et pointe directement la cause.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import * as THREE from 'three';

describe('harnais de test', () => {
  test('le spécificateur nu « three » est résolu vers la copie du jeu', () => {
    assert.equal(THREE.REVISION, '160',
      'la version testée doit être celle que le joueur exécute');
  });

  test('la copie vendorée existe à l\'emplacement attendu', () => {
    assert.ok(
      existsSync(new URL('../../game/lib/three.module.js', import.meta.url)),
      'game/lib/three.module.js introuvable : le résolveur pointe dans le vide'
    );
  });

  test('les primitives géométriques se comportent normalement', () => {
    const boite = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(2, 2, 2));
    assert.equal(boite.min.y, 0);
    assert.equal(boite.max.y, 2);
    assert.ok(boite.containsPoint(new THREE.Vector3(0, 1, 0)));
  });
});
