// Verrouille la base curatée d'objets (T-011).
//
// La base est de la DONNÉE, pas du code : on ne peut pas la « tester » au sens
// habituel. Ce qu'on peut vérifier, c'est sa cohérence — et c'est là que sont
// les vrais défauts d'une base écrite à la main : une propriété mal orthographiée
// qui ne s'appliquera jamais, un objet listé deux fois avec deux jeux de
// propriétés, une entrée vide qui rendra un objet inutilisable en jeu.
//
// Ces défauts ne provoquent aucune erreur visible. Ils se manifestent des mois
// plus tard, sous la forme d'un objet qui « ne marche pas », sans message.

import test from 'node:test';
import assert from 'node:assert/strict';

import { PROPRIETES } from '../../game/js/perception/vocabulaire.js';
import {
  CATEGORIES, NOMS, TAILLE_INDEX,
  normaliser, chercher, nomAffichable, verifierProprietes,
} from '../../game/js/perception/base/index.js';

const ENTREES = Object.entries(CATEGORIES)
  .flatMap(([categorie, objets]) =>
    Object.entries(objets).map(([nom, brut]) => ({ categorie, nom, brut })));

// ─── Intégrité des données ──────────────────────────────────────────────────

test('toutes les propriétés citées existent dans le vocabulaire', () => {
  // Le défaut le plus probable et le plus silencieux : « tranchan » au lieu de
  // « tranchant » produit un objet qui ne coupera jamais, sans aucune alerte.
  const fautes = verifierProprietes();
  assert.deepEqual(fautes, [],
    fautes.map((f) => `${f.categorie}/${f.nom} : « ${f.propriete} » inconnue`).join('\n'));
});

test('aucun objet n\'est dépourvu de propriétés', () => {
  for (const { categorie, nom, brut } of ENTREES) {
    assert.ok(Array.isArray(brut.p), `${categorie}/${nom} n'a pas de liste de propriétés`);
    assert.notEqual(brut.p.length, 0,
      `${categorie}/${nom} n'a aucune propriété : il serait détecté puis inutilisable`);
  }
});

test('aucun objet ne répète une propriété', () => {
  for (const { categorie, nom, brut } of ENTREES) {
    assert.equal(new Set(brut.p).size, brut.p.length,
      `${categorie}/${nom} répète une propriété`);
  }
});

test('chaque objet déclare un article', () => {
  const ARTICLES = ['un', 'une', 'des', 'du', 'de la', 'de l\'', 'l\''];
  for (const { categorie, nom, brut } of ENTREES) {
    assert.ok(ARTICLES.includes(brut.a),
      `${categorie}/${nom} : article « ${brut.a} » non reconnu`);
  }
});

test('les noms canoniques sont en minuscules', () => {
  for (const { categorie, nom } of ENTREES) {
    assert.equal(nom, nom.toLowerCase(), `${categorie}/${nom} n'est pas en minuscules`);
  }
});

test('aucun nom canonique n\'est dupliqué entre catégories', () => {
  // Un doublon ferait dépendre les propriétés de l'ordre des imports : le même
  // objet marcherait ou non selon un détail invisible.
  const vus = new Map();
  for (const { categorie, nom } of ENTREES) {
    const norme = normaliser(nom);
    assert.equal(vus.has(norme), false,
      `« ${nom} » présent dans ${vus.get(norme)} et ${categorie}`);
    vus.set(norme, categorie);
  }
});

test('aucun nom ne se normalise en chaîne vide', () => {
  for (const { categorie, nom } of ENTREES) {
    assert.notEqual(normaliser(nom), '', `${categorie}/${nom} devient vide une fois normalisé`);
  }
});

test('chaque nom canonique se retrouve par lui-même', () => {
  // Vérifie l'aller-retour complet nom → normalisation → index. Une normalisation
  // trop agressive rendrait une partie de la base inaccessible sans rien casser
  // d'autre : l'objet existerait dans le fichier et resterait introuvable en jeu.
  for (const { categorie, nom } of ENTREES) {
    const trouve = chercher(nom);
    assert.ok(trouve, `${categorie}/${nom} est introuvable par son propre nom`);
    assert.equal(trouve.nom, nom);
  }
});

test('chaque synonyme mène à son objet canonique', () => {
  for (const { categorie, nom, brut } of ENTREES) {
    for (const synonyme of brut.syn ?? []) {
      const trouve = chercher(synonyme);
      assert.ok(trouve, `${categorie}/${nom} : synonyme « ${synonyme} » introuvable`);
      assert.equal(trouve.nom, nom, `« ${synonyme} » mène à ${trouve.nom} au lieu de ${nom}`);
    }
  }
});

test('la base couvre les catégories annoncées et reste substantielle', () => {
  assert.equal(Object.keys(CATEGORIES).length, 9);
  assert.ok(NOMS.length >= 350, `base trop maigre : ${NOMS.length} objets`);
  assert.ok(TAILLE_INDEX >= NOMS.length, 'l\'index doit contenir au moins les canoniques');
});

test('chaque catégorie est substantielle', () => {
  // Une catégorie squelettique signale un travail interrompu ; elle donnerait au
  // joueur l'impression que tout un pan du monde réel n'est pas reconnu.
  for (const [categorie, objets] of Object.entries(CATEGORIES)) {
    assert.ok(Object.keys(objets).length >= 20,
      `${categorie} ne contient que ${Object.keys(objets).length} objets`);
  }
});

test('chaque propriété du vocabulaire est portée par au moins un objet', () => {
  // Une propriété que personne ne porte est morte : les affordances qui en
  // dépendent seraient inatteignables, et l'énigme correspondante insoluble.
  const portees = new Set(ENTREES.flatMap(({ brut }) => brut.p));
  for (const id of Object.keys(PROPRIETES)) {
    assert.ok(portees.has(id), `aucun objet de la base n'est « ${id} »`);
  }
});

