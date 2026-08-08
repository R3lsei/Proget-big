// dehors.js — Le désert derrière la verrière (T-038, T-041).
//
// Le complexe ne racontait rien. Une salle blanche sous un ciel gris, des
// fleurs posées au milieu du sol comme dans un jardin d'agrément : chaque
// élément était correct et l'ensemble ne voulait rien dire.
//
// L'intention est maintenant explicite, et tout en découle :
//
//     DEHORS   un désert, une tempête de sable, une lumière orange
//     DEDANS   un laboratoire blanc, propre, encore éclairé
//     ENTRE    une verrière orangée, seule frontière entre les deux
//     ET       la nature qui repasse par les fissures, depuis les bords
//
// Le contraste est le sujet. Un labo propre au milieu de nulle part n'émeut
// personne ; un labo propre pendant que le monde dehors s'est effondré, si.
//
// ─── Ce que la première version ratait ───────────────────────────────────────
//
// Elle posait un disque plat et neuf boules à cent vingt mètres. Le calcul de
// la brume dit pourquoi on ne les voyait pas : avec une densité de 0,021, le
// facteur de brouillard vaut exp(−(d·densité)²), soit exp(−6,3) ≈ 0,002 à cent
// vingt mètres. Les dunes étaient DÉJÀ intégralement remplacées par la couleur
// de la poussière. Elles existaient, elles coûtaient neuf appels de dessin, et
// aucun pixel ne leur revenait.
//
// D'où les deux décisions qui gouvernent ce fichier :
//
//   1. Le paysage vit entre quinze et cent soixante mètres, et la brume est
//      détendue (0,011) pour que cette tranche se voie vraiment. À douze
//      mètres — la profondeur d'une salle — elle reste sous 2 %, donc
//      l'intérieur ne bouge pas d'un cheveu.
//
//   2. Tout ce qui est ajouté tient en QUATRE appels de dessin, quelle que
//      soit la richesse apparente : un terrain, une famille de reliefs en
//      instanciation, deux voiles de poussière. Le décor est construit une
//      fois pour toute la partie, ne porte ni ne reçoit d'ombre, et ne connaît
//      pas les chambres. On ne paie la beauté qu'une fois.
//
// ─── Ce que ce module ne fait pas ────────────────────────────────────────────
// Il ne connaît ni les chambres, ni les énigmes. Il fabrique un environnement
// qu'on voit à travers une vitre, et rien de plus.

import * as THREE from 'three';
import { fractal, motifSable, cartesDe } from './matieres.js';

/** Palette du dehors. Gelée : c'est une décision, pas un réglage. */
export const DESERT = Object.freeze({
  // Trois hauteurs de ciel, du sol vers le zénith. La bande basse est la plus
  // saturée : c'est là que la poussière est la plus dense, et c'est ce dégradé
  // qui dit « tempête » avant même que rien ne bouge.
  //
  // ─── La faute que ces trois valeurs ont mis longtemps à avouer ─────────────
  //
  // `sable` valait 0x9c5a28 : un brun SOMBRE. Le dégradé du ciel passe par lui
  // entre dix et vingt-cinq degrés au-dessus de l'horizon — c'est-à-dire dans
  // la seule tranche de ciel qu'une baie vitrée de quatre mètres laisse voir
  // depuis l'intérieur. Le zénith clair existait bel et bien ; il était au
  // plafond, hors du cadre. On voyait donc une masse brune au-dessus du désert,
  // qu'on a successivement prise pour une dune, pour la toiture, puis pour un
  // défaut de verre. C'était le ciel, et c'était une couleur.
  //
  // La leçon tient en une phrase : dans un dégradé, ce n'est pas la valeur
  // extrême qui compte, c'est celle qui tombe dans le champ de vision. Les
  // trois valeurs restent donc dans une même plage de luminance — un ciel de
  // tempête est laiteux de bout en bout, jamais contrasté.
  sable: 0xd4813f,
  poussiere: 0xe0a066,
  zenith: 0xf0c88d,
  sol: 0xc98d55,
  /** Roche : plus grise et plus sombre que le sable, sinon rien ne se détache. */
  roche: 0xa8764a,
  /**
   * Portée de la brume.
   *
   * 0,011 et non 0,021 : à l'ancienne valeur, tout ce qui dépassait soixante-dix
   * mètres était déjà de la couleur pure du brouillard. On peignait un mur, pas
   * une distance. Ici l'horizon s'éteint vers cent soixante mètres, ce qui
   * laisse une vraie gradation — et c'est la gradation qui fait la profondeur,
   * pas le nombre d'objets.
   */
  brume: 0.011,
});

