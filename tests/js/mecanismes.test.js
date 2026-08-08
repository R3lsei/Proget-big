// Verrouille les mécanismes physiques (T-018).
//
// Deux dangers propres à ce module, tous deux invisibles en lecture :
//   - un réceptacle qu'aucun objet réel ne peut activer rend la salle
//     infranchissable, sans message ni indice ;
//   - un réceptacle que le joueur active en montant dessus supprime l'énigme,
//     puisqu'il suffit de se tenir dessus… sauf qu'il faut ensuite s'en aller.
//
// Les derniers tests confrontent donc les réceptacles à la base réelle d'objets.

import test from 'node:test';
import assert from 'node:assert/strict';

import { PROPRIETES } from '../../game/js/perception/vocabulaire.js';
import { CATEGORIES, chercher } from '../../game/js/perception/base/index.js';
import {
  RECEPTACLES, IDS_RECEPTACLES, PROPRIETES_JOUEUR,
  activePar, receptaclesActifs, circuitOuvert, receptaclesRequis,
  indiceDe, objetsActivant,
} from '../../game/js/gameplay/mecanismes.js';

const CATALOGUE = Object.values(CATEGORIES)
  .flatMap((objets) => Object.keys(objets))
  .map((nom) => chercher(nom));

const proprietesDe = (nom) => chercher(nom).proprietes;

// ─── Intégrité ──────────────────────────────────────────────────────────────

test('toutes les propriétés citées par les réceptacles existent', () => {
  for (const id of IDS_RECEPTACLES) {
    for (const propriete of receptaclesRequis(RECEPTACLES[id].accepte)) {
      assert.ok(propriete in PROPRIETES, `${id} exige « ${propriete} », hors vocabulaire`);
    }
  }
});

test('chaque réceptacle porte un libellé et un indice', () => {
  for (const id of IDS_RECEPTACLES) {
    assert.ok(RECEPTACLES[id].libelle?.trim(), `${id} sans libellé`);
    assert.ok(RECEPTACLES[id].indice?.trim(), `${id} sans indice`);
    assert.equal(typeof RECEPTACLES[id].refuseLeJoueur, 'boolean');
  }
});

test('aucun réceptacle n\'est activé par un objet sans propriété', () => {
  for (const id of IDS_RECEPTACLES) {
    assert.equal(activePar(id, []), false, `${id} s'active tout seul`);
  }
});

// ─── Activation ─────────────────────────────────────────────────────────────

test('une plaque de pression demande du poids', () => {
  assert.equal(activePar('plaque_pression', proprietesDe('brique')), true);
  assert.equal(activePar('plaque_pression', proprietesDe('bouteille en plastique')), false);
});

test('le joueur ne peut pas maintenir lui-même une plaque de pression', () => {
  // Mécanique fondatrice du genre. Sans elle, le joueur monte sur la plaque, la
  // porte s'ouvre, et il ne peut pas la franchir : l'énigme n'existe plus, elle
  // devient une impasse.
  assert.equal(
    activePar('plaque_pression', PROPRIETES_JOUEUR, { estLeJoueur: true }), false);
  assert.equal(
    activePar('plaque_pression', PROPRIETES_JOUEUR, { estLeJoueur: false }), true);
});

test('une plaque sensible accepte le joueur, par sécurité de conception', () => {
  // Elle existe pour qu'une salle reste franchissable par un joueur qui n'a rien
  // trouvé de lourd.
  assert.equal(
    activePar('plaque_sensible', PROPRIETES_JOUEUR, { estLeJoueur: true }), true);
});

test('la borne de pontage veut du métal qui couvre la distance', () => {
  assert.equal(activePar('socle_conducteur', proprietesDe('trombone')), true);
  assert.equal(activePar('socle_conducteur', proprietesDe('cuillère')), true);
  assert.equal(activePar('socle_conducteur', proprietesDe('éponge')), false);
});

test('le déversoir refuse un liquide qui prendrait feu', () => {
  assert.equal(activePar('bac_deversoir', proprietesDe('eau')), true);
  assert.equal(activePar('bac_deversoir', proprietesDe('huile')), false);
});

test('activePar refuse un réceptacle inconnu sans lever', () => {
  assert.equal(activePar('trappe_secrete', proprietesDe('brique')), false);
});

test('activePar accepte tableau, Set ou rien', () => {
  assert.equal(activePar('plaque_pression', new Set(['lourd'])), true);
  assert.equal(activePar('plaque_pression', ['lourd']), true);
  assert.equal(activePar('plaque_pression', null), false);
});

// ─── Circuits ───────────────────────────────────────────────────────────────

test('les réceptacles actifs se déduisent de leurs occupants', () => {
  // Les instances portent des noms PROPRES à la chambre, différents de leur
  // type. Les confondre a masqué un défaut jusqu'au premier assemblage complet :
  // le type était cherché sous le nom de l'instance, et le mécanisme ne
  // s'activait jamais.
  const actifs = receptaclesActifs({
    plaque_gauche: { type: 'plaque_pression', proprietes: proprietesDe('brique') },
    rail_du_fond: { type: 'rail_magnetique', proprietes: proprietesDe('éponge') },
    borne_nord: null,
  });
  assert.deepEqual([...actifs], ['plaque_gauche']);
});

