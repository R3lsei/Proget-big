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
  sol, mur, murPerce, porte, verriere, jardiniere, lierre, socleReceptacle, materiaux,
  borneTerminal, passerelle,
} from './kit.js';

/**
 * Murs d'une chambre.
 *
 * `normale` pointe vers l'EXTÉRIEUR : c'est aussi la position du mur, en
 * proportion de la demi-dimension. Une seule convention pour placer le mur,
 * poser la porte et orienter le joueur — la première version en avait deux qui
 * se contredisaient, et le joueur démarrait le nez contre la sortie.
 */
const ORIENTATIONS = Object.freeze({
  nord: { rotation: 0, normale: [0, -1] },
  est: { rotation: -Math.PI / 2, normale: [1, 0] },
  sud: { rotation: Math.PI, normale: [0, 1] },
  ouest: { rotation: Math.PI / 2, normale: [-1, 0] },
});

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
  for (const dalle of decouperSol(chambre)) {
    const piece = sol({ largeur: dalle.largeur, profondeur: dalle.profondeur, etat });
    piece.position.set(dalle.x, 0, dalle.z);
    groupe.add(piece);
    colliders.push(depuisCentre(
      dalle.x, -0.25, dalle.z,
      enMetres(dalle.largeur), 0.5, enMetres(dalle.profondeur)));
  }

  const murDeSortie = chambre.porte?.mur ?? 'nord';
  for (const [orientation, { rotation }] of Object.entries(ORIENTATIONS)) {
    const longueur = (orientation === 'nord' || orientation === 'sud') ? largeur : profondeur;
    const recul = ((orientation === 'nord' || orientation === 'sud')
      ? enMetres(profondeur) : enMetres(largeur)) / 2;

    const cloison = orientation === murDeSortie
      ? murPerce({ largeur: longueur, etat, ouverture: chambre.porte?.ouverture ?? 2 })
      : mur({ largeur: longueur, etat });

    const [nx, nz] = ORIENTATIONS[orientation].normale;
    cloison.position.set(nx * recul, 0, nz * recul);
    cloison.rotation.y = rotation;
    groupe.add(cloison);
    ajouterColliders(cloison, colliders);
  }

  const toit = verriere({ largeur, profondeur });
  toit.position.y = enMetres(HAUTEUR_CHAMBRE);
  groupe.add(toit);

  // Porte, posée dans l'ouverture du mur de sortie.
  const [px, pz] = ORIENTATIONS[murDeSortie].normale;
  const reculPorte = ((murDeSortie === 'nord' || murDeSortie === 'sud')
    ? enMetres(profondeur) : enMetres(largeur)) / 2;
  const vantaux = porte({ ouverture: chambre.porte?.ouverture ?? 2, etat });
  vantaux.position.set(px * reculPorte, 0, pz * reculPorte);
  vantaux.rotation.y = ORIENTATIONS[murDeSortie].rotation;
  groupe.add(vantaux);

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
    objets: poserObjets(chambre, groupe),
    porte: { groupe: vantaux, ouvrir: vantaux.userData.ouvrir },
  };
}

/**
 * Découpe le sol en dalles, en laissant le gouffre vide.
 *
 * Sans cela, les zones d'une chambre ne seraient que des mots : le vérificateur
 * jurerait que la plate-forme n'est atteignable qu'une fois le pont sorti, et le
 * joueur y marcherait tranquillement sur un sol plein. C'est précisément la
 * divergence entre déclaration et géométrie que le fichier unique devait
 * empêcher — elle s'était réintroduite par le sol.
 *
 * Découpe en bandes plutôt qu'en trou percé : quatre rectangles restent des
 * boîtes, donc des colliders exacts. Une géométrie percée demanderait un maillage
 * de collision, pour un décor qui n'en a pas besoin.
 */
function decouperSol(chambre) {
  const { largeur, profondeur } = chambre.taille;
  const gouffre = chambre.gouffre;
  if (!gouffre) return [{ x: 0, z: 0, largeur, profondeur }];

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
  return dalles;
}

/** Gabarit d'un objet transportable : petit, cubique, franchissable en marchant. */
export const GABARIT_OBJET = Object.freeze({ rayon: 0.16, hauteur: 0.32 });

/** Marge latérale du seuil de sortie, en mètres : le rayon du joueur. */
const MARGE_SEUIL = 0.35;

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
function ajouterColliders(piece, colliders) {
  piece.updateMatrixWorld(true);
  piece.traverse((noeud) => {
    if (!noeud.isMesh) return;
    colliders.push(depuisBox3(new THREE.Box3().setFromObject(noeud)));
  });
}

/**
 * Le seuil de sortie : le plan du mur percé, et la direction pour le franchir.
 *
 * Dérivé des MÊMES `ORIENTATIONS` que le mur et la porte. Recalculer ce seuil à
 * la main dans la boucle de jeu le laisserait dériver au premier changement de
 * convention cardinale — et le projet en a déjà connu deux qui se
 * contredisaient.
 */
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
