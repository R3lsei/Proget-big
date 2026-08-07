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
  return Object.freeze({
    panneau_propre: panneau(0xeef1f2, 0.55),
    panneau_use: panneau(0xd3d2c9, 0.85),
    joint: panneau(0x9aa3a8, 0.9),
    structure: new THREE.MeshStandardMaterial({
      color: 0x2f3538, roughness: 0.45, metalness: 0.85, envMapIntensity: 0.6,
    }),
    sol_carrelage: panneau(0xc3ccce, 0.45),
    sol_beton: panneau(0x8f8b81, 0.95),
    verre: new THREE.MeshStandardMaterial({
      color: 0xdff0f4, roughness: 0.05, metalness: 0, transparent: true,
      opacity: 0.22, envMapIntensity: 1.2,
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

/** Dalle de sol, carrelage clair au cœur, béton dans les zones abandonnées. */
export function sol({ largeur = 4, profondeur = 4, etat = 'soigne' } = {}) {
  const m = materiaux();
  const dalle = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * MODULE, EPAISSEUR, profondeur * MODULE),
    etat === 'envahi' ? m.sol_beton : m.sol_carrelage);
  dalle.position.y = -EPAISSEUR / 2;
  dalle.receiveShadow = true;
  dalle.name = `sol_${largeur}x${profondeur}_${etat}`;
  return dalle;
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

  const vitrage = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * MODULE, 0.04, profondeur * MODULE), m.verre);
  groupe.add(vitrage);

  // Les meneaux découpent la lumière : c'est ce quadrillage projeté au sol qui
  // donne au lieu sa profondeur, bien plus qu'une texture de mur.
  const geometrieMeneau = new THREE.BoxGeometry(0.08, 0.12, profondeur * MODULE);
  for (let i = 0; i <= largeur; i++) {
    const meneau = new THREE.Mesh(geometrieMeneau, m.structure);
    meneau.position.x = (i - largeur / 2) * MODULE;
    meneau.castShadow = true;
    groupe.add(meneau);
  }
  return groupe;
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

  const temoin = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * MODULE * 0.8, 0.02, largeur * MODULE * 0.8),
    new THREE.MeshBasicMaterial({ color: 0xff5533 }));
  temoin.position.y = 0.07;
  groupe.add(temoin);

  groupe.userData.signaler = (actif) => {
    temoin.material.color.setHex(actif ? 0x44dd88 : 0xff5533);
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
    new THREE.MeshBasicMaterial({ color: 0xff5533 }));
  ecran.position.set(0, 1.02, 0.19);
  ecran.rotation.x = -0.35;
  groupe.add(ecran);

  groupe.userData.signaler = (actif) => {
    ecran.material.color.setHex(actif ? 0x44dd88 : 0xff5533);
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
