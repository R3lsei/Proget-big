// plateforme.js — Ce qui porte un corps quand le sol lui-même bouge (T-043).
//
// Toute la physique du jeu repose sur une hypothèse qui n'a jamais été écrite :
// les obstacles ne bougent pas. `deplacerSurAxe` résout un corps contre des
// boîtes STATIQUES, et cela a suffi pour deux salles — un pont qui sort du mur
// est immobile une fois sorti, une porte qui coulisse ne porte personne.
//
// Une passerelle élévatrice casse cette hypothèse. Si l'on se contente de
// déplacer sa boîte, il n'arrive rien de bon :
//
//   en MONTANT   la boîte traverse le joueur pendant une image, puis la
//                résolution le repousse — vers le haut si elle devine bien,
//                sur le côté sinon, et le joueur est éjecté dans le vide ;
//   en DESCENDANT le sol se dérobe et le joueur retombe par petits sauts,
//                un tressautement à chaque image.
//
// Il manque une notion que le moteur n'a pas : le PORTAGE. Un corps posé sur
// une surface mobile encaisse le déplacement de cette surface avant que quoi
// que ce soit d'autre ne soit résolu.
//
// ─── Pourquoi un module à part, et pur ──────────────────────────────────────
//
// Parce que c'est une décision, pas un dessin : « ce corps est-il porté ? »
// est une question à laquelle on répond par des nombres, et dont la réponse se
// vérifie. La classe de bug qu'on veut rendre impossible — un joueur qui
// traverse une plate-forme, ou qui reste en l'air quand elle descend — ne se
// constate autrement qu'en jouant, au hasard, et une fois sur dix.

import { boiteDuCorps } from './collision.js';

/**
 * Écart vertical maximal, en mètres, entre les pieds d'un corps et le dessus
 * d'une plate-forme pour qu'il soit considéré posé dessus.
 *
 * Généreux à dessein. La résolution de collision laisse déjà 2 mm de marge, la
 * gravité en creuse quelques autres entre deux images, et un corps qui vient de
 * sauter décolle de plusieurs centimètres. Trop serré, le joueur perd le
 * contact une image sur trois et la plate-forme le lâche en route — le défaut
 * le plus rageant qui soit, parce qu'il est intermittent.
 */
export const TOLERANCE_CONTACT = 0.12;

/**
 * Déplacement vertical maximal appliqué en une fois, en mètres.
 *
 * Même raison que le découpage en sous-pas de `deplacerSurAxe`, et c'est la
 * leçon de B-014 transposée : une plate-forme qui monte de plus que la hauteur
 * du corps en une image peut le traverser sans jamais le chevaucher. À 0,47 m/s
 * cela n'arrive pas, mais un à-coup de 400 ms suffirait, et les à-coups
 * arrivent — c'est même le seul moment où l'on a besoin d'un garde-fou.
 */
export const PAS_MAX = 0.1;

/**
 * Ce corps repose-t-il sur cette plate-forme ?
 *
 * Deux conditions, et les deux comptent. Verticalement, les pieds doivent être
 * au niveau du dessus, à la tolérance près — un corps qui passe SOUS la
 * plate-forme ne doit surtout pas être emporté vers le haut. Horizontalement,
 * l'empreinte doit chevaucher la boîte : sans ce test, on porterait quelqu'un
 * qui se tient à côté.
 *
 * @param {{x:number,y:number,z:number}} corps
 * @param {{rayon:number,hauteur:number}} gabarit
 * @param {{minX:number,maxX:number,minY:number,maxY:number,minZ:number,maxZ:number}} boite
 * @returns {boolean}
 */
export function reposeSurPlateforme(corps, gabarit, boite) {
  const ecart = corps.y - boite.maxY;
  if (ecart < -TOLERANCE_CONTACT || ecart > TOLERANCE_CONTACT) return false;
  const c = boiteDuCorps(corps, gabarit);
  return c.maxX > boite.minX && c.minX < boite.maxX
      && c.maxZ > boite.minZ && c.minZ < boite.maxZ;
}

/**
 * Boîte d'une plate-forme à une hauteur donnée.
 *
 * La plate-forme est décrite par son empreinte et son épaisseur ; sa hauteur
 * est le seul paramètre qui change. Une seule formule, appelée par le rendu
 * comme par la physique : deux calculs parallèles finiraient par diverger, et
 * l'on aurait une plate-forme qu'on voit à un endroit et qu'on touche à un
 * autre. C'est exactement ce qui est arrivé au semis et au sol.
 */
