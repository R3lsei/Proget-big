// matieres.js — Le grain des surfaces (T-024).
//
// Le décor était juste et mort : chaque surface était un aplat d'une seule
// couleur. C'est ce qui restait entre le jeu et les références du joueur — pas
// la géométrie, pas la lumière, la MATIÈRE. Un mur d'une seule valeur ne peut
// pas être sale, usé, ni vieux ; il ne peut qu'être neuf, et un laboratoire
// neuf contredit l'herbe qui pousse dans ses joints.
//
// ─── Pourquoi produites par le code, et non téléchargées ─────────────────────
// Trois raisons, dans cet ordre :
//   · on décide de la salissure, carreau par carreau, au lieu de la subir ;
//   · rien à créditer, rien à peser — quelques kilo-octets de code contre
//     plusieurs mégaoctets d'images ;
//   · et surtout : la génération est une fonction PURE de ses paramètres, donc
//     elle se teste. Une texture téléchargée ne se vérifie qu'à l'œil.
//
// ─── La contrainte qui a décidé de la forme ──────────────────────────────────
// Les tests tournent sous Node, sans navigateur, donc sans `canvas`. Les pixels
// sont donc calculés dans un tableau d'octets ordinaire, et three ne sert qu'à
// l'emballage final. Toute la logique — joints, taches, fissures, relief —
// reste vérifiable ligne par ligne.

import * as THREE from 'three';

