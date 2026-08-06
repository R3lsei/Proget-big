// vegetation.js — Vraies plantes, instanciées (T-021).
//
// Trois tentatives de feuillage procédural ont produit, dans l'ordre : du
// confetti vert, un feu d'artifice, puis des roseaux clairsemés. La structure
// était juste — feuilles sur tiges, tiges enracinées séparément — mais une
// plante générée par formule ne fait pas illusion. Le problème n'était pas le
// réglage, c'était l'approche.
//
// Ce module charge de vrais modèles et les répète par instanciation.
//
// ─── Pourquoi ne pas simplement cloner le modèle ─────────────────────────────
// `gltf.scene.clone()` par plante donne autant d'appels de dessin que de plantes.
// Trente plantes dans une chambre coûteraient trente fois le prix d'une. On
// extrait donc géométrie et matériau du modèle chargé pour bâtir un
// `InstancedMesh` : trente plantes coûtent alors le prix d'une.
//
// ─── Repli assumé ────────────────────────────────────────────────────────────
// Si les modèles sont absents ou que le réseau manque, le feuillage procédural
// de `kit.js` reprend la main. Une chambre laide reste jouable ; une chambre qui
// ne charge pas ne l'est pas.

import * as THREE from 'three';

/** Espèces disponibles, et ce qu'elles racontent du lieu. */
export const ESPECES = Object.freeze({
  plante_pot: {
    fichier: 'models/vegetation/plante-pot.glb',
    hauteur: 0.84,
    // CC-BY 4.0 : l'attribution doit apparaître dans le jeu, pas seulement dans
    // le dépôt. Voir models/vegetation/CREDITS.md.
    attributionRequise: true,
    usage: 'soigne',
  },
  plante_pot_loin: {
    // Même plante, simplifiée à 12 %. Le premier rendu massé atteignait
    // 5,7 millions de triangles pour trente-six plantes — le modèle de près est
    // détaillé pour être vu de près, pas répété au fond d'une salle.
    fichier: 'models/vegetation/plante-pot-loin.glb',
    hauteur: 0.84,
    attributionRequise: true,
    usage: 'soigne',
  },
  fleurs_vase: {
    fichier: 'models/vegetation/fleurs-vase.glb',
    hauteur: 0.42,
    attributionRequise: false,
    usage: 'soigne',
  },
});

const chargees = new Map();

/**
 * Parties instanciables d'un modèle : une géométrie, un matériau, une transformation.
 *
 * Un modèle glTF est un arbre de maillages ; l'instanciation travaille sur des
 * maillages plats. On aplatit donc l'arbre en appliquant les transformations
 * parentes, sans quoi les feuilles se retrouveraient à l'origine et le pot
 * ailleurs.
 */
function extraireParties(racine) {
  const parties = [];
  racine.updateMatrixWorld(true);
  racine.traverse((noeud) => {
    if (!noeud.isMesh) return;
    parties.push({
      geometrie: noeud.geometry,
      materiau: noeud.material,
      locale: noeud.matrixWorld.clone(),
    });
  });
  return parties;
}

/**
 * Charge une espèce. Renvoie `null` plutôt que de lever si elle est indisponible.
 *
 * Un modèle manquant ne doit pas empêcher de jouer : c'est une dégradation
 * visuelle, pas une panne. L'appelant se rabat sur le feuillage procédural.
 */
export async function chargerEspece(nom, chargeur, base = '') {
  if (chargees.has(nom)) return chargees.get(nom);
  const espece = ESPECES[nom];
  if (!espece) return null;

  try {
    const gltf = await chargeur.loadAsync(base + espece.fichier);
    const parties = extraireParties(gltf.scene);
    for (const partie of parties) {
      partie.materiau.side = THREE.DoubleSide;
      partie.materiau.shadowSide = THREE.DoubleSide;
    }
    const charge = { nom, ...espece, parties };
    chargees.set(nom, charge);
    return charge;
  } catch (erreur) {
    console.warn(`Végétation : « ${nom} » indisponible, repli procédural.`, erreur.message);
    chargees.set(nom, null);
    return null;
  }
}

/** Générateur déterministe, identique à celui du kit : un décor doit être reproductible. */
function hasard(graine) {
  let etat = graine >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

/**
 * Massif de plantes : une espèce répétée, en instances.
 *
 * @param {object} espece   résultat de `chargerEspece`
 * @param {object} options  nombre, étendue, échelle, aplatissement, graine
 * @returns {THREE.Group}   un groupe coûtant autant d'appels que le modèle a de parties
 */
export function massif(espece, {
  nombre = 6, etendue = 1, echelle = 1, aplatissement = 1, graine = 1,
} = {}) {
  const groupe = new THREE.Group();
  groupe.name = `massif_${espece.nom}_${nombre}`;

  const suivant = hasard(graine);
  const placements = [];
  for (let i = 0; i < nombre; i++) {
    const pose = new THREE.Matrix4();
    const facteur = echelle * (0.75 + suivant() * 0.5);
    pose.compose(
      new THREE.Vector3(
        (suivant() - 0.5) * 2 * etendue,
        0,
        (suivant() - 0.5) * 2 * etendue * aplatissement),
      // Rotation autour de la verticale seulement : une plante couchée sur le
      // flanc trahit immédiatement la répétition.
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), suivant() * Math.PI * 2),
      new THREE.Vector3(facteur, facteur, facteur));
    placements.push(pose);
  }

  for (const partie of espece.parties) {
    const instances = new THREE.InstancedMesh(
      partie.geometrie, partie.materiau, nombre);
    instances.castShadow = true;
    instances.receiveShadow = true;
    for (let i = 0; i < nombre; i++) {
      instances.setMatrixAt(i, placements[i].clone().multiply(partie.locale));
    }
    instances.instanceMatrix.needsUpdate = true;
    groupe.add(instances);
  }
  return groupe;
}

/**
 * Espèces chargées qui exigent une attribution dans le jeu.
 *
 * Sert à alimenter l'écran de crédits automatiquement. Une attribution tenue à
 * la main finit toujours par diverger de ce que le jeu embarque réellement —
 * et une licence qu'on ne respecte plus se découvre juste avant une publication.
 */
export function attributionsRequises() {
  return [...chargees.values()]
    .filter((espece) => espece && espece.attributionRequise)
    .map((espece) => espece.nom);
}
