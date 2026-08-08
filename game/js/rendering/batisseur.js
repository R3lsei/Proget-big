// batisseur.js — Construit une chambre à partir de sa déclaration (T-022).
//
// ─── Le principe : un fichier, deux lecteurs ─────────────────────────────────
//
//     declaration de chambre
//        ├──> batisseur.js      construit la pièce en 3D
//        └──> resolubilite.js   prouve qu'elle est franchissable
//
// C'est ce qui empêche le décor et les règles de diverger. Dans la plupart des
// projets, le niveau et sa validation vivent dans deux fichiers : on déplace un
// objet dans l'un, on oublie l'autre, et la salle validée n'est plus celle qu'on
// joue. Ici la question ne se pose pas — il n'y a rien à synchroniser.
//
// ─── Ce que le bâtisseur produit ─────────────────────────────────────────────
// Pas seulement un décor : aussi les boîtes de collision et les emplacements de
// mécanismes. Ce sont les mêmes coordonnées qui servent à dessiner et à jouer,
// donc un mur qu'on voit est un mur qui arrête.

import * as THREE from 'three';
import { depuisBox3, depuisCentre } from '../physics/aabb.js';
import { chercher } from '../perception/base/index.js';
import {
  MODULE, HAUTEUR_CHAMBRE,
  sol, mur, murPerce, porte, paroiCourbe, plafondCaissons, lumiereSpot, COULEUR_SPOT,
  jardiniere, lierre, socleReceptacle, materiaux,
  borneTerminal, passerelle, fosse, panneauConsigne,
  mezzanine, elevateur, EPAISSEUR_ELEVATEUR,
} from './kit.js';
import { boiteDePlateforme } from '../physics/plateforme.js';
import { mettreEnPage, placerConsigne } from './consigne.js';
import {
  ORIENTATIONS, dallesDe, departDe, seuilDe, aFranchi, solPresent, solPorte, FLECHE_VERRIERE,
} from './plan.js';

// La géométrie d'une chambre — orientations, dalles, seuil, départ — a été
// sortie dans `plan.js` : le semis de végétation en a besoin lui aussi, et le
// faire importer le bâtisseur aurait créé un cycle. Elle est réexportée ici
// parce que le reste du jeu la demande historiquement au bâtisseur ; une
// passerelle explicite vaut mieux qu'une migration de tous les appelants pour
// un déplacement interne.
export { departDe, seuilDe, aFranchi, dallesDe, solPresent, solPorte };

/** Convertit une position en modules vers des mètres, centrée sur la chambre. */
const enMetres = (modules) => modules * MODULE;

/**
 * Construit une chambre.
 *
 * @param {object} chambre  déclaration, voir gameplay/chambres.js
 * @returns {{
 *   groupe: THREE.Group,
 *   colliders: object[],
 *   receptacles: Map<string, {type: string, boite: object, socle: THREE.Group}>,
 *   porte: {groupe: THREE.Group, ouvrir: Function},
 * }}
 */
