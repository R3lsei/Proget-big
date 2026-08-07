// posttraitement.js — Ce qui sépare une maquette d'un jeu (T-032).
//
// Le décor était géométriquement juste et visuellement mort : des aplats de
// couleur, des arêtes vives, aucune profondeur. Le réflexe est d'aller chercher
// des modèles 3D plus détaillés. C'est le mauvais réflexe, et il aggrave le
// problème : un modèle photoréaliste posé contre un mur en aplat ne relève pas
// le mur, il souligne qu'il est plat. Le mélange de styles est la façon la plus
// sûre de faire amateur.
//
// Ce qui produit vraiment le regard « Portal » et le regard « Fortnite » n'est
// pas la densité des modèles — Fortnite tient sur des formes simples — mais le
// TRAITEMENT de l'image : les sources vives débordent, les couleurs sont
// étalonnées, les bords de l'écran s'assombrissent. Trois effets, appliqués à
// n'importe quelle géométrie, et la même scène change de nature.
//
// ─── Ordre des passes, et pourquoi celui-là ─────────────────────────────────
//
//   rendu → floraison → sortie → étalonnage(écran)
//
// La floraison travaille AVANT la sortie, donc sur des valeurs linéaires non
// bornées : c'est la seule façon qu'une lampe à 4,0 déborde plus qu'un mur
// blanc à 1,0. Après conversion, les deux seraient à 1,0 et la floraison
// baverait sur tout le décor.
//
// L'étalonnage travaille APRÈS, donc en valeurs d'affichage. Le contraste et la
// saturation sont des notions d'écran : « pivoter autour de 0,5 » n'a de sens
// que là. Faites-le en linéaire et les tons moyens partent en vrille.

import * as THREE from 'three';
import { EffectComposer } from '../../lib/post/EffectComposer.js';
import { RenderPass } from '../../lib/post/RenderPass.js';
import { ShaderPass } from '../../lib/post/ShaderPass.js';
import { UnrealBloomPass } from '../../lib/post/UnrealBloomPass.js';
import { OutputPass } from '../../lib/post/OutputPass.js';

/**
 * Réglages de l'image. Gelés : ce sont des décisions de direction artistique,
 * pas des variables que le code ajuste en cours de partie.
 */
export const REGLAGES = Object.freeze({
  floraison: Object.freeze({
    // Assez pour que les voyants rayonnent, pas assez pour noyer les murs. Une
    // force au-delà de 1 transforme le décor en brouillard lumineux — le défaut
    // le plus courant du bloom, et le plus vite fatigant.
    force: 0.32,
    rayon: 0.32,
    // Seuil haut : SEULES les sources vives débordent. Un seuil bas ferait
    // briller les murs blancs, qui sont la plus grande surface de la scène.
    seuil: 0.90,
  }),
  etalonnage: Object.freeze({
    contraste: 1.10,
    saturation: 1.14,
    // Ombres froides, lumières chaudes : c'est la signature de Portal, et cela
    // suffit à donner une identité à une palette qui n'en avait aucune.
    teinteOmbres: Object.freeze([0.88, 0.95, 1.12]),
    teinteLumieres: Object.freeze([1.03, 1.005, 0.985]),
    // Assombrit les bords. Concentre le regard vers le centre, où se joue
    // l'énigme, et cache la pauvreté des angles du champ de vision.
    vignettage: 0.42,
  }),
});

/**
 * Étalonnage : contraste, saturation, virage partiel, vignettage.
 *
 * Un seul nuanceur pour les quatre. Les séparer en quatre passes coûterait
 * quatre lectures et quatre écritures de l'image entière pour des opérations
 * qui tiennent en dix lignes.
 */
export const ETALONNAGE = {
  name: 'Etalonnage',
  uniforms: {
    tDiffuse: { value: null },
    contraste: { value: REGLAGES.etalonnage.contraste },
    saturation: { value: REGLAGES.etalonnage.saturation },
    teinteOmbres: { value: new THREE.Vector3(...REGLAGES.etalonnage.teinteOmbres) },
    teinteLumieres: { value: new THREE.Vector3(...REGLAGES.etalonnage.teinteLumieres) },
    vignettage: { value: REGLAGES.etalonnage.vignettage },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float contraste;
    uniform float saturation;
    uniform vec3 teinteOmbres;
    uniform vec3 teinteLumieres;
    uniform float vignettage;
    varying vec2 vUv;

    void main() {
      vec4 source = texture2D(tDiffuse, vUv);
      vec3 couleur = source.rgb;

      // Luminance perçue (Rec. 709) : le vert pèse davantage que le bleu parce
      // que l'œil y est plus sensible. Une moyenne simple ferait virer les
      // teintes en désaturant.
      float luminance = dot(couleur, vec3(0.2126, 0.7152, 0.0722));

      couleur = mix(vec3(luminance), couleur, saturation);
      couleur = (couleur - 0.5) * contraste + 0.5;

      // Virage partiel : les ombres tirent vers le froid, les lumières vers le
      // chaud. Le fondu suit la luminance, donc les tons moyens restent neutres.
      couleur *= mix(teinteOmbres, teinteLumieres, smoothstep(0.0, 1.0, luminance));

      vec2 ecart = vUv - 0.5;
      couleur *= 1.0 - dot(ecart, ecart) * vignettage;

      gl_FragColor = vec4(clamp(couleur, 0.0, 1.0), source.a);
    }
  `,
};

/**
 * Ordre des passes, sous forme de données.
 *
 * Décrit ici plutôt que déduit du composeur, pour qu'un test puisse vérifier
 * l'ordre sans WebGL — indisponible en test. Une inversion entre floraison et
 * sortie ne planterait pas : elle rendrait juste l'image fausse, silencieusement.
 */
export const PLAN = Object.freeze(['rendu', 'floraison', 'sortie', 'etalonnage']);

/**
 * Construit la chaîne de post-traitement.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {{largeur: number, hauteur: number}} taille
 */
export function creerComposeur(renderer, scene, camera, { largeur, hauteur }) {
  const composeur = new EffectComposer(renderer);
  composeur.setSize(largeur, hauteur);

  composeur.addPass(new RenderPass(scene, camera));

  const floraison = new UnrealBloomPass(
    new THREE.Vector2(largeur, hauteur),
    REGLAGES.floraison.force,
    REGLAGES.floraison.rayon,
    REGLAGES.floraison.seuil,
  );
  composeur.addPass(floraison);

  // Applique la cartographie tonale du renderer et la conversion sRGB. Sans
  // elle, la scène s'affiche délavée : le composeur court-circuite la sortie
  // que le renderer ferait tout seul.
  composeur.addPass(new OutputPass());

  const etalonnage = new ShaderPass(ETALONNAGE);
  etalonnage.renderToScreen = true;
  composeur.addPass(etalonnage);

  return { composeur, floraison, etalonnage };
}

/**
 * Redimensionne toute la chaîne.
 *
 * La floraison garde sa propre résolution interne : l'oublier laisse ses tampons
 * à l'ancienne taille, et le halo se décale du reste de l'image.
 */
export function redimensionner(chaine, largeur, hauteur) {
  chaine.composeur.setSize(largeur, hauteur);
  chaine.floraison.setSize(largeur, hauteur);
}
