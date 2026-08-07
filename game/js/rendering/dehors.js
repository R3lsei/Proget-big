// dehors.js — Le désert derrière la verrière (T-038).
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
// C'est aussi ce qui justifie enfin la végétation : elle n'est pas décorative,
// elle est le signe que l'endroit n'est plus entretenu.
//
// ─── Ce que ce module ne fait pas ────────────────────────────────────────────
// Il ne connaît ni les chambres, ni les énigmes. Il fabrique un environnement
// qu'on voit à travers une vitre, et rien de plus.

import * as THREE from 'three';

/** Palette du dehors. Gelée : c'est une décision, pas un réglage. */
export const DESERT = Object.freeze({
  // Trois hauteurs de ciel, du sol vers le zénith. La bande basse est la plus
  // saturée : c'est là que la poussière est la plus dense, et c'est ce dégradé
  // qui dit « tempête » avant même que rien ne bouge.
  sable: 0x9c5a28,
  poussiere: 0xd98b45,
  zenith: 0xe8b877,
  sol: 0xc98d55,
  /** Portée de la brume. Au-delà, le désert disparaît dans la poussière. */
  brume: 0.021,
});

/** Rayon du dôme et du sol extérieurs, en mètres. */
const RAYON = 220;

/**
 * Ciel de tempête : un dôme dégradé, parcouru de voiles de poussière.
 *
 * Un dôme et non une couleur de fond : une couleur unie n'a pas d'horizon, donc
 * pas d'échelle, et le dehors paraîtrait peint sur la vitre. Le dégradé
 * vertical suffit à placer une ligne d'horizon, et c'est elle qui donne au
 * désert sa profondeur.
 *
 * Les voiles sont trois couches de bruit défilant à des vitesses différentes.
 * Une seule couche se lit comme une texture qui glisse ; trois, décalées, se
 * lisent comme de la matière en mouvement.
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
 * Sol du désert : un disque, posé sous le niveau du laboratoire.
 *
 * Légèrement en contrebas, pour que le complexe se lise comme POSÉ sur le
 * terrain plutôt qu'enfoncé dedans, et pour qu'aucune arête du sol extérieur ne
 * coïncide exactement avec le plancher intérieur — deux surfaces au même
 * niveau se battent pour le même pixel et scintillent.
 */
export function solDeDesert() {
  const materiau = new THREE.MeshStandardMaterial({
    color: DESERT.sol, roughness: 1, metalness: 0,
  });
  const disque = new THREE.Mesh(new THREE.CircleGeometry(RAYON * 0.95, 48), materiau);
  disque.name = 'sol_desert';
  disque.rotation.x = -Math.PI / 2;
  disque.position.y = -0.35;
  disque.receiveShadow = false;   // rien ne porte d'ombre à cette distance
  return disque;
}

/**
 * Dunes lointaines : quelques bosses qui cassent la ligne d'horizon.
 *
 * Un horizon parfaitement droit se lit comme un décor peint. Trois ou quatre
 * masses suffisent — elles seront à demi noyées dans la brume, donc leur forme
 * exacte n'a aucune importance.
 */
export function dunes(graine = 5) {
  const groupe = new THREE.Group();
  groupe.name = 'dunes';
  const materiau = new THREE.MeshStandardMaterial({
    color: DESERT.sol, roughness: 1, metalness: 0,
  });

  let etat = graine >>> 0;
  const suivant = () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };

  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + suivant() * 0.5;
    // Loin, et modestes. Trop près, une dune se dresse derrière le laboratoire
    // comme un mur et lui vole la vedette ; le rôle de l'horizon est de dire
    // l'étendue, pas d'occuper le cadre.
    const distance = 120 + suivant() * 130;
    const taille = 14 + suivant() * 24;
    const dune = new THREE.Mesh(new THREE.SphereGeometry(taille, 12, 8), materiau);
    const aplatissement = 0.28 + suivant() * 0.2;
    // Enfouies aux quatre cinquièmes : il ne doit émerger qu'une bosse. La
    // première version calculait l'enfouissement sur le rayon AVANT
    // aplatissement, si bien que le sommet de chaque dune restait sous le sol
    // et qu'aucune ne se voyait — l'horizon était resté parfaitement droit.
    dune.position.set(
      Math.cos(angle) * distance, -taille * aplatissement * 0.55, Math.sin(angle) * distance);
    dune.scale.set(1, aplatissement, 1);
    groupe.add(dune);
  }
  return groupe;
}

/**
 * L'extérieur complet, prêt à ajouter à une scène.
 *
 * @returns {{groupe: THREE.Group, animer: (temps: number) => void, brume: THREE.FogExp2}}
 */
export function dehors({ graine = 5 } = {}) {
  const groupe = new THREE.Group();
  groupe.name = 'dehors';
  const ciel = cielDeTempete();
  groupe.add(ciel, solDeDesert(), dunes(graine));

  // Brume exponentielle plutôt que linéaire : elle est négligeable sur les
  // douze mètres d'une chambre et écrasante à cent mètres. Une brume linéaire
  // réglée pour noyer l'horizon voilerait aussi l'intérieur du laboratoire.
  const brume = new THREE.FogExp2(DESERT.poussiere, DESERT.brume);

  return { groupe, brume, animer: (temps) => ciel.userData.animer(temps) };
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
export function cieletSable({ intensite = 1.35 } = {}) {
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
  const lumiere = new THREE.DirectionalLight(0xffbf7a, 2.4);
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
