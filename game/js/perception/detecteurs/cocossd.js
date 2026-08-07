// cocossd.js — Détecteur de repli : 80 classes figées, reconnues hors ligne.
//
// Ce n'est pas le détecteur visé. L'objectif du jeu est l'open-vocabulary — que
// n'importe quel objet montré soit reconnu. COCO-SSD ne connaît que 80 classes,
// mais il a deux qualités décisives pour un repli : il est léger, et il tourne
// partout sans WebGPU.
//
// Il vit derrière `detecteur.js`, donc le jour où le modèle ouvert fonctionne,
// on change ce fichier et rien d'autre.

/**
 * Correspondance classe COCO → nom de la base curatée.
 *
 * Toutes les classes de COCO n'y figurent pas : « traffic light » ou « giraffe »
 * n'ont rien à faire dans un complexe de recherche, et les faire entrer dans la
 * base pour la seule symétrie l'encombrerait de choses que personne ne montrera
 * jamais à sa webcam.
 *
 * Un test vérifie que chaque nom cité existe réellement dans la base : une faute
 * de frappe ici rendrait l'objet indétectable en silence.
 */
export const CLASSES = Object.freeze({
  // Outils et objets tranchants
  'scissors': 'ciseaux',
  'knife': 'couteau',
  'fork': 'fourchette',
  'spoon': 'cuillère',
  'toothbrush': 'brosse à dents',

  // Électronique
  'cell phone': 'téléphone',
  'laptop': 'ordinateur portable',
  'keyboard': 'clavier',
  'mouse': 'souris',
  'remote': 'télécommande',
  'tv': 'écran',
  'clock': 'horloge',

  // Contenants et liquides
  'bottle': 'bouteille',
  'cup': 'tasse',
  'wine glass': 'verre',
  'bowl': 'bol',
  'vase': 'vase',

  // Nourriture
  'banana': 'banane',
  'apple': 'pomme',
  'orange': 'orange',
  'sandwich': 'sandwich',
  'carrot': 'carotte',
  'broccoli': 'brocoli',
  'pizza': 'pizza',
  'cake': 'gâteau',
  'hot dog': 'hot-dog',

  // Papier et savoir
  'book': 'livre',

  // Textile et transport
  'tie': 'cravate',
  'umbrella': 'parapluie',
  'backpack': 'sac à dos',
  'handbag': 'sac à main',
  'suitcase': 'valise',
  'chair': 'chaise',
  'potted plant': 'plante',
  'teddy bear': 'peluche',
  'sports ball': 'ballon',
  'frisbee': 'frisbee',
  'hair drier': 'sèche-cheveux',

  // Vivant
  'person': 'personne',
  'cat': 'chat',
  'dog': 'chien',
});

/** Traduit une classe COCO. Renvoie `null` pour ce qui n'a pas d'usage ici. */
export function traduire(classe) {
  return CLASSES[classe] ?? null;
}

/**
 * Charge le modèle.
 *
 * Un modèle copié dans `lib/model/` permet de jouer entièrement hors ligne ;
 * sinon les poids viennent du dépôt officiel. L'ordre compte : essayer le local
 * d'abord évite d'imposer le réseau à quelqu'un qui a déjà tout ce qu'il faut.
 */
export async function charger({ cocoSsd = globalThis.cocoSsd, base = '' } = {}) {
  if (!cocoSsd) throw new Error('Bibliothèque COCO-SSD absente.');
  try {
    const local = await fetch(`${base}lib/model/model.json`, { method: 'HEAD' });
    if (!local.ok) throw new Error('pas de modèle local');
    return await cocoSsd.load({ modelUrl: `${base}lib/model/model.json` });
  } catch (_) {
    return cocoSsd.load({ base: 'lite_mobilenet_v2' });
  }
}

/**
 * Détecte sur une image.
 *
 * Normalise la sortie du modèle vers la forme attendue par `detecteur.js` —
 * `{ label, score }` — pour que le reste du jeu n'ait jamais à connaître le
 * format d'une bibliothèque tierce.
 */
export async function detecter(modele, source) {
  const brutes = await modele.detect(source);
  return brutes.map((d) => ({ label: d.class, score: d.score, boite: d.bbox }));
}
