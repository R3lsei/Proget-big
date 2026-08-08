// kit.js — Pièces modulaires du complexe NOVA-7.
//
// Un vocabulaire restreint de modules réutilisés partout, à la manière de Portal.
// Ce n'est pas qu'un choix esthétique : un kit répétitif est exactement ce que la
// fusion de géométries sait exploiter. Vingt chambres bâties avec dix pièces
// coûtent moins cher qu'une chambre modelée à la main.
//
// Voir docs/ART_DIRECTION.md pour les intentions. Ce fichier n'en est que la
// traduction ; s'il s'en écarte, c'est le document qui tranche.
//
// ─── Ce que le module ne fait pas ────────────────────────────────────────────
// Il ne connaît ni le gameplay, ni les énigmes, ni la caméra. Il fabrique des
// pièces. L'assemblage d'une chambre et la preuve qu'elle est franchissable
// appartiennent à `gameplay/`.

import * as THREE from 'three';
import { motifCarrelage, motifPanneau, cartesDe } from './matieres.js';

/** Pas de la grille, en mètres. Toute dimension en est un multiple. */
export const MODULE = 1.2;

/** Hauteur standard d'une chambre, en modules. */
export const HAUTEUR_CHAMBRE = 3;

/** Épaisseur des cloisons. Assez pour que la tranche se voie à l'œil. */
const EPAISSEUR = 0.12;

/** Creux du joint entre deux panneaux. C'est lui qui donne l'échelle. */
const JOINT = 0.02;

/**
 * États du lieu. Le décor bascule du cultivé au subi à mesure qu'on progresse.
 * @typedef {'soigne'|'envahi'} Etat
 */
export const ETATS = Object.freeze(['soigne', 'envahi']);

/**
 * Palette, en trois familles et pas une de plus : panneau, structure, vivant.
 *
 * Les matériaux sont créés UNE fois et partagés par toutes les pièces. Deux
 * matériaux identiques mais distincts empêchent la fusion des géométries et
 * doublent les appels de dessin — c'est le défaut B-003 déjà corrigé une fois,
 * et la mémoire du projet doit rester dans le code, pas dans nos têtes.
 */
function creerMateriaux() {
  const panneau = (couleur, rugosite) => new THREE.MeshStandardMaterial({
    color: couleur, roughness: rugosite, metalness: 0.02, envMapIntensity: 0.35,
  });

  // Motifs calculés une seule fois pour toute la partie. Deux cent cinquante-six
  // pixels de côté suffisent : ces surfaces sont vues de loin autant que de
  // près, et la répétition règle le détail mieux que la résolution.
  // UN seul carreau par texture. La géométrie porte déjà les carreaux — chaque
  // dalle est un maillage distinct, avec ses UV de 0 à 1 — si bien qu'une
  // texture à quatre carreaux par côté en dessinait seize sur CHAQUE dalle
  // réelle. Le sol se retrouvait quadrillé deux fois, à deux échelles. La
  // texture n'apporte donc que la salissure et le relief ; le découpage reste
  // affaire de géométrie.
  const carrelagePropre = cartesDe(motifCarrelage({ carreaux: 1, salete: 0.35, graine: 3 }), 1);
  const carrelageSale = cartesDe(
    motifCarrelage({ carreaux: 1, salete: 0.95, graine: 7, teinte: [206, 205, 196] }), 1);
  const panneauPropre = cartesDe(motifPanneau({ salete: 0.3, graine: 9 }), 1);
  const panneauUse = cartesDe(
    motifPanneau({ salete: 0.95, graine: 13, teinte: [211, 210, 201] }), 1);
  return Object.freeze({
    panneau_propre: new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.55, metalness: 0.02, envMapIntensity: 0.35,
      ...panneauPropre,
    }),
    panneau_use: new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.85, metalness: 0.02, envMapIntensity: 0.3,
      ...panneauUse,
    }),
    joint: panneau(0x9aa3a8, 0.9),
    structure: new THREE.MeshStandardMaterial({
      color: 0x2f3538, roughness: 0.45, metalness: 0.85, envMapIntensity: 0.6,
    }),
    sol_carrelage: panneau(0xc3ccce, 0.45),
    // Ossature de verrière : CLAIRE, comme celle de toute serre réelle. En métal
    // sombre, les meneaux vus en enfilade — c'est-à-dire dès qu'on lève les yeux
    // — fusionnaient en une masse noire qui bouchait le ciel. Le défaut ne
    // venait d'aucun réglage de lumière : une résille sombre vue par la tranche
    // est un mur, quelle que soit la scène derrière.
    ossature: new THREE.MeshStandardMaterial({
      color: 0xd8dedf, roughness: 0.4, metalness: 0.3, envMapIntensity: 0.9,
    }),
    sol_beton: panneau(0x8f8b81, 0.95),
    // Verre ORANGÉ : c'est lui la frontière du jeu. Dehors la tempête, dedans le
    // laboratoire — et la seule chose qui sépare les deux est cette teinte. Un
    // verre neutre laisserait le désert entrer tel quel dans l'image et il n'y
    // aurait plus de dedans du tout.
    verre: new THREE.MeshStandardMaterial({
      color: 0xe89a52, roughness: 0.08, metalness: 0, transparent: true,
      opacity: 0.16, envMapIntensity: 1.2, side: THREE.DoubleSide,
      // Le verre ne s'éteint jamais complètement. Sa sous-face ne reçoit aucune
      // lumière directe — le soleil est au-dessus — et une vitre parfaitement
      // noire par en dessous n'existe pas : une vraie vitre diffuse dans son
      // épaisseur. Sans ce minimum, la toiture formait une masse sombre au
      // milieu du ciel, et c'était bien le verre, pas une géométrie parasite.
      emissive: 0xe89a52, emissiveIntensity: 0.18,
    }),
    // Carrelage du laboratoire : peu rugueux, donc il REND l'environnement.
    // C'est ce reflet qui fait entrer l'orange du dehors sur le sol blanc, et
    // qui lie les deux moitiés de l'image sans rien peindre.
    // La COULEUR passe à blanc : c'est la carte qui porte désormais la teinte.
    // La laisser colorée multiplierait la carte par elle-même et assombrirait
    // tout d'un cran — l'erreur la plus discrète en posant une texture.
    sol_poli: new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 1, metalness: 0.05, envMapIntensity: 1.6,
      ...carrelagePropre,
    }),
    // Le même carrelage, mais plus personne ne le lave : terne, mat, sans
    // reflet. C'est l'entretien qui distingue les deux états, pas la matière.
    sol_terni: new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 1, metalness: 0.02, envMapIntensity: 0.5,
      ...carrelageSale,
    }),
    joint_sol: new THREE.MeshStandardMaterial({
      color: 0xaeb6b8, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.8,
    }),
    // Découpe binaire, jamais de fondu : le fondu impose un tri par profondeur
    // et interdit la fusion. Voir ART_DIRECTION §6.
    feuillage: new THREE.MeshStandardMaterial({
      color: 0x4f7f42, roughness: 0.8, metalness: 0, side: THREE.DoubleSide,
      alphaTest: 0.5,
    }),
    mousse: panneau(0x5d7a4a, 1),
    terre: panneau(0x4a3b2e, 1),
  });
}

