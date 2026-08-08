// Verrouille le contrôleur du joueur et la boucle d'énigme (T-025).
//
// Le test qui compte ici n'est pas unitaire : c'est celui qui joue une chambre
// du début à la fin — prendre un objet, le poser sur une plaque, voir la porte
// s'ouvrir. Toutes les pièces du projet sont testées séparément ; c'est leur
// enchaînement qui n'avait jamais été vérifié, et c'est là que se cachent les
// défauts de raccord.

import test from 'node:test';
import assert from 'node:assert/strict';

import { CHAMBRES } from '../../game/js/gameplay/chambres.js';
import {
  receptaclesActifs, circuitOuvert, enclencher, faitsDeChambre, declenchePar,
} from '../../game/js/gameplay/mecanismes.js';
import { batir, departDe } from '../../game/js/rendering/batisseur.js';
import { PORTEE_SAISIE } from '../../game/js/physics/portage.js';
import { MODULE } from '../../game/js/rendering/kit.js';
import {
  GABARIT, creerJoueur, regarder, avancer, basculerPrise, lacher,
  majObjets, occupations, objetVise, restaurerEgares,
} from '../../game/js/app/joueur.js';

const AUCUNE = { avancer: false, reculer: false, gauche: false, droite: false, sauter: false };
const intentions = (p = {}) => ({ ...AUCUNE, ...p });

/** Simule `secondes` de jeu à 60 images par seconde. */
function simuler(joueur, objets, bati, secondes, touches = AUCUNE) {
  for (let i = 0; i < secondes * 60; i++) {
    avancer(joueur, touches, bati.colliders, 1 / 60);
    majObjets(joueur, objets, bati.colliders, 1 / 60);
  }
}

/**
 * Amène le joueur au-dessus d'un point, sans passer par les commandes.
 *
 * L'objet tenu est emporté du même déplacement. Sans cela, la rupture de
 * portage se déclenche immédiatement — l'objet resterait à quatre mètres — et
 * le joueur arriverait les mains vides. C'est aussi ce que devra faire tout
 * téléport du jeu : changement de salle, réapparition. La règle vaut donc bien
 * au-delà des tests.
 */
function teleporter(joueur, x, z) {
  const dx = x - joueur.x;
  const dz = z - joueur.z;
  joueur.x = x; joueur.z = z; joueur.y = 0; joueur.vy = 0;
  if (joueur.porte) { joueur.porte.x += dx; joueur.porte.z += dz; }
}

function partie(indexChambre = 0) {
  const chambre = CHAMBRES[indexChambre];
  const bati = batir(chambre);
  const joueur = creerJoueur(departDe(chambre));
  return { chambre, bati, joueur, objets: [...bati.objets.values()] };
}

// ─── Déclarations complètes ─────────────────────────────────────────────────

test('chaque objet déclaré a une pose', () => {
  // La preuve de résolubilité suppose les objets ATTEIGNABLES. Un objet déclaré
  // mais jamais posé rendrait la preuve fausse : le vérificateur annoncerait la
  // salle franchissable et le joueur ne trouverait rien.
  for (const chambre of CHAMBRES) {
    for (const nom of chambre.objets) {
      assert.ok(chambre.poses?.[nom], `${chambre.id} : « ${nom} » déclaré mais jamais posé`);
    }
  }
});

test('les objets sont posés dans la pièce et accessibles', () => {
  for (const chambre of CHAMBRES) {
    const { bati } = partie(CHAMBRES.indexOf(chambre));
    const demiL = chambre.taille.largeur * MODULE / 2;
    const demiP = chambre.taille.profondeur * MODULE / 2;
    for (const [nom, corps] of bati.objets) {
      assert.ok(Math.abs(corps.x) < demiL - 0.3 && Math.abs(corps.z) < demiP - 0.3,
        `${chambre.id} : « ${nom} » posé dans un mur`);
    }
  }
});

// ─── Déplacement ────────────────────────────────────────────────────────────

test('le joueur avance dans la direction où il regarde', () => {
  const { joueur, objets, bati } = partie();
  const depart = { x: joueur.x, z: joueur.z };
  simuler(joueur, objets, bati, 0.5, intentions({ avancer: true }));
  const parcouru = Math.hypot(joueur.x - depart.x, joueur.z - depart.z);
  assert.ok(parcouru > 1, `seulement ${parcouru.toFixed(2)} m parcourus`);
});

