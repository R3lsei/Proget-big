// Verrouille la cinématique d'entrée dans l'acte I (T-044).
//
// Une cinématique fausse ne plante pas : elle place la caméra dans un mur,
// laisse un voile noir en place, ou rend la main à trois mètres du sol. Rien de
// tout cela ne lève d'erreur, et tout se voit immédiatement — sauf en test, où
// il faut le demander.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  etatCinematique, dureeDe, instantDePurge, ENTREE_HALLE,
} from '../../game/js/rendering/cinematique.js';
import { CHAMBRES } from '../../game/js/gameplay/chambres.js';
import { departDe } from '../../game/js/rendering/plan.js';

test('la séquence commence dans le noir', () => {
  // Elle prend la suite d'un changement de chambre : sans voile, on verrait un
  // huitième d'image de la salle avant que la caméra ne soit placée, ce qui se
  // lit comme un raté d'affichage.
  assert.equal(etatCinematique(ENTREE_HALLE, 0).voile, 1);
});

test('elle rend la main sans voile et sans texte', () => {
  // Le pire défaut possible et le plus facile à écrire : un voile qui reste. Le
  // joueur récupère les commandes derrière un rectangle noir, croit à un
  // plantage, et recharge la page.
  const fin = etatCinematique(ENTREE_HALLE, dureeDe(ENTREE_HALLE));
  assert.equal(fin.voile, 0);
  assert.equal(fin.eclair, 0);
  assert.equal(fin.texte, '');
});

test('elle rend la main exactement à la hauteur des yeux', () => {
  // Sinon la reprise en main est un saut : la caméra se téléporte au premier
  // pas de simulation, et le joueur ne sait pas s'il vient de tomber.
  const fin = etatCinematique(ENTREE_HALLE, dureeDe(ENTREE_HALLE));
  assert.ok(Math.abs(fin.position[1] - 1.6) < 0.2,
    `la caméra rend la main à ${fin.position[1]} m`);
});

test('elle rend la main près du départ du joueur', () => {
  // La halle est la troisième chambre : c'est là que la séquence se joue.
  const halle = CHAMBRES[2];
  const depart = departDe(halle);
  const fin = etatCinematique(ENTREE_HALLE, dureeDe(ENTREE_HALLE));
  const ecart = Math.hypot(fin.position[0] - depart.x, fin.position[2] - depart.z);
  assert.ok(ecart < 2.5, `${ecart.toFixed(2)} m entre la fin du plan et le départ`);
});

test('la caméra reste dans la salle', () => {
  // Une image-clé mal saisie envoie la caméra à travers un mur, et l'on voit le
  // désert par l'envers du décor pendant deux secondes.
  const halle = CHAMBRES[2];
  const demiX = (halle.taille.largeur * 1.2) / 2;
  const demiZ = (halle.taille.profondeur * 1.2) / 2;
  const plafond = halle.hauteur * 1.2;
  for (let t = 0; t <= dureeDe(ENTREE_HALLE); t += 0.1) {
    const { position } = etatCinematique(ENTREE_HALLE, t);
    assert.ok(Math.abs(position[0]) < demiX, `x hors salle à ${t.toFixed(1)} s`);
    assert.ok(Math.abs(position[2]) < demiZ, `z hors salle à ${t.toFixed(1)} s`);
    assert.ok(position[1] > 0.3 && position[1] < plafond - 0.3,
      `y = ${position[1].toFixed(2)} hors salle à ${t.toFixed(1)} s`);
  }
});

test('le mouvement est continu, sans saut', () => {
  // Un tri d'images-clés absent, ou une recherche d'intervalle fausse, produit
  // un saut instantané. À l'écran cela ressemble à une coupe voulue, et l'on
  // peut passer à côté longtemps.
  let precedente = etatCinematique(ENTREE_HALLE, 0).position;
  for (let t = 0.05; t <= dureeDe(ENTREE_HALLE); t += 0.05) {
    const { position } = etatCinematique(ENTREE_HALLE, t);
    const saut = Math.hypot(
      position[0] - precedente[0], position[1] - precedente[1], position[2] - precedente[2]);
    assert.ok(saut < 0.4, `saut de ${saut.toFixed(2)} m à ${t.toFixed(2)} s`);
    precedente = position;
  }
});

test('elle monte vraiment', () => {
  // C'est TOUT le propos du plan : dire que la salle a un étage. Une séquence
  // qui resterait à hauteur d'homme coûterait douze secondes de la patience du
  // joueur pour ne rien lui apprendre.
  let plusHaut = 0;
  for (let t = 0; t <= dureeDe(ENTREE_HALLE); t += 0.1) {
    plusHaut = Math.max(plusHaut, etatCinematique(ENTREE_HALLE, t).position[1]);
  }
  assert.ok(plusHaut > 4, `la caméra ne monte qu'à ${plusHaut.toFixed(1)} m`);
});

test('la purge tombe sur l\'éclair, pas à côté', () => {
  // La purge et son signal doivent être le MÊME événement. Décalés d'une demi-
  // seconde, le joueur ne fait pas le lien, et la disparition de sa sacoche
  // redevient inexpliquée — c'est-à-dire un bug, de son point de vue.
  const instant = instantDePurge(ENTREE_HALLE);
  assert.ok(etatCinematique(ENTREE_HALLE, instant).eclair > 0.9,
    'la purge ne tombe pas sur le plus fort de l\'éclair');
});

test('elle tient dans douze secondes', () => {
  // Au-delà, on ne peut plus l'imposer : un joueur qui recommence la salle la
  // subirait. Elle reste passable, mais la durée est aussi une discipline.
  assert.ok(dureeDe(ENTREE_HALLE) <= 12.5, `${dureeDe(ENTREE_HALLE)} s, c'est trop long`);
});

test('hors bornes, elle ne part pas à l\'infini', () => {
  // Extrapoler au-delà de la dernière clé enverrait la caméra quelque part
  // au-dessus du désert si un seul appel arrivait en retard.
  const fin = etatCinematique(ENTREE_HALLE, dureeDe(ENTREE_HALLE));
  const bienApres = etatCinematique(ENTREE_HALLE, 900);
  assert.deepEqual(bienApres.position, fin.position);
  assert.deepEqual(etatCinematique(ENTREE_HALLE, -50).position,
    etatCinematique(ENTREE_HALLE, 0).position);
});