/**
 * Intensité des voyants. Au-delà de 1 volontairement.
 *
 * Une couleur d'écran plafonne à 1, et la floraison ne saisit que ce qui
 * dépasse son seuil : un voyant à 1,0 ne rayonnerait donc pas plus qu'un mur
 * blanc, qui est la plus grande surface de la scène. C'est en sortant de
 * l'intervalle affichable qu'une source devient une SOURCE — le rendu à plage
 * dynamique étendue n'est pas un effet, c'est ce qui distingue une lampe d'un
 * carré peint en jaune.
 */
export const INTENSITE_SIGNAL = 2.2;

const SIGNAL_ACTIF = 0x44dd88;
const SIGNAL_INACTIF = 0xff5533;

/** Couleur d'un voyant selon son état, en valeurs non bornées. */
export function couleurSignal(actif) {
  return new THREE.Color(actif ? SIGNAL_ACTIF : SIGNAL_INACTIF)
    .multiplyScalar(INTENSITE_SIGNAL);
}

let materiauxPartages = null;

/** Palette partagée. Une seule instance par exécution, volontairement. */
export function materiaux() {
  if (!materiauxPartages) materiauxPartages = creerMateriaux();
  return materiauxPartages;
}

/** Convertit des modules en mètres. */
export const enMetres = (modules) => modules * MODULE;

/** Le nombre est-il aligné sur la grille ? */
export function surGrille(metres, tolerance = 1e-9) {
  return Math.abs(metres / MODULE - Math.round(metres / MODULE)) < tolerance;
}

/** Matériau de panneau correspondant à l'état du lieu. */
function materiauPanneau(etat) {
  const m = materiaux();
  return etat === 'envahi' ? m.panneau_use : m.panneau_propre;
}

/**
 * Cloison faite de panneaux jointifs.
 *
 * Les joints sont des creux réels, pas une texture : ils accrochent la lumière
 * rasante des verrières et donnent au mur son échelle. Un mur lisse est
 * exactement ce qui faisait paraître la version précédente une maquette.
 */
export function mur({ largeur = 4, hauteur = HAUTEUR_CHAMBRE, etat = 'soigne' } = {}) {
  const groupe = new THREE.Group();
  groupe.name = `mur_${largeur}x${hauteur}_${etat}`;
  const m = materiaux();
  const matiere = materiauPanneau(etat);

  const geometriePanneau = new THREE.BoxGeometry(
    MODULE - JOINT * 2, MODULE - JOINT * 2, EPAISSEUR);

  for (let colonne = 0; colonne < largeur; colonne++) {
    for (let rangee = 0; rangee < hauteur; rangee++) {
      const panneau = new THREE.Mesh(geometriePanneau, matiere);
      panneau.position.set(
        (colonne - (largeur - 1) / 2) * MODULE,
        (rangee + 0.5) * MODULE,
        0);
      // Un panneau déboîté par endroits raconte l'abandon mieux qu'une tache.
      if (etat === 'envahi' && (colonne * 7 + rangee * 3) % 11 === 0) {
        panneau.position.z += 0.03;
        panneau.rotation.z = 0.012;
      }
      panneau.castShadow = true;
      panneau.receiveShadow = true;
      groupe.add(panneau);
    }
  }

  // Fond de joint : c'est lui qu'on voit dans les creux.
  const fond = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * MODULE, hauteur * MODULE, EPAISSEUR * 0.5),
    m.joint);
  fond.position.set(0, (hauteur * MODULE) / 2, -EPAISSEUR * 0.4);
  fond.receiveShadow = true;
  groupe.add(fond);

  return groupe;
}

/**
 * Sol carrelé, poli, à joints creux.
 *
 * Le sol n'était qu'une dalle d'une seule couleur mate. Or c'est la plus grande
 * surface visible du jeu : tant qu'elle ne renvoie rien, la salle reste une
 * maquette quelle que soit la qualité du reste. Poli, il rend l'environnement —
 * et fait donc entrer l'orange de la tempête sur le blanc du laboratoire, ce
 * qui lie les deux moitiés de l'image sans qu'on ait rien à peindre.
 *
 * Le carrelage est fait de vraies dalles séparées par des creux, comme les
 * murs. Une texture de damier aurait été moins chère, mais un joint creux
 * accroche la lumière rasante des verrières : c'est en relief qu'il donne
 * l'échelle, pas en dessin.
 */