export function batir(chambre) {
  const { largeur, profondeur } = chambre.taille;
  const etat = chambre.etat ?? 'soigne';
  const groupe = new THREE.Group();
  groupe.name = `chambre_${chambre.id}`;
  const colliders = [];

  // Le sol est un collider comme les autres : sans lui, le joueur tombe
  // indéfiniment dès la première image, avant même d'avoir pu bouger.
  for (const dalle of dallesDe(chambre)) {
    const piece = sol({ largeur: dalle.largeur, profondeur: dalle.profondeur, etat });
    piece.position.set(dalle.x, 0, dalle.z);
    groupe.add(piece);
    colliders.push(depuisCentre(
      dalle.x, -0.25, dalle.z,
      enMetres(dalle.largeur), 0.5, enMetres(dalle.profondeur)));
  }

  // Habillage du gouffre. Il n'en avait aucun : le vide était une absence de
  // dalles, on voyait le sable du désert à travers le sol, et le joueur a lu
  // cela comme un carrelage bogué plutôt que comme un trou. La mécanique
  // fonctionnait parfaitement et n'était pas lisible — ce qui revient à ne pas
  // exister.
  if (chambre.gouffre) {
    groupe.add(fosse({
      xMin: enMetres(chambre.gouffre.xMin), xMax: enMetres(chambre.gouffre.xMax),
      zMin: enMetres(chambre.gouffre.zMin), zMax: enMetres(chambre.gouffre.zMax),
    }));
    // Aucun collider : c'est un trou. Les parois sont là pour l'œil, et une
    // paroi qui arrête le joueur transformerait la fosse en mur invisible.
  }

  const murDeSortie = chambre.porte?.mur ?? 'nord';
  // Le mur vitré : une verrière en arc à la place d'une cloison. Déclaré par la
  // chambre, jamais deviné — c'est une décision de mise en scène, et deux
  // salles voisines n'ouvrent pas forcément sur le même côté.
  const murVitre = chambre.verriere ?? null;
  const RAYON_ARC = enMetres(HAUTEUR_CHAMBRE);

  for (const [orientation, { rotation }] of Object.entries(ORIENTATIONS)) {
    const longueur = (orientation === 'nord' || orientation === 'sud') ? largeur : profondeur;
    const recul = ((orientation === 'nord' || orientation === 'sud')
      ? enMetres(profondeur) : enMetres(largeur)) / 2;
    const [nx, nz] = ORIENTATIONS[orientation].normale;

    if (orientation === murVitre) {
      const baie = paroiCourbe({ largeur: longueur, fleche: FLECHE_VERRIERE });
      // La paroi est posée AU PLAN DU MUR : c'est elle qui bombe vers le dehors,
      // et le tablier de plancher que `plan.js` ajoute la porte exactement.
      baie.position.set(nx * recul, 0, nz * recul);
      baie.rotation.y = Math.atan2(nx, nz);
      groupe.add(baie);

      // Un collider par facette, transporté du repère local vers le monde. Un
      // seul mur droit laisserait passer aux extrémités de l'arc, là où le verre
      // s'écarte le plus du plan du mur.
      baie.updateMatrixWorld(true);
      for (const facette of baie.userData.colliders) {
        const centre = new THREE.Vector3(facette.x, facette.hauteur / 2, facette.z)
          .applyMatrix4(baie.matrixWorld);
        const oriente = facette.angle + baie.rotation.y;
        // Boîte alignée sur les axes : on prend l'empreinte de la facette
        // tournée, ce qui l'épaissit un peu — sans conséquence, le joueur ne
        // doit de toute façon pas coller la vitre.
        const dx = Math.abs(Math.cos(oriente)) * facette.largeur
                 + Math.abs(Math.sin(oriente)) * facette.epaisseur;
        const dz = Math.abs(Math.sin(oriente)) * facette.largeur
                 + Math.abs(Math.cos(oriente)) * facette.epaisseur;
        colliders.push(depuisCentre(centre.x, facette.hauteur / 2, centre.z,
          dx, facette.hauteur, dz));
      }
      continue;
    }

    const cloison = orientation === murDeSortie
      ? murPerce({ largeur: longueur, etat, ouverture: chambre.porte?.ouverture ?? 2 })
      : mur({ largeur: longueur, etat });

    cloison.position.set(nx * recul, 0, nz * recul);
    cloison.rotation.y = rotation;
    groupe.add(cloison);
    ajouterColliders(cloison, colliders);
  }

  // Plafond plein à caissons, et non plus une verrière de toiture. Le jour
  // n'entre plus par le haut mais par la BAIE : c'est ce qui donne à la lumière
  // sa direction, rasante, et au lieu son atmosphère de fin d'après-midi.
  const plafond = plafondCaissons({ largeur, profondeur, etat });
  plafond.position.y = enMetres(HAUTEUR_CHAMBRE);
  groupe.add(plafond);

  // Retombée au-dessus de la baie. Le plafond couvre le RECTANGLE de la pièce ;
  // la baie, elle, bombe au-delà. Sans cette retombée, il restait une fente
  // entre le haut du vitrage et le bord du plafond, par laquelle on voyait le
  // ciel — une bande orange qui donnait l'impression que la verrière ne montait
  // pas jusqu'en haut. Le défaut ne venait pas de la baie mais de ce qui aurait
  // dû la coiffer.
  if (murVitre) {
    const [vx, vz] = ORIENTATIONS[murVitre].normale;
    const murEnX = vx === 0;
    const reculVitre = (murEnX ? enMetres(profondeur) : enMetres(largeur)) / 2;
    const retombee = new THREE.Mesh(
      new THREE.BoxGeometry(
        murEnX ? enMetres(largeur) : FLECHE_VERRIERE + 0.3, 0.14,
        murEnX ? FLECHE_VERRIERE + 0.3 : enMetres(profondeur)),
      materiaux().panneau_propre);
    retombee.position.set(
      vx * (reculVitre + FLECHE_VERRIERE / 2), enMetres(HAUTEUR_CHAMBRE) + 0.07,
      vz * (reculVitre + FLECHE_VERRIERE / 2));
    retombee.receiveShadow = true;
    groupe.add(retombee);
  }
  const eclairage = { lumieres: [], matiere: plafond.userData.matiereLampe };
  for (const lampe of plafond.userData.lampes) {
    const spot = lumiereSpot(lampe.x, enMetres(HAUTEUR_CHAMBRE) - 0.12, lampe.z);
    groupe.add(spot);
    eclairage.lumieres.push({ lumiere: spot, intensite: spot.intensity });
  }

  // Porte, posée dans l'ouverture du mur de sortie.
  const [px, pz] = ORIENTATIONS[murDeSortie].normale;
  const reculPorte = ((murDeSortie === 'nord' || murDeSortie === 'sud')
    ? enMetres(profondeur) : enMetres(largeur)) / 2;
  const vantaux = porte({ ouverture: chambre.porte?.ouverture ?? 2, etat });
  vantaux.position.set(px * reculPorte, 0, pz * reculPorte);
  vantaux.rotation.y = ORIENTATIONS[murDeSortie].rotation;
  groupe.add(vantaux);

  // Panneau de consigne, dans le champ de vision du départ. Le joueur a signalé
  // que « le niveau est très mal expliqué » — et il l'était : rien, nulle part,
  // ne lui disait qu'il pouvait montrer un objet réel à sa caméra.
  if (chambre.consigne) {
    const pose = placerConsigne(chambre, seuilDe(chambre));
    const panneau = panneauConsigne(mettreEnPage(chambre.consigne));
    panneau.position.set(pose.x, pose.y, pose.z);
    panneau.rotation.y = pose.rotation;
    groupe.add(panneau);
  }

  const receptacles = new Map();
  for (const [instance, decl] of Object.entries(chambre.receptacles ?? {})) {
    const socle = socleReceptacle({ etat });
    socle.position.set(enMetres(decl.x ?? 0), 0, enMetres(decl.z ?? 0));
    groupe.add(socle);
    // La boîte du réceptacle sert à savoir si un objet y repose. Elle est
    // calculée depuis la géométrie réellement placée, jamais redéclarée à la
    // main : deux sources de vérité finiraient par se contredire.
    socle.updateMatrixWorld(true);
    receptacles.set(instance, {
      type: decl.type,
      boite: depuisBox3(new THREE.Box3().setFromObject(socle)),
      socle,
    });
  }

  const terminaux = new Map();
  for (const [instance, decl] of Object.entries(chambre.terminaux ?? {})) {
    const borne = borneTerminal({ etat });
    borne.position.set(enMetres(decl.x ?? 0), 0, enMetres(decl.z ?? 0));
    groupe.add(borne);
    borne.updateMatrixWorld(true);
    terminaux.set(instance, {
      type: decl.type,
      boite: depuisBox3(new THREE.Box3().setFromObject(borne)),
      borne,
    });
    // La borne est un obstacle : on ne traverse pas une console.
    ajouterColliders(borne, colliders);
  }

  const passerelles = new Map();
  for (const decl of chambre.passerelles ?? []) {
    const pont = passerelle({
      largeur: decl.largeur ?? 2, longueur: decl.longueur ?? 3, etat,
    });
    pont.position.set(enMetres(decl.x ?? 0), 0, enMetres(decl.z ?? 0));
    groupe.add(pont);
    pont.updateMatrixWorld(true);
    passerelles.set(decl.id, {
      condition: decl.condition,
      // La CONSIGNE physique n'est pas la condition du fait : une passerelle
      // élévatrice a trois états, pas deux. Voir la déclaration de la chambre.
      deverrouillage: decl.deverrouillage ?? decl.condition,
      rappel: decl.rappel ?? null,
      groupe: pont,
      deployer: pont.userData.deployer,
      // Le collider n'est pas ajouté à la liste : il n'existe que déployé, et
      // c'est la boucle de jeu qui l'y met. Un pont rentré sur lequel on marche
      // quand même serait le pire des deux mondes.
      // Même forme qu'une dalle de sol : un pont se marche dessus, il ne se
      // franchit pas comme un obstacle.
      collider: depuisCentre(
        enMetres(decl.x ?? 0), -0.25, enMetres(decl.z ?? 0),
        (decl.largeur ?? 2) * MODULE, 0.5, (decl.longueur ?? 3) * MODULE),
    });
  }

  // ─── Mezzanines ───────────────────────────────────────────────────────────
  //
  // Un plancher perché est un obstacle comme un autre pour la physique : une
  // boîte pleine sous sa surface. C'est ce qui permet d'y marcher SANS que rien
  // d'autre du moteur n'ait à connaître la notion d'étage.
  for (const decl of chambre.mezzanines ?? []) {
    const etage = mezzanine({
      largeur: decl.largeur, profondeur: decl.profondeur,
      hauteur: decl.hauteur, etat, ouvertureX: decl.ouvertureX ?? null,
    });
    etage.position.set(enMetres(decl.x ?? 0), 0, enMetres(decl.z ?? 0));
    groupe.add(etage);
    colliders.push(depuisCentre(
      enMetres(decl.x ?? 0), decl.hauteur - 0.6, enMetres(decl.z ?? 0),
      enMetres(decl.largeur), 1.2, enMetres(decl.profondeur)));
  }

  // ─── Passerelles élévatrices ──────────────────────────────────────────────
  //
  // Le collider n'entre PAS dans la liste figée : il suit le tablier, image par
  // image, et c'est la boucle de jeu qui l'ajoute. Même règle que pour la porte
  // et pour le pont déployé — tout ce qui bouge a une collision recalculée, et
  // tout ce qui ne bouge pas l'a une fois pour toutes.
  const elevateurs = new Map();
  for (const decl of chambre.elevateurs ?? []) {
    const cage = elevateur({
      largeur: decl.largeur ?? 2, longueur: decl.longueur ?? 2,
      course: decl.haut ?? 2.8, etat,
    });
    cage.position.set(enMetres(decl.x ?? 0), 0, enMetres(decl.z ?? 0));
    groupe.add(cage);
    const forme = {
      x: enMetres(decl.x ?? 0), z: enMetres(decl.z ?? 0),
      largeur: (decl.largeur ?? 2) * MODULE,
      longueur: (decl.longueur ?? 2) * MODULE,
      epaisseur: EPAISSEUR_ELEVATEUR,
    };
    elevateurs.set(decl.id, {
      forme,
      bas: decl.bas ?? 0,
      haut: decl.haut ?? 2.8,
      vitesse: decl.vitesse ?? 0.47,
      condition: decl.condition,
      // La CONSIGNE physique n'est pas la condition du fait : une passerelle
      // élévatrice a trois états, pas deux. Voir la déclaration de la chambre.
      deverrouillage: decl.deverrouillage ?? decl.condition,
      rappel: decl.rappel ?? null,
      // Il démarre EN HAUT. C'est la mise en scène de la salle : la sortie est
      // visible et inaccessible dès la première seconde, ce qui pose la
      // question avant que le joueur ait fait un pas.
      hauteur: decl.haut ?? 2.8,
      placer: cage.userData.placer,
      boite: (hauteur) => depuisBox3Plateforme(forme, hauteur),
    });
    cage.userData.placer(decl.haut ?? 2.8);
  }

  for (const decor of chambre.decor ?? []) {
    const piece = decor.type === 'lierre'
      ? lierre({ largeur: decor.largeur ?? 4, densite: decor.densite ?? 40, graine: decor.graine ?? 1 })
      : jardiniere({ largeur: decor.largeur ?? 2, etat });
    piece.position.set(enMetres(decor.x ?? 0), 0, enMetres(decor.z ?? 0));
    piece.rotation.y = decor.rotation ?? 0;
    groupe.add(piece);
    // Le décor n'entre PAS dans les colliders : le joueur doit pouvoir traverser
    // un massif de feuilles. Un buisson qui bloque est un mur invisible, et le
    // joueur ne comprend jamais pourquoi il ne passe pas.
  }

  return {
    groupe,
    colliders,
    receptacles,
    terminaux,
    passerelles,
    elevateurs,
    objets: poserObjets(chambre, groupe),
    eclairage,
    porte: {
      groupe: vantaux,
      ouvrir: vantaux.userData.ouvrir,
      // Colliders des vantaux à une progression donnée, exprimés dans le repère
      // du MONDE. Ils ne rejoignent pas `colliders` : cette liste est figée à la
      // construction, et une porte bouge. C'est la boucle de jeu qui les ajoute,
      // comme elle le fait déjà pour la passerelle déployée.
      empreinte: (progression) => vantaux.userData.empreinte(progression)
        .map(({ cx, cy, cz, largeur, hauteur, profondeur }) => {
          // Rotation du mur de sortie, puis translation. Sans elle, une porte
          // sur un mur est ou ouest aurait sa boîte en travers de la pièce.
          const cos = Math.cos(ORIENTATIONS[murDeSortie].rotation);
          const sin = Math.sin(ORIENTATIONS[murDeSortie].rotation);
          return depuisCentre(
            px * reculPorte + cx * cos + cz * sin,
            cy,
            pz * reculPorte - cx * sin + cz * cos,
            Math.abs(cos) * largeur + Math.abs(sin) * profondeur,
            hauteur,
            Math.abs(sin) * largeur + Math.abs(cos) * profondeur);
        }),
    },
  };
}

