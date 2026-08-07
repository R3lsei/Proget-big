// partie.js — Assemblage : c'est le seul module autorisé à tout connaître.
//
// Il branche ensemble des pièces qui s'ignorent : le bâtisseur ne sait rien du
// joueur, le joueur ne sait rien des mécanismes, les mécanismes ne savent rien
// du rendu. Tout se rejoint ici, et nulle part ailleurs.

import * as THREE from 'three';
import { RoomEnvironment } from '../../lib/RoomEnvironment.js';

import { CHAMBRES } from '../gameplay/chambres.js';
import {
  receptaclesActifs, circuitOuvert, enclencher, faitsDeChambre,
} from '../gameplay/mecanismes.js';
import {
  creerInventaire, memoriser, materialiser, dematerialiser, contenu, placesRestantes,
} from '../gameplay/inventaire.js';
import { chercher } from '../perception/base/index.js';
import { batir, departDe } from '../rendering/batisseur.js';
import { soleil, ambiance } from '../rendering/kit.js';
import {
  creerJoueur, regarder, avancer, basculerPrise, majObjets, occupations,
  objetVise, terminalAPortee, restaurerEgares, HAUTEUR_YEUX,
} from './joueur.js';
import { GABARIT_OBJET } from '../rendering/batisseur.js';
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

  const depart = departDe(chambre);
  const joueur = creerJoueur(depart);
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
    enclenches: new Set(),
    inventaire: creerInventaire(),
    dernierMessage: '',
  };

  /**
   * Une seule touche pour agir, et l'ordre des priorités compte.
   *
   * Déclencher un terminal passe AVANT prendre ou poser : le joueur qui approche
   * son téléphone d'une console veut la pirater, pas lâcher son téléphone
   * dessus. L'ordre inverse rendrait le piratage presque impossible à déclencher.
   */
  function agir() {
    const cible = terminalAPortee(joueur, bati.terminaux);
    if (cible && !etat.enclenches.has(cible.instance)) {
      etat.enclenches = enclencher(etat.enclenches, cible.instance);
      etat.dernierMessage = `${cible.instance} enclenché.`;
      return { action: 'enclenche', terminal: cible.instance };
    }

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

  /**
   * Enregistre un objet reconnu par la caméra.
   *
   * Le scan ne fait qu'ajouter à la mémoire : rien n'apparaît dans la salle
   * tant que le joueur ne le décide pas. Matérialiser d'office encombrerait la
   * pièce et retirerait au joueur le choix du moment.
   */
  etat.memoriser = (nom) => {
    const resultat = memoriser(etat.inventaire, chercher(nom));
    etat.dernierMessage = resultat.ajoute
      ? `${nom} mémorisé — invocable à tout moment.`
      : `${nom} : ${resultat.raison}.`;
    return resultat;
  };

  /**
   * Fait apparaître un objet mémorisé devant le joueur.
   *
   * Devant lui et non dans ses mains : l'objet doit être ramassé comme les
   * autres, pour que la caméra reste une façon d'obtenir un objet et non une
   * façon de contourner le jeu.
   */
  etat.invoquer = (nom) => {
    const resultat = materialiser(etat.inventaire, nom);
    if (!resultat.ok) {
      etat.dernierMessage = `Impossible : ${resultat.raison}.`;
      return resultat;
    }
    const taille = resultat.objet.proprietes.includes('lourd') ? 0.32 : 0.24;
    const maillage = new THREE.Mesh(
      new THREE.BoxGeometry(taille, taille, taille),
      new THREE.MeshStandardMaterial({ color: 0x6ad4b0, roughness: 0.5 }));
    maillage.castShadow = true;
    bati.groupe.add(maillage);

    const corps = {
      nom, proprietes: resultat.objet.proprietes,
      x: joueur.x - Math.sin(joueur.yaw) * 1.1, y: 0.6,
      z: joueur.z - Math.cos(joueur.yaw) * 1.1,
      vy: 0, auSol: false, maillage, invoque: true,
      gabarit: { rayon: taille / 2, hauteur: taille },
    };
    objets.push(corps);
    etat.dernierMessage = `${nom} matérialisé.`;
    return { ok: true, corps };
  };

  /** Renvoie un objet invoqué à l'inventaire, libérant une place. */
  etat.renvoyer = (nom) => {
    const index = objets.findIndex((c) => c.invoque && c.nom === nom);
    if (index < 0) return false;
    if (joueur.porte === objets[index]) joueur.porte = null;
    bati.groupe.remove(objets[index].maillage);
    objets.splice(index, 1);
    dematerialiser(etat.inventaire, nom);
    return true;
  };

  etat.inventaireVisible = () => ({
    connus: contenu(etat.inventaire).map((o) => o.nom),
    places: placesRestantes(etat.inventaire),
  });

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
    // Une passerelle déployée devient un sol ; rentrée, elle n'existe plus.
    // Recomposer la liste à chaque pas coûte peu et évite qu'un pont rentré
    // reste marchable — le pire des deux mondes.
    const obstacles = [...bati.colliders];
    for (const [id, pont] of bati.passerelles) {
      if ((pont.progression ?? 0) > 0.98) obstacles.push(pont.collider);
    }

    avancer(joueur, intentions, obstacles, dt);
    majObjets(joueur, objets, obstacles, dt);

    const egares = restaurerEgares(joueur, objets, depart);
    for (const nom of egares.rendus) {
      const index = objets.findIndex((c) => c.invoque && c.nom === nom);
      if (index >= 0) bati.groupe.remove(objets[index].maillage);
      dematerialiser(etat.inventaire, nom);
    }
    if (egares.objets.length) {
      etat.dernierMessage = `${egares.objets.join(', ')} remonté du gouffre.`;
    } else if (egares.rendus.length) {
      etat.dernierMessage = `${egares.rendus.join(', ')} rendu à l'inventaire.`;
    } else if (egares.joueurTombe) {
      etat.dernierMessage = 'Vous êtes tombé. Rien n\'est perdu.';
    }

    etat.actifs = receptaclesActifs(occupations(joueur, objets, bati.receptacles));
    for (const [instance, recep] of bati.receptacles) {
      recep.socle.userData.signaler(etat.actifs.has(instance));
    }

    // Les faits d'une chambre sont de trois natures — réceptacles maintenus,
    // terminaux enclenchés, passerelles déployées — mais la grammaire n'en voit
    // qu'un seul ensemble. C'est ce qui permet à une sortie de les mélanger sans
    // une ligne de code supplémentaire.
    const faits = faitsDeChambre(etat.actifs, etat.enclenches, bati.passerelles);
    for (const [instance, terminal] of bati.terminaux) {
      terminal.borne.userData.signaler(etat.enclenches.has(instance));
    }

    etat.deployees = new Set();
    for (const [id, pont] of bati.passerelles) {
      const sortie = faits.has(id) ? 1 : 0;
      pont.progression = (pont.progression ?? 0)
        + Math.sign(sortie - (pont.progression ?? 0))
          * Math.min(Math.abs(sortie - (pont.progression ?? 0)), dt);
      pont.deployer(pont.progression);
      if (pont.progression > 0.98) etat.deployees.add(id);
    }
    etat.faits = faits;

    etat.ouverte = circuitOuvert(chambre.sortie, faits);
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
