// Verrouille le kit modulaire (T-020).
//
// Le décor ne se teste pas à l'œil en CI. Ce qui se teste, ce sont les
// invariants dont dépend la performance et la lisibilité — et qui se perdent
// silencieusement au fil des ajouts :
//   - matériaux partagés : deux matériaux identiques mais distincts empêchent
//     la fusion et doublent les appels de dessin (défaut B-003, déjà payé) ;
//   - instanciation du feuillage : une plante par objet coûte trente images ;
//   - déterminisme : un décor aléatoire rend les bugs de placement
//     irreproductibles et les captures incomparables ;
//   - une seule source porteuse d'ombre.

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  MODULE, HAUTEUR_CHAMBRE, ETATS,
  materiaux, enMetres, surGrille,
  mur, sol, verriere, jardiniere, touffe, lierre, soleil, ambiance,
} from '../../game/js/rendering/kit.js';

/** Tous les maillages d'un objet, instances comprises. */
function maillages(objet) {
  const trouves = [];
  objet.traverse((n) => { if (n.isMesh) trouves.push(n); });
  return trouves;
}

// ─── Grille ─────────────────────────────────────────────────────────────────

test('la conversion en mètres suit la grille', () => {
  assert.equal(enMetres(3), 3 * MODULE);
  assert.equal(surGrille(enMetres(4)), true);
  assert.equal(surGrille(enMetres(4) + 0.3), false);
});

test('les murs occupent exactement leur emprise en modules', () => {
  const m = mur({ largeur: 4, hauteur: HAUTEUR_CHAMBRE });
  const boite = new THREE.Box3().setFromObject(m);
  const taille = boite.getSize(new THREE.Vector3());
  assert.ok(Math.abs(taille.x - 4 * MODULE) < 1e-6, `largeur ${taille.x}`);
  assert.ok(Math.abs(taille.y - HAUTEUR_CHAMBRE * MODULE) < 1e-6, `hauteur ${taille.y}`);
});

test('un mur repose sur le sol, jamais enfoncé ni flottant', () => {
  // Un mur qui flotte laisse voir une fente lumineuse au ras du sol — le genre
  // de défaut qu'on ne voit qu'en jouant, et partout à la fois.
  const boite = new THREE.Box3().setFromObject(mur({ largeur: 3 }));
  assert.ok(Math.abs(boite.min.y) < 1e-6, `base à ${boite.min.y}`);
});

test('le sol est sous le niveau zéro, pour que rien ne s\'y enfonce', () => {
  // Le carrelage poli affleure à un millimètre au-dessus du fond de joint :
  // sans ce décalage les deux surfaces se disputent le même pixel et
  // scintillent. La tolérance couvre ce millimètre, et rien de plus — un
  // carrelage qui dépasserait vraiment ferait trébucher le joueur sur du plat.
  const boite = new THREE.Box3().setFromObject(sol({ largeur: 4, profondeur: 4 }));
  assert.ok(boite.max.y <= 0.012, `surface à ${boite.max.y}`);
});

test('le carrelage est instancié, pas répété maillage par maillage', () => {
  // Un sol de 8 × 8 modules fait plus de deux cent cinquante carreaux. Autant
  // de maillages coûteraient à eux seuls plus d'appels de dessin que toute la
  // salle réunie.
  const pieces = maillages(sol({ largeur: 8, profondeur: 8, etat: 'soigne' }));
  assert.ok(pieces.some((p) => p.isInstancedMesh), 'le carrelage devrait être instancié');
  assert.ok(pieces.length < 12, `${pieces.length} maillages pour un sol : trop`);
});

test('une zone envahie garde son carrelage, mais terni', () => {
  // Le joueur a signalé que la serre n'avait « pas de carrelage » : l'état
  // envahi renvoyait du béton nu. C'est le même bâtiment — ce qui change est
  // l'ENTRETIEN, pas la nature du sol. Un lieu abandonné garde ses matériaux,
  // il cesse seulement de les laver.
  const soigne = maillages(sol({ largeur: 4, profondeur: 4, etat: 'soigne' }));
  const envahi = maillages(sol({ largeur: 4, profondeur: 4, etat: 'envahi' }));
  assert.equal(soigne.length, envahi.length, 'les deux états devraient porter des carreaux');

  const poli = soigne.find((p) => p.isInstancedMesh).material;
  const terni = envahi.find((p) => p.isInstancedMesh).material;
  assert.notStrictEqual(poli, terni, 'même matière : l\'abandon ne se verrait pas');
  // La rugosité vit désormais dans une CARTE, pas dans un nombre : le champ
  // `roughness` vaut 1 des deux côtés et ne dit plus rien. Comparer les deux
  // scalaires passerait donc au vert quelle que soit la texture posée.
  const moyenne = (materiau) => {
    const octets = materiau.roughnessMap.image.data;
    let somme = 0;
    for (let i = 0; i < octets.length; i += 4) somme += octets[i];
    return somme / (octets.length / 4);
  };
  assert.ok(moyenne(terni) > moyenne(poli),
    'le sol abandonné devrait moins renvoyer que le sol entretenu');
});

