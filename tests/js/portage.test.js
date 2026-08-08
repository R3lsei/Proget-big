// Verrouille le portage d'objets (T-019).
//
// Trois catégories de défauts, toutes invisibles en lecture de code et coûteuses
// à trouver en jouant :
//   - traversée : un objet poussé à travers un mur ouvre des raccourcis et casse
//     les énigmes de salle fermée ;
//   - dépendance à la fréquence d'images : l'objet colle à la vue sur une machine
//     rapide et traîne sur une lente, avec le même code ;
//   - aimantation trop généreuse : un objet « presque » posé qui active quand même
//     rend le mécanisme illisible.

import test from 'node:test';
import assert from 'node:assert/strict';

import { depuisCentre } from '../../game/js/physics/aabb.js';
import {
  DISTANCE_PORTAGE, DISTANCE_RUPTURE, PORTEE_SAISIE, RALENTISSEMENT_LOURD,
  directionRegard, positionDePortage, aPortee, facteurLissage,
  suivrePorteur, appliquerGravite, reposeSur, poserSur, facteurVitesse,
} from '../../game/js/physics/portage.js';

const GABARIT = { rayon: 0.2, hauteur: 0.4 };
const porteur = (p = {}) => ({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, hauteurYeux: 1.6, ...p });
const objet = (p = {}) => ({ x: 0, y: 0, z: 0, vy: 0, auSol: false, ...p });

/** Sol infini à hauteur 0, pour les tests de chute. */
const SOL = depuisCentre(0, -0.5, 0, 200, 1, 200);

// ─── Direction du regard ────────────────────────────────────────────────────

test('le lacet nul regarde vers -Z, comme le joueur', () => {
  // Toute autre convention ferait apparaître l'objet derrière le joueur : la
  // caméra du jeu suit déjà (-sin yaw, 0, -cos yaw).
  const d = directionRegard({ yaw: 0, pitch: 0 });
  assert.ok(Math.abs(d.x) < 1e-12);
  assert.ok(Math.abs(d.y) < 1e-12);
  assert.ok(Math.abs(d.z + 1) < 1e-12);
});

test('un quart de tour à gauche regarde vers -X', () => {
  const d = directionRegard({ yaw: Math.PI / 2, pitch: 0 });
  assert.ok(Math.abs(d.x + 1) < 1e-12);
  assert.ok(Math.abs(d.z) < 1e-12);
});

test('le tangage fait monter et descendre la direction', () => {
  assert.ok(directionRegard({ yaw: 0, pitch: 0.5 }).y > 0);
  assert.ok(directionRegard({ yaw: 0, pitch: -0.5 }).y < 0);
});

test('la direction reste unitaire quel que soit le tangage', () => {
  for (const pitch of [-1.2, -0.3, 0, 0.4, 1.2]) {
    const d = directionRegard({ yaw: 1.1, pitch });
    const norme = Math.hypot(d.x, d.y, d.z);
    assert.ok(Math.abs(norme - 1) < 1e-12, `norme ${norme} pour un tangage de ${pitch}`);
  }
});

// ─── Position de portage ────────────────────────────────────────────────────

test('l\'objet se tient devant les yeux, pas devant les pieds', () => {
  const p = positionDePortage(porteur());
  assert.ok(Math.abs(p.z + DISTANCE_PORTAGE) < 1e-12);
  assert.equal(p.y, 1.6);
});

test('viser le sol descend la position de portage', () => {
  // Sans tangage, poser un objet à ses pieds donnerait l'impression de le
  // pousser dans le décor plutôt que de le déposer.
  assert.ok(positionDePortage(porteur({ pitch: -1 })).y < 1.6);
});

// ─── Saisie ─────────────────────────────────────────────────────────────────