// ─── Normalisation ──────────────────────────────────────────────────────────

test('la normalisation absorbe casse, accents et espaces', () => {
  assert.equal(normaliser('  Couteau  '), 'couteau');
  assert.equal(normaliser('CLÉ'), 'cle');
  assert.equal(normaliser('Téléphone'), 'telephone');
  assert.equal(normaliser('sèche-cheveux'), 'seche-cheveux');
});

test('la normalisation retire les articles en tête', () => {
  assert.equal(normaliser('un couteau'), 'couteau');
  assert.equal(normaliser('une clé'), 'cle');
  assert.equal(normaliser('le livre'), 'livre');
  assert.equal(normaliser('les ciseaux'), 'ciseaux');
  assert.equal(normaliser("de l'eau"), 'eau');
  assert.equal(normaliser('de la javel'), 'javel');
});

test('la normalisation ne mange pas le début des mots', () => {
  // Régression : sans espace obligatoire après l'article, « la » dévorait le
  // début de « lait » et « le » celui de « levier ». Les articles français sont
  // des préfixes d'objets bien réels de la base.
  assert.equal(normaliser('lait'), 'lait');
  assert.equal(normaliser('laisse'), 'laisse');
  assert.equal(normaliser('lame de rasoir'), 'lame de rasoir');
  assert.equal(normaliser('livre'), 'livre');
  assert.equal(normaliser('dentifrice'), 'dentifrice');
  assert.equal(normaliser('unité'), 'unite');
});

test('la normalisation traite les entrées non textuelles sans planter', () => {
  // Le détecteur peut renvoyer un libellé absent ; ce chemin ne doit pas casser
  // la boucle de jeu.
  for (const valeur of [null, undefined, 42, {}, []]) {
    assert.equal(normaliser(valeur), '');
  }
});

// ─── Recherche ──────────────────────────────────────────────────────────────

test('la recherche trouve malgré le pluriel', () => {
  assert.equal(chercher('couteaux').nom, 'couteau');
  assert.equal(chercher('livres').nom, 'livre');
  assert.equal(chercher('des clés').nom, 'clé');
});

test('la recherche respecte les objets naturellement pluriels', () => {
  assert.equal(chercher('ciseaux').nom, 'ciseaux');
  assert.equal(chercher('lunettes').nom, 'lunettes');
  // L'inverse est refusé : inventer un singulier créerait un objet qui n'existe pas.
  assert.equal(chercher('ciseau'), null);
});

test('la recherche renvoie null hors base, sans lever', () => {
  // Chemin NOMINAL : c'est la promesse du jeu que d'accepter l'imprévu. Le repli
  // sémantique prendra le relais.
  assert.equal(chercher('astrolabe'), null);
  assert.equal(chercher(''), null);
  assert.equal(chercher(null), null);
});

test('les entrées renvoyées sont gelées', () => {
  // Elles sont partagées : l'inventaire, le scanner et le journal reçoivent la
  // même référence. Une mutation en modifierait l'objet pour toute la partie.
  const couteau = chercher('couteau');
  assert.ok(Object.isFrozen(couteau));
  assert.ok(Object.isFrozen(couteau.proprietes));
  assert.throws(() => { couteau.proprietes.push('magique'); }, TypeError);
});

test('nomAffichable produit un français correct', () => {
  assert.equal(nomAffichable(chercher('couteau')), 'un couteau');
  assert.equal(nomAffichable(chercher('ciseaux')), 'des ciseaux');
  assert.equal(nomAffichable(chercher('eau')), "de l'eau");
  assert.equal(nomAffichable(null), '');
});

// ─── Cohérence de sens ──────────────────────────────────────────────────────

test('les objets tranchants emblématiques sont bien tranchants', () => {
  // Empreinte minimale : ces objets sont les solutions canoniques de la première
  // énigme du jeu. Les perdre passerait inaperçu jusqu'au test de résolubilité.
  for (const nom of ['couteau', 'ciseaux', 'cutter', 'lame de rasoir', 'couteau suisse']) {
    assert.ok(chercher(nom).proprietes.includes('tranchant'), `${nom} n'est plus tranchant`);
  }
});

test('seuls des appareils réellement pilotables sont programmables', () => {
  // `programmable` ouvre le piratage profond. Si une télécommande l'obtenait,
  // toutes les énigmes électroniques s'effondreraient d'un coup.
  const programmables = ENTREES
    .filter(({ brut }) => brut.p.includes('programmable'))
    .map(({ nom }) => nom);
  assert.ok(programmables.includes('téléphone'));
  assert.ok(programmables.includes('ordinateur portable'));
  assert.ok(!programmables.includes('télécommande'));
  assert.ok(!programmables.includes('montre'));
  // Une poignée d'objets, pas une catégorie entière.
  assert.ok(programmables.length <= 12, `trop d'objets programmables : ${programmables.length}`);
});

test('tout objet comestible pour l\'humain n\'est pas bon pour l\'animal', () => {
  // L'asymétrie est un ressort d'énigme : certains aliments ne servent qu'au
  // joueur, d'autres qu'au gardien. Si les deux propriétés coïncidaient toujours,
  // l'une des deux serait inutile.
  const comestibles = ENTREES.filter(({ brut }) => brut.p.includes('comestible'));
  const appetissants = ENTREES.filter(({ brut }) => brut.p.includes('appetissant_animal'));
  assert.ok(comestibles.some(({ brut }) => !brut.p.includes('appetissant_animal')));
  assert.ok(appetissants.some(({ brut }) => !brut.p.includes('comestible')));
});