/**
 * Rayon du dôme céleste, en mètres.
 *
 * ─── B-033, la vraie cause, après trois diagnostics erronés ─────────────────
 *
 * Une masse sombre barrait le ciel au-dessus du désert. On l'a prise pour une
 * dune trop proche, puis pour la sous-face de la verrière, puis pour un défaut
 * du verre — et elle a même semblé disparaître le jour où la toiture vitrée a
 * été remplacée par un plafond plein, ce qui a validé la mauvaise explication.
 *
 * C'était le PLAN LOINTAIN DE LA CAMÉRA. Il était à 200 m ; le dôme à 220. Le
 * ciel était donc découpé au ras du plan de coupe, par plaques, selon la
 * facette du dôme traversée — d'où des panneaux de verre noirs et d'autres non,
 * ce qui ressemblait à tout sauf à un problème de caméra. Deux expériences l'ont
 * établi sans appel : peindre le fond en vert faisait virer au vert les seuls
 * pixels sombres (donc rien n'y était dessiné), et porter le plan lointain à
 * 400 m les rendait identiques aux pixels clairs.
 *
 * La leçon : quand une surface est ABSENTE et non pas mal colorée, ce n'est
 * jamais un problème de matière. Il fallait mesurer, pas regarder.
 *
 * Pour que la faute ne puisse pas revenir, ces distances ne sont plus écrites à
 * deux endroits : `PORTEE_VISION` est exportée, la caméra et la sonde de reflets
 * s'en servent, et un test vérifie l'ordre des trois rayons.
 */
const RAYON = 300;

/**
 * Distance de vision à donner à toute caméra qui regarde cette scène.
 *
 * Strictement supérieure au dôme, sinon le ciel est tronqué. La sonde cubique
 * des reflets est concernée au même titre : réglée trop court, elle capture un
 * ciel noir et le carrelage se met à refléter du vide.
 */
export const PORTEE_VISION = 420;

/** Niveau du sable au pied du laboratoire. En contrebas du plancher. */
const ASSISE = -0.35;

// ─── Terrain ────────────────────────────────────────────────────────────────

/** Côté du terrain, en mètres. Au-delà, la brume a déjà tout mangé. */
const ETENDUE = 340;

/**
 * Subdivisions par côté.
 *
 * 96 donne un quadrillage de 3,5 m et 18 432 triangles — pour un GPU, moins
 * qu'un seul modèle de mobilier, et en UN appel de dessin. Doubler la finesse
 * quadruplerait le coût pour un gain nul : les dunes ont quarante mètres de
 * longueur d'onde, on ne les décrit pas mieux avec des mailles de deux mètres.
 */
const SEGMENTS = 96;

/** Rayon strictement plat autour du laboratoire, en mètres. */
export const RAYON_PLAT = 15;

/** Rayon où le relief atteint son amplitude pleine. */
export const RAYON_RAMPE = 38;

/** Amplitude du relief, en mètres. */
const AMPLITUDE = 4.2;