test('la portée se mesure depuis les yeux', () => {
  // Choisi pour DISCRIMINER : sur une étagère haute, l'objet est à 0,8 m des yeux
  // mais à 2,3 m des pieds. Mesurer au sol refuserait une prise que le joueur voit
  // juste devant lui. Un objet à mi-hauteur passerait les deux mesures et ne
  // prouverait rien — la mutation correspondante survivait.
  const surEtagere = objet({ y: 2.2, z: -0.5 });
  assert.equal(aPortee(porteur(), surEtagere), true);
  const auSol = { x: porteur().x, y: porteur().y, z: porteur().z };
  assert.ok(Math.hypot(surEtagere.y - auSol.y, surEtagere.z - auSol.z) > PORTEE_SAISIE,
    'le cas de test ne distingue plus les yeux des pieds');
});

test('un objet trop loin ne peut être saisi', () => {
  assert.equal(aPortee(porteur(), objet({ z: -(PORTEE_SAISIE + 0.5) })), false);
});

// ─── Lissage ────────────────────────────────────────────────────────────────

test('le rattrapage ne dépend pas de la fréquence d\'images', () => {
  // Deux demi-pas doivent rattraper autant qu'un pas entier. Un lissage naïf
  // ferait coller l'objet à la vue à 120 FPS et traîner à 60.
  const dt = 1 / 60;
  const enUnPas = facteurLissage(14, dt);
  const a = facteurLissage(14, dt / 2);
  const enDeuxPas = 1 - (1 - a) * (1 - a);
  assert.ok(Math.abs(enUnPas - enDeuxPas) < 1e-12);
});

test('un pas de temps nul ou absurde ne fait rien avancer', () => {
  for (const dt of [0, -1, NaN, Infinity]) {
    assert.equal(facteurLissage(14, dt), 0);
  }
});

test('le facteur de lissage reste dans [0, 1]', () => {
  for (const dt of [0.001, 0.016, 0.5, 10]) {
    const f = facteurLissage(14, dt);
    assert.ok(f >= 0 && f <= 1, `facteur ${f} hors bornes pour dt=${dt}`);
  }
});

// ─── Suivi et traversée ─────────────────────────────────────────────────────

test('l\'objet porté rejoint la position de portage', () => {
  const o = objet();
  for (let i = 0; i < 120; i++) suivrePorteur(o, porteur(), [], GABARIT, 1 / 60);
  const cible = positionDePortage(porteur());
  assert.ok(Math.hypot(o.x - cible.x, o.y - cible.y, o.z - cible.z) < 0.01);
});

test('un objet porté ne traverse pas un mur', () => {
  // Défaut le plus grave du portage : pousser un objet à travers la géométrie
  // ouvre des raccourcis et vide de leur sens les énigmes de salle fermée.
  const mur = depuisCentre(0, 1.5, -1, 6, 3, 0.2);
  const o = objet({ y: 1.6 });
  for (let i = 0; i < 240; i++) suivrePorteur(o, porteur(), [mur], GABARIT, 1 / 60);
  assert.ok(o.z > mur.maxZ, `l'objet est passé derrière le mur (z=${o.z})`);
});

test('un objet retenu par un obstacle finit par être lâché', () => {
  // Sans rupture, il resterait « tenu » à travers la géométrie puis se
  // téléporterait auprès du joueur au premier dégagement.
  // Le mur doit SÉPARER l'objet du porteur, sinon rien ne le retient : l'objet
  // est derrière (z négatif), le porteur devant (z positif).
  const mur = depuisCentre(0, 1.5, -1, 6, 3, 0.2);
  const o = objet({ y: 1.6, z: -2 });
  const joueur = porteur({ z: 3 });
  let lache = false;
  for (let i = 0; i < 240 && !lache; i++) {
    ({ lache } = suivrePorteur(o, joueur, [mur], GABARIT, 1 / 60));
  }
  assert.ok(o.z < mur.minZ, 'l\'objet a traversé au lieu de rester bloqué');
  assert.equal(lache, true, 'l\'objet aurait dû rompre');
});

test('un objet tenu ne conserve aucune vitesse de chute', () => {
  // Sinon il plonge au moment du lâcher comme s'il tombait depuis le plafond.
  const o = objet({ vy: -12 });
  suivrePorteur(o, porteur(), [], GABARIT, 1 / 60);
  assert.equal(o.vy, 0);
});