export function sol({ largeur = 4, profondeur = 4, etat = 'soigne' } = {}) {
  const m = materiaux();
  const groupe = new THREE.Group();
  groupe.name = `sol_${largeur}x${profondeur}_${etat}`;

  // Fond de joint : c'est lui qu'on aperçoit entre les carreaux.
  const fond = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * MODULE, EPAISSEUR, profondeur * MODULE),
    etat === 'envahi' ? m.sol_beton : m.joint_sol);
  fond.position.y = -EPAISSEUR / 2;
  fond.receiveShadow = true;
  groupe.add(fond);

  // Une zone envahie garde son CARRELAGE — c'est le même bâtiment. Elle l'a
  // seulement laissé se salir : plus terne, plus mat, moins de reflet. La
  // première version renvoyait du béton nu, et la serre se retrouvait sans
  // sol carrelé du tout alors que les références en montrent partout. L'état
  // d'un lieu se lit à son ENTRETIEN, pas à son changement de nature.

  // Les carreaux ne sont pas alignés sur la grille des modules : deux carreaux
  // par module. Un carreau de 1,2 m se lirait comme une dalle de béton, pas
  // comme du carrelage de laboratoire.
  const pas = MODULE / 2;
  const carreau = new THREE.BoxGeometry(pas - JOINT * 2, 0.02, pas - JOINT * 2);
  const colonnes = Math.round(largeur * 2);
  const rangees = Math.round(profondeur * 2);
  const carrelage = new THREE.InstancedMesh(
    carreau, etat === 'envahi' ? m.sol_terni : m.sol_poli, colonnes * rangees);
  carrelage.receiveShadow = true;

  const pose = new THREE.Object3D();
  let index = 0;
  for (let c = 0; c < colonnes; c++) {
    for (let r = 0; r < rangees; r++) {
      pose.position.set(
        (c - (colonnes - 1) / 2) * pas, 0.001, (r - (rangees - 1) / 2) * pas);
      pose.updateMatrix();
      carrelage.setMatrixAt(index++, pose.matrix);
    }
  }
  carrelage.instanceMatrix.needsUpdate = true;
  groupe.add(carrelage);
  return groupe;
}

/**
 * Verrière : la source de lumière principale du jeu.
 *
 * Un cadre métallique et du verre. C'est par là que passe le soleil, donc les
 * ombres portées — et c'est ce qui justifie que des plantes poussent à
 * l'intérieur d'un complexe fermé.
 */
export function verriere({ largeur = 4, profondeur = 4 } = {}) {
  const groupe = new THREE.Group();
  groupe.name = `verriere_${largeur}x${profondeur}`;
  const m = materiaux();

  // Une NAPPE, pas une boîte. Une boîte de verre présente deux surfaces à
  // traverser : le ciel était teinté deux fois et s'assombrissait d'autant.
  // Une vitre de toiture se regarde par en dessous, jamais par la tranche.
  const vitrage = new THREE.Mesh(
    new THREE.PlaneGeometry(largeur * MODULE, profondeur * MODULE), m.verre);
  vitrage.rotation.x = -Math.PI / 2;
  groupe.add(vitrage);

  // Les meneaux découpent la lumière : c'est ce quadrillage projeté au sol qui
  // donne au lieu sa profondeur, bien plus qu'une texture de mur.
  const geometrieMeneau = new THREE.BoxGeometry(0.07, 0.09, profondeur * MODULE);
  for (let i = 0; i <= largeur; i++) {
    const meneau = new THREE.Mesh(geometrieMeneau, m.ossature);
    meneau.position.x = (i - largeur / 2) * MODULE;
    meneau.castShadow = true;
    groupe.add(meneau);
  }
  return groupe;
}

/**
 * Verrière en arc : le côté vitré de la serre.
 *
 * Un quart de cylindre qui part du sol, se redresse et rejoint la toiture. La
 * salle cessait d'être une boîte au moment précis où l'on ajoutait cette
 * courbe : quatre murs droits et un plafond plat se lisent comme un couloir,
 * quel que soit le soin porté aux matières. Une paroi courbe dit « serre »
 * avant qu'on ait nommé quoi que ce soit.
 *
 * Facettée, et non lisse. D'abord parce que c'est ainsi que se construit une
 * vraie verrière — des panneaux plats sur une ossature cintrée. Ensuite parce
 * que chaque facette prend la lumière sous un angle légèrement différent : la
 * courbe se lit alors dans le dégradé des reflets, ce qu'une surface lisse à ce
 * niveau de détail ne donnerait pas.
 *
 * @param {object} options
 * @param {number} options.largeur   étendue le long du mur, en modules
 * @param {number} options.rayon     rayon de l'arc, en mètres
 * @param {number} options.segments  nombre de facettes sur le quart de tour
 */
export function verriereArc({ largeur = 8, rayon = HAUTEUR_CHAMBRE * MODULE, segments = 10 } = {}) {
  const groupe = new THREE.Group();
  groupe.name = `verriere_arc_${largeur}`;
  const m = materiaux();

  const longueur = largeur * MODULE;
  const pas = (Math.PI / 2) / segments;
  // Corde d'une facette : la largeur réelle du panneau plat qui sous-tend
  // l'angle. La calculer évite les fentes entre panneaux, qu'une largeur
  // approchée laisserait apparaître comme des rais de lumière.
  const corde = 2 * rayon * Math.sin(pas / 2);

  const panneau = new THREE.BoxGeometry(longueur, corde, 0.04);
  const vitrage = new THREE.InstancedMesh(panneau, m.verre, segments);
  const meneauArc = new THREE.BoxGeometry(longueur, 0.045, 0.10);
  const meneaux = new THREE.InstancedMesh(meneauArc, m.ossature, segments + 1);
  meneaux.castShadow = true;

  const pose = new THREE.Object3D();
  for (let i = 0; i < segments; i++) {
    const angle = (i + 0.5) * pas;
    pose.position.set(0, rayon * Math.sin(angle), rayon * Math.cos(angle));
    pose.rotation.set(-angle, 0, 0);
    pose.updateMatrix();
    vitrage.setMatrixAt(i, pose.matrix);
  }
  for (let i = 0; i <= segments; i++) {
    const angle = i * pas;
    pose.position.set(0, rayon * Math.sin(angle), rayon * Math.cos(angle));
    pose.rotation.set(-angle, 0, 0);
    pose.updateMatrix();
    meneaux.setMatrixAt(i, pose.matrix);
  }
  vitrage.instanceMatrix.needsUpdate = true;
  meneaux.instanceMatrix.needsUpdate = true;
  groupe.add(vitrage, meneaux);

  // Montants verticaux, un par module : ils découpent la lumière sur toute la
  // hauteur de l'arc, et c'est ce quadrillage projeté au sol qui donne au lieu
  // sa profondeur — bien plus qu'une texture de mur.
  const points = [];
  for (let i = 0; i <= segments; i++) {
    points.push(new THREE.Vector3(0, rayon * Math.sin(i * pas), rayon * Math.cos(i * pas)));
  }
  const nervure = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments * 2, 0.022, 5, false);
  // Un montant tous les deux modules : à chaque module, l'ossature masquait le
  // dehors qu'elle est censée encadrer.
  for (let c = 0; c <= largeur; c += 2) {
    const montant = new THREE.Mesh(nervure, m.ossature);
    montant.position.x = (c - largeur / 2) * MODULE;
    montant.castShadow = true;
    groupe.add(montant);
  }
  return groupe;
}

