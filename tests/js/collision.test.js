// Résolution de collisions.
//
// La suite la plus importante du projet : elle verrouille B-001, le bug qui
// éjectait le joueur hors de la carte. Ces cas ne se reproduisent qu'avec des
// valeurs très précises — les retrouver à la main coûterait des heures.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { depuisCentre, seChevauchent } from '../../game/js/physics/aabb.js';
import {
  SEUIL_DEPLACEMENT, boiteDuCorps, deplacerSurAxe, contraindreAuxLimites,
} from '../../game/js/physics/collision.js';

const GABARIT = { rayon: 0.32, hauteur: 1.75 };

const corps = (x = 0, y = 0, z = 0) => ({ x, y, z, vy: 0, auSol: true });

/**
 * Reproduit la cellule de départ, porte fermée.
 *
 * Le mur nord est percé d'une ouverture de 1,5 m : sans le panneau de porte,
 * le joueur en sortirait légitimement et les tests d'enfermement n'auraient
 * aucun sens. C'est précisément l'oubli de ce collider qui causait B-001.
 */
function cellule() {
  return [
    depuisCentre(0, 1.5, 2.15, 4.6, 3, 0.3),        // sud
    depuisCentre(-2.15, 1.5, 0, 0.3, 3, 4.6),       // ouest
    depuisCentre(2.15, 1.5, 0, 0.3, 3, 4.6),        // est
    depuisCentre(-1.525, 1.5, -2.15, 1.55, 3, 0.3), // nord gauche
    depuisCentre(1.525, 1.5, -2.15, 1.55, 3, 0.3),  // nord droit
    depuisCentre(0, 1.15, -2.15, 1.5, 2.3, 0.12),   // panneau de porte, fermé
  ];
}

describe('B-001 — le joueur ne doit jamais sortir du décor', () => {
  test('un résidu de virgule flottante ne déclenche aucune correction', () => {
    // Le cœur du bug : Math.sin(Math.PI) vaut 1,2e-16, pas zéro. Ce déplacement
    // latéral parasite plaquait le joueur sur le bord opposé du mur.
    const residu = -Math.sin(Math.PI) * 3.6 * 0.016;
    assert.notEqual(residu, 0, 'le résidu doit bien être non nul');
    assert.ok(Math.abs(residu) < SEUIL_DEPLACEMENT, 'et sous le seuil');

    const c = corps(0, 0, 0.9);
    deplacerSurAxe(c, 'x', residu, cellule(), GABARIT);
    assert.equal(c.x, 0, 'un déplacement négligeable ne doit rien modifier');
  });

  test('marcher en arrière ne projette pas de l\'autre côté du mur', () => {
    // Symptôme historique : le joueur finissait en (-2,62 ; 2,62), dehors.
    const c = corps(0, 0, 0.9);
    const murs = cellule();
    for (let i = 0; i < 200; i++) {
      deplacerSurAxe(c, 'x', -Math.sin(Math.PI) * 3.6 * 0.016, murs, GABARIT);
      deplacerSurAxe(c, 'z', -3.6 * 0.016, murs, GABARIT);
    }
    assert.ok(Math.abs(c.x) < 2.0, `éjecté en x = ${c.x}`);
    assert.ok(c.z > -2.0, `traversé le mur nord, z = ${c.z}`);
  });

  test('le joueur reste enfermé quelle que soit la direction', () => {
    const murs = cellule();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
      const c = corps(0, 0, 0);
      for (let i = 0; i < 300; i++) {
        deplacerSurAxe(c, 'x', dx * 3.6 * 0.016, murs, GABARIT);
        deplacerSurAxe(c, 'z', dz * 3.6 * 0.016, murs, GABARIT);
      }
      assert.ok(Math.abs(c.x) <= 2.0, `direction (${dx},${dz}) : x = ${c.x}`);
      assert.ok(Math.abs(c.z) <= 2.3, `direction (${dx},${dz}) : z = ${c.z}`);
    }
  });
});

