// inventaire.js — Ce que le joueur a montré à la caméra, gardé pour plus tard.
//
// Montrer un objet est un geste physique : se lever, aller le chercher, le tenir
// devant l'écran. L'exiger deux fois pour le même objet est une punition, pas une
// mécanique. Un objet scanné une fois reste donc acquis pour toute la partie.
//
// ─── Le risque, et pourquoi il y a un plafond ────────────────────────────────
// Un inventaire illimité et invocable à volonté détruit toute tension : une
// chambre qui force à choisir quelle plaque lester n'exige plus rien si l'on
// peut faire apparaître autant de briques que nécessaire. Le nombre d'objets
// MATÉRIALISÉS EN MÊME TEMPS est donc borné — la collection, elle, ne l'est pas.
// On garde le confort (ne jamais rescanner) sans perdre l'arbitrage.
//
// ─── Ce que le module ne fait pas ────────────────────────────────────────────
// Ni caméra, ni détection, ni rendu. Il reçoit des entrées de la base curatée et
// tient une liste. C'est ce qui le rend testable sans webcam.

/**
 * Objets matérialisables simultanément.
 *
 * Deux, parce qu'une énigme à deux mécanismes reste résoluble à la caméra seule,
 * tandis qu'une énigme à trois oblige à composer avec le décor. C'est la limite
 * qui garde les deux piliers utiles l'un à l'autre.
 */
export const MATERIALISATIONS_SIMULTANEES = 2;

/** Version du format, pour que d'anciennes sauvegardes restent lisibles. */
export const VERSION_INVENTAIRE = 1;

/** Crée un inventaire vide. */
export function creerInventaire() {
  return { connus: new Map(), materialises: new Set() };
}

/**
 * Enregistre un objet reconnu.
 *
 * Rescanner un objet déjà connu n'est pas une erreur : le joueur a pu le
 * remontrer sans le savoir. On renvoie l'information sans rien casser, pour que
 * l'interface puisse dire « déjà connu » plutôt que de rester muette.
 */
export function memoriser(inventaire, entree) {
  if (!entree?.nom) return { ajoute: false, raison: 'objet non reconnu' };
  if (inventaire.connus.has(entree.nom)) {
    return { ajoute: false, raison: 'déjà connu', nom: entree.nom };
  }
  inventaire.connus.set(entree.nom, {
    nom: entree.nom,
    article: entree.article,
    proprietes: [...entree.proprietes],
  });
  return { ajoute: true, nom: entree.nom };
}

/** Objets connus, dans l'ordre où ils ont été montrés. */
export function contenu(inventaire) {
  return [...inventaire.connus.values()];
}

/** L'objet est-il déjà acquis ? */
export function connait(inventaire, nom) {
  return inventaire.connus.has(nom);
}

/**
 * Fait apparaître un objet connu dans le monde.
 *
 * Refuse au-delà du plafond plutôt que de retirer le plus ancien. Voir un objet
 * disparaître d'une plaque parce qu'on en a invoqué un autre ailleurs serait
 * incompréhensible : le joueur croirait à un bug, et il aurait presque raison.
 */
export function materialiser(inventaire, nom) {
  const objet = inventaire.connus.get(nom);
  if (!objet) return { ok: false, raison: 'objet inconnu' };
  if (inventaire.materialises.has(nom)) {
    return { ok: false, raison: 'déjà présent dans la salle' };
  }
  if (inventaire.materialises.size >= MATERIALISATIONS_SIMULTANEES) {
    return {
      ok: false,
      raison: `${MATERIALISATIONS_SIMULTANEES} objets au maximum en même temps`,
    };
  }
  inventaire.materialises.add(nom);
  return { ok: true, objet };
}

/** Fait disparaître un objet matérialisé, libérant une place. */
export function dematerialiser(inventaire, nom) {
  return inventaire.materialises.delete(nom);
}

/**
 * Vide les matérialisations sans toucher aux acquis.
 *
 * Appelé au changement de chambre : les objets invoqués appartiennent à la salle
 * qu'on quitte, la connaissance appartient au joueur.
 */
export function quitterLaSalle(inventaire) {
  inventaire.materialises.clear();
  return inventaire;
}

/**
 * Purge complète : la sacoche redevient vide, connaissances comprises.
 *
 * ─── Une décision qui contredit une autre décision, assumée ─────────────────
 *
 * Ce module dit, et continue de dire, que la connaissance appartient au joueur :
 * `quitterLaSalle` efface les matérialisations et garde les objets connus,
 * parce que remettre la sacoche à zéro à chaque porte franchie « punirait le
 * joueur d'avoir progressé ». C'est toujours vrai entre deux salles.
 *
 * La fin du tutoriel n'est pas entre deux salles : c'est une rupture. Le jeu
 * change d'acte, et repartir de rien fait partie de ce que l'acte raconte.
 * Mais une purge silencieuse ne se lit jamais comme un choix — elle se lit
 * comme un bug, et le joueur croit avoir perdu sa progression. Elle n'est donc
 * appelée QUE depuis un passage qui la MONTRE : le sas de décontamination de la
 * cinématique, et la consigne de la halle qui l'écrit noir sur blanc.
 *
 * Garde-fou permanent : le vérificateur interdit à toute salle d'exiger la
 * caméra. Une sacoche vide ne peut donc bloquer aucune chambre — sans cette
 * règle, cette fonction serait une façon de rendre le jeu infinissable.
 */
export function purger(inventaire) {
  inventaire.connus.clear();
  inventaire.materialises.clear();
  return inventaire;
}

/** Places restantes pour de nouvelles matérialisations. */
export function placesRestantes(inventaire) {
  return MATERIALISATIONS_SIMULTANEES - inventaire.materialises.size;
}

/**
 * Sérialise pour la sauvegarde.
 *
 * Seuls les NOMS sont écrits, jamais les propriétés : celles-ci appartiennent à
 * la base curatée, qui évolue. Recopier les propriétés figerait une partie sur
 * une version périmée du vocabulaire, et un objet corrigé resterait faux pour
 * qui l'avait déjà scanné.
 */
export function serialiser(inventaire) {
  return {
    version: VERSION_INVENTAIRE,
    connus: [...inventaire.connus.keys()],
  };
}

/**
 * Restaure une sauvegarde.
 *
 * Un objet disparu de la base est ignoré plutôt que de faire échouer le
 * chargement : perdre un objet acquis est regrettable, perdre la partie entière
 * ne l'est pas.
 */
export function restaurer(donnees, chercher) {
  const inventaire = creerInventaire();
  const perdus = [];
  for (const nom of donnees?.connus ?? []) {
    const entree = chercher(nom);
    if (entree) memoriser(inventaire, entree);
    else perdus.push(nom);
  }
  return { inventaire, perdus };
}
