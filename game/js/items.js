// items.js — Moteur de règles : chaque objet réel détecté par la caméra
// reçoit automatiquement des capacités logiques utilisables dans le jeu.

// Capacités possibles dans le monde de NOVA-7
export const CAPS = {
  couper:    { icon: '✂️',  label: 'Couper',        desc: 'trancher liens, câbles et scellés' },
  crocheter: { icon: '🔓', label: 'Crocheter',     desc: 'forcer les serrures mécaniques' },
  levier:    { icon: '🪛', label: 'Faire levier',  desc: 'soulever grilles et panneaux' },
  pirater:   { icon: '💻', label: 'Pirater',       desc: 'compromettre les systèmes électroniques' },
  savoir:    { icon: '📖', label: 'Connaissance',  desc: 'lire codes, plans et secrets' },
  liquide:   { icon: '💧', label: 'Liquide',       desc: 'éteindre, diluer, neutraliser' },
  nourrir:   { icon: '🍎', label: 'Nourrir',       desc: 'amadouer un animal affamé' },
  distraire: { icon: '🎯', label: 'Distraire',     desc: 'détourner l\'attention (objet jetable)' },
  eclairer:  { icon: '🔦', label: 'Éclairer',      desc: 'percer l\'obscurité' },
  casser:    { icon: '💥', label: 'Briser',        desc: 'fracasser vitres et verrous fragiles' },
  temps:     { icon: '⏱️', label: 'Chronométrer', desc: 'synchroniser les cycles de sécurité' },
  proteger:  { icon: '🛡️', label: 'Protéger',     desc: 'se couvrir des projections' },
  soigner:   { icon: '❤️', label: 'Réconforter',  desc: 'reprendre des forces' },
};

// Base de connaissances : classes COCO-SSD -> identité française + capacités déduites.
// C'est ici que "le jeu établit automatiquement des critères logiques".
const KNOWLEDGE = {
  'scissors':    { fr: 'des ciseaux',            emoji: '✂️', caps: ['couper', 'crocheter'],            logic: 'Des lames : de quoi couper des liens… ou triturer une serrure.' },
  'knife':       { fr: 'un couteau',             emoji: '🔪', caps: ['couper', 'levier'],               logic: 'Une lame solide : coupe et fait levier.' },
  'fork':        { fr: 'une fourchette',         emoji: '🍴', caps: ['crocheter', 'levier'],            logic: 'Les dents d\'une fourchette font un excellent crochet improvisé.' },
  'spoon':       { fr: 'une cuillère',           emoji: '🥄', caps: ['levier'],                          logic: 'Le grand classique de l\'évasion : la cuillère qui fait levier.' },
  'toothbrush':  { fr: 'une brosse à dents',     emoji: '🪥', caps: ['crocheter'],                       logic: 'Taillée en pointe, une brosse à dents devient un crochet de fortune.' },
  'cell phone':  { fr: 'un téléphone',           emoji: '📱', caps: ['pirater', 'eclairer', 'temps'],   logic: 'Un téléphone : piratage sans fil, lampe torche et chronomètre.' },
  'laptop':      { fr: 'un ordinateur portable', emoji: '💻', caps: ['pirater'],                         logic: 'Assez de puissance pour compromettre le réseau du complexe.' },
  'keyboard':    { fr: 'un clavier',             emoji: '⌨️', caps: ['pirater'],                         logic: 'Branché sur un terminal, il permet d\'injecter des commandes.' },
  'mouse':       { fr: 'une souris d\'ordinateur', emoji: '🖱️', caps: ['pirater'],                      logic: 'Un périphérique : une porte d\'entrée vers les terminaux.' },
  'remote':      { fr: 'une télécommande',       emoji: '🎛️', caps: ['pirater', 'distraire'],           logic: 'Émetteur infrarouge : parfait pour leurrer les capteurs.' },
  'tv':          { fr: 'un écran',               emoji: '🖥️', caps: ['pirater'],                         logic: 'Un écran de contrôle : accès direct aux flux de sécurité.' },
  'book':        { fr: 'un livre',               emoji: '📕', caps: ['savoir'],                          logic: 'Le savoir est une arme : codes, plans, protocoles…' },
  'bottle':      { fr: 'une bouteille',          emoji: '🍾', caps: ['liquide', 'casser', 'distraire'],  logic: 'Son contenu éteint un feu ; le verre, lui, brise ce qu\'il faut.' },
  'cup':         { fr: 'une tasse',              emoji: '☕', caps: ['liquide', 'distraire'],            logic: 'De quoi transporter un liquide — ou faire du bruit en la jetant.' },
  'wine glass':  { fr: 'un verre',               emoji: '🥂', caps: ['liquide', 'casser'],               logic: 'Fragile mais utile : contient un liquide, se brise net.' },
  'bowl':        { fr: 'un bol',                 emoji: '🥣', caps: ['liquide', 'nourrir'],              logic: 'Un récipient : liquide ou nourriture, au choix.' },
  'clock':       { fr: 'une horloge',            emoji: '🕰️', caps: ['temps'],                           logic: 'Les rondes de sécurité suivent un cycle : chronométrez-les.' },
  'banana':      { fr: 'une banane',             emoji: '🍌', caps: ['nourrir', 'distraire', 'soigner'], logic: 'Un animal affamé ne résiste pas à une banane.' },
  'apple':       { fr: 'une pomme',              emoji: '🍎', caps: ['nourrir', 'distraire', 'soigner'], logic: 'Croquante, nourrissante, et facile à lancer.' },
  'orange':      { fr: 'une orange',             emoji: '🍊', caps: ['nourrir', 'distraire', 'soigner'], logic: 'Vitamines pour vous, appât pour les bêtes.' },
  'sandwich':    { fr: 'un sandwich',            emoji: '🥪', caps: ['nourrir', 'soigner'],              logic: 'Un vrai repas : irrésistible pour un chien de garde.' },
  'carrot':      { fr: 'une carotte',            emoji: '🥕', caps: ['nourrir', 'distraire'],            logic: 'Croquer ou appâter, à vous de voir.' },
  'broccoli':    { fr: 'un brocoli',             emoji: '🥦', caps: ['nourrir'],                          logic: 'Peu appétissant, mais c\'est de la nourriture.' },
  'pizza':       { fr: 'une pizza',              emoji: '🍕', caps: ['nourrir', 'soigner'],              logic: 'Personne — homme ou bête — ne refuse une pizza.' },
  'donut':       { fr: 'un donut',               emoji: '🍩', caps: ['nourrir', 'distraire', 'soigner'], logic: 'Le sucre attire tout ce qui a un odorat.' },
  'cake':        { fr: 'un gâteau',              emoji: '🍰', caps: ['nourrir', 'soigner'],              logic: 'Un appât de luxe, ou un remontant bien mérité.' },
  'hot dog':     { fr: 'un hot-dog',             emoji: '🌭', caps: ['nourrir', 'distraire'],            logic: 'L\'odeur de saucisse porte loin dans les couloirs…' },
  'sports ball': { fr: 'un ballon',              emoji: '⚽', caps: ['distraire', 'casser'],             logic: 'Lancé fort, il déclenche les capteurs — ou brise une vitre.' },
  'frisbee':     { fr: 'un frisbee',             emoji: '🥏', caps: ['distraire'],                        logic: 'Vole loin, atterrit bruyamment : diversion garantie.' },
  'teddy bear':  { fr: 'un ours en peluche',     emoji: '🧸', caps: ['distraire', 'soigner'],            logic: 'Un peu de douceur dans cet enfer — et un leurre silencieux.' },
  'tie':         { fr: 'une cravate',            emoji: '👔', caps: ['proteger'],                        logic: 'Nouée sur le visage, elle filtre fumées et vapeurs.' },
  'umbrella':    { fr: 'un parapluie',           emoji: '☂️', caps: ['proteger', 'levier'],              logic: 'Bouclier contre les projections, manche pour faire levier.' },
  'vase':        { fr: 'un vase',                emoji: '🏺', caps: ['casser', 'liquide', 'distraire'],  logic: 'Lourd et fragile : idéal pour briser — ou être brisé.' },
  'hair drier':  { fr: 'un sèche-cheveux',       emoji: '💨', caps: ['distraire'],                        logic: 'Son souffle chaud peut leurrer un capteur thermique.' },
  'backpack':    { fr: 'un sac à dos',           emoji: '🎒', caps: ['proteger'],                        logic: 'De quoi transporter, protéger, encaisser.' },
  'handbag':     { fr: 'un sac',                 emoji: '👜', caps: ['proteger', 'distraire'],           logic: 'Un sac abandonné attire toujours l\'attention.' },
};