describe('résolution par axe', () => {
  const mur = [depuisCentre(2, 1.5, 0, 0.3, 3, 4)];

  test('arrête le corps du côté d\'où il vient, vers +x', () => {
    const c = corps(0, 0, 0);
    deplacerSurAxe(c, 'x', 5, mur, GABARIT);
    assert.ok(c.x < 1.85, 'doit rester en deçà du mur');
    assert.ok(c.x > 1.4, `ne doit pas être renvoyé au loin (x = ${c.x})`);
  });

  test('arrête le corps du côté d\'où il vient, vers -x', () => {
    const c = corps(4, 0, 0);
    deplacerSurAxe(c, 'x', -5, mur, GABARIT);
    assert.ok(c.x > 2.15, 'doit rester au-delà du mur');
  });

  test('un déplacement nul ou non fini ne fait rien', () => {
    for (const d of [0, NaN, Infinity, -Infinity]) {
      const c = corps(0, 0, 0);
      deplacerSurAxe(c, 'x', d, mur, GABARIT);
      assert.equal(c.x, 0, `déplacement ${d} ne doit rien changer`);
    }
  });

  test('sans obstacle, le déplacement est intégral', () => {
    const c = corps(0, 0, 0);
    deplacerSurAxe(c, 'z', 2.5, [], GABARIT);
    assert.equal(c.z, 2.5);
  });
});

describe('axe vertical', () => {
  const caisse = [depuisCentre(0, 0.4, 0, 1, 0.8, 1)];

  test('se pose sur une surface située sous les pieds', () => {
    const c = { x: 0, y: 2, z: 0, vy: -5, auSol: false };
    deplacerSurAxe(c, 'y', -1.4, caisse, GABARIT);
    assert.ok(Math.abs(c.y - 0.8) < 0.01, `devrait reposer à 0,8 (y = ${c.y})`);
    assert.equal(c.vy, 0);
    assert.equal(c.auSol, true);
  });

  test('ne se téléporte pas au sommet d\'un mur frôlé en tombant', () => {
    // Sans la tolérance d'appui, longer un mur en chute plaquait le joueur
    // sur son sommet — trois mètres plus haut.
    const mur = [depuisCentre(0.5, 1.5, 0, 0.3, 3, 4)];
    const c = { x: 0.15, y: 1, z: 0, vy: -5, auSol: false };
    deplacerSurAxe(c, 'y', -0.5, mur, GABARIT);
    assert.ok(c.y < 1, `ne doit pas monter (y = ${c.y})`);
  });

  test('un plafond stoppe la montée', () => {
    const plafond = [depuisCentre(0, 3.1, 0, 4, 0.2, 4)];
    const c = { x: 0, y: 1.2, z: 0, vy: 4, auSol: false };
    deplacerSurAxe(c, 'y', 0.5, plafond, GABARIT);
    assert.equal(c.vy, 0, 'la vitesse verticale doit être annulée');
    assert.ok(c.y + GABARIT.hauteur <= 3.01, 'la tête ne doit pas traverser');
  });
});

describe('filet de sécurité des limites', () => {
  const limites = { minX: -8.5, maxX: 8.5, minY: -1, maxY: 7, minZ: -62, maxZ: 3.5 };

  test('ramène un corps sorti des limites', () => {
    const c = corps(99, 0, 0);
    const sur = { x: 1, y: 0, z: 2 };
    assert.equal(contraindreAuxLimites(c, limites, sur), true);
    assert.deepEqual({ x: c.x, y: c.y, z: c.z }, sur);
  });

  test('laisse tranquille un corps à l\'intérieur', () => {
    const c = corps(1, 0, -20);
    assert.equal(contraindreAuxLimites(c, limites, { x: 0, y: 0, z: 0 }), false);
    assert.equal(c.x, 1);
  });

  test('annule la vitesse verticale au rattrapage', () => {
    const c = { x: 0, y: 50, z: 0, vy: -30, auSol: false };
    contraindreAuxLimites(c, limites, { x: 0, y: 0, z: 0 });
    assert.equal(c.vy, 0, 'sinon le joueur repart en chute libre immédiate');
  });
});

describe('boîtes englobantes', () => {
  test('la boîte du corps repose sur ses pieds', () => {
    const b = boiteDuCorps(corps(0, 0, 0), GABARIT);
    assert.ok(Math.abs(b.minY) < 1e-9, 'la base doit être au niveau des pieds');
    assert.ok(Math.abs(b.maxY - GABARIT.hauteur) < 1e-9);
  });

  test('le contact exact ne compte pas comme un chevauchement', () => {
    const a = depuisCentre(0, 0, 0, 1, 1, 1);
    const b = depuisCentre(1, 0, 0, 1, 1, 1);
    assert.equal(seChevauchent(a, b), false,
      'deux boîtes adjacentes ne se chevauchent pas, sinon le joueur reste collé');
  });
});
