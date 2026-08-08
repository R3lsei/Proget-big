// semis.js — Où pousse chaque plante, et surtout où elle ne pousse PAS.
//
// Le joueur a signalé « de l'herbe dans le vide ». Le lierre de la serre était
// déclaré sur toute la profondeur de la pièce, et la pièce a un GOUFFRE en son
// milieu : des touffes poussaient au-dessus de trois mètres de rien. Ce n'était
// pas une coordonnée mal tapée mais un défaut de conception — le décor était
// posé sans qu'on lui demande jamais s'il y avait du sol dessous.
//
// Ce module ne place donc pas la végétation : il la SÈME sous contrainte. Le
// résultat est une liste de positions, pas des maillages, et c'est délibéré —
// une fonction pure se teste, et c'est ici que la classe de bogue se ferme.
//
// ─── Ce qu'un semis ne fera jamais ───────────────────────────────────────────
//   · pousser là où il n'y a pas de sol            (le défaut signalé)
//   · pousser dans un mur ou hors de la chambre
//   · recouvrir un mécanisme, un objet ou la porte  (une énigme cachée par un
//     buisson est une énigme injouable, et le joueur accuse le jeu, pas le
//     buisson)
//   · pousser au point de départ du joueur          (on ne se réveille pas dans
//     un massif)
//   · varier d'une partie à l'autre                 (une graine, un résultat)

import { MODULE } from './kit.js';
import { solPorte } from './plan.js';
import { ESPECES } from './vegetation.js';

/**
 * Facteur d'échelle d'une espèce, et l'emprise au sol qui en résulte.
 *
 * Contraint par les DEUX dimensions, et c'est tout l'enjeu. Mettre à l'échelle
 * par la seule hauteur explose la largeur des modèles plats : `plante_7_grande`
 * mesure 0,30 m de haut pour 1,36 m de large, si bien que la ramener à 1,10 m
 * de haut la gonflait 3,7 fois — d'où les fleurs géantes qui écrasaient la
 * salle de réveil. On retient donc le plus petit des deux facteurs : le modèle
 * tient sous la hauteur voulue ET dans l'emprise voulue.
 *
 * Le rayon est DÉRIVÉ de cette mesure, jamais déclaré à la main. Les rayons
 * écrits à l'estime étaient tous faux, et rien ne pouvait le dire : ils
 * servaient à espacer des plantes dont ils ne décrivaient pas la taille.
 */
function gabarit(semable) {
  const modele = ESPECES[semable.espece];
  if (!modele?.hauteur || !modele?.emprise) return null;
  const facteur = Math.min(
    semable.hauteurVisee / modele.hauteur,
    semable.empriseVisee / modele.emprise);
  return { facteur, rayon: (modele.emprise / 2) * facteur };
}

/**
 * Espèces semables et leur emprise réelle au sol, en mètres.
 *
 * `hauteurVisee` est la taille voulue DANS LE JEU, en mètres. Les modèles sont
 * modelés à l'échelle du plein air — l'« herbe courte » mesure 1,33 m et la
 * grande plante 3,76 m, pour une salle de 3,6 m sous plafond. Posés tels quels
 * ils transformaient la serre en jungle à hauteur d'homme. On ne retouche pas
 * les fichiers pour autant : la hauteur réelle du modèle est un fait, la taille
 * voulue est une décision, et `planterSemis` fait le rapport des deux.
 *
 * Le rayon vient des dimensions mesurées sur les modèles, pas d'une estimation :
 * c'est lui qui décide si une plante tient sur une dalle et si deux plantes se
 * traversent. Une valeur trop basse et les buissons s'interpénètrent ; trop
 * haute et la salle reste vide.
 */
