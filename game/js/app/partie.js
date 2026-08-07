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
import { ouvrir as ouvrirCamera, fermer as fermerCamera, estActive } from '../perception/camera.js';
import {
  creerStabilisateur, stabiliser, versEntree, meilleure,
} from '../perception/detecteur.js';
import * as cocossd from '../perception/detecteurs/cocossd.js';
import { batir, departDe, aFranchi } from '../rendering/batisseur.js';
import { ambiance } from '../rendering/kit.js';
import { dehors, soleilDeTempete, cieletSable } from '../rendering/dehors.js';
import { creerComposeur, redimensionner } from '../rendering/posttraitement.js';
import { semer } from '../rendering/semis.js';
import { chargerEspece, planterSemis } from '../rendering/vegetation.js';
import { SEMABLES } from '../rendering/semis.js';
import { GLTFLoader } from '../../lib/GLTFLoader.js';
import { DRACOLoader } from '../../lib/DRACOLoader.js';
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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth || 1280, canvas.clientHeight || 720);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer)
    .fromScene(new RoomEnvironment(), 0.04).texture;

  // Le désert et sa tempête. Ajoutés à la scène plutôt qu'en fond : une couleur
  // de fond n'a pas d'horizon, donc pas d'échelle, et le dehors se lirait comme
  // un aplat peint sur la vitre au lieu d'un lieu où l'on pourrait aller.
  const exterieur = dehors();
  scene.add(exterieur.groupe);
  scene.fog = exterieur.brume;

  scene.add(soleilDeTempete({ portee: 26 }));
  scene.add(cieletSable());
  scene.add(ambiance());

  const camera = new THREE.PerspectiveCamera(
    72, (canvas.clientWidth || 1280) / (canvas.clientHeight || 720), 0.1, 200);

  // Réassignés à chaque chambre. Ce sont des `let` et non des `const` parce que
  // le jeu ENCHAÎNE désormais les chambres dans la même page : tout recharger
  // en rouvrant l'URL perdrait la sacoche, qui doit survivre à toute la partie.
  let chambre; let bati; let depart; let joueur; let objets;

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
    scene, camera, renderer,
    ouverture: 0, ouverte: false, actifs: new Set(),
    enclenches: new Set(),
    // Créé UNE fois, hors du chargement de chambre : ce que le joueur a montré
    // à sa caméra lui appartient pour toute la partie. Le remettre à zéro à
    // chaque porte franchie punirait le joueur d'avoir progressé.
    inventaire: creerInventaire(),
    indexChambre: 0,
    termine: false,
    dernierMessage: '',
  };

  // ─── Végétation ───────────────────────────────────────────────────────────
  //
  // Les modèles se chargent une seule fois pour toute la partie, en arrière-plan.
  // La chambre s'affiche AVANT eux : attendre huit cents kilo-octets de plantes
  // pour montrer une pièce jouable ferait patienter le joueur devant un écran
  // noir, alors que rien du jeu n'en dépend. La verdure apparaît quand elle est
  // prête, et le décor procédural tient la place en attendant.
  const especes = new Map();
  let verdurePosee = null;

  /** Sème et plante la verdure de la chambre en place. */
  function verdir() {
    if (!especes.size) return;
    if (verdurePosee) {
      verdurePosee.traverse((noeud) => noeud.geometry?.dispose?.());
      verdurePosee.parent?.remove(verdurePosee);
    }
    // La graine dérive de l'identifiant de chambre : chaque salle a SON jardin,
    // le même à chaque partie. Un décor qui change à chaque chargement rend
    // tout défaut visuel irreproductible.
    const graine = [...chambre.id].reduce((s, c) => s + c.charCodeAt(0), 0);
    verdurePosee = planterSemis(semer(chambre, { depart, graine }), especes);
    bati.groupe.add(verdurePosee);
  }

  etat.especesChargees = 0;
  etat.verdureEnErreur = null;
  (async () => {
    const draco = new DRACOLoader().setDecoderPath('./lib/draco/');
    const chargeur = new GLTFLoader().setDRACOLoader(draco);
    // En parallèle, pas l'une après l'autre. Dix-neuf modèles chargés en série
    // attendaient chacun le décodage Draco du précédent : deux espèces prêtes
    // au bout de douze secondes, pour huit cents kilo-octets au total. Le
    // navigateur sait mener plusieurs requêtes de front, et le décodage occupe
    // ses ouvriers de fond ; le faire attendre ne servait personne.
    await Promise.all(SEMABLES.map(async ({ espece }) => {
      const charge = await chargerEspece(espece, chargeur, './');
      if (charge) especes.set(espece, charge);
      etat.especesChargees = especes.size;
    }));
    verdir();
  })().catch((erreur) => {
    // Une promesse rejetée sans `catch` disparaît sans un mot : la verdure ne
    // s'affiche pas, le jeu tourne, et rien n'indique où chercher. On l'expose
    // dans l'état, où le test de navigateur peut la lire.
    etat.verdureEnErreur = String(erreur);
    console.warn('Verdure indisponible :', erreur);
  });

  /**
   * Charge une chambre, en remplaçant celle en place.
   *
   * Ce qui est conservé et ce qui est jeté n'est pas un détail d'implémentation
   * mais une règle de jeu : la sacoche traverse les chambres, les mécanismes
   * non. Un terminal piraté dans la salle de réveil n'a aucun sens dans la
   * serre.
   */
  function chargerChambre(index) {
    if (bati) {
      scene.remove(bati.groupe);
      // Les géométries sont propres à la chambre et occupent la mémoire de la
      // carte graphique jusqu'à libération explicite ; les matières, elles, sont
      // PARTAGÉES par le kit — les libérer viderait la chambre suivante.
      bati.groupe.traverse((noeud) => noeud.geometry?.dispose());
    }
    // Les objets invoqués repartent dans la sacoche : leur maillage appartenait
    // à la chambre qu'on vient de quitter, et les laisser comptés occuperait des
    // places pour des objets qui n'existent plus.
    for (const corps of objets ?? []) {
      if (corps.invoque) dematerialiser(etat.inventaire, corps.nom);
    }

    chambre = CHAMBRES[index];
    bati = batir(chambre);
    scene.add(bati.groupe);
    depart = departDe(chambre);
    verdir();
    joueur = creerJoueur(depart);
    objets = [...bati.objets.values()];

    etat.chambre = chambre;
    etat.bati = bati;
    etat.joueur = joueur;
    etat.objets = objets;
    etat.indexChambre = index;
    etat.actifs = new Set();
    etat.enclenches = new Set();
    etat.ouverture = 0;
    etat.ouverte = false;
  }
  etat.chargerChambre = chargerChambre;

  chargerChambre(indexChambre);

  // La chaîne d'image est construite APRÈS la première chambre : sa passe de
  // rendu capture la scène et la caméra, qui doivent exister.
  const image = creerComposeur(renderer, scene, camera, {
    largeur: canvas.clientWidth || 1280, hauteur: canvas.clientHeight || 720,
  });
  etat.image = image;
  etat.redimensionner = (largeur, hauteur) => {
    renderer.setSize(largeur, hauteur);
    camera.aspect = largeur / hauteur;
    camera.updateProjectionMatrix();
    redimensionner(image, largeur, hauteur);
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

  // ─── Caméra ───────────────────────────────────────────────────────────────
  //
  // Le scan MÉMORISE, il ne matérialise pas. Faire apparaître l'objet d'office
  // encombrerait la salle et retirerait au joueur le choix du moment — or c'est
  // ce choix qui fait de la caméra une mécanique et non un distributeur.

  const vision = { flux: null, modele: null, stabilisateur: creerStabilisateur(), actif: false };
  etat.vision = vision;

  /** Allume la caméra et charge le détecteur. Idempotent. */
  etat.ouvrirScanner = async (video) => {
    if (!vision.modele) {
      etat.dernierMessage = 'Chargement du module de reconnaissance…';
      try {
        vision.modele = await cocossd.charger({});
      } catch (erreur) {
        etat.dernierMessage = `Reconnaissance indisponible : ${erreur.message}`;
        return { ok: false };
      }
    }
    if (!estActive(vision.flux)) {
      const resultat = await ouvrirCamera({});
      if (!resultat.ok) {
        etat.dernierMessage = resultat.raison;
        return resultat;
      }
      vision.flux = resultat.flux;
      if (video) { video.srcObject = vision.flux; await video.play().catch(() => {}); }
    }
    vision.actif = true;
    vision.stabilisateur = creerStabilisateur();
    etat.dernierMessage = 'Montrez un objet à la caméra.';
    return { ok: true };
  };

  /** Éteint réellement la caméra : pistes arrêtées, pas seulement détachées. */
  etat.fermerScanner = (video) => {
    fermerCamera(vision.flux);
    vision.flux = null;
    vision.actif = false;
    if (video) video.srcObject = null;
    return true;
  };

  /**
   * Analyse une image et mémorise ce qui se confirme.
   *
   * La stabilisation est ici et non dans le détecteur : c'est une règle de jeu
   * — « il faut montrer l'objet un instant » — pas une propriété du modèle.
   */
  etat.analyser = async (source) => {
    if (!vision.modele || !source) return { etat: 'inactif' };
    const detections = await cocossd.detecter(vision.modele, source);
    const entree = versEntree(meilleure(detections), cocossd.traduire);
    vision.stabilisateur = stabiliser(vision.stabilisateur, entree?.nom ?? null);

    if (!entree) return { etat: 'rien' };
    if (!vision.stabilisateur.confirme) {
      return { etat: 'hesite', nom: entree.nom, serie: vision.stabilisateur.serie };
    }
    const memorise = etat.memoriser(entree.nom);
    vision.stabilisateur = creerStabilisateur();
    return { etat: memorise.ajoute ? 'memorise' : 'connu', nom: entree.nom };
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

    // Franchir la porte fait passer à la chambre suivante.
    //
    // Sans cela, la porte s'ouvrait sur le VIDE : il n'y a pas de sol au-delà du
    // mur, le joueur tombait, et le jeu le remettait au départ en annonçant
    // « rien n'est perdu ». La récompense d'avoir résolu la salle était une
    // chute. Le test se fait ici, dans le pas de simulation, parce que le joueur
    // commence à tomber dès le pas suivant.
    if (etat.ouverte && !etat.termine && aFranchi(joueur, chambre)) {
      const suivante = etat.indexChambre + 1;
      if (suivante < CHAMBRES.length) {
        chargerChambre(suivante);
        etat.dernierMessage = `${chambre.titre}.`;
        return;   // le reste du pas concernait la chambre qu'on vient de quitter
      }
      // Dernière chambre : on ramène le joueur en deçà du seuil. Le laisser
      // passer le ferait tomber dans le vide, et le message de chute
      // remplacerait aussitôt celui de victoire — on finirait le jeu par un
      // échec affiché.
      etat.termine = true;
      Object.assign(joueur, { x: depart.x, y: depart.y, z: depart.z, vy: 0 });
      etat.dernierMessage = 'Vous êtes sorti du complexe. Fin de la démonstration.';
    }

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
    // On rend par le composeur, jamais par le renderer : `renderer.render`
    // afficherait la scène brute et court-circuiterait toute la chaîne, sans
    // erreur ni avertissement. L'image serait simplement fade.
    // Le ciel avance avec l'horloge du navigateur, pas avec le pas de
    // simulation : la tempête n'est pas du jeu, elle est de l'ambiance, et rien
    // du gameplay ne doit en dépendre.
    exterieur.animer(maintenant / 1000);
    image.composeur.render();
    requestAnimationFrame(boucle);
  }
  requestAnimationFrame(boucle);

  return etat;
}
