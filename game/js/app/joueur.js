// joueur.js — Déplacement, regard et manipulation d'objets.
//
// Ne dessine rien et ne connaît aucune chambre : il reçoit des colliders et des
// objets, il renvoie une position. Toute la résolution de collisions vient de
// `physics/`, écrite et testée bien avant qu'un joueur existe — c'était
// précisément le but de l'avoir extraite.
//
// ─── Répartition des responsabilités ─────────────────────────────────────────
//   ce module        état du joueur, intentions, application des règles
//   physics/         collisions, gravité, portage
//   app/partie.js    entrées clavier/souris, boucle de rendu

import { deplacerSurAxe } from '../physics/collision.js';
import { declenchePar } from '../gameplay/mecanismes.js';
import {
  suivrePorteur, appliquerGravite, aPortee, facteurVitesse, poserSur, reposeSur,
} from '../physics/portage.js';

/** Gabarit du joueur : un corps humain debout, arrondi aux hanches. */
export const GABARIT = Object.freeze({ rayon: 0.3, hauteur: 1.7 });

/** Hauteur des yeux au-dessus des pieds. */
export const HAUTEUR_YEUX = 1.6;

export const VITESSE = 4.2;
export const IMPULSION_SAUT = 6.4;
export const GRAVITE = -18;

/** Le regard s'arrête juste avant la verticale : au-delà, l'image se retourne. */
const TANGAGE_MAX = Math.PI / 2 - 0.05;

/** Crée l'état d'un joueur à une position de départ. */
export function creerJoueur(depart) {
  return {
    x: depart.x, y: depart.y, z: depart.z,
    vy: 0, auSol: false,
    yaw: depart.yaw ?? 0, pitch: 0,
    hauteurYeux: HAUTEUR_YEUX,
    porte: null,
  };
}

/** Applique un mouvement de souris au regard. */
export function regarder(joueur, dx, dy, sensibilite = 0.0022) {
  joueur.yaw -= dx * sensibilite;
  joueur.pitch = Math.max(-TANGAGE_MAX,
    Math.min(TANGAGE_MAX, joueur.pitch - dy * sensibilite));
  return joueur;
}

/**
 * Avance le joueur d'une image.
 *
 * `intentions` porte l'état des touches, jamais les touches elles-mêmes : le
 * remappage clavier et une éventuelle manette n'ont alors rien à changer ici.
 */
export function avancer(joueur, intentions, obstacles, dt) {
  const pas = Math.min(dt, 0.05);

  const avantArriere = (intentions.avancer ? 1 : 0) - (intentions.reculer ? 1 : 0);
  const gaucheDroite = (intentions.droite ? 1 : 0) - (intentions.gauche ? 1 : 0);

  const sin = Math.sin(joueur.yaw);
  const cos = Math.cos(joueur.yaw);
  let dx = -sin * avantArriere + cos * gaucheDroite;
  let dz = -cos * avantArriere - sin * gaucheDroite;

  // Normaliser la diagonale : sans cela, avancer en biais est 41 % plus rapide,
  // et le joueur qui l'a remarqué ne se déplace plus jamais autrement.
  const norme = Math.hypot(dx, dz);
  if (norme > 1) { dx /= norme; dz /= norme; }

  const vitesse = VITESSE * (joueur.porte ? facteurVitesse(joueur.porte.proprietes) : 1);
  deplacerSurAxe(joueur, 'x', dx * vitesse * pas, obstacles, GABARIT);
  deplacerSurAxe(joueur, 'z', dz * vitesse * pas, obstacles, GABARIT);

  if (intentions.sauter && joueur.auSol) {
    joueur.vy = IMPULSION_SAUT;
    joueur.auSol = false;
  }
  joueur.vy += GRAVITE * pas;
  joueur.auSol = false;
  deplacerSurAxe(joueur, 'y', joueur.vy * pas, obstacles, GABARIT);

  return joueur;
}

/**
 * Objet le plus proche à portée, ou `null`.
 *
 * Le plus proche plutôt que le premier trouvé : deux objets côte à côte doivent
 * se prendre dans l'ordre où on les atteint, sinon le joueur croit que le jeu
 * ignore ses clics.
 */
export function objetVise(joueur, objets, portee) {
  let meilleur = null;
  let distanceMin = Infinity;
  const yeux = { x: joueur.x, y: joueur.y + joueur.hauteurYeux, z: joueur.z };
  for (const corps of objets) {
    if (!aPortee(joueur, corps, portee)) continue;
    const d = (corps.x - yeux.x) ** 2 + (corps.y - yeux.y) ** 2 + (corps.z - yeux.z) ** 2;
    if (d < distanceMin) { distanceMin = d; meilleur = corps; }
  }
  return meilleur;
}

