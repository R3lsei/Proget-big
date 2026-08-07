// Verrouille la chaîne caméra → base curatée (T-026).
//
// La frontière étanche promise au tout début du projet se tient ou se rompt ici.
// Le jeu ne doit connaître QUE des noms français de la base ; le vocabulaire du
// modèle — « cell phone » — ne doit jamais fuir dans le gameplay, faute de quoi
// changer de détecteur obligerait à réécrire les règles.
//
// L'autre exigence est de conception : la caméra AJOUTE des solutions, elle n'en
// remplace aucune. Une chambre franchissable seulement à la caméra bloquerait le
// joueur qui n'a rien sous la main — c'est le cas contre lequel le second pilier
// a été construit.

import test from 'node:test';
import assert from 'node:assert/strict';

import { chercher } from '../../game/js/perception/base/index.js';
import { CHAMBRES } from '../../game/js/gameplay/chambres.js';
import { verifierSalle } from '../../game/js/gameplay/resolubilite.js';
import { activePar } from '../../game/js/gameplay/mecanismes.js';
import {
  IMAGES_STABLES, CONFIANCE_MINIMALE,
  creerStabilisateur, stabiliser, versEntree, meilleure,
} from '../../game/js/perception/detecteur.js';
import { CLASSES, traduire } from '../../game/js/perception/detecteurs/cocossd.js';
import { ouvrir, fermer, estActive } from '../../game/js/perception/camera.js';

// ─── Traduction ─────────────────────────────────────────────────────────────

test('chaque classe traduite existe dans la base curatée', () => {
  // Une faute de frappe ici rendrait l'objet indétectable en silence : le modèle
  // le reconnaîtrait, le jeu n'en trouverait aucune trace, et rien ne le dirait.
  for (const [classe, nom] of Object.entries(CLASSES)) {
    assert.ok(chercher(nom), `« ${classe} » traduit en « ${nom} », absent de la base`);
  }
});

test('une classe hors table ne traduit rien plutôt que d\'inventer', () => {
  // Toutes les classes de COCO n'ont pas leur place ici — une girafe n'a rien à
  // faire dans un complexe de recherche.
  assert.equal(traduire('giraffe'), null);
  assert.equal(traduire('inconnue'), null);
});

test('la table couvre les objets que le joueur montrera vraiment', () => {
  for (const attendu of ['knife', 'scissors', 'cell phone', 'bottle', 'book', 'banana']) {
    assert.ok(traduire(attendu), `« ${attendu} » n'est pas traduit`);
  }
});

// ─── Frontière étanche ──────────────────────────────────────────────────────

test('le jeu ne reçoit que des entrées de la base, jamais du vocabulaire du modèle', () => {
  const entree = versEntree({ label: 'cell phone', score: 0.9 }, traduire);
  assert.equal(entree.nom, 'téléphone');
  assert.ok(entree.proprietes.includes('programmable'));
  assert.equal(JSON.stringify(entree).includes('cell phone'), false);
});

test('une détection peu sûre est ignorée', () => {
  // Mémoriser sur un doute remplirait la sacoche de choses jamais montrées.
  assert.equal(versEntree({ label: 'knife', score: 0.2 }, traduire), null);
  assert.ok(versEntree({ label: 'knife', score: CONFIANCE_MINIMALE + 0.01 }, traduire));
});

test('une détection hors base ne casse rien', () => {
  // Chemin NORMAL : c'est même la promesse du jeu que d'accepter l'imprévu.
  assert.equal(versEntree({ label: 'giraffe', score: 0.99 }, traduire), null);
  assert.equal(versEntree(null, traduire), null);
});

test('meilleure retient la plus sûre, pas la plus grande', () => {
  // Un objet tenu près de l'objectif occupe l'image sans être celui qu'on montre.
  const gagnante = meilleure([
    { label: 'person', score: 0.6, boite: [0, 0, 600, 400] },
    { label: 'knife', score: 0.94, boite: [10, 10, 40, 40] },
  ]);
  assert.equal(gagnante.label, 'knife');
  assert.equal(meilleure([]), null);
  assert.equal(meilleure(null), null);
});

// ─── Stabilisation ──────────────────────────────────────────────────────────

test('un objet doit tenir plusieurs images avant d\'être retenu', () => {
  // Sans stabilisation, une reconnaissance qui hésite mémoriserait n'importe quoi.
  let etat = creerStabilisateur();
  for (let i = 1; i < IMAGES_STABLES; i++) {
    etat = stabiliser(etat, 'couteau');
    assert.equal(etat.confirme, null, `confirmé dès la ${i}e image`);
  }
  etat = stabiliser(etat, 'couteau');
  assert.equal(etat.confirme, 'couteau');
});