/**
 * Plaque de mousse : la première chose qui repousse dans un lieu abandonné.
 *
 * Le lot de modèles n'en contient pas, et c'est la seule espèce qui manquait
 * vraiment. La mousse ne se dresse pas, elle ÉPOUSE — un modèle importé aurait
 * de toute façon dû être aplati jusqu'à n'être plus qu'une tache. Autant la
 * produire directement, d'autant qu'une tache irrégulière est exactement ce
 * qu'un polygone à rayon variable sait faire.
 *
 * Renvoie une géométrie, pas un maillage : elle rejoint le catalogue des
 * espèces et se plante par instanciation comme les modèles chargés.
 */
export function geometrieMousse({ rayon = 0.45, cotes = 11, graine = 1 } = {}) {
  let etat = (graine * 2654435761) >>> 0;
  const suivant = () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };

  const sommets = [0, 0, 0];
  const index = [];
  // Rayon irrégulier : un disque parfait se lit comme une pastille collée.
  for (let i = 0; i < cotes; i++) {
    const angle = (i / cotes) * Math.PI * 2;
    const r = rayon * (0.55 + suivant() * 0.45);
    // Un léger bombement au centre : la mousse s'épaissit là où elle est vieille.
    sommets.push(Math.cos(angle) * r, suivant() * 0.012, Math.sin(angle) * r);
    index.push(0, 1 + i, 1 + ((i + 1) % cotes));
  }
  const geometrie = new THREE.BufferGeometry();
  geometrie.setAttribute('position', new THREE.Float32BufferAttribute(sommets, 3));
  geometrie.setIndex(index);
  geometrie.computeVertexNormals();
  return geometrie;
}

/**
 * Paroi vitrée courbe : le mur qui ouvre sur le dehors.
 *
 * VERTICALE, et courbée en plan — pas une voûte au-dessus de la tête. La
 * première version faisait arche par-dessus la pièce ; les références montrent
 * une baie qui enveloppe le regard à hauteur d'homme, sous un plafond plat. La
 * différence n'est pas décorative : une voûte se lit comme une serre horticole,
 * une baie courbe se lit comme un poste d'observation. C'est un laboratoire.
 *
 * Elle bombe vers le DEHORS, de `fleche` mètres. Vue de l'intérieur elle est
 * donc concave, et c'est cette concavité qui donne la sensation d'être au bord
 * du monde. Le plancher qui la porte est ajouté par `plan.js`, qui sert aussi
 * le semis — l'herbe pourra ainsi pousser le long de la vitre.
 *
 * @param {object} options
 * @param {number} options.largeur  étendue du mur, en modules
 * @param {number} options.fleche   bombement vers l'extérieur, en mètres
 */
export function paroiCourbe({
  largeur = 8, hauteur = HAUTEUR_CHAMBRE, fleche = 1.2, segments = 9,
} = {}) {
  const groupe = new THREE.Group();
  groupe.name = `paroi_courbe_${largeur}`;
  const m = materiaux();

  const corde = largeur * MODULE;
  const haut = hauteur * MODULE;
  // Rayon d'un arc de corde `corde` et de flèche `fleche`. Calculé, jamais
  // choisi : un rayon écrit à la main ne passerait pas par les deux extrémités
  // du mur, et la baie laisserait une fente à chaque angle de la pièce.
  const rayon = (corde * corde / 4 + fleche * fleche) / (2 * fleche);
  const centre = fleche - rayon;          // sur l'axe sortant, en local
  const demiAngle = Math.asin(corde / (2 * rayon));
  const pas = (demiAngle * 2) / segments;

  const surArc = (angle) => new THREE.Vector3(
    rayon * Math.sin(angle), 0, centre + rayon * Math.cos(angle));

  // Panneaux plats tangents à l'arc. Facettés, comme toute verrière réelle :
  // c'est le dégradé des reflets d'une facette à l'autre qui donne la courbe.
  const largeurPanneau = 2 * rayon * Math.sin(pas / 2);
  const vitrage = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(largeurPanneau, haut), m.verre, segments);
  const montants = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.07, haut, 0.12), m.ossature, segments + 1);
  montants.castShadow = true;

  const pose = new THREE.Object3D();
  for (let i = 0; i < segments; i++) {
    const angle = -demiAngle + (i + 0.5) * pas;
    const point = surArc(angle);
    pose.position.set(point.x, haut / 2, point.z);
    pose.rotation.set(0, angle, 0);
    pose.updateMatrix();
    vitrage.setMatrixAt(i, pose.matrix);
  }
  for (let i = 0; i <= segments; i++) {
    const angle = -demiAngle + i * pas;
    const point = surArc(angle);
    pose.position.set(point.x, haut / 2, point.z);
    pose.rotation.set(0, angle, 0);
    pose.updateMatrix();
    montants.setMatrixAt(i, pose.matrix);
  }
  vitrage.instanceMatrix.needsUpdate = true;
  montants.instanceMatrix.needsUpdate = true;
  groupe.add(vitrage, montants);

  // Allège au sol et bandeau en tête : sans eux, le verre semble flotter, et
  // c'est cette allège que les références montrent envahie par l'herbe.
  for (const [y, epaisseur] of [[0.09, 0.18], [haut - 0.09, 0.18]]) {
    const bande = new THREE.InstancedMesh(
      new THREE.BoxGeometry(largeurPanneau + 0.02, epaisseur, 0.16),
      y < 1 ? materiauPanneau('soigne') : m.ossature, segments);
    bande.castShadow = true;
    bande.receiveShadow = true;
    for (let i = 0; i < segments; i++) {
      const angle = -demiAngle + (i + 0.5) * pas;
      const point = surArc(angle);
      pose.position.set(point.x, y, point.z);
      pose.rotation.set(0, angle, 0);
      pose.updateMatrix();
      bande.setMatrixAt(i, pose.matrix);
    }
    bande.instanceMatrix.needsUpdate = true;
    groupe.add(bande);
  }

  // Boîtes de collision : une par facette, suivant l'arc. Un seul mur droit
  // laisserait le joueur traverser la vitre aux extrémités, là où l'arc s'en
  // écarte le plus.
  groupe.userData.colliders = [];
  for (let i = 0; i < segments; i++) {
    const angle = -demiAngle + (i + 0.5) * pas;
    const point = surArc(angle);
    groupe.userData.colliders.push({
      x: point.x, z: point.z, angle,
      largeur: largeurPanneau, hauteur: haut, epaisseur: 0.24,
    });
  }
  return groupe;
}

