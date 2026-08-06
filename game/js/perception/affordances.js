// affordances.js — Des propriétés physiques aux actions possibles (T-012).
//
// Dernier maillon de la chaîne, et le seul qui décide de quelque chose :
//
//     objet détecté → propriétés → AFFORDANCES → énigme résolue
//                                  ↑ ce fichier
//
// Le module ne connaît ni la caméra, ni la base d'objets, ni le jeu. Il reçoit
// un ensemble de propriétés et renvoie des actions. Cette ignorance est ce qui
// le rend testable en millisecondes et utilisable à l'envers — le test de
// résolubilité (T-014) devra demander « quels objets savent couper ? », ce qui
// serait impossible si les règles étaient enfouies dans le code du gameplay.
//
// Les règles s'écrivent dans la grammaire de conditions du socle
// (`utils/conditions.js`), qui explique pourquoi elles sont des données et non
// des fonctions.

import { evaluer, feuilles, expliquer } from '../utils/conditions.js';

// Réexportés : la grammaire appartient au socle, mais rien n'oblige les
// appelants du moteur d'affordances à connaître deux modules pour une règle.
export { evaluer, expliquer };

/** Propriétés citées par une condition, quelle que soit sa profondeur. */
export const proprietesCitees = feuilles;

/**
 * Les actions du monde de NOVA-7.
 *
 *   requiert  condition minimale, sans laquelle l'action est impossible
 *   favorise  propriétés qui rendent l'objet MEILLEUR sans être nécessaires
 *
 * `favorise` n'est pas un raffinement gratuit : il évite le piège du tout ou
 * rien. Un tesson de verre coupe une corde, un couteau aussi — mais pas aussi
 * bien. Sans gradation, il faudrait soit refuser le tesson (le joueur bute alors
 * sur une solution qu'il juge à raison valable), soit l'accepter à l'identique
 * (et l'ingéniosité n'est plus récompensée). La qualité règle la durée et le
 * bruit de l'action, pas son résultat : aucune solution n'est un piège.
 */
