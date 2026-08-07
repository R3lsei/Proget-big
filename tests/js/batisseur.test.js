// Verrouille le bâtisseur de chambres et le contrat partagé (T-022).
//
// Ce module est le point de jonction du projet : une même déclaration nourrit le
// décor et la preuve de résolubilité. Les défauts qui comptent ici sont ceux du
// raccord :
//   - un mur qu'on voit mais qui n'arrête pas, ou l'inverse ;
//   - une porte dessinée béante mais murée par ses colliders ;
//   - un joueur qui démarre dans une cloison ;
//   - une chambre jouable que le vérificateur ne connaît pas.

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { CHAMBRES } from '../../game/js/gameplay/chambres.js';
import { SALLES } from '../../game/js/gameplay/salles.js';
import { verifierParcours } from '../../game/js/gameplay/resolubilite.js';
import { RECEPTACLES, activePar } from '../../game/js/gameplay/mecanismes.js';
import { chercher } from '../../game/js/perception/base/index.js';
import { seChevauchent, depuisCentre } from '../../game/js/physics/aabb.js';
import { batir, departDe } from '../../game/js/rendering/batisseur.js';
import { MODULE, HAUTEUR_CHAMBRE, ETATS } from '../../game/js/rendering/kit.js';

const GABARIT = { rayon: 0.3, hauteur: 1.7 };
const boiteJoueur = (p) => depuisCentre(
  p.x, p.y + GABARIT.hauteur / 2, p.z, GABARIT.rayon * 2, GABARIT.hauteur, GABARIT.rayon * 2);

// ─── Le contrat partagé ─────────────────────────────────────────────────────

test('la barrière de résolubilité protège exactement les chambres jouables', () => {
  // Si ces deux listes divergeaient, on vérifierait des salles que personne ne
  // joue tout en livrant des salles que personne n'a vérifiées.
  assert.strictEqual(SALLES, CHAMBRES);
});

test('toutes les chambres déclarées sont franchissables', () => {
  const { resoluble, echecs } = verifierParcours(CHAMBRES, chercher);
  assert.equal(resoluble, true,
    echecs.map((e) => `${e.salle} : ${e.raison}`).join('\n'));
});

test('chaque chambre se bâtit et se prouve à partir de la même déclaration', () => {
  // Le test qui donne son sens à T-022 : aucun champ à recopier d'un fichier à
  // l'autre, donc aucune occasion d'oublier.
  for (const chambre of CHAMBRES) {
    const bati = batir(chambre);
    for (const instance of Object.keys(chambre.receptacles ?? {})) {
      assert.ok(bati.receptacles.has(instance),
        `${chambre.id} : ${instance} est vérifié mais n'existe pas en 3D`);
    }
    assert.equal(bati.receptacles.size, Object.keys(chambre.receptacles ?? {}).length);
  }
});

test('chaque chambre déclare des champs cohérents', () => {
  for (const chambre of CHAMBRES) {
    assert.ok(chambre.id && chambre.titre, 'chambre sans identité');
    assert.ok(ETATS.includes(chambre.etat), `${chambre.id} : état « ${chambre.etat} » inconnu`);
    assert.ok(chambre.taille.largeur >= 4 && chambre.taille.profondeur >= 4,
      `${chambre.id} : trop exiguë pour être jouable`);
    for (const [instance, decl] of Object.entries(chambre.receptacles ?? {})) {
      assert.ok(RECEPTACLES[decl.type], `${chambre.id}/${instance} : type inconnu`);
    }
  }
});

test('les objets d\'une chambre existent tous dans la base', () => {
  for (const chambre of CHAMBRES) {
    for (const nom of chambre.objets) {
      assert.ok(chercher(nom), `${chambre.id} : « ${nom} » absent de la base`);
    }
  }
});

// ─── Colliders ──────────────────────────────────────────────────────────────

test('une chambre produit un sol et des murs qui arrêtent', () => {
  const { colliders } = batir(CHAMBRES[0]);
  assert.ok(colliders.length > 10, `seulement ${colliders.length} boîtes de collision`);
  // Sans collider de sol, le joueur tombe dès la première image, avant même
  // d'avoir pu bouger.
  assert.ok(colliders.some((c) => c.maxY <= 0.001 && c.maxX - c.minX > 5), 'sol absent');
});

test('le joueur ne peut pas sortir par un mur plein', () => {
  const chambre = CHAMBRES[0];
  const { colliders } = batir(chambre);
  const demiP = chambre.taille.profondeur * MODULE / 2;
  // Le mur sud est plein : quelque chose doit s'y opposer.
  const contreLeMur = boiteJoueur({ x: 0, y: 0, z: demiP - 0.1 });
  assert.ok(colliders.some((c) => seChevauchent(contreLeMur, c)),
    'aucun collider sur le mur opposé à la sortie');
});

test('la porte est une vraie ouverture, pas un mur peint', () => {
  // Défaut classique du raccord : on dessine une porte béante et on laisse un
  // collider plein derrière. Le joueur voit une sortie et se cogne dedans.
  const chambre = CHAMBRES[0];
  const { colliders } = batir(chambre);
  const demiP = chambre.taille.profondeur * MODULE / 2;
  const dansLOuverture = boiteJoueur({ x: 0, y: 0, z: -demiP + 0.05 });
  const bloquants = colliders.filter((c) => seChevauchent(dansLOuverture, c)
    && c.maxY > 0.2);
  assert.deepEqual(bloquants, [], 'l\'ouverture de la porte est murée');
});