export function boiteDePlateforme(plateforme, hauteur) {
  const demiX = plateforme.largeur / 2;
  const demiZ = plateforme.longueur / 2;
  return {
    minX: plateforme.x - demiX, maxX: plateforme.x + demiX,
    minY: hauteur - plateforme.epaisseur, maxY: hauteur,
    minZ: plateforme.z - demiZ, maxZ: plateforme.z + demiZ,
  };
}

/**
 * Fait avancer une plate-forme vers sa consigne, en emportant ses passagers.
 *
 * L'ordre des opérations est tout le module :
 *
 *   1. on relève QUI est porté, à la position ACTUELLE de la plate-forme ;
 *   2. on déplace la plate-forme d'un sous-pas borné ;
 *   3. on déplace les passagers du même écart, et l'on plaque leurs pieds sur
 *      le nouveau dessus.
 *
 * Relever les passagers AVANT le déplacement, et non après, est la seule chose
 * qui rende le portage juste. Après coup, une plate-forme qui monte a déjà
 * traversé le joueur : il n'est plus « dessus », il est dedans, et aucune règle
 * de contact ne le rattrapera.
 *
 * On ne résout pas les collisions ici — c'est le travail de `deplacerSurAxe`,
 * qui tourne juste après dans la boucle de jeu. Ce module ne fait que
 * transporter.
 *
 * @param {{x:number,z:number,largeur:number,longueur:number,epaisseur:number}} plateforme
 * @param {number} hauteur   hauteur actuelle du dessus, en mètres
 * @param {number} consigne  hauteur visée
 * @param {number} vitesse   en mètres par seconde
 * @param {number} dt        en secondes
 * @param {{corps:object,gabarit:object}[]} passagers  candidats au portage
 * @returns {{hauteur:number, portes:object[]}}  nouvelle hauteur, corps emportés
 */
export function avancerPlateforme(
  plateforme, hauteur, consigne, vitesse, dt, passagers = []) {
  const restant = consigne - hauteur;
  if (Math.abs(restant) < 1e-4) return { hauteur: consigne, portes: [] };

  // Jamais au-delà de la consigne : un dépassement suivi d'un retour ferait
  // osciller la plate-forme d'un millimètre indéfiniment, et ce frémissement
  // se voit sur les reflets bien avant qu'on comprenne d'où il vient.
  const course = Math.sign(restant) * Math.min(Math.abs(restant), vitesse * dt);

  const nb = Math.max(1, Math.ceil(Math.abs(course) / PAS_MAX));
  const portes = new Set();
  const depart = hauteur;

  for (let i = 0; i < nb; i++) {
    const boite = boiteDePlateforme(plateforme, hauteur);
    const embarques = passagers.filter(
      ({ corps, gabarit }) => reposeSurPlateforme(corps, gabarit, boite));
    // Interpolation depuis le DÉPART, jamais par cumul de sous-pas. Additionner
    // trente fois `course / 30` ne redonne pas `course` en virgule flottante :
    // la plate-forme s'arrêtait un milliardième de mètre au-dessus de sa
    // consigne, y revenait à l'image suivante, et frémissait indéfiniment. Une
    // erreur invisible en soi, parfaitement visible dans un reflet.
    const suivante = depart + (course * (i + 1)) / nb;
    const pas = suivante - hauteur;
    hauteur = suivante;
    for (const { corps } of embarques) {
      // PLAQUÉ sur le pont, pas simplement décalé du même écart. La tolérance
      // de contact vaut douze centimètres : un corps cueilli en limite haute
      // garderait ce jeu pendant toute la course et arriverait en l'air, un
      // corps cueilli en limite basse resterait enfoncé dans le pont. Plaquer
      // supprime les deux, et c'est aussi ce que fait un vrai plancher.
      corps.y = suivante;
      // Vitesse verticale remise à zéro et contact confirmé : sans cela, la
      // gravité accumulée pendant la montée ferait replonger le corps dès que
      // la plate-forme s'arrête, et le joueur traverserait son propre plancher.
      if (pas > 0) { corps.vy = 0; corps.auSol = true; }
      portes.add(corps);
    }
  }
  return { hauteur: depart + course, portes: [...portes] };
}
