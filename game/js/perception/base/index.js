// index.js — Assemblage et interrogation de la base curatée (T-011).
//
// La base répond à une seule question : « à quoi ressemble physiquement l'objet
// nommé X ? ». Elle ne dit jamais à quoi il sert — cette déduction appartient au
// moteur d'affordances (T-012), qui ne travaille que sur des propriétés.
//
// ─── Format d'une entrée ─────────────────────────────────────────────────────
//   'couteau': { a: 'un', p: ['tranchant', 'pointu', …], syn: ['coutelas'] }
//
//   clé  nom canonique français, minuscules, singulier sauf si l'objet est
//        naturellement pluriel (« ciseaux », « lunettes »)
//   a    article défini par l'usage, pour l'affichage (« un couteau »)
//   p    propriétés, identifiants du vocabulaire gelé
//   syn  autres appellations courantes, facultatif
//
// ─── Pourquoi la base est découpée par catégorie ─────────────────────────────
// Relire 400 entrées d'affilée est impossible : l'œil ne détecte plus les
// incohérences après une centaine de lignes. Découpée, chaque catégorie se relit
// d'une traite, et les objets voisins se comparent — c'est en comparant qu'on
// remarque qu'une casserole est `lourd` mais pas la marmite.

import { estPropriete } from '../vocabulaire.js';

import { OUTILS } from './outils.js';
import { CUISINE } from './cuisine.js';
import { ELECTRONIQUE } from './electronique.js';
import { BUREAU } from './bureau.js';
import { NOURRITURE } from './nourriture.js';
import { VETEMENTS } from './vetements.js';
import { SOINS } from './soins.js';
import { MAISON } from './maison.js';
import { LOISIRS } from './loisirs.js';

/** Catégories, dans l'ordre d'affichage des outils de relecture. */
export const CATEGORIES = Object.freeze({
  outils: OUTILS,
  cuisine: CUISINE,
  electronique: ELECTRONIQUE,
  bureau: BUREAU,
  nourriture: NOURRITURE,
  vetements: VETEMENTS,
  soins: SOINS,
  maison: MAISON,
  loisirs: LOISIRS,
});

/**
 * Réduit un libellé à sa forme comparable.
 *
 * Les libellés arrivent de trois sources qui n'écrivent pas pareil : nos propres
 * fichiers, le détecteur d'images, et la saisie du joueur. Sans forme commune,
 * « Couteau », « couteau » et « le couteau » seraient trois objets différents.
 *
 * Les accents sont retirés parce qu'ils survivent mal aux allers-retours entre
 * un modèle anglophone, une saisie clavier et une sauvegarde JSON — « clé » et
 * « cle » doivent trouver la même entrée.
 */