/** Gabarit d'un objet transportable : petit, cubique, franchissable en marchant. */
export const GABARIT_OBJET = Object.freeze({ rayon: 0.16, hauteur: 0.32 });


/**
 * Matérialise les objets de la chambre à leurs poses déclarées.
 *
 * La preuve de résolubilité suppose que ces objets sont ATTEIGNABLES. Un objet
 * déclaré mais jamais posé rendrait la preuve fausse : le vérificateur dirait
 * la salle franchissable, et le joueur ne trouverait rien. Un test exige donc
 * une pose pour chaque objet.
 */
function poserObjets(chambre, groupe) {
  const objets = new Map();
  const m = materiaux();

  for (const nom of chambre.objets ?? []) {
    const pose = chambre.poses?.[nom];
    if (!pose) continue;
    const entree = chercher(nom);
    if (!entree) continue;

    const lourd = entree.proprietes.includes('lourd');
    const taille = lourd ? 0.32 : 0.24;
    const maillage = new THREE.Mesh(
      new THREE.BoxGeometry(taille, taille, taille),
      lourd ? m.structure : m.panneau_use);
    maillage.castShadow = true;
    maillage.receiveShadow = true;
    maillage.name = `objet_${nom}`;

    const corps = {
      nom,
      proprietes: entree.proprietes,
      x: enMetres(pose.x), y: 0, z: enMetres(pose.z),
      vy: 0, auSol: true,
      maillage,
      // Position d'origine, gardée pour la restauration : un objet tombé dans le
      // gouffre y revient. Sans elle, un geste maladroit rendrait la salle
      // insoluble — et le vérificateur, qui raisonne sur l'état initial, ne
      // pourrait rien y voir.
      origine: { x: enMetres(pose.x), y: 0, z: enMetres(pose.z) },
      gabarit: { rayon: taille / 2, hauteur: taille },
    };
    maillage.position.set(corps.x, taille / 2, corps.z);
    groupe.add(maillage);
    objets.set(nom, corps);
  }
  return objets;
}

