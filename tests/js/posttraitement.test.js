// Verrouille la chaîne d'image (T-032).
//
// Un défaut de post-traitement ne plante jamais. Il ne lève rien, ne casse
// aucun test de gameplay — il rend simplement l'image fausse, et on ne le voit
// qu'en regardant. Deux passes interverties, un uniforme mal orthographié, un
// voyant qui retombe sous 1,0 : dans les trois cas le jeu tourne parfaitement
// et n'est plus beau. C'est exactement le genre de régression qu'une suite de
// tests laisse passer si on ne l'y oblige pas.
//
// WebGL n'existe pas ici. On ne vérifie donc pas des pixels, mais les
// invariants qui les gouvernent : l'ordre des passes, la cohérence entre les
// réglages et les uniformes, et le fait que les voyants sortent de l'intervalle
// affichable.

import test from 'node:test';
import assert from 'node:assert/strict';

import { REGLAGES, ETALONNAGE, PLAN } from '../../game/js/rendering/posttraitement.js';
import { INTENSITE_SIGNAL, couleurSignal, socleReceptacle } from '../../game/js/rendering/kit.js';

// ─── Ordre des passes ───────────────────────────────────────────────────────

test('la floraison passe AVANT la conversion de sortie', () => {
  // C'est tout le sujet. La floraison ne saisit que ce qui dépasse son seuil ;
  // après conversion, tout est ramené dans [0,1] et une lampe ne se distingue
  // plus d'un mur blanc. Inverser ces deux passes ne planterait pas — cela
  // ferait juste baver la lumière sur le décor entier.
  assert.ok(PLAN.indexOf('floraison') < PLAN.indexOf('sortie'));
});

test('l\'étalonnage passe APRÈS la conversion de sortie', () => {
  // Contraste et saturation sont des notions d'affichage : « pivoter autour de
  // 0,5 » n'a de sens qu'en valeurs d'écran. Appliqué en linéaire, le même
  // réglage écrase les tons moyens.
  assert.ok(PLAN.indexOf('etalonnage') > PLAN.indexOf('sortie'));
});

test('le rendu est la première passe et l\'étalonnage la dernière', () => {
  assert.equal(PLAN[0], 'rendu');
  assert.equal(PLAN.at(-1), 'etalonnage');
});

// ─── Cohérence nuanceur / réglages ──────────────────────────────────────────

test('chaque uniforme utilisé par le nuanceur est déclaré', () => {
  // Un uniforme référencé mais jamais déclaré empêche la compilation ; un
  // uniforme déclaré côté JS mais absent du GLSL est ignoré EN SILENCE. Le
  // second cas est le dangereux : le réglage semble exister et ne fait rien.
  const source = ETALONNAGE.fragmentShader;
  const declares = [...source.matchAll(/uniform\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]);
  for (const nom of Object.keys(ETALONNAGE.uniforms)) {
    assert.ok(declares.includes(nom), `« ${nom} » passé au nuanceur mais jamais déclaré`);
  }
  for (const nom of declares) {
    assert.ok(nom in ETALONNAGE.uniforms, `« ${nom} » déclaré mais jamais fourni`);
  }
});

test('les uniformes portent bien les valeurs des réglages', () => {
  // Deux sources de vérité qui divergent : on règle la direction artistique
  // dans REGLAGES et le jeu affiche autre chose.
  assert.equal(ETALONNAGE.uniforms.contraste.value, REGLAGES.etalonnage.contraste);
  assert.equal(ETALONNAGE.uniforms.saturation.value, REGLAGES.etalonnage.saturation);
  assert.equal(ETALONNAGE.uniforms.vignettage.value, REGLAGES.etalonnage.vignettage);
  const ombres = ETALONNAGE.uniforms.teinteOmbres.value;
  assert.deepEqual([ombres.x, ombres.y, ombres.z], REGLAGES.etalonnage.teinteOmbres);
});

