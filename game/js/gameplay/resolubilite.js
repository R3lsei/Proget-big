// resolubilite.js — Preuve qu'une salle peut être terminée (T-014).
//
// Le filet de sécurité du projet. Un jeu d'énigmes a un mode d'échec qui n'en
// est pas vraiment un du point de vue du code : tout fonctionne, rien ne plante,
// et la salle est simplement impossible. Le joueur cherche des heures une
// solution qui n'existe pas, puis abandonne en se croyant en tort.
//
// Aucun test unitaire ne détecte ça. Il faut poser la question autrement :
// « avec les objets présents dans cette salle, existe-t-il un chemin jusqu'à la
// sortie ? » — et refuser de livrer si la réponse est non.
//
// ─── La difficulté réelle : un objet ne peut pas être à deux endroits ────────
// Vérifier que chaque exigence a UNE solution ne suffit pas. Deux plaques de
// pression à maintenir en même temps ont peut-être la même unique brique pour
// solution : chacune est satisfaisable, l'ensemble ne l'est pas. C'est un
// problème d'affectation, pas une suite de questions indépendantes.
//
// D'où un couplage maximal (algorithme de Kuhn) plutôt qu'une boucle de tests.

import { evaluer } from '../utils/conditions.js';
import { objetsPour } from '../perception/affordances.js';
import { RECEPTACLES, TERMINAUX, objetsActivant, declenchePar } from './mecanismes.js';

/**
 * Nombre maximal de réceptacles par salle.
 *
 * Les sous-ensembles satisfaisant la condition de sortie sont énumérés
 * exhaustivement : c'est exact, mais exponentiel. La borne garde le coût sous
 * 65 536 combinaisons et, surtout, elle documente une limite de conception —
 * une salle à plus de seize mécanismes n'est plus une énigme, c'est un tableau
 * de bord. Un test vérifie qu'aucune salle réelle n'en approche.
 */
export const MAX_RECEPTACLES = 16;

/**
 * Type d'un réceptacle déclaré.
 *
 * Une chambre déclare `{ type, x, z }` parce que le bâtisseur a besoin de la
 * position ; le vérificateur, lui, n'en a que faire. Accepter aussi la forme
 * courte `'plaque_pression'` garde les cas de test lisibles sans imposer des
 * coordonnées factices qui ne prouveraient rien.
 */
function typeDeReceptacle(declaration) {
  return typeof declaration === 'string' ? declaration : declaration?.type;
}

/**
 * Objets du catalogue capables de satisfaire un besoin.
 *
 * Un besoin est soit un outil (`{ affordance }`), soit un mécanisme
 * (`{ receptacle }`). Les deux se ramènent au même vocabulaire de propriétés,
 * ce qui permet à cette fonction de rester courte.
 */
export function objetsCapables(besoin, catalogue) {
  if (besoin.affordance) return objetsPour(besoin.affordance, catalogue).map((c) => c.entree);
  if (besoin.receptacle) return objetsActivant(besoin.receptacle, catalogue);
  if (besoin.terminal) {
    return catalogue.filter((entree) => declenchePar(besoin.terminal, entree.proprietes));
  }
  throw new Error(`Besoin mal formé : ${JSON.stringify(besoin)}`);
}

/**
 * Remplace chaque passerelle par la condition qui la sort.
 *
 * Une passerelle n'est pas un mécanisme : c'est un EFFET. Écrire « la sortie
 * exige le pont » revient à écrire « la sortie exige ce qui sort le pont ».
 * L'aplatir ici évite au reste du vérificateur de connaître un troisième type
 * de fait, et garantit qu'on ne peut pas déclarer une passerelle que rien ne
 * déploie.
 */
function aplatirPasserelles(condition, passerelles) {
  if (typeof condition === 'string') {
    const passerelle = passerelles.find((p) => p.id === condition);
    return passerelle
      ? aplatirPasserelles(passerelle.condition, passerelles)
      : condition;
  }
  for (const forme of ['toutes', 'auMoins', 'sans']) {
    if (condition[forme]) {
      return {
        [forme]: condition[forme].map((c) => aplatirPasserelles(c, passerelles)),
      };
    }
  }
  return condition;
}

