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
import { depuisBox3 } from '../physics/aabb.js';
import {
  MODULE, HAUTEUR_CHAMBRE,
  sol, mur, murPerce, porte, verriere, jardiniere, lierre, socleReceptacle,
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

  groupe.add(sol({ largeur, profondeur, etat }));

  // Le sol est un collider comme les autres : sans lui, le joueur tombe
  // indéfiniment dès la première image, avant même d'avoir pu bouger.
  colliders.push(depuisBox3(new THREE.Box3(
    new THREE.Vector3(-enMetres(largeur) / 2, -0.5, -enMetres(profondeur) / 2),
    new THREE.Vector3(enMetres(largeur) / 2, 0, enMetres(profondeur) / 2))));

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
    porte: { groupe: vantaux, ouvrir: vantaux.userData.ouvrir },
  };
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