test('la diagonale ne va pas plus vite que la ligne droite', () => {
  // Sans normalisation, avancer en biais est 41 % plus rapide ; le joueur qui
  // l'a remarqué ne se déplace plus jamais autrement.
  const droit = partie();
  simuler(droit.joueur, droit.objets, droit.bati, 0.4, intentions({ avancer: true }));
  const d1 = Math.hypot(droit.joueur.x, droit.joueur.z - departDe(droit.chambre).z);

  const biais = partie();
  simuler(biais.joueur, biais.objets, biais.bati, 0.4,
    intentions({ avancer: true, droite: true }));
  const d2 = Math.hypot(biais.joueur.x, biais.joueur.z - departDe(biais.chambre).z);
  assert.ok(d2 <= d1 * 1.05, `diagonale ${d2.toFixed(2)} m contre ${d1.toFixed(2)} m`);
});

test('le joueur ne traverse pas les murs, même en poussant longtemps', () => {
  const { chambre, joueur, objets, bati } = partie();
  regarder(joueur, 0, 0);
  joueur.yaw = Math.PI; // dos à la sortie, face au mur plein
  simuler(joueur, objets, bati, 6, intentions({ avancer: true }));
  const demiP = chambre.taille.profondeur * MODULE / 2;
  assert.ok(Math.abs(joueur.z) < demiP, `sorti de la pièce (z=${joueur.z.toFixed(2)})`);
});

test('le joueur retombe au sol et ne s\'y enfonce pas', () => {
  const { joueur, objets, bati } = partie();
  joueur.y = 3;
  simuler(joueur, objets, bati, 2);
  assert.ok(Math.abs(joueur.y) < 0.05, `posé à y=${joueur.y.toFixed(3)}`);
  assert.equal(joueur.auSol, true);
});

test('le regard ne bascule pas par-dessus la verticale', () => {
  // Au-delà, l'image se retourne et le joueur perd tout repère.
  const { joueur } = partie();
  regarder(joueur, 0, -10000);
  assert.ok(joueur.pitch < Math.PI / 2);
  regarder(joueur, 0, 20000);
  assert.ok(joueur.pitch > -Math.PI / 2);
});

// ─── Prise et dépose ────────────────────────────────────────────────────────

test('on ne prend que ce qui est à portée', () => {
  const { chambre, joueur, objets, bati } = partie();
  // Un coin volontairement vide : au point de départ, le couteau est déjà à
  // portée, et le test ne prouverait rien.
  const demiL = chambre.taille.largeur * MODULE / 2;
  teleporter(joueur, -demiL + 0.6, -demiL + 0.6);
  assert.equal(basculerPrise(joueur, objets, bati.receptacles, PORTEE_SAISIE).action, 'rien');

  const brique = bati.objets.get('brique');
  teleporter(joueur, brique.x, brique.z + 0.6);
  assert.equal(basculerPrise(joueur, objets, bati.receptacles, PORTEE_SAISIE).action, 'pris');
  assert.equal(joueur.porte, brique);
});

test('une seule commande prend puis lâche', () => {
  // Deux touches distinctes obligeraient à se souvenir de ce qu'on tient.
  const { joueur, objets, bati } = partie();
  const brique = bati.objets.get('brique');
  teleporter(joueur, brique.x, brique.z + 0.6);
  basculerPrise(joueur, objets, bati.receptacles, PORTEE_SAISIE);
  assert.ok(joueur.porte);
  basculerPrise(joueur, objets, bati.receptacles, PORTEE_SAISIE);
  assert.equal(joueur.porte, null);
});

test('objetVise renvoie le plus proche, pas le premier trouvé', () => {
  // Deux objets côte à côte doivent se prendre dans l'ordre où on les atteint,
  // sinon le joueur croit que le jeu ignore ses commandes.
  const { joueur, objets, bati } = partie();
  const caillou = bati.objets.get('caillou');
  teleporter(joueur, caillou.x, caillou.z + 0.4);
  assert.equal(objetVise(joueur, objets, PORTEE_SAISIE).nom, 'caillou');
});

// ─── La boucle d'énigme complète ────────────────────────────────────────────

