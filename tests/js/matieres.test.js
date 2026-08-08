// Verrouille la génération de matières (T-024).
//
// Une texture ne plante jamais : elle est seulement fausse, et cela ne se voit
// qu'à l'œil, souvent tard. Ces tests portent donc sur ce qui décide de son
// aspect — la salissure fait-elle vraiment quelque chose, les joints sont-ils
// plus sombres, la carte boucle-t-elle — plutôt que sur des pixels précis.

import test from 'node:test';
import assert from 'node:assert/strict';

import { motifCarrelage, motifPanneau, fractal, versNormales } from '../../game/js/rendering/matieres.js';

const TAILLE = 64;
const moyenne = (octets) => {
  let somme = 0;
  for (let i = 0; i < octets.length; i += 3) somme += octets[i];
  return somme / (octets.length / 3);
};

test('le bruit fractal est déterministe et borné', () => {
  // Un décor irreproductible ne se corrige pas : on ne peut ni le montrer, ni
  // prouver qu'il a changé.
  assert.equal(fractal(1.3, 2.7, 5), fractal(1.3, 2.7, 5));
  for (let i = 0; i < 200; i++) {
    const v = fractal(i * 0.37, i * 0.11, 3);
    assert.ok(v >= 0 && v <= 1, `valeur hors bornes : ${v}`);
  }
});

test('la salissure assombrit vraiment', () => {
  // Le paramètre pourrait n'être branché sur rien : la texture serait alors la
  // même partout, et l'état du lieu ne se lirait plus au sol.
  const propre = motifCarrelage({ taille: TAILLE, salete: 0 });
  const sale = motifCarrelage({ taille: TAILLE, salete: 1 });
  assert.ok(moyenne(sale.couleur) < moyenne(propre.couleur) - 5,
    'un sol sale devrait être plus sombre qu\'un sol propre');
});

test('la salissure mange le reflet', () => {
  // C'est la carte de rugosité qui distingue « clair » de « clair et SALE ».
  // Sans elle, un sol encrassé continuerait de briller comme un sol lavé.
  const propre = motifCarrelage({ taille: TAILLE, salete: 0 });
  const sale = motifCarrelage({ taille: TAILLE, salete: 1 });
  assert.ok(moyenne(sale.rugosite) > moyenne(propre.rugosite) + 5);
});

test('les joints sont plus sombres que les carreaux', () => {
  // Sans ce contraste, le carrelage se lit comme une surface unie : c'est le
  // joint qui donne l'échelle, exactement comme sur les murs.
  const motif = motifCarrelage({ taille: TAILLE, carreaux: 4, salete: 0 });
  const pixel = (x, y) => motif.couleur[(y * TAILLE + x) * 3];
  // (0,0) est sur un joint ; le centre d'un carreau ne l'est pas.
  assert.ok(pixel(0, 0) < pixel(TAILLE / 8, TAILLE / 8) - 10);
});

test('un mur est plus sale en bas qu\'en haut', () => {
  // L'encrassement monte du sol. Une salissure uniforme se lit comme un filtre
  // posé sur l'image, pas comme de la crasse sur un mur.
  const motif = motifPanneau({ taille: TAILLE, salete: 1 });
  const ligne = (y) => {
    let somme = 0;
    for (let x = 0; x < TAILLE; x++) somme += motif.couleur[(y * TAILLE + x) * 3];
    return somme / TAILLE;
  };
  assert.ok(ligne(TAILLE - 2) < ligne(1) - 8, 'le bas devrait être plus sombre');
});

test('les cartes bouclent, sans couture visible', () => {
  // Une texture de mur se répète des dizaines de fois : une carte qui ne boucle
  // pas dessine une ligne nette à chaque raccord, et rien n'est plus visible.
  // Sur la COULEUR, pas sur les normales : les deux bords sont les deux flancs
  // du même joint, donc leurs normales sont légitimement opposées. Les
  // comparer signalait une couture là où le relief était juste — un test qui
  // se trompe de grandeur accuse le code d'un défaut qu'il n'a pas.
  const motif = motifCarrelage({ taille: TAILLE, carreaux: 4 });
  for (let y = 0; y < TAILLE; y++) {
    const gauche = motif.couleur[(y * TAILLE) * 3];
    const droite = motif.couleur[(y * TAILLE + TAILLE - 1) * 3];
    assert.ok(Math.abs(gauche - droite) < 30,
      `couture à la ligne ${y} : ${gauche} contre ${droite}`);
  }
});

test('les normales sont des vecteurs, pas du bruit', () => {
  // Encodées autour de 128 avec un Z dominant : une carte dont le bleu ne
  // domine pas produit un relief aberrant, et l'éclairage devient faux partout
  // sans qu'aucune erreur ne soit levée.
  const hauteur = new Float32Array(TAILLE * TAILLE);
  for (let i = 0; i < hauteur.length; i++) hauteur[i] = Math.sin(i * 0.05) * 0.1;
  const normales = versNormales(hauteur, TAILLE);
  let bleuMin = 255;
  for (let i = 2; i < normales.length; i += 3) bleuMin = Math.min(bleuMin, normales[i]);
  assert.ok(bleuMin > 128, `composante Z trop faible : ${bleuMin}`);
});

test('chaque motif fournit les trois cartes à la bonne taille', () => {
  for (const motif of [motifCarrelage({ taille: TAILLE }), motifPanneau({ taille: TAILLE })]) {
    for (const nom of ['couleur', 'rugosite', 'normale']) {
      assert.equal(motif[nom].length, TAILLE * TAILLE * 3, `${nom} mal dimensionnée`);
    }
  }
});
