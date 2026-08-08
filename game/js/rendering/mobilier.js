// mobilier.js — Ce qui fait qu'une salle a été habitée (T-040).
//
// Le joueur l'a dit sans détour : les salles sont vides. C'était l'écart n°1
// avec ses références, et aucune quantité de texture ne l'aurait comblé — une
// pièce nue reste une pièce nue, quelle que soit la finesse de ses murs. Ce que
// montrent les images, ce n'est pas un décor riche : c'est un lieu où des gens
// ont travaillé, et qui est parti sans être rangé.
//
// ─── Deux règles, et elles gouvernent tout ───────────────────────────────────
//
// 1. Le mobilier va CONTRE LES MURS. Le centre reste libre : c'est là que se
//    joue l'énigme, et un joueur qui contourne une caisse pour atteindre une
//    plaque n'y voit pas du décor mais une gêne.
//
// 2. Rien de ce qui se manipule n'est du mobilier. Les socles et les bornes
//    restent faits main, avec leur liseré lumineux. La règle que le joueur peut
//    apprendre en dix secondes : si ça brille, ça se manipule ; si c'est mat,
//    c'est du décor. Sans elle, il passerait la salle à essayer d'activer un
//    ventilateur.
//
// Ce module ne charge rien et ne dessine rien : il DÉCIDE des emplacements, et
// c'est une fonction pure. Même raison que pour le semis — une décision de
// placement se teste, un maillage non.

import { MODULE } from './kit.js';
import { ORIENTATIONS, solPresent } from './plan.js';
import { interdits } from './semis.js';

/**
 * Meubles disponibles.
 *
 * `hauteurVisee` est la taille voulue en jeu, en mètres ; l'échelle réelle est
 * calculée à la pose, une fois le modèle mesuré. Les fichiers viennent d'un lot
 * modelé pour d'autres pièces que les nôtres, et une taille déclarée à l'avance
 * serait un pari — c'est ce pari qui avait donné des fleurs plus larges qu'une
 * plaque de pression.
 *
 * `pose` dit contre quoi le meuble s'appuie :
 *   sol   posé au pied du mur, tourné vers l'intérieur
 *   mur   accroché à hauteur d'homme ou plus haut
 */
export const MEUBLES = Object.freeze([
  { nom: 'poste_console', fichier: 'models/mobilier/poste-console.glb', pose: 'sol', hauteurVisee: 1.15, largeur: 1.1, poids: 6 },
  { nom: 'etagere', fichier: 'models/mobilier/etagere.glb', pose: 'sol', hauteurVisee: 1.6, largeur: 1.0, poids: 5 },
  { nom: 'coffre', fichier: 'models/mobilier/coffre.glb', pose: 'sol', hauteurVisee: 0.75, largeur: 1.0, poids: 4 },
  { nom: 'caisse_1', fichier: 'models/mobilier/caisse-1.glb', pose: 'sol', hauteurVisee: 0.7, largeur: 0.8, poids: 5 },
  { nom: 'caisse_2', fichier: 'models/mobilier/caisse-2.glb', pose: 'sol', hauteurVisee: 0.6, largeur: 0.8, poids: 5 },
  { nom: 'fut', fichier: 'models/mobilier/fut.glb', pose: 'sol', hauteurVisee: 1.0, largeur: 0.7, poids: 3 },
  { nom: 'colonne_conduits', fichier: 'models/mobilier/colonne-conduits.glb', pose: 'sol', hauteurVisee: 3.4, largeur: 0.9, poids: 2 },
  // Le ventilateur est retiré du sol : c'est une pièce d'extraction, elle se
  // fixe en hauteur, et posée au pied d'un mur elle ne ressemblait à rien.

  { nom: 'boitier_mural', fichier: 'models/mobilier/boitier-mural.glb', pose: 'mur', hauteurVisee: 0.55, hauteurPose: 1.5, largeur: 0.7, poids: 6 },
  { nom: 'bouche_large', fichier: 'models/mobilier/bouche-large.glb', pose: 'mur', hauteurVisee: 0.5, hauteurPose: 2.7, largeur: 1.1, poids: 4 },
  { nom: 'bouche_petite', fichier: 'models/mobilier/bouche-petite.glb', pose: 'mur', hauteurVisee: 0.4, hauteurPose: 2.6, largeur: 0.6, poids: 4 },
  { nom: 'support_conduit', fichier: 'models/mobilier/support-conduit.glb', pose: 'mur', hauteurVisee: 0.6, hauteurPose: 3.0, largeur: 1.0, poids: 4 },
  { nom: 'cable_1', fichier: 'models/mobilier/cable-1.glb', pose: 'mur', hauteurVisee: 1.2, hauteurPose: 2.3, largeur: 0.5, poids: 3 },
  { nom: 'cable_2', fichier: 'models/mobilier/cable-2.glb', pose: 'mur', hauteurVisee: 1.2, hauteurPose: 2.3, largeur: 0.5, poids: 3 },
  { nom: 'applique_large', fichier: 'models/mobilier/applique-large.glb', pose: 'mur', hauteurVisee: 0.3, hauteurPose: 2.5, largeur: 0.8, poids: 3 },

  // Signalétique. Ce sont ces marquages qui donnent au lieu un nom, donc une
  // administration, donc une histoire — pour trois fois rien.
  { debout: true, nom: 'panneau_signaletique', fichier: 'models/mobilier/panneau-signaletique.glb', pose: 'mur', hauteurVisee: 0.45, hauteurPose: 2.2, largeur: 0.9, poids: 5 },
  { debout: true, nom: 'logo_mural', fichier: 'models/mobilier/logo-mural.glb', pose: 'mur', hauteurVisee: 0.6, hauteurPose: 2.4, largeur: 0.8, poids: 3 },
  { debout: true, nom: 'lettre_a', fichier: 'models/mobilier/lettre-a.glb', pose: 'mur', hauteurVisee: 0.5, hauteurPose: 2.4, largeur: 0.5, poids: 2 },
  { debout: true, nom: 'chiffre_7', fichier: 'models/mobilier/chiffre-7.glb', pose: 'mur', hauteurVisee: 0.5, hauteurPose: 2.4, largeur: 0.5, poids: 2 },
]);

