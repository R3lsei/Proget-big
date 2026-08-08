// vocabulaire.js — Le vocabulaire de propriétés physiques de NOVA-7.
//
// C'est le pivot du jeu. La caméra reconnaît un objet ; on ne lui demande pas
// « que peut-on faire avec ? » mais « comment est-il ? ». Les actions possibles
// sont ensuite déduites de sa forme et de sa matière par des règles pures.
//
//     objet détecté  →  PROPRIÉTÉS PHYSIQUES  →  affordances  →  énigme résolue
//                       ↑ ce fichier
//
// Pourquoi cette indirection plutôt qu'une table « couteau → couper » : parce
// qu'elle rend le jeu ouvert. Un objet jamais prévu par nous — un tournevis, une
// carte de fidélité, une règle en métal — reçoit des propriétés, donc des actions,
// donc une utilité. Une table d'objets ne peut, elle, que grandir à l'infini sans
// jamais couvrir le monde réel.
//
// ─── RÈGLE ABSOLUE ───────────────────────────────────────────────────────────
// Une propriété décrit un FAIT OBSERVABLE, jamais un usage.
//     ✓ `tranchant`   — on peut le vérifier en regardant l'objet
//     ✗ `peutCouper`  — c'est une conclusion, elle appartient aux affordances
// Enfreindre cette règle réintroduit la table d'objets sous un autre nom, et
// avec elle l'impossibilité de gérer l'imprévu.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Version du vocabulaire. **Gelée.**
 *
 * Les sauvegardes et la base curatée (T-011) référencent des identifiants de
 * propriétés. Retirer ou renommer une propriété casse les deux. Toute évolution
 * suit ces règles, vérifiées par les tests :
 *
 *   - AJOUTER une propriété      → incrémenter le mineur (1.0 → 1.1)
 *   - RETIRER ou RENOMMER        → incrémenter le majeur, écrire une migration
 *   - corriger un libellé/critère → incrémenter le correctif
 */
export const VERSION = '1.0.0';

/**
 * Gèle un objet et tout ce qu'il contient.
 *
 * `Object.freeze` est superficiel : il interdit `PROPRIETES.tranchant = …` mais
 * laisse passer `PROPRIETES.tranchant.critere = …`. Or c'est justement le critère
 * qui doit être identique pour la base curatée et pour le repli sémantique — le
 * modifier à chaud ferait diverger les deux sources sans aucun signe visible.
 */
function gelerEnProfondeur(objet) {
  for (const valeur of Object.values(objet)) {
    if (valeur && typeof valeur === 'object') gelerEnProfondeur(valeur);
  }
  return Object.freeze(objet);
}

/**
 * Familles de propriétés. Purement organisationnelles : elles structurent
 * l'interface de débogage et la relecture de la base curatée, jamais les règles.
 */
export const FAMILLES = Object.freeze({
  forme:    'Forme et géométrie',
  matiere:  'Matière et solidité',
  masse:    'Masse et maniabilité',
  fonction: 'Fonction technique',
  contenu:  'Contenu et matière transportée',
  vivant:   'Rapport au vivant',
  signal:   'Émission perceptible',
});

/**
 * Le vocabulaire lui-même.
 *
 * Chaque propriété porte un `critere` formulé comme une **question fermée**.
 * Ce n'est pas de la décoration : c'est le contrat d'interface entre les deux
 * sources de propriétés du jeu.
 *
 *   - la base curatée (T-011) est remplie à la main en répondant à ces questions ;
 *   - le repli sémantique (T-013) pose littéralement la même question au modèle
 *     pour un objet hors base.
 *
 * Une seule formulation pour les deux chemins, donc des réponses comparables.
 * Si le critère est ambigu, les deux sources divergent et le joueur constate
 * qu'un même objet « marche parfois ». D'où l'exigence : chaque critère doit
 * pouvoir être tranché par deux personnes différentes sans se concerter.
 */