test('le décor végétal ne bloque pas le passage', () => {
  // Un buisson qui arrête est un mur invisible : le joueur ne comprend jamais
  // pourquoi il ne passe pas, et accuse le jeu d'être cassé.
  const chambre = CHAMBRES[1];
  const { colliders } = batir(chambre);
  for (const decor of chambre.decor) {
    const surLeDecor = boiteJoueur({ x: decor.x * MODULE, y: 0, z: decor.z * MODULE });
    const bloquants = colliders.filter((c) => seChevauchent(surLeDecor, c) && c.maxY > 0.5);
    assert.deepEqual(bloquants, [], `le décor en (${decor.x}, ${decor.z}) bloque`);
  }
});

// ─── Position de départ ─────────────────────────────────────────────────────

test('le joueur démarre dans la pièce, jamais dans un mur', () => {
  // B-001 a déjà éjecté le joueur hors du décor une fois. Une position écrite à
  // la main finit toujours dans une cloison après un redimensionnement.
  for (const chambre of CHAMBRES) {
    const { colliders } = batir(chambre);
    const depart = departDe(chambre);
    const corps = boiteJoueur(depart);
    const dedans = colliders.filter((c) => seChevauchent(corps, c) && c.maxY > 0.2);
    assert.deepEqual(dedans, [], `${chambre.id} : départ dans un obstacle`);

    const demiL = chambre.taille.largeur * MODULE / 2;
    const demiP = chambre.taille.profondeur * MODULE / 2;
    assert.ok(Math.abs(depart.x) < demiL && Math.abs(depart.z) < demiP,
      `${chambre.id} : départ hors de la pièce`);
  }
});

test('le joueur regarde vers l\'intérieur de la pièce', () => {
  // Démarrer nez au mur donne l'impression d'un bug avant même le premier pas.
  for (const chambre of CHAMBRES) {
    const depart = departDe(chambre);
    const regard = { x: -Math.sin(depart.yaw), z: -Math.cos(depart.yaw) };
    // Le regard doit s'éloigner du mur derrière soi, donc pointer vers le centre.
    const versCentre = { x: -depart.x, z: -depart.z };
    const produit = regard.x * versCentre.x + regard.z * versCentre.z;
    assert.ok(produit > 0, `${chambre.id} : le joueur démarre face au mur`);
  }
});

// ─── Mécanismes en place ────────────────────────────────────────────────────

test('les réceptacles bâtis reposent au sol et sont franchissables', () => {
  // Une plaque de pression n'est pas un obstacle : on marche dessus.
  for (const chambre of CHAMBRES) {
    for (const [instance, recep] of batir(chambre).receptacles) {
      assert.ok(recep.boite.maxY < 0.3,
        `${chambre.id}/${instance} : socle trop haut, il bloquerait le passage`);
      assert.ok(recep.boite.minY >= -0.01, `${chambre.id}/${instance} : socle enterré`);
    }
  }
});

test('les objets d\'une chambre peuvent réellement activer ses mécanismes', () => {
  // Le vérificateur le prouve déjà en théorie ; ce test relie la preuve aux
  // types réellement instanciés en 3D.
  for (const chambre of CHAMBRES) {
    for (const [instance, recep] of batir(chambre).receptacles) {
      const capables = chambre.objets
        .filter((nom) => activePar(recep.type, chercher(nom).proprietes));
      assert.notEqual(capables.length, 0,
        `${chambre.id}/${instance} : aucun objet présent ne l'active`);
    }
  }
});

// ─── Porte ──────────────────────────────────────────────────────────────────

test('la porte s\'ouvre et se referme', () => {
  const { porte } = batir(CHAMBRES[0]);
  const positionsFermees = porte.groupe.children.map((v) => v.position.x);
  porte.ouvrir(1);
  const positionsOuvertes = porte.groupe.children.map((v) => v.position.x);
  assert.notDeepEqual(positionsOuvertes, positionsFermees);
  // Les vantaux s'écartent : ils ne doivent pas glisser du même côté.
  assert.ok(positionsOuvertes[0] < positionsFermees[0]);
  assert.ok(positionsOuvertes[1] > positionsFermees[1]);
  porte.ouvrir(0);
  assert.deepEqual(porte.groupe.children.map((v) => v.position.x), positionsFermees);
});

test('la progression de la porte est bornée', () => {
  // Une valeur hors bornes ferait sortir les vantaux du décor.
  const { porte } = batir(CHAMBRES[0]);
  porte.ouvrir(1);
  const ouvert = porte.groupe.children.map((v) => v.position.x);
  porte.ouvrir(5);
  assert.deepEqual(porte.groupe.children.map((v) => v.position.x), ouvert);
  porte.ouvrir(-3);
  porte.ouvrir(0);
  assert.deepEqual(porte.groupe.children.map((v) => v.position.x).length, 2);
});

// ─── Emprise ────────────────────────────────────────────────────────────────

test('la chambre bâtie tient dans les dimensions déclarées', () => {
  for (const chambre of CHAMBRES) {
    const boite = new THREE.Box3().setFromObject(batir(chambre).groupe);
    const marge = MODULE;
    assert.ok(boite.max.x - boite.min.x <= chambre.taille.largeur * MODULE + marge,
      `${chambre.id} déborde en largeur`);
    assert.ok(boite.max.y <= HAUTEUR_CHAMBRE * MODULE + marge,
      `${chambre.id} dépasse en hauteur`);
  }
});