export const AFFORDANCES = Object.freeze({
  couper: {
    libelle: 'Couper',
    resume: 'trancher liens, câbles et scellés',
    // `cassant` a été retiré de la condition : aucun objet réel n'est à la fois
    // tranchant et cassant, parce qu'un verre ne coupe qu'une fois brisé. La
    // branche anticipait une transformation qui n'existe pas encore (T-017) et
    // qu'aucun test ne pouvait couvrir. Le tesson, quand il arrivera, sera un
    // objet à part entière — tranchant et rigide — et passera par la règle
    // normale.
    requiert: { toutes: ['tranchant', 'rigide'] },
    favorise: ['allonge', 'tenable_une_main', 'pointu'],
  },
  crocheter: {
    libelle: 'Crocheter',
    resume: 'forcer une serrure mécanique',
    // Ni `rigide` ni `pointu` en exigence : le trombone, crochet le plus célèbre
    // qui soit, n'est ni l'un ni l'autre au sens strict de nos critères. Ils
    // relèvent donc de la qualité, pas de la possibilité.
    requiert: { toutes: ['mince', 'allonge', { sans: ['lourd'] }] },
    favorise: ['pointu', 'rigide', 'tenable_une_main'],
  },
  faire_levier: {
    libelle: 'Faire levier',
    resume: 'soulever grilles, panneaux et plaques',
    requiert: { toutes: ['rigide', 'allonge'] },
    favorise: ['mince', 'lourd', 'plat'],
  },
  briser: {
    libelle: 'Briser',
    resume: 'fracasser une vitre ou un verrou fragile',
    requiert: { toutes: ['rigide', 'lourd'] },
    favorise: ['allonge', 'tenable_une_main'],
  },
  pirater: {
    libelle: 'Pirater',
    resume: 'compromettre un système informatique',
    // Les deux sont indispensables : exécuter des instructions ne sert à rien
    // sans lien vers la cible, et un lien sans exécution ne fait que transmettre.
    requiert: { toutes: ['programmable', 'communicant'] },
    favorise: ['alimente', 'porte_texte'],
  },
  brouiller: {
    libelle: 'Brouiller',
    resume: 'leurrer un capteur ou un lecteur',
    requiert: { auMoins: ['magnetique', { toutes: ['electronique', 'communicant'] }] },
    favorise: ['alimente', 'tenable_une_main'],
  },
  eclairer: {
    libelle: 'Éclairer',
    resume: 'percer l\'obscurité',
    requiert: 'emet_lumiere',
    favorise: ['alimente', 'tenable_une_main'],
  },
  enflammer: {
    libelle: 'Enflammer',
    resume: 'mettre le feu, déclencher une alarme incendie',
    requiert: { toutes: ['emet_lumiere', 'inflammable'] },
    favorise: ['tenable_une_main'],
  },
  eteindre: {
    libelle: 'Éteindre',
    resume: 'noyer un départ de feu',
    // `sans: inflammable` n'est pas un détail : l'huile et l'alcool sont des
    // liquides qui aggravent un incendie. Les accepter donnerait au joueur une
    // solution qui a l'air juste et qui échoue — le pire des retours.
    requiert: { toutes: ['contient_liquide', { sans: ['inflammable'] }] },
    favorise: ['creux', 'lourd'],
  },
  proteger: {
    libelle: 'Se protéger',
    resume: 'se couvrir des projections, des éclats, de la chaleur',
    // Ajoutée après coup : la base contenait des plateaux, planches et assiettes
    // qu'aucune action ne pouvait servir. Un objet réel sans usage est le moment
    // exact où le joueur cesse de croire au système.
    requiert: { toutes: ['plat', 'rigide'] },
    favorise: ['lourd', 'isolant_thermique', 'tenable_une_main'],
  },
  attiser: {
    libelle: 'Attiser',
    resume: 'nourrir un feu, le propager volontairement',
    // Symétrique exact d'`eteindre` : le même « liquide » selon qu'il brûle ou
    // non. C'est ce qui rend le choix du liquide intéressant plutôt qu'anodin.
    requiert: { toutes: ['contient_liquide', 'inflammable'] },
    favorise: ['odorant', 'tenable_une_main'],
  },
  eponger: {
    libelle: 'Éponger',
    resume: 'absorber un liquide répandu',
    requiert: 'absorbant',
    favorise: ['plat', 'souple'],
  },
  isoler: {
    libelle: 'Isoler',
    resume: 'saisir ce qui brûle ou conduit le courant',
    requiert: { toutes: ['isolant_thermique', { sans: ['conducteur'] }] },
    favorise: ['souple', 'tenable_une_main'],
  },
  conduire: {
    libelle: 'Conduire le courant',
    resume: 'ponter un circuit, court-circuiter une serrure',
    requiert: { toutes: ['conducteur', { auMoins: ['allonge', 'mince'] }] },
    favorise: ['souple', 'tenable_une_main'],
  },
  aimanter: {
    libelle: 'Aimanter',
    resume: 'attirer une pièce métallique hors d\'atteinte',
    requiert: 'magnetique',
    favorise: ['allonge', 'tenable_une_main'],
  },
  refleter: {
    libelle: 'Réfléchir',
    resume: 'voir dans un angle mort, dévier un faisceau',
    requiert: 'reflechissant',
    favorise: ['plat', 'tenable_une_main'],
  },
  attacher: {
    libelle: 'Attacher',
    resume: 'lier, bloquer, descendre le long de quelque chose',
    // `sans: comestible` écarte la banane et la saucisse, souples et allongées
    // mais qui ne lient rien. Exiger `mince` à la place aurait écarté la corde,
    // qui est la solution la plus évidente de toutes.
    requiert: { toutes: ['souple', 'allonge', { sans: ['comestible'] }] },
    favorise: ['mince'],
  },
  contenir: {
    libelle: 'Transporter',
    resume: 'emporter un liquide ou de petits objets',
    requiert: 'creux',
    favorise: ['tenable_une_main', 'rigide'],
  },
  distraire: {
    libelle: 'Faire diversion',
    resume: 'détourner l\'attention en le lançant',
    requiert: { toutes: ['leger', 'tenable_une_main'] },
    favorise: ['emet_son', 'cassant'],
  },
  alerter: {
    libelle: 'Faire du bruit',
    resume: 'attirer volontairement l\'attention',
    requiert: 'emet_son',
    favorise: ['alimente', 'tenable_une_main'],
  },
  appater: {
    libelle: 'Appâter',
    resume: 'amadouer un animal de garde',
    requiert: 'appetissant_animal',
    favorise: ['odorant', 'tenable_une_main'],
  },
  reprendre_des_forces: {
    libelle: 'Reprendre des forces',
    resume: 'se nourrir, tenir le coup',
    requiert: 'comestible',
    favorise: ['odorant'],
  },
  sinformer: {
    libelle: 'S\'informer',
    resume: 'lire codes, plans, notices et protocoles',
    requiert: 'porte_texte',
    favorise: ['plat', 'tenable_une_main'],
  },
  chronometrer: {
    libelle: 'Chronométrer',
    resume: 'synchroniser une ronde de sécurité',
    requiert: 'mesure_temps',
    favorise: ['alimente', 'tenable_une_main'],
  },
  alimenter: {
    libelle: 'Alimenter',
    resume: 'fournir du courant à un appareil hors tension',
    requiert: 'alimente',
    favorise: ['tenable_une_main', 'conducteur'],
  },
});