// ─── Chute ──────────────────────────────────────────────────────────────────

test('un objet lâché tombe et se pose sur le sol', () => {
  const o = objet({ y: 3 });
  for (let i = 0; i < 180; i++) appliquerGravite(o, 1 / 60, [SOL], GABARIT);
  assert.ok(o.auSol, 'l\'objet n\'a pas atterri');
  assert.ok(Math.abs(o.y - SOL.maxY) < 0.01, `posé à ${o.y} au lieu de ${SOL.maxY}`);
});

test('une image très longue ne téléporte pas l\'objet au fond de la salle', () => {
  // Onglet remis au premier plan, chargement : `dt` peut valoir plusieurs
  // secondes. Le sous-pas empêche la traversée, mais sans borne l'objet aurait
  // parcouru une distance qu'il n'a jamais franchie.
  const o = objet({ y: 3 });
  appliquerGravite(o, 5, [SOL], GABARIT);
  assert.ok(o.y > 2.8, `chute de ${(3 - o.y).toFixed(2)} m sur une seule image`);
});

test('un pas de temps invalide laisse l\'objet immobile', () => {
  const o = objet({ y: 3, vy: -5 });
  appliquerGravite(o, NaN, [SOL], GABARIT);
  assert.equal(o.y, 3);
  assert.equal(o.vy, -5);
});

// ─── Dépose sur un réceptacle ───────────────────────────────────────────────

const PLAQUE = depuisCentre(0, 0.05, -2, 1, 0.1, 1);

test('un objet posé sur la plaque y repose', () => {
  const o = poserSur(objet(), GABARIT, PLAQUE);
  assert.equal(reposeSur(o, GABARIT, PLAQUE), true);
  assert.equal(o.auSol, true);
});

test('la dépose centre l\'objet sur le réceptacle', () => {
  // Le cube posé de travers qui glisse à côté est un geste ingrat ; l'aimantation
  // n'accorde rien puisque la condition d'activation reste entière.
  const o = poserSur(objet({ x: 0.4, z: -1.7 }), GABARIT, PLAQUE);
  assert.equal(o.x, 0);
  assert.equal(o.z, -2);
});

test('un objet à côté de la plaque n\'y repose pas', () => {
  assert.equal(reposeSur(objet({ x: 3, z: -2 }), GABARIT, PLAQUE), false);
});

test('un objet en vol au-dessus de la plaque n\'y repose pas', () => {
  // Exiger un contact réel évite d'activer un mécanisme en lançant l'objet
  // au-dessus. L'objet doit être À L'APLOMB de la plaque, sinon le test
  // réussirait par absence de recouvrement horizontal et ne vérifierait rien.
  assert.equal(reposeSur(objet({ x: 0, z: -2, y: 2 }), GABARIT, PLAQUE), false);
});

test('la tolérance verticale reste serrée', () => {
  const auDessus = (y) => objet({ x: 0, z: -2, y });
  assert.equal(reposeSur(auDessus(PLAQUE.maxY + 0.1), GABARIT, PLAQUE), true);
  assert.equal(reposeSur(auDessus(PLAQUE.maxY + 0.5), GABARIT, PLAQUE), false);
});

// ─── Coût du transport ──────────────────────────────────────────────────────

test('un objet lourd ralentit son porteur, un objet léger non', () => {
  assert.equal(facteurVitesse(['lourd', 'rigide']), RALENTISSEMENT_LOURD);
  assert.equal(facteurVitesse(['leger', 'tenable_une_main']), 1);
  assert.equal(facteurVitesse(new Set(['lourd'])), RALENTISSEMENT_LOURD);
  assert.equal(facteurVitesse(null), 1);
});

test('la rupture est plus lointaine que le portage', () => {
  // Sinon l'objet romprait dès qu'il est tenu : la marge est ce qui autorise un
  // retard de rattrapage pendant que le joueur tourne sur lui-même.
  assert.ok(DISTANCE_RUPTURE > DISTANCE_PORTAGE);
});