test('un occupant joueur n\'active pas ce qui le refuse', () => {
  const actifs = receptaclesActifs({
    dalle_a: { type: 'plaque_pression', proprietes: PROPRIETES_JOUEUR, estLeJoueur: true },
    dalle_b: { type: 'plaque_sensible', proprietes: PROPRIETES_JOUEUR, estLeJoueur: true },
  });
  assert.deepEqual([...actifs], ['dalle_b']);
});

test('receptaclesActifs supporte l\'absence totale d\'occupation', () => {
  assert.deepEqual([...receptaclesActifs({})], []);
  assert.deepEqual([...receptaclesActifs(null)], []);
});

test('une porte s\'exprime dans la même grammaire qu\'une affordance', () => {
  // C'est tout l'intérêt d'avoir sorti la grammaire vers le socle : deux plaques
  // à maintenir simultanément ne demandent aucun code nouveau.
  const porte = { toutes: ['plaque_pression', 'socle_conducteur'] };
  assert.equal(circuitOuvert(porte, new Set(['plaque_pression'])), false);
  assert.equal(circuitOuvert(porte, new Set(['plaque_pression', 'socle_conducteur'])), true);
});

test('un circuit accepte les alternatives et les interdits', () => {
  assert.equal(circuitOuvert({ auMoins: ['a', 'b'] }, ['b']), true);
  assert.equal(circuitOuvert({ sans: ['alarme'] }, ['alarme']), false);
  assert.equal(circuitOuvert({ toutes: [] }, []), true);
});

test('receptaclesRequis énumère ce qu\'un circuit exige', () => {
  assert.deepEqual(
    [...receptaclesRequis({ toutes: ['a', { auMoins: ['b', 'c'] }] })].sort(),
    ['a', 'b', 'c']);
});

// ─── Indices ────────────────────────────────────────────────────────────────

test('l\'indice décrit une exigence, jamais un objet', () => {
  // « un cube » ne laisserait qu'une solution et transformerait la réflexion en
  // chasse au trésor.
  const libelleDe = (id) => PROPRIETES[id].libelle.toLowerCase();
  const indice = indiceDe('plaque_pression', libelleDe);
  assert.ok(indice.includes('lourd'));
  for (const entree of CATALOGUE) {
    // Frontières de mot obligatoires : en sous-chaîne nue, « os » se trouve dans
    // « autre chose » et le test accuserait à tort.
    const motEntier = new RegExp(`(^|[^a-zà-ÿ-])${echapper(entree.nom)}([^a-zà-ÿ-]|$)`, 'i');
    assert.ok(!motEntier.test(indice), `l'indice nomme « ${entree.nom} »`);
  }
});

/** Neutralise les caractères spéciaux d'un nom avant de l'injecter en motif. */
function echapper(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('indiceDe reste muet sur un réceptacle inconnu', () => {
  assert.equal(indiceDe('trappe_secrete'), '');
});

// ─── Confrontation à la base réelle ─────────────────────────────────────────

test('chaque réceptacle est activable par un objet réel', () => {
  // Un réceptacle que rien ne peut activer rend la salle infranchissable, sans
  // qu'aucun message ne l'explique au joueur.
  for (const id of IDS_RECEPTACLES) {
    const capables = objetsActivant(id, CATALOGUE);
    assert.notEqual(capables.length, 0, `aucun objet ne peut activer « ${id} »`);
  }
});

test('chaque réceptacle admet plusieurs solutions', () => {
  for (const id of IDS_RECEPTACLES) {
    const capables = objetsActivant(id, CATALOGUE);
    assert.ok(capables.length >= 3,
      `« ${id} » n'a que ${capables.length} solution(s) : ${capables.map((e) => e.nom)}`);
  }
});

test('aucun réceptacle n\'est activé par la moitié du catalogue', () => {
  // Un réceptacle qu'une grande partie des objets active n'exige plus rien : la
  // salle qui s'appuie dessus n'est plus une énigme.
  for (const id of IDS_RECEPTACLES) {
    if (RECEPTACLES[id].permissif) continue;
    const proportion = objetsActivant(id, CATALOGUE).length / CATALOGUE.length;
    assert.ok(proportion <= 0.5,
      `« ${id} » est activé par ${Math.round(proportion * 100)} % de la base`);
  }
});

test('les réceptacles permissifs restent rares et déclarés', () => {
  // L'exemption ci-dessus est une porte ouverte : sans ce garde-fou, il
  // suffirait d'ajouter `permissif: true` pour faire taire un vrai défaut de
  // calibrage. Le filet de sécurité doit rester une exception isolée.
  const permissifs = IDS_RECEPTACLES.filter((id) => RECEPTACLES[id].permissif);
  assert.ok(permissifs.length <= 2,
    `${permissifs.length} réceptacles permissifs : l'exception devient la règle`);
  for (const id of permissifs) {
    assert.equal(RECEPTACLES[id].refuseLeJoueur, false,
      `« ${id} » est permissif mais refuse le joueur : ce n'est pas un filet de sécurité`);
  }
});

test('objetsActivant se restreint au catalogue fourni', () => {
  // Ainsi le test de résolubilité pourra demander : « avec les seuls objets de
  // cette salle, la plaque peut-elle être enfoncée ? »
  const salle = [chercher('éponge'), chercher('mouchoir'), chercher('brique')];
  assert.deepEqual(objetsActivant('plaque_pression', salle).map((e) => e.nom), ['brique']);
  assert.deepEqual(objetsActivant('rail_magnetique', salle), []);
});
