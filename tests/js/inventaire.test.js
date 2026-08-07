// Verrouille l'inventaire des objets scannés (T-027).
//
// Deux tensions à tenir en même temps :
//   - le confort : montrer un objet est un geste physique, l'exiger deux fois
//     est une punition et non une mécanique ;
//   - la tension de jeu : un inventaire invocable sans limite détruit toute
//     énigme d'arbitrage, puisqu'on peut faire apparaître autant d'objets
//     lourds qu'il y a de plaques.
//
// Le plafond de matérialisations simultanées est ce qui concilie les deux, et
// c'est donc lui que ces tests protègent le plus fermement.

import test from 'node:test';
import assert from 'node:assert/strict';

import { chercher } from '../../game/js/perception/base/index.js';
import {
  MATERIALISATIONS_SIMULTANEES, VERSION_INVENTAIRE,
  creerInventaire, memoriser, contenu, connait,
  materialiser, dematerialiser, quitterLaSalle, placesRestantes,
  serialiser, restaurer,
} from '../../game/js/gameplay/inventaire.js';

const avec = (...noms) => {
  const inv = creerInventaire();
  for (const nom of noms) memoriser(inv, chercher(nom));
  return inv;
};

// ─── Mémorisation ───────────────────────────────────────────────────────────

test('un objet montré est acquis pour toute la partie', () => {
  const inv = avec('couteau');
  assert.equal(connait(inv, 'couteau'), true);
  assert.deepEqual(contenu(inv).map((o) => o.nom), ['couteau']);
});

test('remontrer un objet connu ne casse rien et se dit', () => {
  // Le joueur a pu le remontrer sans le savoir ; l'interface doit pouvoir
  // répondre « déjà connu » plutôt que de rester muette.
  const inv = avec('couteau');
  const resultat = memoriser(inv, chercher('couteau'));
  assert.equal(resultat.ajoute, false);
  assert.equal(resultat.raison, 'déjà connu');
  assert.equal(contenu(inv).length, 1);
});

test('un objet non reconnu n\'entre pas dans l\'inventaire', () => {
  const inv = creerInventaire();
  assert.equal(memoriser(inv, chercher('astrolabe')).ajoute, false);
  assert.equal(memoriser(inv, null).ajoute, false);
  assert.deepEqual(contenu(inv), []);
});

test('l\'inventaire garde les propriétés nécessaires au jeu', () => {
  const [couteau] = contenu(avec('couteau'));
  assert.ok(couteau.proprietes.includes('tranchant'));
  assert.equal(couteau.article, 'un');
});

test('l\'inventaire ne partage pas ses tableaux avec la base', () => {
  // Une mutation accidentelle depuis l'inventaire corromprait la base pour toute
  // la partie, et le même objet cesserait de fonctionner ailleurs.
  const inv = avec('couteau');
  contenu(inv)[0].proprietes.push('magique');
  assert.equal(chercher('couteau').proprietes.includes('magique'), false);
});

// ─── Plafond de matérialisation ─────────────────────────────────────────────

test('on ne matérialise pas plus que le plafond', () => {
  // LA règle qui préserve les énigmes d'arbitrage. Sans elle, une salle à deux
  // plaques n'exige plus rien : on invoque deux briques et c'est réglé.
  const inv = avec('brique', 'caillou', 'marteau');
  assert.equal(materialiser(inv, 'brique').ok, true);
  assert.equal(materialiser(inv, 'caillou').ok, true);
  const troisieme = materialiser(inv, 'marteau');
  assert.equal(troisieme.ok, false);
  assert.match(troisieme.raison, /au maximum/);
});

test('le plafond laisse passer une énigme à deux mécanismes', () => {
  // Choisi pour cela : deux, c'est assez pour rester jouable à la caméra seule,
  // trop peu pour dispenser de composer avec le décor sur les salles plus riches.
  assert.equal(MATERIALISATIONS_SIMULTANEES, 2);
});

