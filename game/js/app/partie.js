// partie.js — Assemblage : c'est le seul module autorisé à tout connaître.
//
// Il branche ensemble des pièces qui s'ignorent : le bâtisseur ne sait rien du
// joueur, le joueur ne sait rien des mécanismes, les mécanismes ne savent rien
// du rendu. Tout se rejoint ici, et nulle part ailleurs.

import * as THREE from 'three';
import { RoomEnvironment } from '../../lib/RoomEnvironment.js';

import { CHAMBRES } from '../gameplay/chambres.js';
import { receptaclesActifs, circuitOuvert } from '../gameplay/mecanismes.js';
import { batir, departDe } from '../rendering/batisseur.js';
import { soleil, ambiance } from '../rendering/kit.js';
import {
  creerJoueur, regarder, avancer, basculerPrise, majObjets, occupations,
  objetVise, HAUTEUR_YEUX,
} from './joueur.js';
import { PORTEE_SAISIE } from '../physics/portage.js';

/** Vitesse d'ouverture de la porte, en fraction par seconde. */
const VITESSE_PORTE = 1.4;

/**
 * Démarre une partie sur une chambre.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} indexChambre
 * @returns {object} l'état, exposé pour les tests automatisés
 */
export function demarrer(canvas, indexChambre = 0) {
  const chambre = CHAMBRES[indexChambre];

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth || 1280, canvas.clientHeight || 720);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc9d8de);
  scene.environment = new THREE.PMREMGenerator(renderer)
    .fromScene(new RoomEnvironment(), 0.04).texture;

  const bati = batir(chambre);
  scene.add(bati.groupe);
  scene.add(soleil({ portee: 26 }));
  scene.add(ambiance());

  const camera = new THREE.PerspectiveCamera(
    72, (canvas.clientWidth || 1280) / (canvas.clientHeight || 720), 0.1, 200);

  const joueur = creerJoueur(departDe(chambre));
  const objets = [...bati.objets.values()];

  const intentions = {
    avancer: false, reculer: false, gauche: false, droite: false, sauter: false,
  };
  // Les touches ZQSD d'un clavier français correspondent aux codes physiques
  // WASD : on écoute `code` et non `key`, sinon la disposition du clavier
  // changerait les commandes.
  const TOUCHES = {
    KeyW: 'avancer', KeyS: 'reculer', KeyA: 'gauche', KeyD: 'droite', Space: 'sauter',
    ArrowUp: 'avancer', ArrowDown: 'reculer', ArrowLeft: 'gauche', ArrowRight: 'droite',
  };

  const etat = {
    chambre, joueur, objets, bati, scene, camera, renderer,
    ouverture: 0, ouverte: false, actifs: new Set(),
    dernierMessage: '',
  };

  function agir() {
    const resultat = basculerPrise(joueur, objets, bati.receptacles, PORTEE_SAISIE);
    etat.dernierMessage = {
      pris: () => `Vous prenez ${resultat.objet}.`,
      pose: () => `${resultat.objet} repose sur ${resultat.receptacle}.`,
      lache: () => `Vous lâchez ${resultat.objet}.`,
      rien: () => 'Rien à portée.',
    }[resultat.action]();
    return resultat;
  }
  etat.agir = agir;

  addEventListener('keydown', (e) => {
    if (TOUCHES[e.code]) { intentions[TOUCHES[e.code]] = true; e.preventDefault(); }
    if (e.code === 'KeyE') agir();
  });
  addEventListener('keyup', (e) => {
    if (TOUCHES[e.code]) intentions[TOUCHES[e.code]] = false;
  });
  canvas.addEventListener('click', () => {
    // Firefox renvoie `undefined` au lieu d'une promesse : l'appel doit être
    // défensif, faute de quoi le jeu plante au premier clic (B-007).
    const demande = canvas.requestPointerLock?.();
    if (demande?.catch) demande.catch(() => {});
  });
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) {
      regarder(joueur, e.movementX, e.movementY);
    }
  });

  /** Avance la simulation d'un pas. Séparée de la boucle pour être testable. */
  function pas(dt) {
    avancer(joueur, intentions, bati.colliders, dt);
    majObjets(joueur, objets, bati.colliders, dt);

    etat.actifs = receptaclesActifs(occupations(joueur, objets, bati.receptacles));
    for (const [instance, recep] of bati.receptacles) {
      recep.socle.userData.signaler(etat.actifs.has(instance));
    }

    etat.ouverte = circuitOuvert(chambre.sortie, etat.actifs);
    const cible = etat.ouverte ? 1 : 0;
    // La porte s'anime au lieu de sauter : un changement instantané se lit comme
    // un défaut d'affichage, pas comme une conséquence de ce qu'on vient de faire.
    etat.ouverture += Math.sign(cible - etat.ouverture)
      * Math.min(Math.abs(cible - etat.ouverture), VITESSE_PORTE * dt);
    bati.porte.ouvrir(etat.ouverture);

    camera.position.set(joueur.x, joueur.y + HAUTEUR_YEUX, joueur.z);
    camera.rotation.set(joueur.pitch, joueur.yaw, 0, 'YXZ');
    etat.vise = objetVise(joueur, objets, PORTEE_SAISIE)?.nom ?? null;
  }
  etat.pas = pas;

  /**
   * Pas de simulation fixe, découplé de l'affichage.
   *
   * Sans lui, la distance parcourue dépend de la fréquence d'images : chaque
   * image applique un pas borné, donc une machine à 20 images par seconde
   * déplace le joueur deux fois moins vite qu'une à 60. Le premier essai en
   * navigateur l'a montré — 0,84 m parcourus là où il en fallait 3.
   * Un pas fixe rend le jeu identique partout, ce qui compte d'autant plus que
   * la cible est 120 images par seconde sans l'imposer.
   */
  const PAS_FIXE = 1 / 120;
  /** Au-delà, on abandonne le retard : rattraper une seconde d'un coup gèlerait
   *  la page et téléporterait le joueur. */
  const RETARD_MAX = 0.25;

  let precedent = performance.now();
  let accumulateur = 0;

  function boucle(maintenant) {
    accumulateur += Math.min((maintenant - precedent) / 1000, RETARD_MAX);
    precedent = maintenant;
    while (accumulateur >= PAS_FIXE) {
      pas(PAS_FIXE);
      accumulateur -= PAS_FIXE;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(boucle);
  }
  requestAnimationFrame(boucle);

  return etat;
}