/**
 * Plafond à caissons, avec ses spots allumés.
 *
 * Les spots sont la seconde température de lumière, et c'est elle qui fait
 * l'image : blanc froid au plafond contre orange de tempête à la vitre. Une
 * scène à une seule température est plate quelle que soit sa géométrie — et
 * c'est exactement ce que le jeu montrait, tout baigné dans le même ambre.
 *
 * Les disques sont émissifs ET accompagnés d'une vraie lumière : l'émissif seul
 * donne des pastilles brillantes qui n'éclairent rien, la lumière seule donne
 * des flaques au sol sans source visible. Il faut les deux pour que l'œil relie
 * la cause à l'effet.
 */
export function plafondCaissons({ largeur = 8, profondeur = 8, etat = 'soigne' } = {}) {
  const groupe = new THREE.Group();
  groupe.name = `plafond_${largeur}x${profondeur}`;
  const m = materiaux();

  const dalle = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * MODULE, 0.14, profondeur * MODULE),
    etat === 'envahi' ? m.panneau_use : m.panneau_propre);
  dalle.position.y = 0.07;
  dalle.receiveShadow = true;
  groupe.add(dalle);

  // Nervures : elles découpent le plafond en caissons et lui donnent l'échelle.
  const nervure = new THREE.BoxGeometry(largeur * MODULE, 0.06, 0.05);
  for (let i = 1; i < profondeur; i++) {
    const barre = new THREE.Mesh(nervure, m.ossature);
    barre.position.set(0, -0.02, (i - profondeur / 2) * MODULE);
    groupe.add(barre);
  }

  // Spots répartis sur une grille explicite. La première version calculait ses
  // bornes par divisions et planchers successifs : elle en produisait seize dans
  // une salle de huit modules, et la pièce était entièrement cramée. Un compte
  // décidé vaut mieux qu'un compte déduit — on voit ce qu'on obtient.
  const rangeesX = Math.max(2, Math.round(largeur / 3));
  const rangeesZ = Math.max(2, Math.round(profondeur / 3));
  const disque = new THREE.CircleGeometry(0.17, 16);
  // Un seul matériau pour tous les hublots de la salle : ils vacillent ensemble,
  // donc une seule couleur à modifier par image.
  const lampe = new THREE.MeshBasicMaterial({ color: COULEUR_SPOT.clone() });
  groupe.userData.matiereLampe = lampe;
  groupe.userData.lampes = [];
  for (let i = 0; i < rangeesX; i++) {
    for (let j = 0; j < rangeesZ; j++) {
      const x = ((i + 0.5) / rangeesX - 0.5) * largeur * MODULE;
      const z = ((j + 0.5) / rangeesZ - 0.5) * profondeur * MODULE;
      const verre = new THREE.Mesh(disque, lampe);
      verre.position.set(x, -0.03, z);
      verre.rotation.x = Math.PI / 2;
      groupe.add(verre);
      groupe.userData.lampes.push({ x, z });
    }
  }

  return groupe;
}

/**
 * Couleur d'un spot de plafond, hors de l'intervalle affichable.
 *
 * Franchement FROIDE face à l'orange du dehors. Un blanc neutre se noierait
 * dans l'ambre général et l'on perdrait le contraste des deux mondes.
 */
export const COULEUR_SPOT = new THREE.Color(0xdfeeff).multiplyScalar(2.2);

/**
 * Défaillance de l'éclairage : un multiplicateur d'intensité entre 0 et 1.
 *
 * Le lieu est abandonné depuis assez longtemps pour que l'herbe pousse dans les
 * joints, mais les lampes tiennent encore. Ce sont donc des lampes en SURSIS —
 * et une lampe en sursis clignote. C'est ce qui transforme un décor en lieu :
 * une lumière parfaitement stable dit « rendu 3D », une lumière qui hésite dit
 * « ça tient depuis trop longtemps ».
 *
 * Tout le circuit vacille ensemble, jamais une lampe seule. Une baisse de
 * tension touche la ligne entière ; des tubes clignotant chacun dans son coin
 * se liraient comme un effet, pas comme une panne. Cela permet aussi de garder
 * un seul matériau partagé pour tous les hublots.
 *
 * Fonction PURE du temps : même instant, même valeur. Le clignotement se rejoue
 * donc à l'identique, ce qui le rend vérifiable — un effet aléatoire à chaque
 * image ne se teste pas, et ne se corrige pas non plus.
 */