test('le refus ne sacrifie pas un objet déjà posé', () => {
  // Voir un objet disparaître d'une plaque parce qu'on en a invoqué un autre
  // ailleurs serait incompréhensible : le joueur croirait à un bug.
  const inv = avec('brique', 'caillou', 'marteau');
  materialiser(inv, 'brique');
  materialiser(inv, 'caillou');
  materialiser(inv, 'marteau');
  assert.equal(inv.materialises.has('brique'), true);
  assert.equal(inv.materialises.has('caillou'), true);
});

test('on ne matérialise pas deux fois le même objet', () => {
  const inv = avec('brique');
  assert.equal(materialiser(inv, 'brique').ok, true);
  assert.match(materialiser(inv, 'brique').raison, /déjà présent/);
});

test('on ne matérialise pas ce qu\'on n\'a jamais montré', () => {
  assert.match(materialiser(creerInventaire(), 'brique').raison, /inconnu/);
});

test('renvoyer un objet libère une place', () => {
  const inv = avec('brique', 'caillou', 'marteau');
  materialiser(inv, 'brique');
  materialiser(inv, 'caillou');
  assert.equal(placesRestantes(inv), 0);
  assert.equal(dematerialiser(inv, 'brique'), true);
  assert.equal(placesRestantes(inv), 1);
  assert.equal(materialiser(inv, 'marteau').ok, true);
});

test('changer de salle vide les matérialisations, jamais les acquis', () => {
  // Les objets invoqués appartiennent à la salle qu'on quitte ; la connaissance
  // appartient au joueur.
  const inv = avec('brique', 'couteau');
  materialiser(inv, 'brique');
  quitterLaSalle(inv);
  assert.equal(placesRestantes(inv), MATERIALISATIONS_SIMULTANEES);
  assert.equal(connait(inv, 'brique'), true);
  assert.equal(connait(inv, 'couteau'), true);
});

// ─── Sauvegarde ─────────────────────────────────────────────────────────────

test('la sauvegarde n\'écrit que des noms', () => {
  // Recopier les propriétés figerait une partie sur une version périmée du
  // vocabulaire : un objet corrigé resterait faux pour qui l'avait déjà scanné.
  const donnees = serialiser(avec('couteau', 'brique'));
  assert.equal(donnees.version, VERSION_INVENTAIRE);
  assert.deepEqual(donnees.connus, ['couteau', 'brique']);
  assert.equal(JSON.stringify(donnees).includes('tranchant'), false);
});

test('une sauvegarde se recharge à l\'identique', () => {
  const avant = avec('couteau', 'brique', 'téléphone');
  const { inventaire, perdus } = restaurer(serialiser(avant), chercher);
  assert.deepEqual(perdus, []);
  assert.deepEqual(contenu(inventaire).map((o) => o.nom),
    contenu(avant).map((o) => o.nom));
  assert.ok(contenu(inventaire)[0].proprietes.includes('tranchant'));
});

test('un objet disparu de la base est signalé, pas fatal', () => {
  // Perdre un objet acquis est regrettable ; perdre la partie entière ne l'est
  // pas. Le chargement continue et dit ce qu'il n'a pas su restituer.
  const { inventaire, perdus } = restaurer(
    { version: 1, connus: ['couteau', 'objet_supprime'] }, chercher);
  assert.deepEqual(perdus, ['objet_supprime']);
  assert.deepEqual(contenu(inventaire).map((o) => o.nom), ['couteau']);
});

test('une sauvegarde vide ou absente donne un inventaire vide', () => {
  assert.deepEqual(contenu(restaurer(null, chercher).inventaire), []);
  assert.deepEqual(contenu(restaurer({}, chercher).inventaire), []);
});

test('les matérialisations ne sont pas sauvegardées', () => {
  // Elles appartiennent à une salle et à un instant ; les restituer ferait
  // réapparaître un objet là où le joueur ne l'attend plus.
  const inv = avec('brique');
  materialiser(inv, 'brique');
  const { inventaire } = restaurer(serialiser(inv), chercher);
  assert.equal(placesRestantes(inventaire), MATERIALISATIONS_SIMULTANEES);
});
