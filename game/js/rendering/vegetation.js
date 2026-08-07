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

  // ─── Lot Stylized Nature (Quaternius) ─────────────────────────────────────
  //
  // CC0 1.0 : domaine public, aucune attribution exigée. C'est la meilleure
  // licence possible pour un jeu qu'on veut publier — celle qui ne crée aucune
  // dette. Les crédits restent écrits par correction, pas par obligation.
  //
  // Dix-neuf modèles retenus sur les soixante-huit du lot. Le reste est
  // constitué d'arbres de plein champ de plusieurs mètres, sans emploi dans un
  // complexe sous verrière à 3,6 m sous plafond. Tout importer parce que c'est
  // gratuit n'aurait alourdi le jeu que de fichiers jamais vus.
  herbe_courte: {
    fichier: 'models/vegetation/herbe-courte.glb',
    emprise: 0.74,
    hauteur: 1.33,
    attributionRequise: false,
    usage: 'envahi',
  },
  herbe_haute: {
    fichier: 'models/vegetation/herbe-haute.glb',
    emprise: 0.99,
    hauteur: 1.87,
    attributionRequise: false,
    usage: 'envahi',
  },
  herbe_fine_courte: {
    fichier: 'models/vegetation/herbe-fine-courte.glb',
    emprise: 1.32,
    hauteur: 1.07,
    attributionRequise: false,
    usage: 'envahi',
  },
  herbe_fine_haute: {
    fichier: 'models/vegetation/herbe-fine-haute.glb',
    emprise: 1.59,
    hauteur: 1.67,
    attributionRequise: false,
    usage: 'envahi',
  },
  trefle_1: {
    fichier: 'models/vegetation/trefle-1.glb',
    emprise: 0.8,
    hauteur: 1.14,
    attributionRequise: false,
    usage: 'envahi',
  },
  trefle_2: {
    fichier: 'models/vegetation/trefle-2.glb',
    emprise: 0.85,
    hauteur: 1.26,
    attributionRequise: false,
    usage: 'envahi',
  },
  fougere: {
    fichier: 'models/vegetation/fougere.glb',
    emprise: 9.05,
    hauteur: 2.69,
    attributionRequise: false,
    usage: 'envahi',
  },
  plante_1: {
    fichier: 'models/vegetation/plante-1.glb',
    emprise: 1.39,
    hauteur: 1.01,
    attributionRequise: false,
    usage: 'envahi',
  },
  plante_1_grande: {
    fichier: 'models/vegetation/plante-1-grande.glb',
    emprise: 3.13,
    hauteur: 3.76,
    attributionRequise: false,
    usage: 'envahi',
  },
  plante_7: {
    fichier: 'models/vegetation/plante-7.glb',
    emprise: 1.05,
    hauteur: 0.33,
    attributionRequise: false,
    usage: 'envahi',
  },
  plante_7_grande: {
    fichier: 'models/vegetation/plante-7-grande.glb',
    emprise: 1.36,
    hauteur: 0.3,
    attributionRequise: false,
    usage: 'envahi',
  },
  buisson: {
    fichier: 'models/vegetation/buisson.glb',
    emprise: 1.97,
    hauteur: 1.58,
    attributionRequise: false,
    usage: 'envahi',
  },
  buisson_fleuri: {
    fichier: 'models/vegetation/buisson-fleuri.glb',
    emprise: 1.97,
    hauteur: 1.58,
    attributionRequise: false,
    usage: 'envahi',
  },
  champignon: {
    fichier: 'models/vegetation/champignon.glb',
    emprise: 0.78,
    hauteur: 0.46,
    attributionRequise: false,
    usage: 'envahi',
  },
  fleurs_3: {
    fichier: 'models/vegetation/fleurs-3.glb',
    emprise: 1.59,
    hauteur: 2.05,
    attributionRequise: false,
    usage: 'envahi',
  },
  fleurs_4: {
    fichier: 'models/vegetation/fleurs-4.glb',
    emprise: 1.78,
    hauteur: 2.49,
    attributionRequise: false,
    usage: 'envahi',
  },
  caillou_1: {
    fichier: 'models/vegetation/caillou-1.glb',
    emprise: 0.5,
    hauteur: 0.1,
    attributionRequise: false,
    usage: 'envahi',
  },
  caillou_2: {
    fichier: 'models/vegetation/caillou-2.glb',
    emprise: 0.48,
    hauteur: 0.1,
    attributionRequise: false,
    usage: 'envahi',
  },
  rocher: {
    fichier: 'models/vegetation/rocher.glb',
    emprise: 3.23,
    hauteur: 2.26,
    attributionRequise: false,
    usage: 'envahi',
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
 * Plante un semis : une InstancedMesh par espèce, quel qu'en soit le nombre.
 *
 * Le semis vient de `semis.js`, qui a déjà répondu à la seule question qui
 * compte — où est-ce qu'une plante a le droit de pousser. Ici on ne décide plus
 * rien, on matérialise : mélanger placement et rendu remettrait la contrainte
 * de sol dans un module que l'on ne peut pas tester sans WebGL.
 *
 * @param {{espece:string,x:number,z:number,rotation:number,echelle:number}[]} semis
 * @param {Map<string, object>} especes  espèces chargées, par nom
 * @returns {THREE.Group}
 */
export function planterSemis(semis, especes) {
  const groupe = new THREE.Group();
  groupe.name = 'verdure';

  // Regroupement par espèce : cinquante plantes de six espèces coûtent six
  // appels de dessin, pas cinquante. C'est la différence entre une salle
  // verdoyante à 120 images par seconde et la même à 30.
  const parEspece = new Map();
  for (const pousse of semis) {
    if (!parEspece.has(pousse.espece)) parEspece.set(pousse.espece, []);
    parEspece.get(pousse.espece).push(pousse);
  }

  for (const [nom, pousses] of parEspece) {
    const espece = especes.get(nom);
    // Un modèle absent dégrade le décor, il n'interrompt pas la partie : on
    // saute l'espèce. Le jeu reste jouable avec moins de verdure, ce qui vaut
    // infiniment mieux qu'un écran noir.
    if (!espece) continue;

    const poses = pousses.map((p) => {
      // `echelle` arrive déjà mise à l'échelle du jeu : c'est `semis.js` qui a
      // calculé le facteur, parce que c'est lui qui a réservé la place au sol.
      // Le recalculer ici ferait diverger l'espace réservé et l'espace occupé.
      const facteur = p.echelle;
      return new THREE.Matrix4().compose(
        new THREE.Vector3(p.x, 0, p.z),
        // Rotation autour de la verticale seulement : une plante couchée sur le
        // flanc trahit immédiatement la répétition.
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotation),
        new THREE.Vector3(facteur, facteur, facteur));
    });

    for (const partie of espece.parties) {
      const instances = new THREE.InstancedMesh(
        partie.geometrie, partie.materiau, poses.length);
      instances.castShadow = true;
      instances.receiveShadow = true;
      for (let i = 0; i < poses.length; i++) {
        instances.setMatrixAt(i, poses[i].clone().multiply(partie.locale));
      }
      instances.instanceMatrix.needsUpdate = true;
      groupe.add(instances);
    }
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