/** Identifiants des affordances, dans l'ordre de déclaration. */
export const IDS = Object.freeze(Object.keys(AFFORDANCES));

/** Qualité minimale d'une action possible : toujours utilisable, jamais idéale. */
export const QUALITE_MINIMALE = 0.5;

/**
 * Note de 0,5 à 1 la façon dont un objet remplit une action qu'il peut déjà faire.
 *
 * Le plancher n'est pas à zéro : franchir `requiert` suffit pour agir. Une note
 * nulle laisserait croire à une action impossible alors qu'elle ne fait que
 * demander plus de temps.
 */
function noter(affordance, proprietes) {
  const favorise = affordance.favorise ?? [];
  if (favorise.length === 0) return 1;
  const acquises = favorise.filter((p) => proprietes.has(p)).length;
  return QUALITE_MINIMALE + QUALITE_MINIMALE * (acquises / favorise.length);
}

/**
 * Actions rendues possibles par un ensemble de propriétés.
 *
 * Trié par qualité décroissante : l'interface montre d'abord ce que l'objet fait
 * le mieux, et le joueur comprend l'objet en une lecture au lieu de parcourir
 * une liste plate où l'accessoire côtoie l'essentiel.
 */
export function affordancesDe(proprietes) {
  const ensemble = proprietes instanceof Set ? proprietes : new Set(proprietes ?? []);
  return IDS
    .filter((id) => evaluer(AFFORDANCES[id].requiert, ensemble))
    .map((id) => ({ id, ...AFFORDANCES[id], qualite: noter(AFFORDANCES[id], ensemble) }))
    .sort((a, b) => b.qualite - a.qualite || IDS.indexOf(a.id) - IDS.indexOf(b.id));
}

/** Un ensemble de propriétés permet-il cette action ? */
export function permet(idAffordance, proprietes) {
  const affordance = AFFORDANCES[idAffordance];
  if (!affordance) return false;
  const ensemble = proprietes instanceof Set ? proprietes : new Set(proprietes ?? []);
  return evaluer(affordance.requiert, ensemble);
}

/**
 * Objets d'un catalogue capables d'une action, du meilleur au moins bon.
 *
 * Prend le catalogue en paramètre au lieu de l'importer : le module reste pur,
 * et le test de résolubilité peut l'interroger sur un inventaire restreint —
 * « avec les seuls objets de cette salle, l'énigme a-t-elle encore une solution ? »
 * est exactement la question à laquelle il doit répondre.
 */
export function objetsPour(idAffordance, entrees) {
  const affordance = AFFORDANCES[idAffordance];
  if (!affordance) return [];
  return entrees
    .map((entree) => ({ entree, ensemble: new Set(entree.proprietes) }))
    .filter(({ ensemble }) => evaluer(affordance.requiert, ensemble))
    .map(({ entree, ensemble }) => ({ entree, qualite: noter(affordance, ensemble) }))
    .sort((a, b) => b.qualite - a.qualite);
}
