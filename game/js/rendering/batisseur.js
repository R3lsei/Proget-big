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
import {
  ORIENTATIONS, dallesDe, departDe, seuilDe, aFranchi, solPresent, solPorte,
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
function ajouterColliders(piece, colliders) {
  piece.updateMatrixWorld(true);
  piece.traverse((noeud) => {
    if (!noeud.isMesh) return;
    colliders.push(depuisBox3(new THREE.Box3().setFromObject(noeud)));
  });
}



