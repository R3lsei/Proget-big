// plan.js — La géométrie d'une chambre, et rien d'autre.
//
// Extrait de `batisseur.js` parce que DEUX programmes en ont besoin : celui qui
// bâtit la pièce, et celui qui y sème la végétation. Les laisser chacun
// recalculer où est le sol garantissait qu'ils finiraient par ne plus être
// d'accord — et c'est arrivé : de l'herbe poussait au-dessus du gouffre, dans
// le vide, parce que le semis ignorait que le sol y était découpé.
//
// Ce module ne connaît pas three.js. Il ne produit aucune forme, seulement des
// nombres : des dalles, un seuil, un point de départ. C'est ce qui le rend
// testable sans WebGL, et ce qui interdit qu'une convention y soit dupliquée.

/** Pas de la grille, en mètres. Repris de kit.js, qui fait autorité. */
import { MODULE, enMetres } from './kit.js';

/**
 * Points cardinaux : rotation du mur, et normale pointant vers l'EXTÉRIEUR.
 *
 * Une seule table pour poser les murs, la porte, le seuil de sortie et le
 * départ du joueur. Le projet en a déjà eu deux qui se contredisaient, et le
 * joueur démarrait nez à la porte au lieu de lui faire face.
 */
export const ORIENTATIONS = Object.freeze({
  nord: { rotation: 0, normale: [0, -1] },
  est: { rotation: -Math.PI / 2, normale: [1, 0] },
  sud: { rotation: Math.PI, normale: [0, 1] },
  ouest: { rotation: Math.PI / 2, normale: [-1, 0] },
});

/** Marge latérale du seuil de sortie, en mètres : le rayon du joueur. */
const MARGE_SEUIL = 0.35;

/**
 * Flèche de la verrière courbe : de combien elle bombe vers le DEHORS.
 *
 * Vers le dehors, et c'est ce qui compte. Vue de l'intérieur, la paroi
 * enveloppe alors le joueur — c'est cette concavité qui donne la sensation de
 * baie vitrée des références. Bombée vers l'intérieur elle aurait été plus
 * simple (le plancher existant l'aurait couverte) mais elle se serait lue comme
 * une bosse au milieu de la pièce, exactement l'inverse.
 *
 * Le plancher doit donc s'étendre sous la baie. C'est fait ICI, dans les dalles,
 * et pas seulement dans le bâtisseur : le semis lit les mêmes dalles, et il
 * pourra donc faire pousser de l'herbe le long de la vitre — ce que montrent les
 * références — sans qu'on ait à l'y autoriser à part.
 */
export const FLECHE_VERRIERE = 1.2;

/**
 * Découpe le sol en dalles autour du gouffre.
 *
 * Le gouffre n'est pas un décor : c'est l'absence de plancher qui rend la
 * séparation des zones RÉELLE. Sans découpe, le vérificateur jurait que la
 * plate-forme exigeait le pont, et le joueur y marchait sur un sol plein.
 *
 * Coordonnées de sortie : `x` et `z` en MÈTRES, `largeur` et `profondeur` en
 * MODULES. C'est ce que consomme le bâtisseur ; `dalleContient` fait la
 * conversion pour qui raisonne en mètres.
 */
export function dallesDe(chambre) {
  const { largeur, profondeur } = chambre.taille;
  const gouffre = chambre.gouffre;
  if (!gouffre) {
    const dalles = [{ x: 0, z: 0, largeur, profondeur }];
    ajouterBaie(chambre, dalles);
    return dalles;
  }

  const dalles = [];
  const avant = gouffre.zMin + profondeur / 2;
  const arriere = profondeur / 2 - gouffre.zMax;
  if (avant > 0) {
    dalles.push({
      x: 0, z: enMetres((gouffre.zMin + -profondeur / 2) / 2),
      largeur, profondeur: avant,
    });
  }
  if (arriere > 0) {
    dalles.push({
      x: 0, z: enMetres((gouffre.zMax + profondeur / 2) / 2),
      largeur, profondeur: arriere,
    });
  }
  decoupeGouffre(chambre, dalles);
  ajouterBaie(chambre, dalles);
  return dalles;
}

/** Tablier de plancher sous la baie vitrée, s'il y en a une. */
function ajouterBaie(chambre, dalles) {
  if (!chambre.verriere) return;
  const { largeur, profondeur } = chambre.taille;
  const [nx, nz] = ORIENTATIONS[chambre.verriere].normale;
  const murEnX = nx === 0;   // mur nord ou sud : il court le long de X
  const recul = (murEnX ? enMetres(profondeur) : enMetres(largeur)) / 2;
  dalles.push({
    x: nx * (recul + FLECHE_VERRIERE / 2),
    z: nz * (recul + FLECHE_VERRIERE / 2),
    largeur: murEnX ? largeur : FLECHE_VERRIERE / MODULE,
    profondeur: murEnX ? FLECHE_VERRIERE / MODULE : profondeur,
  });
}

/**
 * Dalles latérales : le gouffre ne barre pas toujours toute la largeur.
 *
 * Extraite lors de l'ajout de la baie vitrée, et l'extraction a bien failli
 * coûter cher — la fonction s'est retrouvée orpheline, jamais appelée. Les deux
 * chambres actuelles ont un gouffre qui traverse toute la pièce, donc rien ne
 * se voyait ; c'est le test au gouffre déplacé qui l'aurait attrapé.
 */
