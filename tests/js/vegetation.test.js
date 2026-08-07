// Verrouille la végétation à base de vrais modèles (T-021).
//
// Le chargement lui-même exige un navigateur ; ce qui se teste ici est tout le
// reste, et c'est là que sont les défauts coûteux :
//   - une plante clonée par exemplaire au lieu d'être instanciée : trente
//     plantes coûtent trente fois le prix d'une, et rien ne le signale ;
//   - un modèle détaillé répété au fond d'une salle : le premier rendu massé
//     atteignait 5,7 millions de triangles ;
//   - une licence à attribution qu'on oublie de citer, ce qui ne se découvre
//     que juste avant une publication.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { ESPECES, massif, attributionsRequises } from '../../game/js/rendering/vegetation.js';

/** Espèce factice : le vrai chargement demande un navigateur. */
function especeFactice(nomParties = 2) {
  const parties = [];
  for (let i = 0; i < nomParties; i++) {
    parties.push({
      geometrie: new THREE.BoxGeometry(0.2, 0.5, 0.2),
      materiau: new THREE.MeshStandardMaterial(),
      locale: new THREE.Matrix4().makeTranslation(0, i * 0.4, 0),
    });
  }
  return { nom: 'factice', hauteur: 0.8, parties };
}

const maillages = (o) => { const t = []; o.traverse((n) => n.isMesh && t.push(n)); return t; };

// ─── Catalogue d'espèces ────────────────────────────────────────────────────

test('chaque espèce déclare son origine, une hauteur et sa licence', () => {
  // Une espèce PROCÉDURALE n'a pas de fichier : elle est produite par le code.
  // Elle doit néanmoins déclarer tout le reste — la mousse est de la végétation
  // comme les autres, et le jour où elle viendrait d'un modèle importé, rien
  // dans le semis ne devrait changer.
  for (const [nom, espece] of Object.entries(ESPECES)) {
    if (espece.procedurale) {
      assert.equal(espece.fichier, undefined, `${nom} : procédurale ET avec un fichier`);
    } else {
      assert.match(espece.fichier, /^models\/vegetation\/.+\.glb$/, `${nom} : chemin douteux`);
    }
    assert.ok(espece.hauteur > 0 && espece.hauteur < 5, `${nom} : hauteur invraisemblable`);
    assert.equal(typeof espece.attributionRequise, 'boolean', `${nom} : licence non déclarée`);
  }
});

test('toute espèce à attribution figure dans le fichier de crédits', () => {
  // Une licence qu'on ne retrouve plus est une licence qu'on ne respecte pas,
  // et cela se découvre toujours juste avant une publication.
  const credits = readFileSync('game/models/vegetation/CREDITS.md', 'utf8');
  for (const [nom, espece] of Object.entries(ESPECES)) {
    if (!espece.attributionRequise) continue;
    const fichier = espece.fichier.split('/').pop();
    assert.ok(credits.includes(fichier),
      `${nom} exige une attribution mais ${fichier} n'est pas dans CREDITS.md`);
  }
});

test('les modèles annoncés existent réellement', () => {
  for (const [nom, espece] of Object.entries(ESPECES)) {
    if (espece.procedurale) continue;
    assert.doesNotThrow(() => readFileSync('game/' + espece.fichier),
      `${nom} : ${espece.fichier} introuvable`);
  }
});

test('la version lointaine est nettement plus légère que la proche', () => {
  // Sans elle, un modèle détaillé répété au fond d'une salle coûte des millions
  // de triangles pour des plantes hautes de quinze pixels à l'écran.
  const poids = (e) => readFileSync('game/' + e.fichier).length;
  assert.ok(poids(ESPECES.plante_pot_loin) < poids(ESPECES.plante_pot) * 0.6,
    'la version lointaine n\'allège pas assez pour justifier son existence');
});

// ─── Massifs ────────────────────────────────────────────────────────────────

test('un massif coûte un dessin par partie, pas un par plante', () => {
  // `clone()` par plante donnerait trente fois le prix d'une. C'est le défaut
  // que ce module existe pour éviter, et il ne se voit qu'au compteur.
  const groupe = massif(especeFactice(2), { nombre: 30 });
  const parties = maillages(groupe);
  assert.equal(parties.length, 2, `${parties.length} dessins pour 30 plantes`);
  assert.ok(parties.every((p) => p.isInstancedMesh && p.count === 30));
});

test('les plantes d\'un massif sont réparties, jamais superposées', () => {
  const instances = maillages(massif(especeFactice(1), { nombre: 8, etendue: 2 }))[0];
  const positions = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Matrix4();
    instances.getMatrixAt(i, m);
    positions.push(new THREE.Vector3().setFromMatrixPosition(m));
  }
  const distinctes = new Set(positions.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`));
  assert.equal(distinctes.size, 8, 'des plantes se superposent exactement');
});

test('les plantes restent debout', () => {
  // Une plante couchée sur le flanc trahit immédiatement la répétition : c'est
  // pourquoi la rotation est limitée à l'axe vertical.
  const instances = maillages(massif(especeFactice(1), { nombre: 12, graine: 3 }))[0];
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Matrix4();
    instances.getMatrixAt(i, m);
    const haut = new THREE.Vector3(0, 1, 0)
      .applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(m));
    assert.ok(haut.y > 0.99, `plante ${i} inclinée (composante verticale ${haut.y.toFixed(3)})`);
  }
});

test('l\'aplatissement plaque un massif contre une paroi', () => {
  // Même règle que le lierre : un massif qui s'avance dans la pièce finira par
  // masquer un mécanisme. ART_DIRECTION §2.
  const groupe = massif(especeFactice(1), { nombre: 20, etendue: 3, aplatissement: 0.1 });
  const boite = new THREE.Box3().setFromObject(groupe);
  assert.ok(boite.max.z - boite.min.z < 1.5, 'le massif déborde dans la pièce');
});

test('le placement est déterministe', () => {
  const lire = (graine) => {
    const m = new THREE.Matrix4();
    maillages(massif(especeFactice(1), { nombre: 6, graine }))[0].getMatrixAt(2, m);
    return m.elements.join(',');
  };
  assert.equal(lire(7), lire(7));
  assert.notEqual(lire(7), lire(8));
});

test('un massif vide ne plante pas', () => {
  assert.equal(maillages(massif(especeFactice(1), { nombre: 0 })).length, 1);
});

// ─── Attributions ───────────────────────────────────────────────────────────

test('aucune attribution n\'est réclamée tant que rien n\'est chargé', () => {
  // La liste se construit à partir de ce que le jeu embarque RÉELLEMENT. Une
  // liste tenue à la main finit toujours par diverger de ce qui est distribué.
  assert.deepEqual(attributionsRequises(), []);
});