export const SEMABLES = Object.freeze([
  // Couvre-sol : ce qui s'installe le premier dans les joints et les angles.
  { espece: 'mousse', poids: 16, etats: ['envahi', 'soigne'], hauteurVisee: 0.04, empriseVisee: 0.9 },
  { espece: 'herbe_courte', poids: 12, etats: ['envahi', 'soigne'], hauteurVisee: 0.30, empriseVisee: 0.30 },
  { espece: 'herbe_fine_courte', poids: 10, etats: ['envahi', 'soigne'], hauteurVisee: 0.28, empriseVisee: 0.32 },
  { espece: 'trefle_1', poids: 7, etats: ['envahi', 'soigne'], hauteurVisee: 0.18, empriseVisee: 0.26 },
  { espece: 'trefle_2', poids: 7, etats: ['envahi', 'soigne'], hauteurVisee: 0.18, empriseVisee: 0.26 },

  // Ce qui vient ensuite, quand plus personne n'entretient.
  { espece: 'herbe_haute', poids: 6, etats: ['envahi'], hauteurVisee: 0.55, empriseVisee: 0.40 },
  { espece: 'herbe_fine_haute', poids: 5, etats: ['envahi'], hauteurVisee: 0.50, empriseVisee: 0.42 },
  { espece: 'fougere', poids: 4, etats: ['envahi'], hauteurVisee: 0.70, empriseVisee: 0.85 },
  { espece: 'plante_1', poids: 3, etats: ['envahi'], hauteurVisee: 0.50, empriseVisee: 0.50 },
  { espece: 'plante_7', poids: 3, etats: ['envahi'], hauteurVisee: 0.40, empriseVisee: 0.45 },
  { espece: 'buisson', poids: 2, etats: ['envahi'], hauteurVisee: 0.80, empriseVisee: 0.85 },
  { espece: 'champignon', poids: 3, etats: ['envahi'], hauteurVisee: 0.16, empriseVisee: 0.20 },

  // PAS de cailloux ni de rochers. Ils avaient l'air d'avoir été semés à la
  // main sur un sol propre, et c'est exactement ce qu'ils étaient. Un sol de
  // laboratoire ne se couvre pas de galets : il se salit, et de la mousse s'y
  // installe. La mousse et l'herbe des joints racontent l'abandon ; un caillou
  // au milieu d'un carrelage ne raconte qu'un objet posé là.
]);

/** Distance à garder autour d'un mécanisme, en mètres. */
const DEGAGEMENT_MECANISME = 0.9;

/** Distance à garder autour du départ du joueur. */
const DEGAGEMENT_DEPART = 1.4;

/** Marge intérieure le long des murs : une plante ne pousse pas dans la cloison. */
const MARGE_MUR = 0.35;

/**
 * Portée de la colonisation, en mètres.
 *
 * Rien ne s'installe au MILIEU d'une pièce. La poussière s'accumule dans les
 * angles, l'eau s'infiltre par les joints du pourtour, les graines arrivent par
 * les fissures des bords : une friche pousse depuis les limites vers le centre,
 * jamais l'inverse. Semer uniformément donnait un parterre de jardin
 * d'agrément au milieu d'un laboratoire — chaque plante était correcte, et
 * l'ensemble ne racontait rien.
 *
 * La probabilité décroît exponentiellement avec la distance au bord le plus
 * proche : quasi certaine contre une paroi, un tiers à un mètre, un vingtième à
 * trois. Le centre reste dégagé — ce qui sert aussi le jeu, puisque c'est là
 * que se joue l'énigme.
 */
const PORTEE_COLONISATION = 1.6;

/**
 * Pas du carrelage, en mètres. Deux carreaux par module, comme `sol()`.
 *
 * Les références montrent l'herbe poussant DANS LES JOINTS, en lignes fines qui
 * suivent la grille sur toute la surface. C'est plus juste qu'un semis libre :
 * un carrelage n'a pas d'autre faiblesse que ses joints, et c'est par là que
 * l'eau passe et que les graines s'installent. C'est aussi ce qui se lit
 * instantanément — une trame régulière dit « sol carrelé abandonné » là où des
 * touffes dispersées ne disent rien.
 */
const PAS_CARREAU = MODULE / 2;

/**
 * Ramène un point sur le joint le plus proche.
 *
 * Sur UN seul axe, celui dont on est le plus près : la pousse s'aligne alors le
 * long d'une ligne de joint et garde sa liberté dans l'autre sens. Aligner les
 * deux axes la clouerait aux intersections, et l'on obtiendrait une grille de
 * points régulière — un damier, pas une friche.
 */
