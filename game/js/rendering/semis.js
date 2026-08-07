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
  { espece: 'herbe_courte', poids: 10, etats: ['envahi'], hauteurVisee: 0.35, empriseVisee: 0.35 },
  { espece: 'herbe_haute', poids: 8, etats: ['envahi'], hauteurVisee: 0.75, empriseVisee: 0.45 },
  { espece: 'herbe_fine_courte', poids: 8, etats: ['envahi', 'soigne'], hauteurVisee: 0.32, empriseVisee: 0.4 },
  { espece: 'herbe_fine_haute', poids: 6, etats: ['envahi'], hauteurVisee: 0.65, empriseVisee: 0.5 },
  { espece: 'trefle_1', poids: 7, etats: ['envahi', 'soigne'], hauteurVisee: 0.22, empriseVisee: 0.3 },
  { espece: 'trefle_2', poids: 7, etats: ['envahi', 'soigne'], hauteurVisee: 0.22, empriseVisee: 0.3 },
  { espece: 'fougere', poids: 6, etats: ['envahi'], hauteurVisee: 0.95, empriseVisee: 1.1 },
  { espece: 'plante_1', poids: 5, etats: ['envahi', 'soigne'], hauteurVisee: 0.6, empriseVisee: 0.6 },
  { espece: 'plante_1_grande', poids: 3, etats: ['envahi'], hauteurVisee: 1.4, empriseVisee: 1.0 },
  { espece: 'plante_7', poids: 5, etats: ['envahi', 'soigne'], hauteurVisee: 0.55, empriseVisee: 0.5 },
  { espece: 'plante_7_grande', poids: 3, etats: ['envahi'], hauteurVisee: 1.1, empriseVisee: 0.8 },
  { espece: 'buisson', poids: 3, etats: ['envahi'], hauteurVisee: 1.0, empriseVisee: 1.0 },
  { espece: 'buisson_fleuri', poids: 2, etats: ['envahi', 'soigne'], hauteurVisee: 1.05, empriseVisee: 1.0 },
  { espece: 'champignon', poids: 4, etats: ['envahi'], hauteurVisee: 0.2, empriseVisee: 0.25 },
  { espece: 'fleurs_3', poids: 4, etats: ['soigne', 'envahi'], hauteurVisee: 0.5, empriseVisee: 0.5 },
  { espece: 'fleurs_4', poids: 4, etats: ['soigne', 'envahi'], hauteurVisee: 0.5, empriseVisee: 0.5 },
  { espece: 'caillou_1', poids: 3, etats: ['envahi'], hauteurVisee: 0.16, empriseVisee: 0.35 },
  { espece: 'caillou_2', poids: 3, etats: ['envahi'], hauteurVisee: 0.16, empriseVisee: 0.35 },
  { espece: 'rocher', poids: 1, etats: ['envahi'], hauteurVisee: 0.75, empriseVisee: 0.9 },
]);

/** Distance à garder autour d'un mécanisme, en mètres. */
const DEGAGEMENT_MECANISME = 0.9;

/** Distance à garder autour du départ du joueur. */
const DEGAGEMENT_DEPART = 1.4;

/** Marge intérieure le long des murs : une plante ne pousse pas dans la cloison. */
const MARGE_MUR = 0.35;

/**
 * Variation de taille d'une plante à l'autre. Exportée pour que les tests
 * bornent la taille RÉELLEMENT produite, et non la formule qu'ils recalculent.
 */
export const VARIATION = Object.freeze({ min: 0.8, max: 1.25 });

/** Densité par défaut : plantes tentées par mètre carré de sol. */
export const DENSITE = Object.freeze({ soigne: 2, envahi: 10 });

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
  const tentatives = Math.round(surface * (densite ?? DENSITE[etat] ?? 0.3));

  const suivant = hasard(graine);
  const places = [];

  for (let i = 0; i < tentatives; i++) {
    // Tirage pondéré : l'herbe est commune, le rocher rare. Un tirage uniforme
    // donnerait autant de rochers que de brins d'herbe, ce qui ne ressemble à
    // aucun lieu réel.
    let reste = suivant() * poidsTotal;
    const choisi = catalogue.find((e) => (reste -= e.poids) <= 0) ?? catalogue[0];

    const x = (suivant() * 2 - 1) * demiX;
    const z = (suivant() * 2 - 1) * demiZ;
    const forme = gabarit(choisi);
    if (!forme) continue;   // espèce sans modèle mesuré : on ne devine pas
    const variation = VARIATION.min + suivant() * (VARIATION.max - VARIATION.min);
    const echelle = forme.facteur * variation;
    const rayon = forme.rayon * variation;

    // 1. Du sol sous TOUTE l'emprise. C'est la règle qui manquait.
    if (!solPorte(chambre, x, z, rayon)) continue;
    // 2. Dans la pièce, en gardant le dégagement des cloisons.
    if (Math.abs(x) + rayon > demiX) continue;
    if (Math.abs(z) + rayon > demiZ) continue;
    // 3. Loin de ce qui se joue.
    if (zones.some((zone) => empiete(zone, x, z, rayon))) continue;
    // 4. Sans traverser une plante déjà semée.
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