function decoupeGouffre(chambre, dalles) {
  const { largeur, profondeur } = chambre.taille;
  const gouffre = chambre.gouffre;
  const gauche = gouffre.xMin + largeur / 2;
  const droite = largeur / 2 - gouffre.xMax;
  const profondeurGouffre = gouffre.zMax - gouffre.zMin;
  if (gauche > 0) {
    dalles.push({
      x: enMetres((gouffre.xMin + -largeur / 2) / 2),
      z: enMetres((gouffre.zMin + gouffre.zMax) / 2),
      largeur: gauche, profondeur: profondeurGouffre,
    });
  }
  if (droite > 0) {
    dalles.push({
      x: enMetres((gouffre.xMax + largeur / 2) / 2),
      z: enMetres((gouffre.zMin + gouffre.zMax) / 2),
      largeur: droite, profondeur: profondeurGouffre,
    });
  }
}

/** Le point (mètres) tombe-t-il sur cette dalle ? */
function dalleContient(dalle, x, z) {
  const demiLargeur = enMetres(dalle.largeur) / 2;
  const demiProfondeur = enMetres(dalle.profondeur) / 2;
  return Math.abs(x - dalle.x) <= demiLargeur
    && Math.abs(z - dalle.z) <= demiProfondeur;
}

/**
 * Y a-t-il du sol sous ce point ? Coordonnées en mètres.
 *
 * Dérivé des dalles RÉELLEMENT posées, jamais d'un calcul parallèle sur le
 * gouffre. Deux formules pour la même question finissent toujours par diverger,
 * et la divergence ne se voit qu'à l'écran.
 */
export function solPresent(chambre, x, z) {
  return dallesDe(chambre).some((dalle) => dalleContient(dalle, x, z));
}

/**
 * Le sol porte-t-il un objet de ce rayon, entièrement ?
 *
 * On teste les quatre coins de l'emprise et son centre. Tester le seul centre
 * laisserait une touffe déborder à moitié dans le vide — ce qui se voit
 * exactement autant qu'une touffe entièrement dans le vide.
 */
export function solPorte(chambre, x, z, rayon) {
  const points = [
    [x, z],
    [x - rayon, z - rayon], [x + rayon, z - rayon],
    [x - rayon, z + rayon], [x + rayon, z + rayon],
  ];
  return points.every(([px, pz]) => solPresent(chambre, px, pz));
}

/** Le seuil de sortie : plan du mur percé, et direction pour le franchir. */
export function seuilDe(chambre) {
  const murDeSortie = chambre.porte?.mur ?? 'nord';
  const [nx, nz] = ORIENTATIONS[murDeSortie].normale;
  const { largeur, profondeur } = chambre.taille;
  const distance = ((murDeSortie === 'nord' || murDeSortie === 'sud')
    ? enMetres(profondeur) : enMetres(largeur)) / 2;
  return { nx, nz, distance, ouverture: enMetres(chambre.porte?.ouverture ?? 2) };
}

/**
 * Le joueur a-t-il franchi la porte ?
 *
 * On teste le plan du mur, pas une zone posée au-delà : il n'y a PAS de sol
 * derrière la porte, et le joueur commence à tomber dès le pas suivant. Le
 * franchissement doit donc être constaté au moment même où il passe.
 */
export function aFranchi(position, chambre) {
  const { nx, nz, distance, ouverture } = seuilDe(chambre);
  const avance = position.x * nx + position.z * nz;
  if (avance < distance) return false;
  // Et par l'ouverture, pas à travers le mur : le long du mur, l'écart au centre
  // doit tenir dans la largeur de la porte. La marge couvre le rayon du joueur,
  // dont le centre reste en deçà du chambranle quand son corps le frôle.
  const lateral = Math.abs(position.x * -nz + position.z * nx);
  return lateral <= ouverture / 2 + MARGE_SEUIL;
}

/**
 * Position de départ du joueur : au centre, dos au mur de sortie.
 *
 * Calculée plutôt que déclarée. Une position écrite à la main dans chaque
 * chambre finit tôt ou tard à l'intérieur d'un mur après un redimensionnement —
 * c'est exactement le bogue B-001 qui a éjecté le joueur hors du décor.
 */
export function departDe(chambre) {
  const murDeSortie = chambre.porte?.mur ?? 'nord';
  const [nx, nz] = ORIENTATIONS[murDeSortie].normale;
  const { largeur, profondeur } = chambre.taille;
  const recul = ((murDeSortie === 'nord' || murDeSortie === 'sud')
    ? enMetres(profondeur) : enMetres(largeur)) / 2 - MODULE;

  // Le joueur démarre au mur OPPOSÉ à la sortie et la regarde. Démarrer collé à
  // la porte priverait la chambre de sa lecture : on doit voir où l'on va avant
  // de chercher comment y aller.
  return {
    x: -nx * recul,
    y: 0,
    z: -nz * recul,
    // La direction du regard vaut (-sin, -cos) chez le joueur ; on veut qu'elle
    // égale la normale du mur de sortie.
    yaw: Math.atan2(-nx, -nz),
  };
}