test('poser un objet lourd sur la plaque ouvre la porte', () => {
  // LE test d'intégration du projet. Chaque module a été vérifié seul ; c'est
  // leur enchaînement qui n'avait jamais tourné.
  const { chambre, joueur, objets, bati } = partie(0);
  assert.equal(circuitOuvert(chambre.sortie,
    receptaclesActifs(occupations(joueur, objets, bati.receptacles))), false,
    'la porte est ouverte avant qu\'on ait rien fait');

  const brique = bati.objets.get('brique');
  teleporter(joueur, brique.x, brique.z + 0.5);
  assert.equal(basculerPrise(joueur, objets, bati.receptacles, PORTEE_SAISIE).action, 'pris');

  const plaque = bati.receptacles.get('plaque');
  const centre = {
    x: (plaque.boite.minX + plaque.boite.maxX) / 2,
    z: (plaque.boite.minZ + plaque.boite.maxZ) / 2,
  };
  teleporter(joueur, centre.x, centre.z + 0.8);
  simuler(joueur, objets, bati, 0.6);
  joueur.pitch = -0.9; // on regarde la plaque pour y déposer l'objet
  simuler(joueur, objets, bati, 0.6);

  const depose = lacher(joueur, bati.receptacles);
  assert.equal(depose.action, 'pose', `dépose ratée : ${JSON.stringify(depose)}`);
  assert.equal(depose.receptacle, 'plaque');

  // Le joueur s'écarte : la plaque doit rester enfoncée par la brique seule.
  teleporter(joueur, centre.x + 2.4, centre.z + 2.4);
  simuler(joueur, objets, bati, 0.4);
  const actifs = receptaclesActifs(occupations(joueur, objets, bati.receptacles));
  assert.ok(actifs.has('plaque'), 'la brique ne maintient pas la plaque');
  assert.equal(circuitOuvert(chambre.sortie, actifs), true, 'la porte ne s\'est pas ouverte');
});

test('se tenir soi-même sur la plaque n\'ouvre rien', () => {
  // La règle fondatrice du genre : sinon on monte dessus, la porte s'ouvre, et
  // on ne peut pas la franchir.
  const { chambre, joueur, objets, bati } = partie(0);
  const plaque = bati.receptacles.get('plaque');
  teleporter(joueur,
    (plaque.boite.minX + plaque.boite.maxX) / 2,
    (plaque.boite.minZ + plaque.boite.maxZ) / 2);
  simuler(joueur, objets, bati, 0.5);
  const actifs = receptaclesActifs(occupations(joueur, objets, bati.receptacles));
  assert.equal(circuitOuvert(chambre.sortie, actifs), false,
    'le joueur ouvre la porte en montant sur la plaque');
});

test('un objet tenu en main n\'active pas la plaque qu\'il survole', () => {
  // Pendant du test précédent : sinon il suffirait de se tenir sur la plaque,
  // brique en main, et la règle du poids propre serait contournée.
  const { chambre, joueur, objets, bati } = partie(0);
  const brique = bati.objets.get('brique');
  teleporter(joueur, brique.x, brique.z + 0.5);
  basculerPrise(joueur, objets, bati.receptacles, PORTEE_SAISIE);

  const plaque = bati.receptacles.get('plaque');
  teleporter(joueur,
    (plaque.boite.minX + plaque.boite.maxX) / 2,
    (plaque.boite.minZ + plaque.boite.maxZ) / 2);
  joueur.pitch = -1.2;
  simuler(joueur, objets, bati, 0.8);
  const actifs = receptaclesActifs(occupations(joueur, objets, bati.receptacles));
  assert.equal(circuitOuvert(chambre.sortie, actifs), false,
    'un objet tenu suffit à ouvrir la porte');
});

test('la serre exige deux objets distincts ET la passerelle', () => {
  // La chaîne complète : deux plaques lestées, plus un terminal enclenché qui
  // sort le pont. Chacune des trois conditions seule ne suffit pas.
  const { chambre, joueur, objets, bati } = partie(1);
  const instances = [...bati.receptacles.keys()];
  let enclenches = new Set();

  const poser = (nomObjet, instance) => {
    const corps = bati.objets.get(nomObjet);
    const recep = bati.receptacles.get(instance);
    corps.x = (recep.boite.minX + recep.boite.maxX) / 2;
    corps.z = (recep.boite.minZ + recep.boite.maxZ) / 2;
    corps.y = recep.boite.maxY;
    corps.vy = 0;
  };
  const ouverte = () => circuitOuvert(chambre.sortie, faitsDeChambre(
    receptaclesActifs(occupations(joueur, objets, bati.receptacles)),
    enclenches, bati.passerelles));

  teleporter(joueur, 0, 3);
  poser('brique', instances[0]);
  simuler(joueur, objets, bati, 0.3);
  assert.equal(ouverte(), false, 'une seule plaque suffit alors qu\'il en faut deux');

  poser('pot de fleurs', instances[1]);
  simuler(joueur, objets, bati, 0.3);
  assert.equal(ouverte(), false, 'les plaques ouvrent la sortie sans la passerelle');

  enclenches = enclencher(enclenches, 'boitier');
  simuler(joueur, objets, bati, 0.3);
  assert.equal(ouverte(), true, 'la chaîne complète n\'ouvre pas la sortie');
});