/** Boîte englobante d'un objet transportable, à sa position courante. */
export function boiteObjet(corps) {
  return depuisCentre(
    corps.x, corps.y + corps.gabarit.hauteur / 2, corps.z,
    corps.gabarit.rayon * 2, corps.gabarit.hauteur, corps.gabarit.rayon * 2);
}

/**
 * Ajoute les boîtes de collision d'une pièce déjà positionnée.
 *
 * Une boîte par maillage plutôt qu'une pour tout le groupe : un mur percé d'une
 * porte donnerait sinon un bloc plein, et le joueur se cognerait à une ouverture
 * qu'il voit béante devant lui.
 */
/**
 * Boîte de collision d'un tablier d'élévateur, au format du moteur.
 *
 * Elle passe par `boiteDePlateforme`, qui est la formule que la physique
 * utilise pour décider qui est porté. Une seconde formule ici donnerait un
 * élévateur qu'on VOIT à un endroit et sur lequel on MARCHE à un autre — c'est
 * la divergence qui avait fait pousser de l'herbe au-dessus du gouffre, et elle
 * se reproduit à chaque fois qu'on recalcule une géométrie de son côté.
 */
function depuisBox3Plateforme(forme, hauteur) {
  const b = boiteDePlateforme(forme, hauteur);
  return depuisCentre(
    (b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2,
    b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ);
}

function ajouterColliders(piece, colliders) {
  piece.updateMatrixWorld(true);
  piece.traverse((noeud) => {
    if (!noeud.isMesh) return;
    colliders.push(depuisBox3(new THREE.Box3().setFromObject(noeud)));
  });
}