test('le nuanceur borne sa sortie', () => {
  // Sans bornage, le contraste et le virage peuvent produire des valeurs
  // négatives ou supérieures à 1 dans le tampon final — franges noires sur les
  // zones sombres, selon le pilote.
  assert.match(ETALONNAGE.fragmentShader, /clamp\(/);
});

// ─── Bornes des réglages ────────────────────────────────────────────────────

test('la floraison reste discrète', () => {
  // Le défaut le plus courant de cet effet, et le plus vite fatigant : une
  // force trop haute noie la scène dans un brouillard lumineux.
  assert.ok(REGLAGES.floraison.force > 0, 'floraison éteinte : la passe ne sert à rien');
  assert.ok(REGLAGES.floraison.force < 0.6, 'floraison trop forte : le décor va se noyer');
});

test('le seuil de floraison épargne les murs', () => {
  // Les murs sont la plus grande surface de la scène et sont clairs. Un seuil
  // bas les ferait tous rayonner, ce qui est l'inverse de l'effet voulu.
  assert.ok(REGLAGES.floraison.seuil >= 0.8, 'seuil trop bas : les murs vont briller');
});

test('les réglages sont gelés en profondeur', () => {
  // Ce sont des décisions de direction artistique, pas des variables de partie.
  assert.throws(() => { REGLAGES.floraison.force = 9; }, TypeError);
  assert.throws(() => { REGLAGES.etalonnage.teinteOmbres[0] = 9; }, TypeError);
});

// ─── Les voyants ────────────────────────────────────────────────────────────

test('un voyant sort de l\'intervalle affichable', () => {
  // LA condition pour que la floraison le saisisse. Un voyant à 1,0 ne
  // rayonnerait pas plus qu'un mur blanc : c'est en dépassant 1 qu'une surface
  // devient une source.
  for (const actif of [true, false]) {
    const c = couleurSignal(actif);
    assert.ok(Math.max(c.r, c.g, c.b) > 1,
      `voyant ${actif ? 'actif' : 'inactif'} sous le seuil d'affichage`);
  }
});

test('un voyant dépasse le seuil de floraison', () => {
  // Plus précis que « supérieur à 1 » : c'est au seuil réel qu'il doit se
  // mesurer, sinon abaisser l'intensité éteindrait l'effet sans rien casser.
  const c = couleurSignal(true);
  assert.ok(Math.max(c.r, c.g, c.b) > REGLAGES.floraison.seuil);
  assert.equal(INTENSITE_SIGNAL > 1, true);
});

test('actif et inactif se distinguent, et pas seulement en intensité', () => {
  // Le joueur doit lire l'état d'un coup d'œil. Deux teintes de même
  // luminosité ne se distingueraient pas pour qui perçoit mal les couleurs :
  // la différence doit porter sur la teinte ET rester nette.
  const actif = couleurSignal(true);
  const inactif = couleurSignal(false);
  assert.ok(actif.g > actif.r, 'le voyant actif devrait tirer vers le vert');
  assert.ok(inactif.r > inactif.g, 'le voyant inactif devrait tirer vers le rouge');
});

test('le voyant d\'un socle n\'est qu\'un liseré', () => {
  // Le défaut corrigé : le témoin couvrait presque tout le socle, un mètre de
  // côté de pure émission. Sous la floraison, cette surface débordait sur les
  // bornes en métal sombre situées à un mètre de là, qui paraissaient rouges.
  // Ce n'était pas un réglage trop fort mais une source trop GRANDE — et aucun
  // réglage de floraison ne rattrape une surface émissive démesurée.
  const socle = socleReceptacle({ largeur: 1 });
  const emissifs = [];
  const opaques = [];
  socle.traverse((noeud) => {
    if (!noeud.geometry?.parameters?.width) return;
    (noeud.material.isMeshBasicMaterial ? emissifs : opaques).push(noeud);
  });
  assert.equal(emissifs.length, 1, 'un seul témoin attendu');

  const cote = emissifs[0].geometry.parameters.width;
  const masque = Math.max(...opaques
    .filter((o) => o.geometry.parameters.width < cote)
    .map((o) => o.geometry.parameters.width), 0);
  assert.ok(masque > 0, 'rien ne masque le centre du témoin');

  // La part visible du témoin doit rester une bordure : moins du tiers de sa
  // surface. C'est ce qui garde le halo local.
  const partVisible = 1 - (masque / cote) ** 2;
  assert.ok(partVisible < 0.34,
    `le témoin montre ${Math.round(partVisible * 100)} % de sa surface : c'est une dalle lumineuse, pas un liseré`);
});