test('le boîtier se ponte avec un simple tournevis, sans informatique', () => {
  // Deux voies pour la même passerelle : la console exige un appareil
  // programmable, le boîtier seulement de quoi relier deux contacts. Un joueur
  // sans téléphone n'est donc jamais bloqué.
  const { bati } = partie(1);
  const tournevis = bati.objets.get('tournevis');
  assert.equal(declenchePar('boitier_commande', tournevis.proprietes), true);
  assert.equal(declenchePar('console_reseau', tournevis.proprietes), false,
    'un tournevis pirate une console réseau');
});

test('un terminal enclenché le reste quand on en déclenche un autre', () => {
  // Sans verrouillage, il faudrait rester planté devant la console pendant que
  // la passerelle est sortie — donc ne jamais pouvoir l'emprunter.
  // Deux terminaux DIFFÉRENTS : réenclencher le même ne prouve rien, puisqu'un
  // état qui s'écrase donnerait exactement le même résultat.
  const apresUn = enclencher(new Set(), 'boitier');
  const apresDeux = enclencher(apresUn, 'console');
  assert.deepEqual([...apresDeux].sort(), ['boitier', 'console']);
  // L'état précédent n'est pas modifié : une fonction pure permet d'annuler et
  // de restituer une sauvegarde sans surprise.
  assert.deepEqual([...apresUn], ['boitier']);
  assert.deepEqual([...enclencher(apresDeux, 'boitier')].sort(), ['boitier', 'console']);
});

test('un objet léger ne suffit pas à maintenir une plaque de pression', () => {
  const { joueur, objets, bati } = partie(0);
  const eponge = bati.objets.get('éponge');
  const plaque = bati.receptacles.get('plaque');
  eponge.x = (plaque.boite.minX + plaque.boite.maxX) / 2;
  eponge.z = (plaque.boite.minZ + plaque.boite.maxZ) / 2;
  eponge.y = plaque.boite.maxY;
  teleporter(joueur, 0, 3);
  simuler(joueur, objets, bati, 0.3);
  const actifs = receptaclesActifs(occupations(joueur, objets, bati.receptacles));
  assert.equal(actifs.has('plaque'), false, 'une éponge enfonce la plaque');
});

// ─── Le gouffre : la déclaration doit être PHYSIQUE ─────────────────────────
//
// Le vérificateur affirme que la plate-forme n'est atteignable qu'une fois le
// pont sorti. Si le sol est plein, cette affirmation est un mensonge : le
// joueur y marche, et toute la preuve de progression ne vaut plus rien.
// Ces tests relient donc ce qui est déclaré à ce qui est bâti.

test('le gouffre déclaré est réellement creusé', () => {
  const serre = CHAMBRES.find((c) => c.id === 'c02_serre');
  const { colliders } = batir(serre);
  const centre = {
    x: (serre.gouffre.xMin + serre.gouffre.xMax) / 2 * MODULE,
    z: (serre.gouffre.zMin + serre.gouffre.zMax) / 2 * MODULE,
  };
  const solSousLeVide = colliders.filter((c) =>
    c.maxY <= 0.01 && c.minX < centre.x && c.maxX > centre.x
    && c.minZ < centre.z && c.maxZ > centre.z);
  assert.deepEqual(solSousLeVide, [], 'le gouffre a du sol : les zones sont fictives');
});

test('sans le pont, on tombe en tentant de rejoindre les plaques', () => {
  // Le test qui vérifie que la géométrie tient la promesse de la déclaration.
  const { chambre, joueur, objets, bati } = partie(1);
  teleporter(joueur, 0, 0);
  joueur.yaw = 0; // face au gouffre, donc vers les plaques
  simuler(joueur, objets, bati, 2.5, intentions({ avancer: true }));
  assert.ok(joueur.y < -0.5, `le joueur a traversé le gouffre à pied (y=${joueur.y.toFixed(2)})`);
});