function surJoint(x, z) {
  const jointX = Math.round(x / PAS_CARREAU) * PAS_CARREAU;
  const jointZ = Math.round(z / PAS_CARREAU) * PAS_CARREAU;
  return Math.abs(x - jointX) <= Math.abs(z - jointZ)
    ? { x: jointX, z }
    : { x, z: jointZ };
}

/**
 * Variation de taille d'une plante à l'autre. Exportée pour que les tests
 * bornent la taille RÉELLEMENT produite, et non la formule qu'ils recalculent.
 */
export const VARIATION = Object.freeze({ min: 0.8, max: 1.25 });

/** Densité par défaut : plantes tentées par mètre carré de sol. */
export const DENSITE = Object.freeze({ soigne: 3, envahi: 9 });

/**
 * Générateur déterministe. Même graine, même jardin.
 *
 * Un décor qui change à chaque chargement rend tout défaut visuel
 * irreproductible : on ne peut ni le montrer, ni vérifier qu'il est corrigé.
 */
function hasard(graine) {
  let etat = (graine * 2654435761) >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

/**
 * Rectangles interdits, déduits de la déclaration de chambre.
 *
 * Déduits, jamais déclarés à part : une liste tenue à la main oublierait le
 * mécanisme ajouté la semaine suivante, et la plante pousserait dessus sans que
 * rien ne le signale.
 */
export function interdits(chambre, depart) {
  const zones = [];
  /** Zone ronde : un mécanisme, un objet, un point. */
  const rond = (x, z, rayon) => zones.push({ x, z, demiX: 0, demiZ: 0, rotation: 0, rayon });
  /**
   * Zone rectangulaire orientée : un décor plaqué le long d'un mur.
   *
   * Indispensable, et pas un raffinement : traiter le lierre comme un disque de
   * son envergure donnait un cercle de six mètres de rayon au milieu de la
   * serre. Il interdisait la pièce entière, et le semis n'y posait plus qu'une
   * seule plante. Une bande plaquée au mur est large et MINCE ; la décrire
   * autrement stérilise la salle.
   */
  const rect = (x, z, demiX, demiZ, rotation) =>
    zones.push({ x, z, demiX, demiZ, rotation, rayon: 0 });

  for (const decl of Object.values(chambre.receptacles ?? {})) {
    rond(decl.x * MODULE, decl.z * MODULE, DEGAGEMENT_MECANISME);
  }
  for (const decl of Object.values(chambre.terminaux ?? {})) {
    rond(decl.x * MODULE, decl.z * MODULE, DEGAGEMENT_MECANISME);
  }
  for (const decl of chambre.passerelles ?? []) {
    // Une passerelle sort et rentre : de la végétation posée dessus flotterait
    // une fois le pont rétracté — le même défaut que l'herbe dans le vide.
    const demi = Math.max(decl.largeur ?? 2, decl.longueur ?? 3) * MODULE / 2;
    rond(decl.x * MODULE, decl.z * MODULE, demi + 0.5);
  }
  for (const pose of Object.values(chambre.poses ?? {})) {
    rond(pose.x * MODULE, pose.z * MODULE, 0.7);
  }
  for (const decor of chambre.decor ?? []) {
    // Le lierre couvre la paroi : large, et presque sans épaisseur. La
    // jardinière est un meuble : un module de profondeur.
    const demiZ = decor.type === 'lierre' ? 0.45 : MODULE / 2;
    rect(decor.x * MODULE, decor.z * MODULE,
      (decor.largeur ?? 2) * MODULE / 2, demiZ, decor.rotation ?? 0);
  }
  if (depart) rond(depart.x, depart.z, DEGAGEMENT_DEPART);

  // Le passage vers la porte doit rester lisible : c'est là que va le joueur.
  const murDeSortie = chambre.porte?.mur ?? 'nord';
  const { largeur, profondeur } = chambre.taille;
  const surZ = murDeSortie === 'nord' || murDeSortie === 'sud';
  const signe = (murDeSortie === 'nord' || murDeSortie === 'ouest') ? -1 : 1;
  const bord = (surZ ? profondeur : largeur) * MODULE / 2;
  const couloir = (chambre.porte?.ouverture ?? 2) * MODULE / 2 + 0.4;
  for (let d = 0; d < 2.4; d += 0.6) {
    const avance = signe * (bord - 0.4 - d);
    rond(surZ ? 0 : avance, surZ ? avance : 0, couloir);
  }
  return zones;
}

/**
 * Distance au bord le plus proche : cloisons de la pièce, et lèvres du gouffre.
 *
 * Le gouffre compte comme un bord, et pas seulement comme un trou : ses lèvres
 * sont exposées, humides et jamais balayées. C'est exactement là qu'une friche
 * s'installe en premier, et cela dessine la faille au sol sans qu'on ait à la
 * souligner autrement.
 */
export function distanceAuBord(chambre, x, z) {
  const { largeur, profondeur } = chambre.taille;
  const distances = [
    (largeur * MODULE) / 2 - Math.abs(x),
    (profondeur * MODULE) / 2 - Math.abs(z),
  ];
  const gouffre = chambre.gouffre;
  if (gouffre) {
    // Distance au rectangle du gouffre, vue de l'extérieur : nulle sur sa lèvre.
    const dx = Math.max(gouffre.xMin * MODULE - x, 0, x - gouffre.xMax * MODULE);
    const dz = Math.max(gouffre.zMin * MODULE - z, 0, z - gouffre.zMax * MODULE);
    distances.push(Math.hypot(dx, dz));
  }
  return Math.max(0, Math.min(...distances));
}

/**
 * Un disque de rayon `rayon` centré en (x,z) touche-t-il la zone ?
 *
 * Le point est ramené dans le repère de la zone, ce qui traite une zone tournée
 * comme une zone droite. Une zone ronde n'est qu'un rectangle de demi-côtés
 * nuls : une seule formule pour les deux, donc une seule à vérifier.
 */
function empiete(zone, x, z, rayon) {
  const dx = x - zone.x;
  const dz = z - zone.z;
  const cos = Math.cos(-zone.rotation);
  const sin = Math.sin(-zone.rotation);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  const ecartX = Math.max(0, Math.abs(localX) - zone.demiX);
  const ecartZ = Math.max(0, Math.abs(localZ) - zone.demiZ);
  return Math.hypot(ecartX, ecartZ) < zone.rayon + rayon;
}

/**
 * Sème la végétation d'une chambre.
 *
 * @param {object} chambre       déclaration, voir gameplay/chambres.js
 * @param {object} options
 * @param {{x:number,z:number}} options.depart  position de départ du joueur
 * @param {number} [options.graine]
 * @param {number} [options.densite]  plantes tentées par m² ; défaut selon l'état
 * @returns {{espece:string,x:number,z:number,rotation:number,echelle:number}[]}
 */
/**
 * Nombre maximal de pousses semées dans une salle, quelle que soit sa surface.
 *
 * Cent cinquante. C'est le compte de la serre, qui est la salle la plus dense
 * du jeu et que personne n'a trouvée vide.
 */
export const PLAFOND_SEMIS = 150;

export function semer(chambre, { depart, graine = 7, densite } = {}) {
  const etat = chambre.etat ?? 'soigne';
  const { largeur, profondeur } = chambre.taille;
  // Demi-dimensions utiles : le mur, moins le dégagement qu'on lui laisse. Une
  // plante collée à la cloison entre dans les joints creux des panneaux, et le
  // feuillage traverse le mur par la tranche.
  const demiX = (largeur * MODULE) / 2 - MARGE_MUR;
  const demiZ = (profondeur * MODULE) / 2 - MARGE_MUR;

  const catalogue = SEMABLES.filter((s) => s.etats.includes(etat));
  const poidsTotal = catalogue.reduce((s, e) => s + e.poids, 0);
  const zones = interdits(chambre, depart);

  const surface = largeur * profondeur * MODULE * MODULE;
  // ─── Un budget PAR SALLE, jamais par mètre carré ──────────────────────────
  //
  // La densité seule est une règle qui se retourne contre soi dès qu'une salle
  // grandit : la halle de maintenance fait 242 m², soit deux fois et demie la
  // salle de réveil, et le semis y produisait 444 pousses pour 74 — près de
  // 480 000 triangles dans une seule chambre, quatre fois le reste du jeu.
  //
  // Or une salle deux fois plus grande n'a pas besoin de deux fois plus de
  // verdure : le joueur n'en voit jamais qu'une portion à la fois, et au-delà
  // d'un certain seuil chaque touffe supplémentaire ne fait qu'ajouter du coût.
  // Le plafond est donc une décision de direction artistique autant que de
  // performance — et une grande salle un peu plus dépouillée sert d'ailleurs la
  // lecture de son volume.
  const tentatives = Math.round(surface * (densite ?? DENSITE[etat] ?? 0.3));

  const suivant = hasard(graine);
  const places = [];

  for (let i = 0; i < tentatives; i++) {
    // Le plafond porte sur les pousses RETENUES, pas sur les tirages. Une
    // première version bornait les tentatives, ce qui n'est pas la même chose
    // du tout : la serre, très dense, en refuse neuf sur dix pour cause de
    // chevauchement, et plafonner ses tirages lui a fait perdre les trois
    // quarts de sa verdure d'un coup. Le taux de refus n'est pas une constante,
    // il dépend de la salle — donc on compte ce qu'on garde.
    if (places.length >= PLAFOND_SEMIS) break;
    // Tirage pondéré : l'herbe est commune, le rocher rare. Un tirage uniforme
    // donnerait autant de rochers que de brins d'herbe, ce qui ne ressemble à
    // aucun lieu réel.
    let reste = suivant() * poidsTotal;
    const choisi = catalogue.find((e) => (reste -= e.poids) <= 0) ?? catalogue[0];

    const tire = surJoint((suivant() * 2 - 1) * demiX, (suivant() * 2 - 1) * demiZ);
    const x = tire.x;
    const z = tire.z;
    const forme = gabarit(choisi);
    if (!forme) continue;   // espèce sans modèle mesuré : on ne devine pas
    const variation = VARIATION.min + suivant() * (VARIATION.max - VARIATION.min);
    const echelle = forme.facteur * variation;
    const rayon = forme.rayon * variation;

    // 1. La colonisation part des bords. Un tirage au sort pondéré par la
    //    distance à la paroi la plus proche : contre un mur, presque toujours ;
    //    au centre de la pièce, presque jamais.
    // La friche part des bords, mais ne s'y limite plus : les joints portent
    // partout, simplement moins densément loin des parois. Une décroissance
    // pure laissait le centre entièrement nu, ce que les références démentent —
    // on y voit de l'herbe jusqu'au milieu de la salle, dans les joints.
    const proche = Math.exp(-distanceAuBord(chambre, x, z) / PORTEE_COLONISATION);
    if (suivant() > 0.35 + 0.65 * proche) continue;
    // 2. Du sol sous TOUTE l'emprise. C'est la règle qui manquait.
    if (!solPorte(chambre, x, z, rayon)) continue;
    // 3. Dans la pièce, en gardant le dégagement des cloisons.
    if (Math.abs(x) + rayon > demiX) continue;
    if (Math.abs(z) + rayon > demiZ) continue;
    // 4. Loin de ce qui se joue.
    if (zones.some((zone) => empiete(zone, x, z, rayon))) continue;
    // 5. Sans traverser une plante déjà semée.
    if (places.some((p) => Math.hypot(p.x - x, p.z - z) < p.rayon + rayon)) continue;

    places.push({
      espece: choisi.espece, x, z, rayon,
      rotation: suivant() * Math.PI * 2,
      // `echelle` est le facteur FINAL : la plantation n'a plus rien à calculer.
      // Le rayon qui a servi à placer la plante et l'échelle qui la dessine
      // viennent du même gabarit, donc l'espace réservé est exactement celui
      // qu'elle occupe.
      echelle,
    });
  }
  return places;
}