// Objet inconnu du protocole : il reste jetable (diversion). Rien n'est inutile.
const FALLBACK = {
  fr: 'un objet non répertorié',
  emoji: '📦',
  caps: ['distraire'],
  logic: 'Objet inconnu du protocole NOVA-7. Au pire… il peut toujours être lancé.',
};

// Petit lexique pour l'annonce vocale de secours
const RAW_FR = {
  'person': 'une personne', 'chair': 'une chaise', 'dining table': 'une table',
  'potted plant': 'une plante', 'couch': 'un canapé', 'bed': 'un lit',
  'bird': 'un oiseau', 'cat': 'un chat', 'dog': 'un chien',
};

let nextId = 1;

/** Analyse une classe détectée et fabrique l'objet de jeu avec ses règles logiques. */
export function analyzeObject(cocoClass) {
  const known = KNOWLEDGE[cocoClass];
  const info = known || { ...FALLBACK, fr: RAW_FR[cocoClass] || FALLBACK.fr };
  return {
    id: 'item_' + nextId++,
    cocoClass,
    name: info.fr,
    emoji: info.emoji,
    caps: [...info.caps],
    logic: info.logic,
    known: !!known,
    usesLeft: consumableUses(info.caps),
  };
}

// Les objets "consommables" (liquide, nourriture, jetables) ont des usages limités.
function consumableUses(caps) {
  if (caps.includes('liquide') || caps.includes('nourrir')) return 1;
  return Infinity;
}

/** Phrase descriptive des capacités, pour l'écran de scan et l'annonce vocale. */
export function describeCaps(caps) {
  return caps.map((c) => `${CAPS[c].icon} ${CAPS[c].label} — ${CAPS[c].desc}`);
}

/** Un inventaire possède-t-il une capacité ? Renvoie l'objet porteur ou null. */
export function findItemWithCap(inventory, cap) {
  return inventory.find((it) => it.caps.includes(cap) && it.usesLeft > 0) || null;
}