/** Interpolation douce, bornée. */
function lissage(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/**
 * Hauteur du sable en un point, relativement à l'assise.
 *
 * Fonction PURE, et c'est délibéré : c'est elle qui décide où le terrain est
 * assez plat pour poser le laboratoire, et où les reliefs peuvent s'implanter
 * sans flotter. Deux programmes doivent tomber d'accord là-dessus — le maillage
 * du sol et l'implantation des buttes — et la seule façon de garantir qu'ils ne
 * divergeront jamais est qu'ils appellent la même fonction. C'est la leçon du
 * semis qui faisait pousser de l'herbe au-dessus du gouffre.
 *
 * Trois échelles superposées, du plus large au plus fin :
 *   · les grandes dunes donnent la silhouette de l'horizon ;
 *   · les ondulations moyennes empêchent les dunes d'être des boules ;
 *   · les rides donnent l'échelle, et sans elles on ne sait pas si l'on voit
 *     une dune de dix mètres ou de cent.
 *
 * Aucune de ces échelles ne descend sous QUATORZE mètres, et c'est une
 * contrainte, pas un goût : le maillage a des mailles de 3,5 m, et une
 * ondulation de sept mètres de longueur d'onde y est décrite par deux sommets.
 * On n'obtient pas du détail en dessous de sa propre résolution — on obtient du
 * bruit, qui scintille dès que la caméra bouge. Le relief fin, c'est le travail
 * de la carte de normales du sable, pas celui de la géométrie.
 *
 * @param {number} x   mètres
 * @param {number} z   mètres
 * @param {number} graine
 * @returns {number} hauteur en mètres, nulle au pied du laboratoire
 */
export function relief(x, z, graine = 5) {
  const distance = Math.hypot(x, z);
  // Plat sous le laboratoire, et pas seulement « à peu près plat » : la moindre
  // bosse traverserait le plancher et se verrait de l'intérieur comme une tache
  // de sable au milieu du carrelage.
  if (distance <= RAYON_PLAT) return 0;

  const montee = lissage((distance - RAYON_PLAT) / (RAYON_RAMPE - RAYON_PLAT));
  const grandes = fractal(x / 90, z / 90, graine, 3) - 0.5;
  const moyennes = fractal(x / 28, z / 28, graine + 5, 3) - 0.5;
  const rides = fractal(x / 14, z / 14, graine + 11, 2) - 0.5;

  return (grandes * 2 + moyennes * 1.1 + rides * 0.35) * AMPLITUDE * montee;
}

/**
 * Coordonnées d'un axe de la grille, avec les bords du trou insérés.
 *
 * Un pas régulier NE PEUT PAS tomber pile sur les bords d'un trou quelconque.
 * On force donc ces bords dans la liste, et l'on subdivise l'intervalle entre
 * eux au même pas que le reste : sans cette subdivision, la bande qui traverse
 * le trou deviendrait une seule maille de douze mètres, visible comme une
 * facette grossière au milieu des dunes.
 */
function coordonnees(demi, pas, borneMin, borneMax) {
  const valeurs = new Set();
  const n = Math.round((demi * 2) / pas);
  for (let i = 0; i <= n; i++) valeurs.add(+(-demi + (i * demi * 2) / n).toFixed(4));
  if (borneMin !== null && borneMax !== null) {
    const m = Math.max(1, Math.round((borneMax - borneMin) / pas));
    for (let i = 0; i <= m; i++) {
      valeurs.add(+(borneMin + ((borneMax - borneMin) * i) / m).toFixed(4));
    }
  }
  return [...valeurs].sort((a, b) => a - b);
}

/**
 * La grille du terrain, en tableaux bruts — et le trou sous le laboratoire.
 *
 * ─── Pourquoi un trou, et pourquoi c'était invisible ────────────────────────
 *
 * Le terrain est un plan de 340 m posé à -0,35 m. Il passe donc SOUS le
 * laboratoire, et il traversait le gouffre de la serre : en regardant dans la
 * fosse on voyait, à trente-cinq centimètres, le sable du désert. Le joueur a
 * signalé « un problème de sol, sûrement dû au fait qu'il soit dupliqué ». Ce
 * n'était pas une duplication, et l'intuition était pourtant juste — deux sols
 * occupaient bien le même endroit.
 *
 * Aucun habillage de fosse n'y pouvait rien : les parois étaient correctement
 * bâties, simplement le sable arrivait AVANT elles sur le rayon. C'est le
 * genre de défaut qu'on attribue au dernier module touché alors qu'il vient de
 * l'interaction entre deux modules qui s'ignorent.
 *
 * Fonction PURE, et c'est ce qui la rend vérifiable : « aucun triangle ne
 * recouvre l'intérieur du trou » est une propriété qui se teste, quand un
 * maillage ne se teste qu'à l'œil.
 *
 * @param {object} options
 * @param {{xMin:number,xMax:number,zMin:number,zMax:number}|null} options.trou  en mètres
 */
export function grilleDeTerrain({
  etendue = ETENDUE, segments = SEGMENTS, trou = null, graine = 5,
} = {}) {
  const pas = etendue / segments;
  const xs = coordonnees(etendue / 2, pas, trou?.xMin ?? null, trou?.xMax ?? null);
  const zs = coordonnees(etendue / 2, pas, trou?.zMin ?? null, trou?.zMax ?? null);

  const positions = new Float32Array(xs.length * zs.length * 3);
  const uvs = new Float32Array(xs.length * zs.length * 2);
  for (let j = 0; j < zs.length; j++) {
    for (let i = 0; i < xs.length; i++) {
      const k = j * xs.length + i;
      positions[k * 3] = xs[i];
      positions[k * 3 + 1] = relief(xs[i], zs[j], graine);
      positions[k * 3 + 2] = zs[j];
      uvs[k * 2] = xs[i] / etendue + 0.5;
      uvs[k * 2 + 1] = zs[j] / etendue + 0.5;
    }
  }

  const indices = [];
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      if (trou) {
        // Le CENTRE de la maille décide. Les bords du trou étant des lignes de
        // grille, aucune maille ne le chevauche : le test est donc exact, et le
        // trou a la taille demandée au millimètre près.
        const cx = (xs[i] + xs[i + 1]) / 2;
        const cz = (zs[j] + zs[j + 1]) / 2;
        if (cx > trou.xMin && cx < trou.xMax && cz > trou.zMin && cz < trou.zMax) continue;
      }
      const a = j * xs.length + i;
      const b = a + 1;
      const c = a + xs.length;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return { positions, uvs, indices: new Uint32Array(indices), colonnes: xs.length };
}

/**
 * Le sol du désert : un seul maillage, déformé par `relief`.
 *
 * Un plan et non un disque : le carré déborde de la portée utile de la brume,
 * donc ses coins ne se voient pas, et une grille régulière se déforme sans
 * étirement — une géométrie polaire concentre ses sommets au centre, c'est-à-dire
 * exactement là où le terrain est plat et n'en a pas besoin.
 *
 * `creuser` refait la géométrie quand on change de chambre : le trou dépend du
 * gouffre de la salle, et une salle sans gouffre n'en veut aucun. C'est le seul
 * élément du dehors qui n'est pas construit une fois pour toutes, et il ne l'est
 * qu'aux changements de chambre — jamais par image.
 */
export function terrain({ graine = 5, trou = null } = {}) {
  const materiau = new THREE.MeshStandardMaterial({
    ...cartesDe(motifSable({ graine: 21 }), ETENDUE / 4),
    color: DESERT.sol, roughness: 1, metalness: 0,
  });
  const sol = new THREE.Mesh(new THREE.BufferGeometry(), materiau);
  sol.name = 'terrain_desert';
  sol.position.y = ASSISE;
  // Ni porteur ni receveur d'ombre : la caméra d'ombre couvre vingt-six mètres,
  // le terrain en fait trois cent quarante. L'inscrire dans la passe d'ombre
  // coûterait un second rendu de dix-huit mille triangles pour zéro pixel.
  sol.castShadow = false;
  sol.receiveShadow = false;

  sol.userData.creuser = (nouveauTrou) => {
    const { positions, uvs, indices } = grilleDeTerrain({ graine, trou: nouveauTrou });
    const geometrie = new THREE.BufferGeometry();
    geometrie.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometrie.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometrie.setIndex(new THREE.BufferAttribute(indices, 1));
    // Recalculées APRÈS déformation : conserver les normales d'un plan laisserait
    // toutes les dunes éclairées comme une surface horizontale, donc parfaitement
    // invisibles quel que soit leur relief.
    geometrie.computeVertexNormals();
    sol.geometry.dispose();
    sol.geometry = geometrie;
  };
  sol.userData.creuser(trou);
  return sol;
}

// ─── Reliefs rocheux ────────────────────────────────────────────────────────

/** Aucune butte à moins de cette distance : la vue depuis la baie est sacrée. */
export const EXCLUSION = 44;

/** Au-delà, la brume les a effacées. Inutile de les payer. */
export const PORTEE_FORMATIONS = 160;

/** De combien une butte est enterrée sous le point le plus bas de son empreinte. */
const ENFONCEMENT = 0.4;

function hasard(graine) {
  let etat = (graine * 374761393) >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

/**
 * Décide où planter les buttes, et à quelle taille.
 *
 * Pure, pour les mêmes raisons que le semis : un placement se vérifie, un
 * maillage non. Les trois fautes que ce calcul doit rendre impossibles sont
 * celles qu'on a déjà commises ailleurs — un objet qui flotte au-dessus du sol,
 * deux objets qui s'interpénètrent, un objet planté là où il gêne la vue.
 *
 * L'altitude retenue est le MINIMUM du relief sous l'empreinte, pas sa valeur
 * au centre : une butte de vingt mètres de large posée sur le sommet d'une dune
 * aurait son centre au contact et ses bords en l'air.
 *
 * @returns {{x:number,z:number,y:number,rayonX:number,rayonZ:number,hauteur:number,rotation:number}[]}
 */
export function implanter({ graine = 5, nombre = 20 } = {}) {
  const suivant = hasard(graine);
  const posees = [];

  for (let i = 0; i < nombre; i++) {
    // Angle d'or : réparti sans grille visible, et sans deux buttes alignées
    // sur le même azimut — ce qui, vu depuis une seule fenêtre, se remarque.
    const angle = i * 2.39996 + suivant() * 0.6;
    // Racine carrée du tirage : sinon la moitié des buttes se tasse dans le
    // premier tiers du rayon, parce que l'aire d'un anneau croît avec sa
    // distance. C'est la même erreur que semer uniformément en polaire.
    const t = Math.sqrt(suivant());
    const distance = EXCLUSION + t * (PORTEE_FORMATIONS - EXCLUSION);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    // Les buttes lointaines sont plus grosses : c'est ce qui donne l'échelle du
    // désert. Des masses identiques à toute distance annulent la perspective.
    const echelle = 0.55 + t * 0.9;
    const rayonX = (7 + suivant() * 9) * echelle;
    const rayonZ = rayonX * (0.6 + suivant() * 0.8);
    const hauteur = rayonX * (0.55 + suivant() * 1.15);

    const demi = Math.max(rayonX, rayonZ);
    if (posees.some((p) => Math.hypot(p.x - x, p.z - z)
      < demi + Math.max(p.rayonX, p.rayonZ) + 6)) continue;

    // Minimum du relief sur TOUT le pourtour, puis enfoncement.
    //
    // L'enfoncement est volontairement petit — quarante centimètres — et c'est
    // le cœur du calcul. La première version enterrait la butte de deux mètres,
    // ce qui masquait le problème au lieu de le résoudre : avec une marge
    // pareille, prendre l'altitude au seul centre passait inaperçu, la pente
    // étant absorbée par l'enfouissement. Un test l'a montré en survivant à la
    // mutation. C'est donc l'échantillonnage du pourtour qui garantit qu'aucun
    // bord ne décolle, et l'enfoncement ne sert plus qu'à une chose : que la
    // base ne se lise pas comme un objet POSÉ sur le sable.
    // Deux couronnes de vingt-quatre points, plus le centre. Douze points ne
    // suffisaient pas : sur une butte de quinze mètres de rayon, ils laissent
    // des trous de quatre mètres d'arc, et le terrain ondule à quatorze — on
    // manquait donc régulièrement le point bas. Quarante-neuf appels d'une
    // fonction pure, une fois pour la partie entière : le coût est nul.
    let plancher = relief(x, z, graine);
    for (const proportion of [0.55, 1]) {
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        plancher = Math.min(plancher, relief(
          x + Math.cos(a) * rayonX * proportion,
          z + Math.sin(a) * rayonZ * proportion, graine));
      }
    }

    posees.push({
      x, z,
      y: plancher - ENFONCEMENT,
      rayonX, rayonZ, hauteur,
      rotation: suivant() * Math.PI * 2,
    });
  }
  return posees;
}

/**
 * Les buttes, en UN seul appel de dessin.
 *
 * Une géométrie, N matrices. Vingt maillages séparés auraient coûté vingt
 * changements d'état par image pour un décor qui ne bouge jamais — et c'est le
 * nombre d'appels, pas le nombre de triangles, qui fait ramer un navigateur.
 *
 * Sept segments radiaux et un ombrage plat : à cette distance et sous cette
 * brume, on ne lit qu'une silhouette. Y mettre du détail serait payer pour des
 * pixels que la poussière efface.
 */
export function formations({ graine = 5, nombre = 20 } = {}) {
  const poses = implanter({ graine, nombre });

  const geometrie = new THREE.CylinderGeometry(0.62, 1, 1, 7, 1);
  geometrie.translate(0, 0.5, 0);   // origine à la BASE, pas au centre

  const cartes = cartesDe(motifSable({ graine: 33, teinte: [178, 128, 86] }), 3);
  const matiere = new THREE.MeshStandardMaterial({
    ...cartes, color: DESERT.roche, roughness: 1, metalness: 0, flatShading: true,
  });

  const buttes = new THREE.InstancedMesh(geometrie, matiere, poses.length);
  buttes.name = 'formations';
  buttes.castShadow = false;
  buttes.receiveShadow = false;
  // Aucune matrice ne changera plus : autant le dire au moteur, qui cesse alors
  // de les relire à chaque image.
  buttes.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const matrice = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const echelle = new THREE.Vector3();

  poses.forEach((pose, i) => {
    position.set(pose.x, ASSISE + pose.y, pose.z);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pose.rotation);
    echelle.set(pose.rayonX, pose.hauteur, pose.rayonZ);
    buttes.setMatrixAt(i, matrice.compose(position, quaternion, echelle));
  });
  buttes.instanceMatrix.needsUpdate = true;
  return buttes;
}