export function clignotement(temps, graine = 1) {
  const alea = (n) => {
    const x = Math.sin(n * 12.9898 + graine * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const CYCLE = 6.5;
  const index = Math.floor(temps / CYCLE);
  // Deux cycles sur trois ne se passe rien : c'est l'attente qui rend la
  // défaillance efficace. Un clignotement permanent devient un papier peint.
  if (alea(index) > 0.35) return 1;

  const duree = 0.25 + alea(index + 0.25) * 0.6;
  const debut = alea(index + 0.5) * (CYCLE - duree);
  const local = temps - index * CYCLE - debut;
  if (local < 0 || local > duree) return 1;

  // Enveloppe en cloche : la crise s'installe et se résorbe. Un créneau franc
  // ressemblerait à un interrupteur, pas à un contact qui faiblit.
  const enveloppe = Math.sin(Math.PI * (local / duree));
  const battement = 0.5 + 0.5 * Math.sin(temps * 41 + graine);
  const creux = 0.12 + 0.35 * alea(index + 0.75);
  return 1 - (1 - creux) * enveloppe * battement;
}

/** Vraie lumière d'un spot : sans ombre, donc bon marché. */
export function lumiereSpot(x, y, z) {
  // Sans ombre portée : quatre à six spots par salle, chacun avec sa carte
  // d'ombre, coûteraient plus cher que tout le reste de la chambre. Le soleil
  // porte déjà les ombres qui comptent, celles de la verrière.
  const lumiere = new THREE.PointLight(0xdfeeff, 2.2, 7, 2);
  lumiere.position.set(x, y, z);
  lumiere.castShadow = false;
  return lumiere;
}

/** Jardinière : le végétal cultivé, celui du cœur entretenu. */
export function jardiniere({ largeur = 2, etat = 'soigne' } = {}) {
  const groupe = new THREE.Group();
  groupe.name = `jardiniere_${largeur}_${etat}`;
  const m = materiaux();

  const bac = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * MODULE, 0.45, MODULE * 0.7),
    etat === 'envahi' ? m.panneau_use : m.structure);
  bac.position.y = 0.225;
  bac.castShadow = true;
  bac.receiveShadow = true;
  groupe.add(bac);

  const terre = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * MODULE - 0.1, 0.05, MODULE * 0.7 - 0.1), m.terre);
  terre.position.y = 0.44;
  groupe.add(terre);

  groupe.add(touffe({
    nombre: etat === 'envahi' ? 14 : 9,
    etendue: largeur * MODULE * 0.45,
    hauteur: etat === 'envahi' ? 1.1 : 0.7,
    graine: largeur * 31 + (etat === 'envahi' ? 7 : 0),
  }));
  groupe.children.at(-1).position.y = 0.46;

  return groupe;
}

/**
 * Générateur pseudo-aléatoire déterministe.
 *
 * `Math.random` donnerait une chambre différente à chaque chargement : les
 * captures ne seraient pas comparables, un bug de placement serait
 * irreproductible, et la sauvegarde ne pourrait pas restituer le décor vu.
 */
function hasard(graine) {
  let etat = graine >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

/**
 * Touffe de feuillage, en instances.
 *
 * Une seule instance dessinée `nombre` fois, jamais `nombre` objets : c'est la
 * différence entre une chambre verdoyante à 120 images par seconde et la même à
 * 30. Voir ART_DIRECTION §6.
 */
/**
 * Silhouette de feuille : une ogive pointue, base à l'origine, pointe vers +Y.
 *
 * Un simple rectangle donnait du confetti vert — c'est le premier rendu du kit
 * qui l'a montré, et aucun réglage de couleur n'y aurait changé quoi que ce soit.
 * La forme se joue en géométrie plutôt qu'en découpe d'image : une trentaine de
 * triangles coûtent moins qu'une texture à charger, et surtout la forme existe
 * aussi hors du navigateur, donc les tests la vérifient.
 */
function geometrieFeuille() {
  const contour = new THREE.Shape();
  // Une feuille de lierre fait une dizaine de centimètres. À 50, ce sont des
  // plantes tropicales, et l'échelle de la pièce entière devient illisible.
  contour.moveTo(0, 0);
  contour.bezierCurveTo(0.075, 0.06, 0.085, 0.19, 0, 0.29);
  contour.bezierCurveTo(-0.085, 0.19, -0.075, 0.06, 0, 0);
  return new THREE.ShapeGeometry(contour, 6);
}

let feuillePartagee = null;

/**
 * Feuillage porté par des brins, en instances.
 *
 * Les feuilles ne flottent pas : elles poussent le long de brins qui partent de
 * la base. C'est ce qui distingue une plante d'un nuage de feuilles éparpillées,
 * et le premier rendu a prouvé qu'aucun réglage ne remplace cette structure.
 *
 * Un seul dessin pour toutes les feuilles, un autre pour toutes les tiges :
 * la différence entre une chambre verdoyante à 120 images par seconde et la même
 * à 30. Voir ART_DIRECTION §6.
 */
export function touffe({
  nombre = 10, etendue = 0.6, hauteur = 0.8, graine = 1, profondeur = etendue,
  brins = Math.max(3, Math.round(nombre / 4)),
} = {}) {
  const m = materiaux();
  const groupe = new THREE.Group();
  groupe.name = `touffe_${nombre}`;

  if (!feuillePartagee) feuillePartagee = geometrieFeuille();
  const feuilles = new THREE.InstancedMesh(feuillePartagee, m.feuillage, nombre);
  feuilles.castShadow = true;
  const tiges = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.006, 0.012, 1, 4), m.mousse, brins);
  tiges.castShadow = true;

  const suivant = hasard(graine);
  const aplatissement = profondeur / (etendue || 1);
  const transformation = new THREE.Object3D();

  // Chaque brin part de la base et monte en s'écartant : les feuilles se
  // répartissent le long de son trajet plutôt qu'au hasard dans le volume.
  // Les pieds sont RÉPARTIS sur l'emprise, jamais confondus en un point : des
  // tiges partant toutes du même endroit forment une gerbe de feu d'artifice,
  // ce que le rendu précédent a montré sans ambiguïté. Une plante a plusieurs
  // points d'ancrage, ou plusieurs plantes en ont chacune le leur.
  const trajets = [];
  for (let b = 0; b < brins; b++) {
    const pied = new THREE.Vector3(
      (suivant() - 0.5) * 2 * etendue, 0,
      (suivant() - 0.5) * 2 * etendue * aplatissement);
    const angle = suivant() * Math.PI * 2;
    const derive = etendue * 0.35 * suivant();
    const sommet = new THREE.Vector3(
      pied.x + Math.cos(angle) * derive,
      hauteur * (0.45 + suivant() * 0.55),
      pied.z + Math.sin(angle) * derive * aplatissement);
    trajets.push({ pied, sommet });

    const axe = sommet.clone().sub(pied);
    transformation.position.copy(pied).addScaledVector(axe, 0.5);
    transformation.scale.set(1, axe.length(), 1);
    transformation.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), axe.clone().normalize());
    transformation.updateMatrix();
    tiges.setMatrixAt(b, transformation.matrix);
  }

  for (let i = 0; i < nombre; i++) {
    const { pied, sommet } = trajets[i % brins];
    // Feuilles réparties sur la moitié haute du brin : le bas d'une tige est nu.
    const avancement = 0.45 + suivant() * 0.55;
    transformation.position.set(
      pied.x + (sommet.x - pied.x) * avancement,
      pied.y + (sommet.y - pied.y) * avancement,
      pied.z + (sommet.z - pied.z) * avancement);
    // Les feuilles s'ouvrent autour de leur brin, inclinées vers l'extérieur :
    // une orientation entièrement libre redonnerait l'aspect éparpillé.
    transformation.rotation.set(
      -0.5 + suivant() * 0.5, suivant() * Math.PI * 2, (suivant() - 0.5) * 0.8);
    transformation.scale.setScalar(0.55 + suivant() * 0.7);
    transformation.updateMatrix();
    feuilles.setMatrixAt(i, transformation.matrix);
  }

  feuilles.instanceMatrix.needsUpdate = true;
  tiges.instanceMatrix.needsUpdate = true;
  groupe.add(tiges, feuilles);
  return groupe;
}