/** Recul du mur pour un meuble POSÉ, en mètres : de quoi ne pas s'y encastrer. */
const CONTRE_MUR = 0.42;

/**
 * Recul d'un élément ACCROCHÉ. Bien plus faible : une bouche d'aération à
 * quarante centimètres de sa cloison ne se lit pas comme fixée au mur mais
 * comme flottant devant — ce qu'elle faisait.
 */
const CONTRE_MUR_ACCROCHE = 0.09;

/** Marge d'angle : un panneau à cheval sur deux murs déborde dans le vide. */
const MARGE_ANGLE = 0.9;

/** Dégagement de part et d'autre de la porte, en mètres : le passage reste libre. */
const MARGE_PORTE = 0.5;

/** Largeur de l'ouverture de sortie, en mètres. */
const ouvertureDe = (chambre) => (chambre.porte?.ouverture ?? 2) * MODULE;

/** Nombre de meubles visés par mètre linéaire de mur exploitable. */
export const DENSITE_MOBILIER = 1.6;

function hasard(graine) {
  let etat = (graine * 374761393) >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

/**
 * Répartit le mobilier le long des murs d'une chambre.
 *
 * @param {object} chambre
 * @param {object} options
 * @param {{x:number,z:number}} options.depart  position de départ du joueur
 * @returns {{meuble:string,x:number,z:number,y:number,rotation:number,largeur:number}[]}
 */
export function meubler(chambre, { depart, graine = 11, densite = DENSITE_MOBILIER } = {}) {
  const { largeur, profondeur } = chambre.taille;
  const murDeSortie = chambre.porte?.mur ?? 'nord';
  const murVitre = chambre.verriere ?? null;
  const suivant = hasard(graine);
  const zones = interdits(chambre, depart);
  const poses = [];

  for (const [orientation, { normale }] of Object.entries(ORIENTATIONS)) {
    // Le mur vitré reste nu : c'est la vue, et rien ne se met devant.
    //
    // Le mur de SORTIE, lui, était écarté en entier — et c'était trop. Une
    // porte de 2,4 m dans une cloison de 12 en interdisait douze. Les salles se
    // meublaient donc sur deux murs au lieu de trois, et le joueur l'a dit sans
    // détour : « les salles sont vides ». Ce n'est pas la densité qu'il fallait
    // monter, c'est la surface disponible qu'il fallait cesser de jeter. Seule
    // l'ouverture est protégée, par la zone d'exclusion du seuil.
    if (orientation === murVitre) continue;
    const surLeMurDeSortie = orientation === murDeSortie;

    const [nx, nz] = normale;
    const murEnX = nx === 0;
    const longueur = (murEnX ? largeur : profondeur) * MODULE - MARGE_ANGLE * 2;
    const demiMur = (murEnX ? profondeur : largeur) * MODULE / 2;
    const emplacements = Math.max(1, Math.round(longueur * densite));

    // ─── Deux passes, et c'est ce qui remplit vraiment une salle ─────────────
    //
    // Le sol et le mur tiraient au MÊME loto de places. Une bouche d'aération
    // à 2,70 m interdisait donc la caisse qui serait allée sous elle, alors
    // qu'elles ne se gênent en rien : elles ne sont pas à la même hauteur. La
    // moitié des places partait ainsi à des objets qui n'occupent pas le sol,
    // et la pièce restait nue là où le joueur regarde.
    //
    // Deux passes indépendantes doublent le remplissage sans toucher à la
    // densité, et sans qu'aucune pièce n'en chevauche une autre : le test de
    // recouvrement se fait DANS la famille, jamais entre les deux.
    for (const famille of ['sol', 'mur']) {
    const candidats = MEUBLES.filter((e) => e.pose === famille);
    const total = candidats.reduce((s, e) => s + e.poids, 0);

    for (let i = 0; i < emplacements; i++) {
      // Réparti sur le mur, avec un décalage : un alignement parfait se lit
      // comme une grille, et une pièce rangée au cordeau contredit l'abandon.
      const glissement = (suivant() - 0.5) * (longueur / emplacements) * 0.7;
      const long = ((i + 0.5) / emplacements - 0.5) * longueur + glissement;

      let reste = suivant() * total;
      const choisi = candidats.find((e) => (reste -= e.poids) <= 0) ?? candidats[0];

      const recul = demiMur
        - (choisi.pose === 'mur' ? CONTRE_MUR_ACCROCHE : CONTRE_MUR);
      const x = murEnX ? long : nx * recul;
      const z = murEnX ? nz * recul : long;
      const demi = choisi.largeur / 2;

      // Devant la porte, rien. Ni au sol ni au mur : une bouche d'aération
      // au-dessus d'une porte passe encore, un caisson accroché EN TRAVERS de
      // l'ouverture est un mur qu'on ne comprend pas. La marge vaut le rayon du
      // joueur en plus du demi-passage, pour qu'il n'ait pas à raser le montant.
      if (surLeMurDeSortie
        && Math.abs(long) < ouvertureDe(chambre) / 2 + demi + MARGE_PORTE) continue;

      // Un meuble au sol doit reposer sur du sol. Un meuble mural n'a pas cette
      // contrainte : il est accroché, il peut surplomber un gouffre.
      //
      // ─── Pourquoi ce n'est pas `solPorte` ─────────────────────────────────
      //
      // `solPorte` exige que les QUATRE coins de l'empreinte soient sur une
      // dalle. Or un meuble est plaqué contre un mur, et la dalle s'arrête AU
      // mur : ses deux coins arrière débordent donc toujours — de quelques
      // centimètres, à l'intérieur de la cloison, ce qui ne pose évidemment
      // aucun problème. Le test refusait ainsi presque tout le mobilier posé.
      // Deux salles entières se sont retrouvées avec deux meubles au sol
      // chacune, et le joueur a signalé des « salles vides » qu'on a d'abord
      // prises pour un manque de densité. Ce n'était pas la densité : c'était
      // un garde-fou qui rejetait ce qu'il aurait dû accepter.
      //
      // On échantillonne donc VERS L'INTÉRIEUR et le long du mur, jamais vers
      // le mur. Ce qui compte est qu'aucun meuble ne surplombe le gouffre, et
      // cette vérification-là reste entière.
      if (choisi.pose === 'sol' && !poseSurLeSol(chambre, x, z, demi, nx, nz)) continue;
      if (zones.some((zone) => empiete(zone, x, z, demi))) continue;
      // Recouvrement DANS la famille seulement : un caisson au sol et une
      // bouche d'aération au plafond peuvent partager la même verticale.
      if (poses.some((p) => p.famille === famille
        && Math.hypot(p.x - x, p.z - z) < p.largeur / 2 + demi)) continue;

      poses.push({
        meuble: choisi.nom,
        x, z,
        y: choisi.pose === 'mur' ? choisi.hauteurPose : 0,
        // Tourné vers l'INTÉRIEUR : la face utile d'une console regarde la
        // pièce, pas la cloison. La normale du mur pointe vers l'extérieur,
        // d'où le signe inversé.
        rotation: Math.atan2(-nx, -nz),
        largeur: choisi.largeur,
        hauteurVisee: choisi.hauteurVisee,
        debout: choisi.debout === true,
        famille,
      });
    }
    }
  }
  return poses;
}

/**
 * Ce meuble repose-t-il sur du sol ?
 *
 * `nx, nz` est la normale du mur, qui pointe vers l'EXTÉRIEUR. On échantillonne
 * le centre, les deux côtés le long du mur, et un point ramené vers l'intérieur.
 * Jamais vers le mur : de ce côté-là, le débord est dans la cloison, pas dans le
 * vide, et l'y interdire revient à interdire tout meuble adossé.
 */
function poseSurLeSol(chambre, x, z, demi, nx, nz) {
  const points = [
    [x, z],
    [x - nz * demi, z + nx * demi],     // le long du mur, d'un côté
    [x + nz * demi, z - nx * demi],     // et de l'autre
    [x - nx * demi, z - nz * demi],     // vers l'intérieur de la pièce
  ];
  return points.every(([px, pz]) => solPresent(chambre, px, pz));
}

/** Reprise de la même formule que le semis : une zone ronde ou rectangulaire. */
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