export function normaliser(libelle) {
  if (typeof libelle !== 'string') return '';
  return libelle
    // Plage écrite en échappements : ce sont des marques combinantes, invisibles
    // dans un éditeur. En clair, elles se font supprimer par un copier-coller
    // maladroit sans que personne ne voie la différence — et la base entière
    // devient introuvable dès qu'un accent est en jeu.
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    // L'espace après l'article est OBLIGATOIRE. Sans elle, « la » dévorerait le
    // début de « lait » et « le » celui de « levier » : les articles français
    // sont des préfixes d'objets réels de la base.
    .replace(/^(?:un|une|des|du|le|la|les)\s+/, '')
    .replace(/^de\s+(?:la\s+|l')/, '')
    .replace(/^[ld]'/, '')
    .replace(/[^a-z0-9'\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Construit l'index de recherche et refuse une base incohérente.
 *
 * Les collisions lèvent une exception au chargement plutôt que de laisser la
 * dernière entrée écraser silencieusement la première. Un doublon entre deux
 * catégories signifie qu'un objet a deux jeux de propriétés : le joueur verrait
 * le même objet marcher ou non selon l'ordre des imports. Ce genre de bogue est
 * introuvable en jeu ; il doit tomber ici, tout de suite, avec les deux noms.
 */
function construireIndex() {
  const index = new Map();
  const origine = new Map();

  const inscrire = (cle, entree, categorie, nomCanonique) => {
    const norme = normaliser(cle);
    if (norme === '') {
      throw new Error(`Base curatée : « ${cle} » (${categorie}) se normalise en chaîne vide.`);
    }
    if (index.has(norme)) {
      throw new Error(
        `Base curatée : « ${cle} » (${categorie}) entre en collision avec `
        + `« ${origine.get(norme)} ». Deux jeux de propriétés pour un même objet.`);
    }
    index.set(norme, entree);
    origine.set(norme, `${nomCanonique} (${categorie})`);
  };

  for (const [categorie, objets] of Object.entries(CATEGORIES)) {
    for (const [nom, brut] of Object.entries(objets)) {
      const entree = Object.freeze({
        nom,
        categorie,
        article: brut.a,
        proprietes: Object.freeze([...brut.p]),
      });
      inscrire(nom, entree, categorie, nom);
      for (const synonyme of brut.syn ?? []) inscrire(synonyme, entree, categorie, nom);
    }
  }
  return index;
}

const INDEX = construireIndex();

/** Nombre d'entrées interrogeables, synonymes compris. */
export const TAILLE_INDEX = INDEX.size;

/** Objets canoniques, sans les synonymes. */
export const NOMS = Object.freeze(
  Object.values(CATEGORIES).flatMap((objets) => Object.keys(objets)));

/**
 * Cherche un objet par son nom.
 *
 * Renvoie `null` plutôt que de lever : un objet absent de la base est le cas
 * NORMAL, pas une erreur. C'est même la situation que le jeu revendique — le
 * repli sémantique (T-013) prend alors le relais. Lever ici obligerait chaque
 * appelant à un try/catch pour un chemin nominal.
 */
export function chercher(libelle) {
  const norme = normaliser(libelle);
  if (norme === '') return null;

  const direct = INDEX.get(norme);
  if (direct) return direct;

  // Repli sur le singulier : le détecteur et le joueur écrivent volontiers au
  // pluriel. Les trois formes du français sont tentées séparément — une règle
  // unique se tromperait sur « couteaux », dont le singulier retire le « x »
  // seul, là où « journaux » remplace « aux » par « al ».
  // On ne tente jamais l'inverse : « ciseau » ne doit pas trouver « ciseaux »,
  // sinon un objet qui n'existe qu'au pluriel gagnerait un singulier fantôme.
  for (const singulier of [
    norme.replace(/x$/, ''),
    norme.replace(/s$/, ''),
    norme.replace(/aux$/, 'al'),
  ]) {
    if (singulier === norme) continue;
    const entree = INDEX.get(singulier);
    if (entree) return entree;
  }
  return null;
}

/** Forme affichable d'une entrée : « un couteau ». */
export function nomAffichable(entree) {
  if (!entree) return '';
  const espace = entree.article.endsWith("'") ? '' : ' ';
  return `${entree.article}${espace}${entree.nom}`;
}

/**
 * Vérifie que toute la base référence des propriétés existantes.
 *
 * Volontairement séparée du chargement : une faute de frappe dans une propriété
 * est une erreur d'auteur, pas une corruption. La faire planter au démarrage
 * empêcherait de jouer pour une entrée sur quatre cents. Les tests l'exécutent,
 * la CI la bloque, le jeu l'ignore.
 */
export function verifierProprietes() {
  const fautes = [];
  for (const [categorie, objets] of Object.entries(CATEGORIES)) {
    for (const [nom, { p }] of Object.entries(objets)) {
      for (const propriete of p) {
        if (!estPropriete(propriete)) {
          fautes.push({ categorie, nom, propriete });
        }
      }
    }
  }
  return fautes;
}