test('le pont déployé rend la plate-forme franchissable', () => {
  const { chambre, joueur, objets, bati } = partie(1);
  const pont = bati.passerelles.get('pont');
  const obstacles = [...bati.colliders, pont.collider];
  teleporter(joueur, 0, 0);
  joueur.yaw = 0;
  // Juste assez pour franchir le gouffre et poser le pied sur la plate-forme.
  // Plus longtemps, le joueur ressort par la porte et tombe hors du monde —
  // ce que le filet rattrape, mais qui ne dit rien sur le pont.
  for (let i = 0; i < 80; i++) {
    avancer(joueur, intentions({ avancer: true }), obstacles, 1 / 60);
    majObjets(joueur, objets, obstacles, 1 / 60);
  }
  const bordLoin = chambre.gouffre.zMin * MODULE;
  assert.ok(joueur.y > -0.5, `le joueur est tombé malgré le pont (y=${joueur.y.toFixed(2)})`);
  assert.ok(joueur.z < bordLoin,
    `le joueur n'a pas franchi le gouffre (z=${joueur.z.toFixed(2)}, bord ${bordLoin.toFixed(2)})`);
});

// ─── Restauration ───────────────────────────────────────────────────────────

test('un objet tombé dans le gouffre revient à sa place', () => {
  // Sans cela, un geste maladroit rend la salle insoluble — et le vérificateur,
  // qui raisonne sur l'état initial, ne peut rien y voir. Supprimer la classe de
  // problème coûte moins cher que prouver qu'elle n'arrive jamais.
  const { chambre, joueur, objets, bati } = partie(1);
  const brique = bati.objets.get('brique');
  const origine = { ...brique.origine };
  brique.y = -8;

  const bilan = restaurerEgares(joueur, objets, departDe(chambre));
  assert.deepEqual(bilan.objets, ['brique']);
  assert.equal(brique.x, origine.x);
  assert.equal(brique.z, origine.z);
  assert.equal(brique.vy, 0);
});

test('la salle reste soluble après avoir jeté tout ce qu\'on peut', () => {
  // Simulation du pire joueur possible : tout balancer dans le vide. Chaque
  // objet doit revenir, sinon la chambre devient insoluble sans aucun message.
  const { chambre, joueur, objets, bati } = partie(1);
  for (const corps of objets) corps.y = -12;
  restaurerEgares(joueur, objets, departDe(chambre));
  for (const corps of objets) {
    assert.ok(corps.y > -1, `${corps.nom} est resté au fond du gouffre`);
  }
});

test('le joueur tombé réapparaît au départ sans rien perdre', () => {
  // La chute est une erreur de parcours, pas une punition : sanctionner
  // pousserait à jouer prudemment plutôt qu'à essayer.
  const { chambre, joueur, objets, bati } = partie(1);
  const depart = departDe(chambre);
  joueur.y = -10;
  const bilan = restaurerEgares(joueur, objets, depart);
  assert.equal(bilan.joueurTombe, true);
  assert.equal(joueur.x, depart.x);
  assert.equal(joueur.z, depart.z);
  assert.equal(joueur.vy, 0);
});

test('un objet tenu et lâché dans le vide n\'est plus tenu', () => {
  // Sinon le joueur remonterait en tenant un objet resté au fond, et la
  // restauration le téléporterait dans ses mains depuis nulle part.
  const { chambre, joueur, objets, bati } = partie(1);
  joueur.porte = bati.objets.get('brique');
  joueur.porte.y = -9;
  restaurerEgares(joueur, objets, departDe(chambre));
  assert.equal(joueur.porte, null);
});

test('un objet invoqué tombé est rendu, pas restauré', () => {
  // Le faire réapparaître au fond d'une salle qu'on a quittée serait
  // incompréhensible ; il retourne à l'inventaire et libère sa place.
  const { chambre, joueur, objets } = partie(1);
  const invoque = {
    nom: 'marteau', invoque: true, proprietes: ['lourd'],
    x: 0, y: -7, z: 0, vy: 0, gabarit: { rayon: 0.16, hauteur: 0.32 },
  };
  objets.push(invoque);
  const bilan = restaurerEgares(joueur, objets, departDe(chambre));
  assert.deepEqual(bilan.rendus, ['marteau']);
  assert.equal(objets.includes(invoque), false);
});

test('rien ne bouge tant que rien n\'est tombé', () => {
  const { chambre, joueur, objets } = partie(1);
  const avant = objets.map((c) => `${c.x},${c.y},${c.z}`);
  const bilan = restaurerEgares(joueur, objets, departDe(chambre));
  assert.deepEqual(bilan, { objets: [], joueurTombe: false, rendus: [] });
  assert.deepEqual(objets.map((c) => `${c.x},${c.y},${c.z}`), avant);
});