/**
 * Prend ou lâche : une seule commande, comme dans tout le genre.
 *
 * Deux touches distinctes obligeraient le joueur à se souvenir de ce qu'il
 * tient. Une seule rend l'action réversible sans réflexion.
 */
export function basculerPrise(joueur, objets, receptacles, portee) {
  if (joueur.porte) return lacher(joueur, receptacles);
  const cible = objetVise(joueur, objets, portee);
  if (!cible) return { action: 'rien' };
  joueur.porte = cible;
  return { action: 'pris', objet: cible.nom };
}

/**
 * Lâche l'objet tenu, en l'aimantant sur un réceptacle s'il y en a un dessous.
 *
 * L'aimantation n'accorde rien : la condition d'activation reste entière. Elle
 * supprime seulement l'exigence de précision au centimètre, qui ne demande
 * aucune réflexion et ne produit que de l'agacement.
 */
export function lacher(joueur, receptacles) {
  const objet = joueur.porte;
  if (!objet) return { action: 'rien' };
  joueur.porte = null;

  for (const [instance, recep] of receptacles) {
    if (reposeSur(objet, objet.gabarit, recep.boite, 0.6)) {
      poserSur(objet, objet.gabarit, recep.boite);
      return { action: 'pose', objet: objet.nom, receptacle: instance };
    }
  }
  return { action: 'lache', objet: objet.nom };
}

/** Fait suivre l'objet tenu, et applique la gravité à tous les autres. */
export function majObjets(joueur, objets, obstacles, dt) {
  for (const corps of objets) {
    if (corps === joueur.porte) {
      const { lache } = suivrePorteur(corps, joueur, obstacles, corps.gabarit, dt);
      if (lache) joueur.porte = null;
    } else {
      appliquerGravite(corps, dt, obstacles, corps.gabarit, GRAVITE);
    }
    if (corps.maillage) {
      corps.maillage.position.set(
        corps.x, corps.y + corps.gabarit.hauteur / 2, corps.z);
    }
  }
}

/**
 * Terminal à portée que l'objet tenu permet de déclencher, ou `null`.
 *
 * Il faut TENIR l'objet, pas seulement le posséder : brandir son téléphone
 * devant la console est le geste, et c'est lui qu'on récompense. Sans cette
 * exigence, le piratage se ferait de loin, sans rien décider.
 */
export function terminalAPortee(joueur, terminaux, portee = 2.2) {
  if (!joueur.porte) return null;
  for (const [instance, terminal] of terminaux) {
    const centre = {
      x: (terminal.boite.minX + terminal.boite.maxX) / 2,
      y: (terminal.boite.minY + terminal.boite.maxY) / 2,
      z: (terminal.boite.minZ + terminal.boite.maxZ) / 2,
    };
    if (!aPortee(joueur, centre, portee)) continue;
    if (declenchePar(terminal.type, joueur.porte.proprietes)) {
      return { instance, terminal };
    }
  }
  return null;
}

/**
 * Occupation de chaque réceptacle, telle que les mécanismes l'attendent.
 *
 * Un objet TENU ne compte pas : le joueur ne peut pas maintenir une plaque avec
 * un objet qu'il emporte. C'est le pendant de la règle qui refuse son propre
 * poids — sans elle, il suffirait de rester debout dessus, brique en main.
 */
export function occupations(joueur, objets, receptacles) {
  const etat = {};
  for (const [instance, recep] of receptacles) {
    etat[instance] = null;

    for (const corps of objets) {
      if (corps === joueur.porte) continue;
      if (reposeSur(corps, corps.gabarit, recep.boite, 0.25)) {
        etat[instance] = {
          type: recep.type, proprietes: corps.proprietes, estLeJoueur: false,
        };
        break;
      }
    }
    if (etat[instance]) continue;

    const surLaPlaque = joueur.x > recep.boite.minX && joueur.x < recep.boite.maxX
                     && joueur.z > recep.boite.minZ && joueur.z < recep.boite.maxZ
                     && joueur.y < recep.boite.maxY + 0.4;
    if (surLaPlaque) {
      etat[instance] = { type: recep.type, proprietes: ['lourd'], estLeJoueur: true };
    }
  }
  return etat;
}