/**
 * Couplage maximal entre exigences et objets distincts (algorithme de Kuhn).
 *
 * Chaque exigence reçoit un objet que nulle autre ne peut plus prendre. Quand
 * un objet est déjà pris, on tente de reloger son occupant ailleurs — c'est le
 * chemin augmentant, et c'est ce qui distingue une vraie preuve d'une heuristique
 * gloutonne qui échouerait sur des salles pourtant solubles.
 *
 * @param {Array<{id:string, candidats:string[]}>} exigences
 * @returns {Map<string,string>} exigence → objet, incomplète si insoluble
 */
export function coupler(exigences) {
  const prisPar = new Map();

  const reloger = (exigence, visites) => {
    for (const objet of exigence.candidats) {
      if (visites.has(objet)) continue;
      visites.add(objet);
      const occupant = prisPar.get(objet);
      if (occupant === undefined || reloger(occupant, visites)) {
        prisPar.set(objet, exigence);
        return true;
      }
    }
    return false;
  };

  for (const exigence of exigences) reloger(exigence, new Set());

  const affectation = new Map();
  for (const [objet, exigence] of prisPar) affectation.set(exigence.id, objet);
  return affectation;
}

/** Sous-ensembles d'instances satisfaisant la condition, du plus petit au plus grand. */
function combinaisonsSatisfaisantes(condition, instances) {
  if (instances.length > MAX_RECEPTACLES) {
    throw new Error(
      `Salle à ${instances.length} réceptacles : au-delà de ${MAX_RECEPTACLES}, `
      + 'la résolubilité ne peut plus être prouvée exhaustivement.');
  }
  const trouvees = [];
  for (let masque = 0; masque < (1 << instances.length); masque++) {
    const sousEnsemble = instances.filter((_, i) => masque & (1 << i));
    if (evaluer(condition, new Set(sousEnsemble))) trouvees.push(sousEnsemble);
  }
  // Le plus petit d'abord : c'est la solution que le joueur trouvera, et celle
  // qui laisse le plus d'objets libres pour les épreuves.
  return trouvees.sort((a, b) => a.length - b.length);
}

/**
 * Une salle peut-elle être terminée avec les objets qu'elle contient ?
 *
 * @param {object} salle
 *   objets       noms d'objets présents (entrées de la base curatée)
 *   receptacles  instance → type de réceptacle
 *   sortie       condition sur les instances de réceptacles
 *   epreuves     [{ id, affordance }] outils nécessaires, utilisés brièvement
 * @param {Function} chercher  résolution d'un nom vers son entrée de base
 */
export function verifierSalle(salle, chercher) {
  const catalogue = [];
  const introuvables = [];
  for (const nom of salle.objets ?? []) {
    const entree = chercher(nom);
    if (entree) catalogue.push(entree);
    else introuvables.push(nom);
  }
  if (introuvables.length) {
    return echec(salle, `objets absents de la base : ${introuvables.join(', ')}`);
  }

  for (const [instance, declaration] of Object.entries(salle.receptacles ?? {})) {
    const type = typeDeReceptacle(declaration);
    if (!RECEPTACLES[type]) return echec(salle, `réceptacle inconnu : ${instance} → ${type}`);
  }
  for (const [instance, declaration] of Object.entries(salle.terminaux ?? {})) {
    const type = typeDeReceptacle(declaration);
    if (!TERMINAUX[type]) return echec(salle, `terminal inconnu : ${instance} → ${type}`);
  }

  const instances = [
    ...Object.keys(salle.receptacles ?? {}),
    ...Object.keys(salle.terminaux ?? {}),
  ];
  const sortie = aplatirPasserelles(salle.sortie ?? { toutes: [] }, salle.passerelles ?? []);
  const combinaisons = combinaisonsSatisfaisantes(sortie, instances);
  if (combinaisons.length === 0) {
    return echec(salle, 'aucune combinaison de mécanismes n\'ouvre la sortie');
  }

  const raisons = [];
  for (const combinaison of combinaisons) {
    const verdict = tenter(salle, combinaison, catalogue);
    if (verdict.resoluble) return verdict;
    raisons.push(verdict.raison);
  }
  // La raison de la combinaison minimale est la plus parlante : c'est celle que
  // le concepteur avait en tête.
  return echec(salle, raisons[0]);
}