test('changer d\'objet remet le compteur à zéro', () => {
  let etat = creerStabilisateur();
  etat = stabiliser(etat, 'couteau');
  etat = stabiliser(etat, 'couteau');
  etat = stabiliser(etat, 'banane');
  assert.equal(etat.serie, 1);
  assert.equal(etat.confirme, null);
});

test('perdre l\'objet de vue annule la série', () => {
  let etat = creerStabilisateur();
  etat = stabiliser(etat, 'couteau');
  etat = stabiliser(etat, 'couteau');
  etat = stabiliser(etat, null);
  assert.equal(etat.serie, 0);
  assert.equal(etat.candidat, null);
});

test('le stabilisateur est repartable à neuf', () => {
  // Un scanner rouvert dans la même partie repartirait sinon avec les
  // hésitations de la fois précédente.
  let etat = creerStabilisateur();
  etat = stabiliser(etat, 'couteau');
  assert.equal(creerStabilisateur().serie, 0);
  assert.equal(creerStabilisateur().candidat, null);
});

// ─── Caméra ─────────────────────────────────────────────────────────────────

test('un refus de permission est expliqué, pas masqué', () => {
  // Renvoyer un flux vide ferait croire à une panne, là où le joueur a dit non
  // et peut revenir sur sa décision.
  const media = { getUserMedia: async () => { throw Object.assign(new Error('non'), { name: 'NotAllowedError' }); } };
  return ouvrir({ media }).then((r) => {
    assert.equal(r.ok, false);
    assert.match(r.raison, /refusé/);
  });
});

test('un navigateur sans caméra le dit clairement', async () => {
  const r = await ouvrir({ media: undefined });
  assert.equal(r.ok, false);
  assert.match(r.raison, /navigateur/);
});

test('fermer arrête réellement les pistes', () => {
  // Détacher le flux sans l'arrêter laisse la webcam allumée, voyant compris.
  // C'est le défaut le plus courant de ce genre de code, et le moins pardonné.
  let arretees = 0;
  const flux = {
    getTracks: () => [
      { readyState: 'live', stop() { arretees++; this.readyState = 'ended'; } },
      { readyState: 'live', stop() { arretees++; this.readyState = 'ended'; } },
    ],
  };
  const pistes = flux.getTracks();
  flux.getTracks = () => pistes;
  assert.equal(estActive(flux), true);
  assert.equal(fermer(flux), true);
  assert.equal(arretees, 2);
  assert.equal(estActive(flux), false);
});

test('fermer sans flux ne plante pas', () => {
  assert.equal(fermer(null), false);
  assert.equal(estActive(null), false);
});

// ─── La règle de conception ─────────────────────────────────────────────────

test('la caméra ouvre de vraies solutions dans les chambres', () => {
  // Sans cela, le second pilier serait décoratif : la caméra doit donner accès à
  // des objets qui marchent réellement sur les mécanismes du jeu.
  const scannables = Object.values(CLASSES).map(chercher);
  for (const chambre of CHAMBRES) {
    for (const [instance, decl] of Object.entries(chambre.receptacles ?? {})) {
      const capables = scannables.filter((e) => activePar(decl.type, e.proprietes));
      assert.notEqual(capables.length, 0,
        `${chambre.id}/${instance} : aucun objet montrable ne l'active`);
    }
  }
});

test('aucune chambre n\'exige la caméra pour être finie', () => {
  // LA règle. Un joueur sans rien sous la main — dans un train, dans un lit —
  // doit pouvoir terminer chaque salle. La caméra ajoute, elle ne remplace pas.
  for (const chambre of CHAMBRES) {
    const verdict = verifierSalle(chambre, chercher);
    assert.equal(verdict.resoluble, true,
      `${chambre.id} n'est pas franchissable sans caméra : ${verdict.raison}`);
  }
});

test('un objet montré peut remplacer un objet de la salle', () => {
  // Le confort promis : si le joueur perd ou gâche la brique, montrer une
  // bouteille pleine doit suffire. Les deux passent par la même règle.
  const bouteille = chercher('bouteille');
  const brique = chercher('brique');
  assert.equal(activePar('plaque_pression', brique.proprietes), true);
  assert.equal(traduire('bottle'), 'bouteille');
  // La bouteille n'est pas lourde : elle ne remplace PAS un lest, et c'est
  // volontaire — la caméra n'annule pas les propriétés physiques.
  assert.equal(activePar('plaque_pression', bouteille.proprietes), false);
  // Le téléphone, lui, ouvre la console réseau qu'aucun objet de la serre ne
  // sait pirater : voilà la solution que seule la caméra apporte.
  const telephone = chercher('téléphone');
  assert.equal(traduire('cell phone'), 'téléphone');
  assert.ok(telephone.proprietes.includes('programmable'));
});