export const PROPRIETES = gelerEnProfondeur({

  // ── Forme et géométrie ────────────────────────────────────────────────────
  tranchant: {
    famille: 'forme',
    libelle: 'Tranchant',
    critere: 'Possède-t-il un bord affilé capable d\'entamer une matière souple ?',
  },
  pointu: {
    famille: 'forme',
    libelle: 'Pointu',
    critere: 'Se termine-t-il par une pointe fine capable d\'entrer dans un trou étroit ?',
  },
  allonge: {
    famille: 'forme',
    libelle: 'Allongé',
    critere: 'Est-il nettement plus long que large, comme une tige ou un manche ?',
  },
  mince: {
    famille: 'forme',
    libelle: 'Mince',
    critere: 'Peut-il se glisser dans une fente de quelques millimètres ?',
  },
  creux: {
    famille: 'forme',
    libelle: 'Creux',
    critere: 'Possède-t-il une cavité capable de retenir quelque chose ?',
  },
  plat: {
    famille: 'forme',
    libelle: 'Plat',
    critere: 'Présente-t-il une grande surface plane et régulière ?',
  },

  // ── Matière et solidité ───────────────────────────────────────────────────
  rigide: {
    famille: 'matiere',
    libelle: 'Rigide',
    critere: 'Garde-t-il sa forme lorsqu\'on appuie dessus à deux mains ?',
  },
  souple: {
    famille: 'matiere',
    libelle: 'Souple',
    critere: 'Se plie-t-il ou s\'enroule-t-il sans se rompre ?',
  },
  cassant: {
    famille: 'matiere',
    libelle: 'Cassant',
    critere: 'Se brise-t-il en éclats plutôt que de se déformer, sous un choc franc ?',
  },
  absorbant: {
    famille: 'matiere',
    libelle: 'Absorbant',
    critere: 'Retient-il un liquide versé dessus au lieu de le laisser couler ?',
  },
  conducteur: {
    famille: 'matiere',
    libelle: 'Conducteur',
    critere: 'Est-il fait d\'un métal nu capable de laisser passer le courant ?',
  },
  inflammable: {
    famille: 'matiere',
    libelle: 'Inflammable',
    critere: 'S\'enflamme-t-il durablement au contact d\'une flamme ?',
  },
  isolant_thermique: {
    famille: 'matiere',
    libelle: 'Isolant thermique',
    critere: 'Permet-il de saisir un objet brûlant sans se brûler ?',
  },

  // ── Masse et maniabilité ──────────────────────────────────────────────────
  lourd: {
    famille: 'masse',
    libelle: 'Lourd',
    critere: 'Pèse-t-il assez pour enfoncer ou maintenir quelque chose par son seul poids ?',
  },
  leger: {
    famille: 'masse',
    libelle: 'Léger',
    critere: 'Peut-on le lancer d\'une main à plusieurs mètres sans effort ?',
  },
  tenable_une_main: {
    famille: 'masse',
    libelle: 'Tenable d\'une main',
    critere: 'Tient-il fermement dans une seule main ?',
  },

  // ── Fonction technique ────────────────────────────────────────────────────
  electronique: {
    famille: 'fonction',
    libelle: 'Électronique',
    critere: 'Contient-il un circuit qui a besoin d\'énergie pour fonctionner ?',
  },
  alimente: {
    famille: 'fonction',
    libelle: 'Autonome en énergie',
    critere: 'Embarque-t-il sa propre source d\'énergie, pile ou batterie ?',
  },
  communicant: {
    famille: 'fonction',
    libelle: 'Communicant',
    critere: 'Peut-il échanger des données avec un autre appareil, avec ou sans fil ?',
  },
  programmable: {
    famille: 'fonction',
    libelle: 'Programmable',
    critere: 'Peut-on lui faire exécuter des instructions qu\'on lui fournit ?',
  },
  mesure_temps: {
    famille: 'fonction',
    libelle: 'Mesure le temps',
    critere: 'Affiche-t-il l\'heure ou une durée écoulée ?',
  },
  magnetique: {
    famille: 'fonction',
    libelle: 'Magnétique',
    critere: 'Attire-t-il le métal, ou porte-t-il une bande magnétique ?',
  },
  reflechissant: {
    famille: 'fonction',
    libelle: 'Réfléchissant',
    critere: 'Renvoie-t-il une image ou un faisceau lumineux ?',
  },

  // ── Contenu et matière transportée ────────────────────────────────────────
  contient_liquide: {
    famille: 'contenu',
    libelle: 'Contient du liquide',
    critere: 'Transporte-t-il, en cet instant, un liquide utilisable ?',
  },
  porte_texte: {
    famille: 'contenu',
    libelle: 'Porte du texte',
    critere: 'Porte-t-il un texte lisible de plus de quelques mots ?',
  },

  // ── Rapport au vivant ─────────────────────────────────────────────────────
  comestible: {
    famille: 'vivant',
    libelle: 'Comestible',
    critere: 'Un être humain peut-il l\'avaler sans danger ?',
  },
  appetissant_animal: {
    famille: 'vivant',
    libelle: 'Appétissant pour un animal',
    critere: 'Un chien affamé s\'en approcherait-il pour le manger ?',
  },

  // ── Émission perceptible ──────────────────────────────────────────────────
  emet_lumiere: {
    famille: 'signal',
    libelle: 'Émet de la lumière',
    critere: 'Produit-il sa propre lumière, suffisante pour éclairer un pas devant soi ?',
  },
  emet_son: {
    famille: 'signal',
    libelle: 'Émet du son',
    critere: 'Produit-il un son audible à travers une porte fermée ?',
  },
  odorant: {
    famille: 'signal',
    libelle: 'Odorant',
    critere: 'Dégage-t-il une odeur perceptible à plusieurs mètres ?',
  },
});

/** Identifiants du vocabulaire, dans l'ordre de déclaration. */
export const IDS = Object.freeze(Object.keys(PROPRIETES));

/** Une propriété porte-t-elle un identifiant connu du vocabulaire ? */
export function estPropriete(id) {
  return Object.prototype.hasOwnProperty.call(PROPRIETES, id);
}

/** Propriétés d'une famille, dans l'ordre de déclaration. */
export function proprietesDeFamille(famille) {
  return IDS.filter((id) => PROPRIETES[id].famille === famille);
}

/**
 * Sépare des identifiants en connus / inconnus.
 *
 * Le repli sémantique (T-013) fait parler un modèle de langage, qui peut inventer
 * une propriété plausible mais absente du vocabulaire. La rejeter silencieusement
 * masquerait un manque réel du vocabulaire ; planter interromprait la partie.
 * On trie donc, et l'appelant décide — en pratique : jouer avec les connues,
 * et journaliser les autres pour alimenter la prochaine version.
 */
export function trierProprietes(ids) {
  const connues = [];
  const inconnues = [];
  for (const id of ids) {
    (estPropriete(id) ? connues : inconnues).push(id);
  }
  return { connues, inconnues };
}