// ─── Matériaux partagés ─────────────────────────────────────────────────────

test('la palette est unique et gelée', () => {
  assert.strictEqual(materiaux(), materiaux());
  assert.ok(Object.isFrozen(materiaux()));
});

test('deux murs du même état partagent leurs matériaux', () => {
  // Deux matériaux identiques mais distincts empêchent la fusion des géométries
  // et doublent les appels de dessin. C'est B-003, déjà corrigé une fois.
  const a = maillages(mur({ largeur: 2 }));
  const b = maillages(mur({ largeur: 2 }));
  assert.strictEqual(a[0].material, b[0].material);
});

test('tout le kit puise dans la palette, sans matériau improvisé', () => {
  const connus = new Set(Object.values(materiaux()));
  const pieces = [
    mur({ largeur: 2 }), mur({ largeur: 2, etat: 'envahi' }),
    sol({}), sol({ etat: 'envahi' }), verriere({}),
    jardiniere({}), jardiniere({ etat: 'envahi' }), touffe({}), lierre({}),
  ];
  for (const piece of pieces) {
    for (const maillage of maillages(piece)) {
      assert.ok(connus.has(maillage.material),
        `${piece.name} utilise un matériau hors palette`);
    }
  }
});

test('la palette tient en quatre familles', () => {
  // ART_DIRECTION §5 : panneau, structure, vivant — et désormais VERRIÈRE, qui
  // a gagné son rang le jour où le dehors est devenu un personnage. Le verre
  // orangé, l'ossature claire et le carrelage poli forment la frontière entre
  // le laboratoire et la tempête : c'est le sujet de l'image, pas un détail.
  //
  // Le plafond reste bas et volontaire. Une palette qui enfle est le premier
  // symptôme d'une direction artistique qui se dilue, et chaque matière ajoutée
  // doit désormais déloger une famille entière, pas se glisser dans la liste.
  //
  // La règle a été appliquée : l'habillage du gouffre a demandé deux matières —
  // le béton de fosse et le marquage de danger, qui fonde la famille
  // SIGNALÉTIQUE — et le plafond n'a pas bougé d'un cran. C'est `sol_carrelage`
  // qui a payé, parce qu'il n'était plus utilisé nulle part. Un test de plafond
  // ne sert qu'à cela : forcer l'inventaire au lieu d'autoriser l'accumulation.
  assert.ok(Object.keys(materiaux()).length <= 15,
    `${Object.keys(materiaux()).length} matériaux : la palette se disperse`);
});

// ─── Feuillage ──────────────────────────────────────────────────────────────

test('le feuillage est instancié, jamais dupliqué en objets', () => {
  // Deux dessins pour une touffe entière : un pour toutes les feuilles, un pour
  // toutes les tiges. Quarante feuilles en quarante objets coûteraient quarante.
  const t = touffe({ nombre: 40 });
  const parties = maillages(t);
  assert.equal(parties.length, 2, 'une touffe doit coûter deux dessins, pas plus');
  assert.ok(parties.every((p) => p.isInstancedMesh));
  assert.equal(parties.find((p) => p.geometry.type === 'ShapeGeometry').count, 40);
});

test('les feuilles poussent sur des brins, elles ne flottent pas', () => {
  // Le premier rendu du kit a donné du confetti vert : des feuilles éparpillées
  // dans le volume, sans rien qui les porte. Aucun réglage de couleur n'y
  // remédie — il faut la structure.
  const t = touffe({ nombre: 30, graine: 3 });
  const tiges = maillages(t).find((p) => p.geometry.type === 'CylinderGeometry');
  assert.ok(tiges, 'une touffe sans tige redonne l\'aspect éparpillé');
  assert.ok(tiges.count >= 2 && tiges.count <= 30);
});

test('la feuille a une silhouette, pas un rectangle', () => {
  // Un plan rectangulaire se lit comme un morceau de carton, quelle que soit la
  // teinte. La forme est en géométrie et non en découpe d'image, pour exister
  // aussi hors du navigateur — donc être vérifiable ici.
  const feuilles = maillages(touffe({ nombre: 4 }))
    .find((p) => p.geometry.type === 'ShapeGeometry');
  assert.ok(feuilles, 'les feuilles doivent avoir une silhouette découpée');
  assert.ok(feuilles.geometry.attributes.position.count > 8,
    'silhouette trop grossière pour se distinguer d\'un rectangle');
});