/**
 * Lierre courant le long d'un mur : la marque des zones abandonnées.
 *
 * Volontairement plaqué contre la paroi et sans épaisseur notable. Le décor ne
 * doit jamais s'avancer dans l'espace jouable, où il finirait par masquer un
 * mécanisme — la règle qui prime sur l'esthétique, ART_DIRECTION §2.
 */
export function lierre({ largeur = 4, hauteur = HAUTEUR_CHAMBRE, densite = 18, graine = 5 } = {}) {
  const groupe = new THREE.Group();
  groupe.name = `lierre_${largeur}x${hauteur}`;
  groupe.add(touffe({
    nombre: densite, etendue: largeur * MODULE * 0.5,
    // Presque nulle : le lierre couvre la paroi, il ne s'en détache pas.
    profondeur: 0.12,
    hauteur: hauteur * MODULE, graine,
  }));
  return groupe;
}

/**
 * Éclairage d'une zone : un soleil unique, une seule carte d'ombre.
 *
 * Vingt lampes ponctuelles porteuses d'ombre coûtent vingt rendus de scène et
 * produisent des ombres molles qui se contredisent. Une directionnelle en coûte
 * un et donne des ombres franches, lisibles, cohérentes d'un bout à l'autre du
 * complexe. C'est la correction du défaut le plus visible de la version
 * précédente.
 */
export function soleil({ intensite = 2.1, portee = 30 } = {}) {
  const lumiere = new THREE.DirectionalLight(0xfff4e2, intensite);
  lumiere.name = 'soleil';
  lumiere.position.set(6, 14, 4);
  lumiere.castShadow = true;
  lumiere.shadow.mapSize.set(2048, 2048);
  lumiere.shadow.camera.near = 1;
  lumiere.shadow.camera.far = 60;
  lumiere.shadow.camera.left = -portee;
  lumiere.shadow.camera.right = portee;
  lumiere.shadow.camera.top = portee;
  lumiere.shadow.camera.bottom = -portee;
  // Sans ce décalage, les surfaces s'auto-ombrent en bandes rayées.
  lumiere.shadow.bias = -0.0006;
  lumiere.shadow.normalBias = 0.02;
  return lumiere;
}

/**
 * Lumière d'ambiance, délibérément basse.
 *
 * Une ambiance généreuse efface les ombres et ramène le décor plat que ce kit
 * existe pour corriger. Le ciel bleuté et le sol chaud donnent la variation de
 * teinte que le blanc uniforme n'avait pas.
 */
export function ambiance({ intensite = 0.5 } = {}) {
  const lumiere = new THREE.HemisphereLight(0xd8ecf5, 0x6f6a5c, intensite);
  lumiere.name = 'ambiance';
  return lumiere;
}

/**
 * Cloison percée d'une ouverture de porte.
 *
 * Construite en trois morceaux — deux jambages et un linteau — plutôt qu'en
 * découpant un mur plein. Découper produirait une géométrie irrégulière que la
 * fusion par zone ne saurait plus regrouper, et l'ouverture ne tomberait plus
 * sur la grille.
 */
export function murPerce({
  largeur = 8, hauteur = HAUTEUR_CHAMBRE, etat = 'soigne',
  ouverture = 2, hauteurOuverture = 2,
} = {}) {
  const groupe = new THREE.Group();
  groupe.name = `mur_perce_${largeur}_${ouverture}`;

  const cote = Math.floor((largeur - ouverture) / 2);
  const decalage = (ouverture + cote) * MODULE / 2;

  for (const signe of [-1, 1]) {
    if (cote <= 0) continue;
    const jambage = mur({ largeur: cote, hauteur, etat });
    jambage.position.x = signe * decalage;
    groupe.add(jambage);
  }

  const restant = hauteur - hauteurOuverture;
  if (restant > 0) {
    const linteau = mur({ largeur: ouverture, hauteur: restant, etat });
    linteau.position.y = hauteurOuverture * MODULE;
    groupe.add(linteau);
  }
  return groupe;
}

