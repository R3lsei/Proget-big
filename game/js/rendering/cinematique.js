// cinematique.js — Le seul moment où le joueur n'a pas la main (T-044).
//
// Une cinématique est une dépense de confiance. Le joueur accepte de regarder
// au lieu de jouer, et il n'accepte qu'une fois : à la deuxième partie, tout ce
// qu'il n'a pas pu passer se paie en agacement. Trois règles en découlent, et
// elles ne sont pas négociables.
//
//   PASSABLE     à n'importe quelle touche, dès la première image. Sans quoi
//                la deuxième partie commence par douze secondes d'attente.
//   COURTE       douze secondes. Au-delà, on raconte ; ici on ANNONCE.
//   UTILE        elle doit dire quelque chose que le jeu ne dit pas autrement.
//
// Celle-ci en dit deux : que la halle est HAUTE — c'est le sujet de la salle,
// et un plan d'ouverture vertical l'établit mieux que n'importe quelle
// consigne — et que la sacoche a été purgée. Ce second point est le vrai
// travail de la séquence. Une purge silencieuse se lit comme une perte de
// progression, donc comme un bug ; montrée à l'écran, c'est un événement.
//
// ─── Ce que ce module ne fait pas ────────────────────────────────────────────
//
// Il ne touche ni à three, ni au DOM, ni à la partie. Il répond à une seule
// question — « à cet instant, où est la caméra, que regarde-t-elle, et que voit
// le joueur par-dessus ? » — et c'est une fonction pure. Le branchement fait
// dix lignes ailleurs ; c'est ici que se trouve tout ce qui peut être faux.

/** Interpolation douce entre deux images-clés. */
function lissage(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

const melanger = (a, b, k) => a + (b - a) * k;

/**
 * Où en est la caméra à l'instant `t` ?
 *
 * Les images-clés portent une position, un point visé, et deux voiles : le NOIR
 * qui ouvre et ferme, l'ÉCLAIR blanc de la décontamination. Le texte, lui, ne
 * s'interpole pas — un titre à moitié affiché n'existe pas. Il vaut celui de la
 * dernière clé franchie, ce qui permet de l'afficher et de le retirer en posant
 * simplement deux clés.
 *
 * Hors bornes, on rend la première ou la dernière clé plutôt que d'extrapoler :
 * une caméra qui continue sa course après la fin de la séquence part à l'infini,
 * et le joueur reprend la main quelque part au-dessus du désert.
 *
 * @param {{cles: object[]}} sequence
 * @param {number} t  secondes depuis le début
 */
export function etatCinematique(sequence, t) {
  const cles = sequence.cles;
  if (t <= cles[0].t) return rendre(cles[0], cles[0], 0);
  const derniere = cles[cles.length - 1];
  if (t >= derniere.t) return rendre(derniere, derniere, 0);

  let i = 0;
  while (i < cles.length - 2 && cles[i + 1].t <= t) i += 1;
  const a = cles[i];
  const b = cles[i + 1];
  return rendre(a, b, lissage((t - a.t) / (b.t - a.t)));
}

function rendre(a, b, k) {
  return {
    position: [0, 1, 2].map((i) => melanger(a.position[i], b.position[i], k)),
    cible: [0, 1, 2].map((i) => melanger(a.cible[i], b.cible[i], k)),
    voile: melanger(a.voile ?? 0, b.voile ?? 0, k),
    eclair: melanger(a.eclair ?? 0, b.eclair ?? 0, k),
    // Pas d'interpolation : le texte de la clé de DÉPART tient jusqu'à la
    // suivante. Un titre dont l'opacité varierait avec la course de la caméra
    // apparaîtrait au milieu d'un mouvement, ce qui se lit comme un défaut.
    texte: a.texte ?? '',
  };
}

/** Durée totale d'une séquence, en secondes. */
export const dureeDe = (sequence) => sequence.cles[sequence.cles.length - 1].t;

/**
 * Instant où la sacoche doit être purgée, en secondes.
 *
 * C'est l'image de l'éclair le plus fort. La purge et son signal visuel sont
 * ainsi le MÊME événement, et non deux choses qui arrivent à peu près en même
 * temps : décaler l'un de l'autre suffirait à ce que le joueur ne fasse pas le
 * lien, et l'on retomberait sur une disparition inexpliquée.
 */
export function instantDePurge(sequence) {
  let meilleur = sequence.cles[0];
  for (const cle of sequence.cles) {
    if ((cle.eclair ?? 0) > (meilleur.eclair ?? 0)) meilleur = cle;
  }
  return meilleur.t;
}

/**
 * L'entrée dans la halle de maintenance.
 *
 * Le mouvement est UNE montée. Toute la salle tient dans cette information — il
 * y a un étage, la sortie est en haut — et la caméra la donne avant que le
 * joueur ait à la chercher. Elle se pose ensuite exactement à la hauteur des
 * yeux, à la position de départ : la reprise en main ne doit pas être un saut.
 */
export const ENTREE_HALLE = Object.freeze({
  id: 'entree_halle',
  cles: [
    // Noir. Le sas vient de se refermer derrière.
    { t: 0.0, position: [0, 1.6, 6.4], cible: [0, 1.6, 0], voile: 1 },
    { t: 1.2, position: [0, 1.6, 6.4], cible: [0, 1.8, 0], voile: 0 },
    // Décontamination : l'éclair. La sacoche se vide ICI, à l'image même.
    { t: 2.4, position: [0, 1.7, 5.6], cible: [0, 1.9, 0], eclair: 0 },
    {
      t: 3.0,
      position: [0, 1.7, 5.4],
      cible: [0, 2.0, 0],
      eclair: 1,
      texte: 'SACOCHE PURGÉE',
    },
    { t: 4.2, position: [0, 1.9, 5.0], cible: [0, 2.4, 0], eclair: 0, texte: 'SACOCHE PURGÉE' },
    // La montée : on découvre la mezzanine, puis le volume entier.
    { t: 7.0, position: [0, 4.6, 4.2], cible: [0, 2.8, -3.5] },
    {
      t: 9.2,
      position: [0, 5.4, 2.4],
      cible: [0, 2.8, -4.6],
      texte: 'ACTE I — APPRENDRE',
    },
    { t: 10.6, position: [0, 3.4, 4.4], cible: [0, 2.4, -3.0], texte: 'ACTE I — APPRENDRE' },
    // Retour dans les yeux du joueur, à sa position de départ exacte.
    { t: 12.0, position: [0, 1.6, 6.0], cible: [0, 1.6, 0] },
  ],
});