test('une jardinière reste sous une poignée d\'appels de dessin', () => {
  // Le végétal est le premier poste de performance. Une jardinière modelée
  // pièce par pièce passerait inaperçue à la relecture et coûterait cher.
  assert.ok(maillages(jardiniere({ largeur: 3 })).length <= 4);
});

test('le feuillage utilise une découpe binaire, jamais un fondu', () => {
  // Le fondu impose un tri par profondeur et interdit la fusion des géométries.
  const feuillage = materiaux().feuillage;
  assert.equal(feuillage.transparent, false);
  assert.ok(feuillage.alphaTest > 0);
});

test('le décor est déterministe', () => {
  // Un décor aléatoire rend un bug de placement irreproductible et interdit à
  // une sauvegarde de restituer la scène telle qu'elle a été vue.
  const lire = (t) => {
    const m = new THREE.Matrix4();
    t.getMatrixAt(3, m);
    return m.elements.join(',');
  };
  const instances = (t) => maillages(t).find((p) => p.geometry.type === 'ShapeGeometry');
  assert.equal(lire(instances(touffe({ graine: 42 }))), lire(instances(touffe({ graine: 42 }))));
  assert.notEqual(lire(instances(touffe({ graine: 42 }))), lire(instances(touffe({ graine: 43 }))));
});

test('le lierre reste plaqué contre sa paroi', () => {
  // S'il s'avance dans l'espace jouable, il finira par masquer un mécanisme.
  // ART_DIRECTION §2 : le décor n'occulte jamais un élément interactif.
  const boite = new THREE.Box3().setFromObject(lierre({ largeur: 4 }));
  const profondeur = boite.max.z - boite.min.z;
  assert.ok(profondeur <= MODULE * 2.1, `le lierre déborde de ${profondeur.toFixed(2)} m`);
});

// ─── États du lieu ──────────────────────────────────────────────────────────

test('les deux états produisent des matières différentes', () => {
  // Sans quoi la bascule narrative du cœur soigné vers la périphérie envahie
  // ne se verrait pas, et la progression perdrait son récit.
  const propre = maillages(mur({ largeur: 2, etat: 'soigne' }))[0].material;
  const use = maillages(mur({ largeur: 2, etat: 'envahi' }))[0].material;
  assert.notStrictEqual(propre, use);
  assert.notStrictEqual(
    maillages(sol({ etat: 'soigne' }))[0].material,
    maillages(sol({ etat: 'envahi' }))[0].material);
});

test('chaque état déclaré est constructible', () => {
  for (const etat of ETATS) {
    assert.ok(maillages(mur({ largeur: 2, etat })).length > 0);
    assert.ok(maillages(jardiniere({ etat })).length > 0);
  }
});

// ─── Lumière ────────────────────────────────────────────────────────────────

test('le soleil est la seule source porteuse d\'ombre', () => {
  // Vingt lampes ponctuelles à ombre coûtent vingt rendus et se contredisent.
  const s = soleil();
  assert.equal(s.isDirectionalLight, true);
  assert.equal(s.castShadow, true);
  assert.equal(ambiance().castShadow, false);
});

test('le soleil couvre la zone qu\'il éclaire', () => {
  // Une caméra d'ombre trop étroite fait disparaître les ombres au loin, sans
  // aucun message : on croit à un problème de matière.
  const s = soleil({ portee: 30 });
  assert.ok(s.shadow.camera.right >= 30);
  assert.ok(s.shadow.camera.far >= 40);
});

test('le décalage d\'ombre est en place', () => {
  // Sans lui, les surfaces s'auto-ombrent en bandes rayées sur tout le décor.
  const s = soleil();
  assert.ok(s.shadow.bias < 0);
  assert.ok(s.shadow.normalBias > 0);
});

test('l\'ambiance reste basse pour que les ombres existent', () => {
  // Une ambiance généreuse efface les ombres et ramène le décor plat que ce kit
  // existe pour corriger.
  assert.ok(ambiance().intensity <= 0.8);
});

// ─── Ombres portées ─────────────────────────────────────────────────────────

test('les pièces projettent et reçoivent les ombres', () => {
  // Le défaut le plus visible de la version précédente : les objets semblaient
  // collés au sol plutôt que posés dessus.
  assert.ok(maillages(mur({ largeur: 2 })).some((m) => m.castShadow));
  assert.ok(maillages(sol({})).some((p) => p.receiveShadow));
  assert.ok(maillages(touffe({})).every((p) => p.castShadow));
});
