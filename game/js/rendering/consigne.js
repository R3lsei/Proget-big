// consigne.js — Le panneau qui dit quoi faire (T-042).
//
// Le joueur a été direct : « le niveau est très mal expliqué ». Il avait raison,
// et pas seulement sur la forme. NOVA-7 demande au joueur quelque chose qu'aucun
// autre jeu ne lui a jamais demandé — montrer un objet RÉEL à sa webcam pour
// qu'il apparaisse dans le monde. Aucune convention ne l'y prépare. Un joueur
// qui ne le devine pas ne joue pas mal : il ne peut pas jouer du tout.
//
// ─── Pourquoi un panneau dans le monde, et pas une bulle d'interface ────────
//
// Une bulle d'aide s'affiche, se lit une fois, disparaît, et le joueur qui
// revient dix minutes plus tard n'a plus rien. Un panneau accroché au mur est
// TOUJOURS là : on peut s'y retourner, le relire, le montrer à quelqu'un. Il
// coûte un maillage et deux textures, et il fait le travail d'un tutoriel entier
// sans jamais interrompre la partie.
//
// ─── Le partage entre ce module et le navigateur ────────────────────────────
//
// Dessiner du texte demande un `canvas`, que Node n'a pas. Toute la logique qui
// DÉCIDE — découpe des lignes, taille du panneau, hiérarchie des blocs — est
// donc ici, en fonctions pures, et testée. Le navigateur ne fait plus que
// peindre ce qu'on lui a calculé. C'est le même partage que pour le semis : la
// décision se teste, le pixel non.

/**
 * Découpe un texte en lignes qui tiennent dans une largeur donnée.
 *
 * En caractères et non en pixels : à cette taille de rendu la police est quasi
 * monospacée une fois moyennée, et surtout une mesure en pixels exigerait un
 * `canvas`, donc rendrait la fonction intestable. Deux caractères d'erreur sur
 * une ligne de trente ne se voient pas ; un tutoriel non vérifié, si.
 *
 * Coupe aux ESPACES, jamais au milieu d'un mot — sauf si le mot est à lui seul
 * plus long que la ligne, auquel cas on le laisse déborder plutôt que de le
 * casser : un mot tronqué se lit comme une faute d'affichage.
 *
 * @param {string} texte
 * @param {number} largeurMax  en caractères
 * @returns {string[]}
 */
export function enLignes(texte, largeurMax) {
  const lignes = [];
  for (const paragraphe of String(texte).split('\n')) {
    let courante = '';
    for (const mot of paragraphe.split(/\s+/).filter(Boolean)) {
      if (courante && courante.length + 1 + mot.length > largeurMax) {
        lignes.push(courante);
        courante = mot;
      } else {
        courante = courante ? `${courante} ${mot}` : mot;
      }
    }
    lignes.push(courante);
  }
  // Un paragraphe vide en fin de texte produirait une ligne vide au rendu, qui
  // décale tout le bloc vers le haut sans qu'on comprenne pourquoi.
  while (lignes.length && lignes[lignes.length - 1] === '') lignes.pop();
  return lignes;
}

/** Largeur du panneau en caractères. Fixée : c'est elle qui règle la lisibilité. */
export const COLONNES = 30;

/** Hauteur du panneau en jeu, en mètres, pour une consigne de trois lignes. */
const HAUTEUR_BASE = 0.62;

/** Ce que coûte une ligne de corps supplémentaire, en mètres. */
const PAR_LIGNE = 0.115;

/**
 * Met une consigne en page : lignes découpées et dimensions du panneau.
 *
 * Le panneau GRANDIT avec son texte au lieu de rétrécir la police. Une consigne
 * illisible ne sert à rien, et c'est le défaut par défaut de tout panneau à
 * taille fixe : le jour où l'on ajoute une phrase, tout devient minuscule et
 * personne ne s'en aperçoit avant le joueur.
 *
 * @param {{titre: string, corps: string, rappel?: string}} consigne
 * @returns {{titre:string, lignes:string[], rappel:string[], largeur:number, hauteur:number}}
 */
export function mettreEnPage(consigne) {
  const lignes = enLignes(consigne.corps ?? '', COLONNES);
  const rappel = consigne.rappel ? enLignes(consigne.rappel, COLONNES) : [];
  const total = lignes.length + rappel.length;
  return {
    titre: (consigne.titre ?? '').toUpperCase(),
    lignes,
    rappel,
    largeur: 1.15,
    hauteur: HAUTEUR_BASE + Math.max(0, total - 3) * PAR_LIGNE,
  };
}

/**
 * Où accrocher le panneau : face au joueur, sur le mur qu'il regarde au départ.
 *
 * Pas « quelque part sur un mur ». Le joueur démarre dos au mur opposé à la
 * sortie et REGARDE la porte ; le panneau doit donc être dans ce premier champ
 * de vision, sinon il faut déjà savoir qu'il existe pour aller le chercher — ce
 * qui est exactement le problème qu'il est censé résoudre.
 *
 * Décalé sur le côté de la porte, et jamais au-dessus : au-dessus, il est hors
 * du champ de vision au repos, et le joueur ne lève pas les yeux dans un couloir.
 *
 * @param {object} chambre
 * @param {{nx:number,nz:number,distance:number,ouverture:number}} seuil
 * @returns {{x:number,y:number,z:number,rotation:number}}
 */
export function placerConsigne(chambre, seuil) {
  const { nx, nz, distance, ouverture } = seuil;
  // À droite de la porte vue depuis la salle. La tangente du mur est (-nz, nx) ;
  // le décalage vaut la demi-ouverture plus la demi-largeur du panneau plus un
  // dégagement, sinon il chevauche le chambranle.
  const cote = ouverture / 2 + 1.05;
  return {
    x: nx * (distance - 0.08) - nz * cote,
    y: 1.55,                       // hauteur des yeux : on le lit sans bouger
    z: nz * (distance - 0.08) + nx * cote,
    // Tourné vers l'intérieur de la salle, comme tout le mobilier mural.
    rotation: Math.atan2(-nx, -nz),
  };
}