/** Bruit de valeur déterministe, entre 0 et 1. */
function alea(x, y, graine) {
  const n = Math.sin(x * 127.1 + y * 311.7 + graine * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Bruit lissé : interpolation bicubique entre les valeurs entières. */
function bruit(x, y, graine) {
  const xi = Math.floor(x); const yi = Math.floor(y);
  const xf = x - xi; const yf = y - yi;
  const ux = xf * xf * (3 - 2 * xf);
  const uy = yf * yf * (3 - 2 * yf);
  const a = alea(xi, yi, graine);
  const b = alea(xi + 1, yi, graine);
  const c = alea(xi, yi + 1, graine);
  const d = alea(xi + 1, yi + 1, graine);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

/**
 * Bruit fractal : plusieurs octaves superposées.
 *
 * Une seule octave donne des taches molles toutes de la même taille, qui se
 * lisent comme un nuage. La salissure réelle a du détail à toutes les échelles —
 * de larges auréoles ET des ponctuations fines.
 */
export function fractal(x, y, graine, octaves = 4) {
  let somme = 0; let amplitude = 1; let total = 0; let frequence = 1;
  for (let i = 0; i < octaves; i++) {
    somme += bruit(x * frequence, y * frequence, graine + i * 17) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequence *= 2.07;   // pas exactement 2 : évite que les octaves s'alignent
  }
  return somme / total;
}

/**
 * Motif de carrelage : couleur, rugosité et relief.
 *
 * Renvoie trois tableaux d'octets RGB de `taille × taille`. Pas d'objet three,
 * pas de canvas : rien qui exige un navigateur.
 *
 * @param {object} options
 * @param {number} options.taille       côté en pixels
 * @param {number} options.carreaux     carreaux par côté de texture
 * @param {number} options.salete       0 = neuf, 1 = laissé à l'abandon
 * @param {number[]} options.teinte     couleur de base RGB, 0-255
 */
export function motifCarrelage({
  taille = 256, carreaux = 4, salete = 0.45, graine = 3,
  teinte = [233, 237, 238], joint = [150, 152, 148],
} = {}) {
  const couleur = new Uint8Array(taille * taille * 3);
  const rugosite = new Uint8Array(taille * taille * 3);
  const hauteur = new Float32Array(taille * taille);

  const pas = taille / carreaux;
  const demiJoint = Math.max(1.2, taille / 220);

  for (let py = 0; py < taille; py++) {
    for (let px = 0; px < taille; px++) {
      const i = py * taille + px;

      // Distance au joint le plus proche, en pixels.
      const dx = Math.min(px % pas, pas - (px % pas));
      const dy = Math.min(py % pas, pas - (py % pas));
      const auJoint = Math.min(dx, dy) < demiJoint;

      // Chaque carreau a sa propre valeur : un carrelage n'est jamais d'une
      // seule teinte, et cette irrégularité est ce qui distingue une surface
      // carrelée d'un aplat rayé.
      const carreauX = Math.floor(px / pas);
      const carreauY = Math.floor(py / pas);
      const variationCarreau = (alea(carreauX, carreauY, graine) - 0.5) * 0.09;

      // Salissure : large fond, ponctuations fines par-dessus.
      const tache = fractal(px / taille * 3.5, py / taille * 3.5, graine, 4);
      const grain = fractal(px / taille * 22, py / taille * 22, graine + 5, 2);
      const encrassement = salete * (tache * 0.75 + grain * 0.25);

      // Les joints retiennent la crasse : c'est là qu'elle s'accumule d'abord,
      // et c'est ce contraste qui fait lire le carrelage comme sale plutôt que
      // comme uniformément gris.
      const facteur = auJoint
        ? 0.62 - encrassement * 0.25
        : 1 + variationCarreau - encrassement * 0.42;

      const base = auJoint ? joint : teinte;
      for (let c = 0; c < 3; c++) {
        couleur[i * 3 + c] = Math.max(0, Math.min(255, base[c] * facteur));
      }

      // Rugosité : le sale ne brille pas. Un carrelage propre renvoie, la
      // crasse mange le reflet — c'est cette carte qui fait la différence
      // entre « sol clair » et « sol clair SALE ».
      const rug = auJoint ? 0.78 : 0.16 + encrassement * 0.62;
      const octet = Math.max(0, Math.min(255, rug * 255));
      rugosite[i * 3] = octet; rugosite[i * 3 + 1] = octet; rugosite[i * 3 + 2] = octet;

      // Relief : le joint est creux, la surface légèrement irrégulière.
      hauteur[i] = (auJoint ? -0.55 : 0) + (grain - 0.5) * 0.08;
    }
  }

  return { couleur, rugosite, normale: versNormales(hauteur, taille), taille };
}

/**
 * Motif de panneau mural : plaques métalliques, coulures, usure basse.
 */
export function motifPanneau({
  taille = 256, salete = 0.4, graine = 9, teinte = [238, 241, 242],
} = {}) {
  const couleur = new Uint8Array(taille * taille * 3);
  const rugosite = new Uint8Array(taille * taille * 3);
  const hauteur = new Float32Array(taille * taille);

  for (let py = 0; py < taille; py++) {
    for (let px = 0; px < taille; px++) {
      const i = py * taille + px;
      const v = py / taille;   // 0 en haut de la texture, 1 en bas

      const tache = fractal(px / taille * 2.6, py / taille * 2.6, graine, 4);
      const grain = fractal(px / taille * 30, py / taille * 30, graine + 3, 2);

      // Coulures verticales : très étirées en hauteur, fines en largeur. C'est
      // la marque la plus reconnaissable d'un mur laissé à l'humidité, et elle
      // ne coûte qu'un bruit anisotrope.
      const coulure = fractal(px / taille * 26, py / taille * 1.6, graine + 11, 3);
      const forceCoulure = Math.max(0, coulure - 0.55) * 2.2 * salete;

      // L'encrassement monte du sol : le bas d'un mur est toujours plus sale
      // que le haut. Une salissure uniforme se lit comme un filtre, pas comme
      // de la crasse.
      const parLeBas = Math.pow(v, 1.7);
      const encrassement = salete * (tache * 0.5 + grain * 0.2 + parLeBas * 0.5)
        + forceCoulure * 0.5;

      const facteur = 1 - Math.min(0.55, encrassement * 0.5);
      for (let c = 0; c < 3; c++) {
        couleur[i * 3 + c] = Math.max(0, Math.min(255, teinte[c] * facteur));
      }

      const rug = 0.45 + Math.min(0.5, encrassement * 0.7);
      const octet = Math.max(0, Math.min(255, rug * 255));
      rugosite[i * 3] = octet; rugosite[i * 3 + 1] = octet; rugosite[i * 3 + 2] = octet;

      hauteur[i] = (grain - 0.5) * 0.25 + forceCoulure * 0.1;
    }
  }

  return { couleur, rugosite, normale: versNormales(hauteur, taille), taille };
}

/**
 * Motif de sable : rides de vent et grain fin.
 *
 * Les rides sont ce qui distingue un désert d'un aplat ocre. Elles suivent une
 * direction dominante — celle du vent — et c'est cette régularité orientée que
 * l'œil lit comme « du sable » plutôt que comme « du bruit brun ».
 */
export function motifSable({
  taille = 256, graine = 21, teinte = [201, 141, 85],
} = {}) {
  const couleur = new Uint8Array(taille * taille * 3);
  const rugosite = new Uint8Array(taille * taille * 3);
  const hauteur = new Float32Array(taille * taille);

  for (let py = 0; py < taille; py++) {
    for (let px = 0; px < taille; px++) {
      const i = py * taille + px;
      const u = px / taille; const v = py / taille;

      // Rides : une sinusoïde le long d'une direction, ondulée par du bruit.
      // Une sinusoïde pure donnerait des rayures de tissu ; c'est l'ondulation
      // qui en fait du sable.
      const derive = fractal(u * 3, v * 3, graine, 3) * 2.2;
      const rides = Math.sin((u * 26 + v * 9 + derive) * Math.PI * 2) * 0.5 + 0.5;

      const dunes = fractal(u * 4.5, v * 4.5, graine + 7, 4);
      const grain = fractal(u * 40, v * 40, graine + 13, 2);

      const valeur = 0.82 + rides * 0.14 + (dunes - 0.5) * 0.16 + (grain - 0.5) * 0.06;
      for (let c = 0; c < 3; c++) {
        couleur[i * 3 + c] = Math.max(0, Math.min(255, teinte[c] * valeur));
      }

      // Le sable ne renvoie rien : rugosité haute et presque constante.
      const octet = Math.max(0, Math.min(255, (0.93 + grain * 0.06) * 255));
      rugosite[i * 3] = octet; rugosite[i * 3 + 1] = octet; rugosite[i * 3 + 2] = octet;

      hauteur[i] = rides * 0.35 + (grain - 0.5) * 0.15;
    }
  }
  return { couleur, rugosite, normale: versNormales(hauteur, taille, 1.4), taille };
}

/**
 * Convertit un champ de hauteur en carte de normales tangentes.
 *
 * Par différences centrées, en bouclant sur les bords : une carte qui ne boucle
 * pas laisse une couture visible à chaque répétition, et une texture de mur se
 * répète des dizaines de fois.
 */
export function versNormales(hauteur, taille, force = 2.2) {
  const normale = new Uint8Array(taille * taille * 3);
  const lire = (x, y) => hauteur[((y + taille) % taille) * taille + ((x + taille) % taille)];

  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      const dx = (lire(x - 1, y) - lire(x + 1, y)) * force;
      const dy = (lire(x, y - 1) - lire(x, y + 1)) * force;
      const longueur = Math.hypot(dx, dy, 1);
      const i = (y * taille + x) * 3;
      normale[i] = ((dx / longueur) * 0.5 + 0.5) * 255;
      normale[i + 1] = ((dy / longueur) * 0.5 + 0.5) * 255;
      normale[i + 2] = ((1 / longueur) * 0.5 + 0.5) * 255;
    }
  }
  return normale;
}

/**
 * Emballe un tableau d'octets en texture répétable.
 *
 * Conversion RGB → RGBA au passage : `THREE.RGBFormat` a été retiré de three à
 * la révision 137, et WebGL 2 n'accepte plus de téléverser trois octets par
 * pixel. On génère donc en trois canaux — c'est plus lisible à écrire et à
 * tester — et l'on ajoute l'alpha ici, à la frontière.
 */
function enTexture(octets, taille, espace) {
  const rgba = new Uint8Array(taille * taille * 4);
  for (let i = 0; i < taille * taille; i++) {
    rgba[i * 4] = octets[i * 3];
    rgba[i * 4 + 1] = octets[i * 3 + 1];
    rgba[i * 4 + 2] = octets[i * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(rgba, taille, taille, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = espace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Trois cartes prêtes à poser sur un matériau.
 *
 * La carte de couleur est en sRGB, les deux autres NON : une carte de rugosité
 * interprétée comme une couleur serait corrigée en gamma, et la surface
 * paraîtrait uniformément trop brillante. C'est l'erreur la plus courante avec
 * les cartes de données, et elle ne se voit pas — elle rend juste tout faux.
 */
export function cartesDe(motif, repetition = 1) {
  const cartes = {
    map: enTexture(motif.couleur, motif.taille, THREE.SRGBColorSpace),
    roughnessMap: enTexture(motif.rugosite, motif.taille, THREE.NoColorSpace),
    normalMap: enTexture(motif.normale, motif.taille, THREE.NoColorSpace),
  };
  for (const carte of Object.values(cartes)) carte.repeat.set(repetition, repetition);
  return cartes;
}