/** Tente de résoudre la salle en activant exactement cette combinaison. */
function tenter(salle, combinaison, catalogue) {
  // Deux natures dans la même combinaison : un réceptacle IMMOBILISE son objet,
  // un terminal ne fait que l'emprunter le temps du geste. Les mélanger dans le
  // couplage exigerait un objet dédié par console, et refuserait des salles
  // parfaitement jouables.
  const surReceptacle = combinaison.filter((i) => salle.receptacles?.[i]);
  const surTerminal = combinaison.filter((i) => salle.terminaux?.[i]);

  const mobilisees = surReceptacle.map((instance) => ({
    id: instance,
    candidats: objetsCapables(
      { receptacle: typeDeReceptacle(salle.receptacles[instance]) }, catalogue)
      .map((entree) => entree.nom),
  }));

  for (const instance of surTerminal) {
    const type = typeDeReceptacle(salle.terminaux[instance]);
    if (objetsCapables({ terminal: type }, catalogue).length === 0) {
      return {
        resoluble: false, salle: salle.id,
        raison: `rien dans la salle ne déclenche « ${instance} » (${type})`,
      };
    }
  }

  for (const exigence of mobilisees) {
    if (exigence.candidats.length === 0) {
      return { resoluble: false, salle: salle.id, raison: `rien n'active « ${exigence.id} »` };
    }
  }

  // Les objets posés sur les mécanismes y restent : il en faut autant que de
  // mécanismes à maintenir, tous différents.
  const affectation = coupler(mobilisees);
  if (affectation.size < mobilisees.length) {
    const orphelines = mobilisees.filter((e) => !affectation.has(e.id)).map((e) => e.id);
    return {
      resoluble: false,
      salle: salle.id,
      raison: `pas assez d'objets distincts : ${orphelines.join(', ')} sans solution `
            + 'une fois les autres mécanismes servis',
    };
  }

  // Chaque outil est utilisé brièvement, jamais en même temps qu'un autre : on
  // le teste donc seul, ajouté aux mécanismes déjà occupés. Le couplage peut
  // alors relaisser un objet à l'outil en déplaçant un autre sur un mécanisme.
  // Terminaux et épreuves se traitent pareil : un geste bref, jamais simultané
  // avec un autre, mais qui a besoin d'un objet non immobilisé à cet instant.
  const gestes = [
    ...surTerminal.map((instance) => ({
      id: instance,
      besoin: { terminal: typeDeReceptacle(salle.terminaux[instance]) },
    })),
    ...(salle.epreuves ?? []).map((e) => ({ id: e.id, besoin: { affordance: e.affordance } })),
  ];

  for (const epreuve of gestes) {
    const candidats = objetsCapables(epreuve.besoin, catalogue)
      .map((entree) => entree.nom);
    if (candidats.length === 0) {
      return {
        resoluble: false,
        salle: salle.id,
        raison: `aucun objet ne permet « ${epreuve.id} »`,
      };
    }
    const avecOutil = coupler([...mobilisees, { id: `outil:${epreuve.id}`, candidats }]);
    if (avecOutil.size < mobilisees.length + 1) {
      return {
        resoluble: false,
        salle: salle.id,
        raison: `« ${epreuve.id} » n'a plus d'objet disponible une fois les `
              + 'mécanismes maintenus',
      };
    }
  }

  return { resoluble: true, salle: salle.id, combinaison, affectation };
}

function echec(salle, raison) {
  return { resoluble: false, salle: salle.id, raison };
}

/**
 * Vérifie une suite de salles et rassemble tous les échecs.
 *
 * On ne s'arrête pas au premier : un concepteur qui corrige une salle veut
 * connaître les autres dans la foulée, pas relancer la vérification cinq fois.
 */
export function verifierParcours(salles, chercher) {
  const echecs = [];
  for (const salle of salles) {
    const verdict = verifierSalle(salle, chercher);
    if (!verdict.resoluble) echecs.push(verdict);
  }
  return { resoluble: echecs.length === 0, echecs };
}