// ─── Voiles de poussière ────────────────────────────────────────────────────

const VOILE_VERTEX = /* glsl */`
  varying vec2 vUv;
  varying float vHauteur;
  void main() {
    vUv = uv;
    vHauteur = uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const VOILE_FRAGMENT = /* glsl */`
  uniform float temps;
  uniform float vitesse;
  uniform float densite;
  uniform vec3 basse;
  uniform vec3 haute;
  varying vec2 vUv;
  varying float vHauteur;

  float alea(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float bruit(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(alea(i), alea(i + vec2(1.0, 0.0)), u.x),
               mix(alea(i + vec2(0.0, 1.0)), alea(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    // uv.x fait le tour du cylindre : le décaler fait passer la poussière
    // DEVANT le paysage, ce qui est exactement le mouvement d'une rafale.
    vec2 uv = vec2(vUv.x * 6.0 + temps * vitesse, vUv.y * 2.0);
    float masse = bruit(uv * 2.0) * 0.6
                + bruit(uv * 5.0 - vec2(temps * vitesse * 0.5, 0.0)) * 0.4;

    // La poussière est lourde : dense au sol, quasi nulle en hauteur. Une
    // densité uniforme se lit comme un cylindre teinté, pas comme du vent.
    float poids = 1.0 - smoothstep(0.02, 0.85, vHauteur);
    float opacite = smoothstep(0.35, 0.95, masse) * poids * densite;

    // Abandon des fragments quasi transparents. Un rideau de poussière couvre
    // une grande part de l'écran mais n'est VRAIMENT visible que par plaques :
    // sans ce rejet, on paie le mélange sur chaque pixel du cylindre pour ne
    // rien y déposer. C'est le seul poste de dépense notable de tout
    // l'extérieur — la mesure a montré que ce ne sont ni les triangles du
    // terrain ni les buttes qui coûtent, mais le remplissage transparent.
    if (opacite < 0.02) discard;

    gl_FragColor = vec4(mix(basse, haute, masse), opacite);
  }
`;

/**
 * Deux rideaux de poussière entre le joueur et l'horizon.
 *
 * Des cylindres ouverts, vus de l'intérieur, et non des panneaux orientés vers
 * la caméra : un cylindre est toujours de face, quel que soit le regard, sans
 * une ligne de code d'orientation et sans jamais montrer sa tranche. Deux
 * rayons différents donnent la parallaxe — c'est le décalage entre les deux qui
 * fait sentir la distance, une seule couche glisserait comme un calque.
 *
 * Sans écriture de profondeur : deux surfaces transparentes qui s'écrivent
 * mutuellement dans le tampon se découpent l'une l'autre en franges.
 */
export function voiles() {
  const groupe = new THREE.Group();
  groupe.name = 'voiles_poussiere';
  const matieres = [];

  for (const { rayon, hauteur, vitesse, densite } of [
    { rayon: 52, hauteur: 30, vitesse: 0.030, densite: 0.42 },
    { rayon: 104, hauteur: 52, vitesse: 0.017, densite: 0.55 },
  ]) {
    const matiere = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      fog: false,
      uniforms: {
        temps: { value: 0 },
        vitesse: { value: vitesse },
        densite: { value: densite },
        basse: { value: new THREE.Color(DESERT.poussiere) },
        haute: { value: new THREE.Color(DESERT.zenith) },
      },
      vertexShader: VOILE_VERTEX,
      fragmentShader: VOILE_FRAGMENT,
    });
    const voile = new THREE.Mesh(
      new THREE.CylinderGeometry(rayon, rayon, hauteur, 24, 1, true), matiere);
    voile.position.y = ASSISE + hauteur / 2 - 5;
    voile.renderOrder = 1;
    groupe.add(voile);
    matieres.push(matiere);
  }

  groupe.userData.animer = (temps) => {
    for (const matiere of matieres) matiere.uniforms.temps.value = temps;
  };
  return groupe;
}

// ─── Ciel ───────────────────────────────────────────────────────────────────

/**
 * Ciel de tempête : un dôme dégradé, parcouru de voiles de poussière.
 *
 * Un dôme et non une couleur de fond : une couleur unie n'a pas d'horizon, donc
 * pas d'échelle, et le dehors paraîtrait peint sur la vitre. Le dégradé
 * vertical suffit à placer une ligne d'horizon, et c'est elle qui donne au
 * désert sa profondeur.
 *
 * Sa couleur à l'horizon est EXACTEMENT celle de la brume. C'est ce qui permet
 * au terrain de s'arrêter à cent soixante-dix mètres sans qu'aucune arête ne se
 * voie : là où il finit, il est déjà entièrement remplacé par la couleur du
 * ciel qui le prolonge.
 */
export function cielDeTempete() {
  const materiau = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      temps: { value: 0 },
      sable: { value: new THREE.Color(DESERT.sable) },
      poussiere: { value: new THREE.Color(DESERT.poussiere) },
      zenith: { value: new THREE.Color(DESERT.zenith) },
    },
    vertexShader: /* glsl */`
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float temps;
      uniform vec3 sable;
      uniform vec3 poussiere;
      uniform vec3 zenith;
      varying vec3 vPosition;

      // Bruit de valeur : assez pour de la poussière, et sans table à charger.
      float alea(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float bruit(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(alea(i), alea(i + vec2(1.0, 0.0)), u.x),
                   mix(alea(i + vec2(0.0, 1.0)), alea(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      void main() {
        vec3 direction = normalize(vPosition);
        float hauteur = clamp(direction.y, 0.0, 1.0);

        // Deux fondus successifs : sol → poussière → zénith. Un seul fondu
        // donnerait un dégradé linéaire, qu'aucun ciel réel ne produit.
        // L'horizon est la zone la plus chargée, donc la plus CLAIRE : c'est la
        // masse de poussière qui s'y accumule qui blanchit le bas du ciel.
        vec3 couleur = mix(poussiere, sable, smoothstep(0.0, 0.22, hauteur));
        couleur = mix(couleur, zenith, smoothstep(0.18, 0.75, hauteur));

        // Voiles de poussière : trois couches, vitesses et échelles distinctes.
        vec2 uv = vec2(atan(direction.z, direction.x) * 1.6, direction.y * 2.4);
        float voile = bruit(uv * 3.0 + vec2(temps * 0.05, 0.0)) * 0.5
                    + bruit(uv * 7.0 - vec2(temps * 0.11, temps * 0.02)) * 0.3
                    + bruit(uv * 15.0 + vec2(temps * 0.19, 0.0)) * 0.2;

        // La poussière ÉCLAIRCIT. Elle diffuse la lumière du soleil au lieu de
        // la bloquer : un ciel de tempête est laiteux, jamais charbonneux. La
        // première version mélangeait vers la couleur sombre du sable, et
        // produisait une masse noire au milieu du ciel qu'on a longtemps prise
        // pour une dune, puis pour la toiture — c'était le ciel lui-même.
        float densite = (1.0 - smoothstep(0.0, 0.6, hauteur)) * 0.35;
        couleur = mix(couleur, zenith, voile * densite);

        gl_FragColor = vec4(couleur, 1.0);
      }
    `,
  });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(RAYON, 32, 20), materiau);
  dome.name = 'ciel_tempete';
  // Le ciel ne doit jamais être écarté par le tri de profondeur ni éliminé par
  // le volume de vue : il entoure la caméra en permanence.
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  dome.userData.animer = (temps) => { materiau.uniforms.temps.value = temps; };
  return dome;
}

/**
 * L'extérieur complet, prêt à ajouter à une scène.
 *
 * Quatre appels de dessin en tout : le ciel, le terrain, les buttes, les deux
 * voiles — cinq, en comptant honnêtement. Construit UNE fois pour la partie
 * entière : changer de chambre ne le reconstruit pas, parce que le désert, lui,
 * n'a pas changé.
 *
 * @returns {{groupe: THREE.Group, animer: (temps: number) => void, brume: THREE.FogExp2}}
 */
export function dehors({ graine = 5 } = {}) {
  const groupe = new THREE.Group();
  groupe.name = 'dehors';
  const ciel = cielDeTempete();
  const rideaux = voiles();
  const sol = terrain({ graine });
  groupe.add(ciel, sol, formations({ graine }), rideaux);

  // Brume exponentielle plutôt que linéaire : elle est négligeable sur les
  // douze mètres d'une chambre et écrasante à cent cinquante mètres. Une brume
  // linéaire réglée pour noyer l'horizon voilerait aussi le laboratoire.
  const brume = new THREE.FogExp2(DESERT.poussiere, DESERT.brume);

  return {
    groupe,
    brume,
    animer: (temps) => {
      ciel.userData.animer(temps);
      rideaux.userData.animer(temps);
    },
    // Appelée au chargement d'une chambre : le sable doit s'écarter là où la
    // salle a un gouffre, sinon il affleure à trente-cinq centimètres dans le
    // trou et l'on voit du désert au fond d'une fosse de laboratoire.
    creuser: (trou) => sol.userData.creuser(trou),
  };
}

/**
 * Lumière du ciel et du sable : ce qui éclaire par en DESSOUS.
 *
 * Un désert renvoie une part énorme de la lumière qu'il reçoit. Sans cette
 * remontée, tout ce qui regarde vers le bas — le dessous de l'ossature, le
 * revers des meneaux, les sous-faces de la verrière — ne reçoit rien et devient
 * NOIR. La toiture se lisait alors comme une masse opaque au-dessus de la
 * salle, et aucun changement de matière n'y pouvait rien : le défaut n'était
 * pas la couleur des pièces mais l'absence de lumière pour la révéler.
 *
 * Une hémisphérique et non une ambiante uniforme : elle distingue le haut du
 * bas, donc le volume reste lisible. Une ambiante à la même intensité aurait
 * aplati toute la scène.
 */
export function cieletSable({ intensite = 0.5 } = {}) {
  const lumiere = new THREE.HemisphereLight(DESERT.zenith, DESERT.sol, intensite);
  lumiere.name = 'ciel_et_sable';
  lumiere.position.set(0, 1, 0);
  return lumiere;
}

/**
 * Soleil filtré par la tempête : chaud, bas, et volontairement peu contrasté.
 *
 * Une lumière blanche et franche démentirait le ciel : on ne voit pas d'ombres
 * nettes au milieu d'une tempête de sable. L'ambiance reprend donc une part de
 * ce que le soleil perd, sans quoi l'intérieur deviendrait illisible.
 */
export function soleilDeTempete({ portee = 26 } = {}) {
  // Plus faible depuis que la toiture est pleine : le jour n'entre plus que par
  // la baie. Une directionnelle réglée pour un plafond de verre écrase tout dès
  // que le verre disparaît — l'exposition est un équilibre, pas une constante.
  const lumiere = new THREE.DirectionalLight(0xffbf7a, 1.5);
  lumiere.name = 'soleil_tempete';
  lumiere.position.set(-9, 11, 6);
  lumiere.castShadow = true;
  lumiere.shadow.mapSize.set(2048, 2048);
  lumiere.shadow.camera.near = 1;
  lumiere.shadow.camera.far = 60;
  lumiere.shadow.camera.left = -portee;
  lumiere.shadow.camera.right = portee;
  lumiere.shadow.camera.top = portee;
  lumiere.shadow.camera.bottom = -portee;
  lumiere.shadow.bias = -0.0006;
  lumiere.shadow.normalBias = 0.02;
  return lumiere;
}
