// models.js — Import de vrais modèles 3D (.glb / .gltf).
//
// Déposez vos fichiers dans game/models/ en les nommant d'après le prop qu'ils
// remplacent (microscope.glb, tabouret.glb…). Le jeu les charge au démarrage et
// les utilise à la place des versions modélisées en primitives. Tout fichier
// absent laisse simplement la version procédurale en place : le jeu fonctionne
// sans aucun modèle importé.
//
// Où trouver des modèles libres : poly.pizza, kenney.nl, quaternius.com
// (licences CC0/CC-BY), ou générez-les depuis vos objets scannés avec le pont
// Tripo3D déjà intégré (voir README).

import * as THREE from 'three';
import { GLTFLoader } from '../lib/GLTFLoader.js';
import { DRACOLoader } from '../lib/DRACOLoader.js';
import { MeshoptDecoder } from '../lib/meshopt_decoder.module.js';

// Nom du fichier -> encombrement attendu dans le jeu, en mètres.
// Le modèle importé est redimensionné pour tenir dans cette boîte, quelle que
// soit son échelle d'origine (les exports varient du centimètre au décamètre).
export const PROPS_REMPLACABLES = {
  microscope:  { taille: [0.28, 0.30, 0.28], pose: 'sol' },
  tabouret:    { taille: [0.46, 0.62, 0.46], pose: 'sol' },
  paillasse:   { taille: [2.40, 0.95, 0.78], pose: 'sol' },
  chariot:     { taille: [0.62, 0.90, 0.46], pose: 'sol' },
  caisse:      { taille: [0.90, 0.90, 0.90], pose: 'sol' },
  bidon:       { taille: [0.60, 0.88, 0.60], pose: 'sol' },
  serveur:     { taille: [0.95, 2.50, 1.40], pose: 'sol' },
  lit:         { taille: [0.82, 0.50, 1.95], pose: 'sol' },
  armoire:     { taille: [1.05, 2.00, 0.50], pose: 'sol' },
  lavabo:      { taille: [0.50, 0.95, 0.45], pose: 'sol' },
  terminal:    { taille: [0.56, 0.60, 0.30], pose: 'sol' },
  chien:       { taille: [1.00, 0.75, 0.35], pose: 'sol' },
  becher:      { taille: [0.10, 0.18, 0.10], pose: 'sol' },
  portoir:     { taille: [0.26, 0.14, 0.07], pose: 'sol' },
};

const charges = new Map();   // nom -> THREE.Group prêt à cloner
let actif = false;

/** Un modèle importé est-il disponible pour ce prop ? */
export function aModele(nom) {
  return charges.has(nom);
}

export function modelesActifs() {
  return actif;
}

/** Renvoie une copie du modèle importé, mise à l'échelle et posée au sol. */
export function modele(nom) {
  const source = charges.get(nom);
  if (!source) return null;
  return source.clone(true);
}

/**
 * Charge tous les modèles présents dans game/models/.
 * Le manifeste est optionnel : sans lui on tente chaque nom connu, et un 404
 * signifie simplement « pas de modèle pour ce prop ».
 */
export async function chargerModeles(base = 'models/') {
  const loader = new GLTFLoader();

  // Un modèle « optimisé » est presque toujours compressé : DRACO pour la
  // géométrie, meshopt pour les flux de vertices. Sans ces décodeurs, le
  // chargement échoue avec « No DRACOLoader instance provided ».
  const draco = new DRACOLoader();
  draco.setDecoderPath('lib/draco/');
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);

  // serve.py génère ce manifeste depuis le contenu du dossier : on sait alors
  // exactement quoi charger. Sans lui (serveur statique quelconque) il faut
  // sonder chaque nom connu, ce qui remplit la console de 404 inoffensifs.
  let noms = null;
  try {
    const res = await fetch(base + 'manifest.json', { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.modeles)) noms = data.modeles;
    }
  } catch (_) { /* pas de manifeste */ }

  if (noms === null) {
    noms = Object.keys(PROPS_REMPLACABLES);
    console.info(
      '[NOVA-7] Pas de manifeste de modèles : sondage des noms connus. ' +
      'Les 404 qui suivent sont normaux (lancez le jeu avec `python serve.py` ' +
      'pour les éviter).'
    );
  }
  if (noms.length === 0) return 0;

  const essais = noms.map(async (nom) => {
    const spec = PROPS_REMPLACABLES[nom];
    if (!spec) return;
    for (const ext of ['.glb', '.gltf']) {
      const url = base + nom + ext;
      try {
        // HEAD d'abord : évite de laisser GLTFLoader hurler sur un 404
        const tete = await fetch(url, { method: 'HEAD' });
        if (!tete.ok) continue;
      } catch (_) { continue; }

      try {
        const gltf = await loader.loadAsync(url);
        const groupe = normaliser(gltf.scene, spec);
        charges.set(nom, groupe);
        return;
      } catch (_) { /* fichier illisible : on garde le procédural */ }
    }
  });

  await Promise.all(essais);
  actif = charges.size > 0;
  if (actif) {
    console.info(`[NOVA-7] Modèles 3D importés : ${[...charges.keys()].join(', ')}`);
  }
  return charges.size;
}

/**
 * Recentre le modèle sur son empreinte au sol et le met à l'échelle du jeu.
 * Sans cela un modèle exporté en centimètres apparaîtrait minuscule, et un
 * modèle non centré flotterait à côté de son emplacement.
 */
function normaliser(scene, spec) {
  const groupe = new THREE.Group();
  groupe.add(scene);

  const boite = new THREE.Box3().setFromObject(scene);
  const dim = boite.getSize(new THREE.Vector3());
  const [lx, ly, lz] = spec.taille;

  // on conserve les proportions du modèle : facteur limitant sur les 3 axes
  const facteur = Math.min(
    lx / Math.max(dim.x, 1e-6),
    ly / Math.max(dim.y, 1e-6),
    lz / Math.max(dim.z, 1e-6)
  );
  if (Number.isFinite(facteur) && facteur > 0) scene.scale.setScalar(facteur);

  // recentre en X/Z, pose la base sur y = 0
  groupe.updateMatrixWorld(true);
  const apres = new THREE.Box3().setFromObject(scene);
  const centre = apres.getCenter(new THREE.Vector3());
  scene.position.x -= centre.x;
  scene.position.z -= centre.z;
  scene.position.y -= apres.min.y;

  groupe.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
      // les exports GLTF arrivent souvent sans reflets d'environnement dosés
      if (n.material && 'envMapIntensity' in n.material) {
        n.material.envMapIntensity = 1;
      }
    }
  });
  return groupe;
}