/**
 * Porte à deux vantaux, coulissant dans les jambages.
 *
 * `ouvrir` prend une progression de 0 à 1 : l'animation appartient à l'appelant.
 * Une porte qui s'anime toute seule ne peut ni être testée d'un coup, ni être
 * restituée dans l'état exact où une sauvegarde l'a laissée.
 */
export function porte({ ouverture = 2, hauteur = 2, etat = 'soigne' } = {}) {
  const groupe = new THREE.Group();
  groupe.name = 'porte';
  const m = materiaux();

  const vantaux = [];
  for (const signe of [-1, 1]) {
    const vantail = new THREE.Mesh(
      new THREE.BoxGeometry(ouverture * MODULE / 2 - 0.01, hauteur * MODULE, 0.1),
      etat === 'envahi' ? m.panneau_use : m.structure);
    vantail.position.set(signe * ouverture * MODULE / 4, hauteur * MODULE / 2, 0);
    vantail.castShadow = true;
    vantail.receiveShadow = true;
    vantaux.push(vantail);
    groupe.add(vantail);
  }

  const course = ouverture * MODULE / 2;
  groupe.userData.ouvrir = (progression) => {
    const p = Math.min(1, Math.max(0, progression));
    vantaux[0].position.x = -ouverture * MODULE / 4 - course * p;
    vantaux[1].position.x = ouverture * MODULE / 4 + course * p;
  };
  return groupe;
}

/**
 * Socle visible d'un réceptacle.
 *
 * Sa lisibilité prime sur son réalisme : le joueur doit comprendre au premier
 * coup d'œil qu'il y a là quelque chose à activer, et voir sans ambiguïté si
 * c'est fait. Un mécanisme dont l'état se devine est un mécanisme qui produit
 * de la frustration au lieu de la réflexion.
 */
export function socleReceptacle({ largeur = 1, etat = 'soigne' } = {}) {
  const groupe = new THREE.Group();
  groupe.name = 'socle';
  const m = materiaux();

  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * MODULE, 0.06, largeur * MODULE), m.structure);
  plaque.position.y = 0.03;
  plaque.receiveShadow = true;
  groupe.add(plaque);

  // Un LISERÉ, pas une dalle lumineuse.
  //
  // Le témoin couvrait auparavant presque tout le socle — un mètre de côté de
  // pure émission. Sous la floraison, cette surface débordait sur tout ce qui
  // l'entourait : les bornes en métal sombre paraissaient rouges, à un mètre de
  // là. Ce n'était pas un réglage trop fort, c'était une source trop GRANDE.
  // Une machine se signale par un liseré ; une boîte lumineuse ne signale rien.
  const temoin = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * MODULE * 0.86, 0.02, largeur * MODULE * 0.86),
    new THREE.MeshBasicMaterial({ color: couleurSignal(false) }));
  temoin.position.y = 0.07;
  groupe.add(temoin);

  // Plateau posé par-dessus : il masque le centre et ne laisse voir du témoin
  // qu'une bordure de quelques centimètres.
  const plateau = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * MODULE * 0.72, 0.03, largeur * MODULE * 0.72),
    m.structure);
  plateau.position.y = 0.075;
  plateau.receiveShadow = true;
  groupe.add(plateau);

  groupe.userData.signaler = (actif) => {
    temoin.material.color.copy(couleurSignal(actif));
  };
  return groupe;
}

/**
 * Borne de terminal : une console à hauteur de main.
 *
 * Volontairement haute et verticale, là où un réceptacle est plat au sol. La
 * silhouette dit ce qu'on en fait avant tout texte : on POSE sur l'un, on
 * MANIPULE l'autre.
 */
export function borneTerminal({ etat = 'soigne' } = {}) {
  const groupe = new THREE.Group();
  groupe.name = 'terminal';
  const m = materiaux();

  const fut = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.35), m.structure);
  fut.position.y = 0.55;
  fut.castShadow = true;
  fut.receiveShadow = true;
  groupe.add(fut);

  const ecran = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.3, 0.04),
    new THREE.MeshBasicMaterial({ color: couleurSignal(false) }));
  ecran.position.set(0, 1.02, 0.19);
  ecran.rotation.x = -0.35;
  groupe.add(ecran);

  groupe.userData.signaler = (actif) => {
    ecran.material.color.copy(couleurSignal(actif));
  };
  return groupe;
}

/**
 * Passerelle rétractable.
 *
 * `deployer` prend une progression de 0 à 1, comme la porte : l'animation reste
 * à l'appelant, pour que l'état soit restituable exactement tel qu'une sauvegarde
 * l'a laissé.
 */
export function passerelle({ largeur = 2, longueur = 3, etat = 'soigne' } = {}) {
  const groupe = new THREE.Group();
  groupe.name = `passerelle_${largeur}x${longueur}`;
  const m = materiaux();

  const tablier = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * MODULE, 0.12, longueur * MODULE),
    etat === 'envahi' ? m.panneau_use : m.structure);
  tablier.castShadow = true;
  tablier.receiveShadow = true;
  groupe.add(tablier);

  const course = longueur * MODULE;
  groupe.userData.deployer = (progression) => {
    const p = Math.min(1, Math.max(0, progression));
    // Rentrée, la passerelle glisse sous le bord : elle disparaît sans laisser
    // un tablier flottant au milieu du vide.
    tablier.position.z = -course * (1 - p);
    // Déployée, sa face supérieure est à hauteur du plancher. Une passerelle en
    // surépaisseur devient une marche de douze centimètres : la résolution de
    // collisions la traite comme un mur, et le joueur se cogne à un pont qu'il
    // voit pourtant sorti.
    tablier.position.y = -0.06 - (1 - p) * 0.4;
    tablier.visible = p > 0.02;
  };
  groupe.userData.deployer(0);
  return groupe;
}
