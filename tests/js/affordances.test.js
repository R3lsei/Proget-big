// Verrouille le moteur d'affordances (T-012).
//
// C'est le module qui décide si une énigme est franchissable. Une règle trop
// stricte rend le jeu injouable ; une règle trop lâche le rend trivial. Les deux
// défauts sont invisibles en lecture de code — ils ne se voient qu'en confrontant
// les règles à la base réelle d'objets, ce que font les derniers tests.

import test from 'node:test';
import assert from 'node:assert/strict';

import { PROPRIETES } from '../../game/js/perception/vocabulaire.js';
import { CATEGORIES, chercher } from '../../game/js/perception/base/index.js';
import {
  AFFORDANCES, IDS, QUALITE_MINIMALE,
  evaluer, affordancesDe, permet, proprietesCitees, expliquer, objetsPour,
} from '../../game/js/perception/affordances.js';

/** Toutes les entrées de la base, aplaties, telles que `chercher` les renvoie. */
const CATALOGUE = Object.keys(CATEGORIES)
  .flatMap((categorie) => Object.keys(CATEGORIES[categorie]))
  .map((nom) => chercher(nom));

const actions = (...proprietes) => affordancesDe(new Set(proprietes)).map((a) => a.id);

// ─── Grammaire des conditions ───────────────────────────────────────────────

test('une condition littérale teste la présence de la propriété', () => {
  assert.equal(evaluer('tranchant', new Set(['tranchant'])), true);
  assert.equal(evaluer('tranchant', new Set(['rigide'])), false);
});

test('`toutes` exige la totalité, `auMoins` se contente d\'une', () => {
  const p = new Set(['tranchant', 'rigide']);
  assert.equal(evaluer({ toutes: ['tranchant', 'rigide'] }, p), true);
  assert.equal(evaluer({ toutes: ['tranchant', 'lourd'] }, p), false);
  assert.equal(evaluer({ auMoins: ['tranchant', 'lourd'] }, p), true);
  assert.equal(evaluer({ auMoins: ['leger', 'lourd'] }, p), false);
});

test('`sans` refuse la présence', () => {
  assert.equal(evaluer({ sans: ['inflammable'] }, new Set(['contient_liquide'])), true);
  assert.equal(evaluer({ sans: ['inflammable'] }, new Set(['inflammable'])), false);
});

test('les formes se composent en profondeur', () => {
  const condition = { toutes: ['contient_liquide', { sans: [{ auMoins: ['inflammable'] }] }] };
  assert.equal(evaluer(condition, new Set(['contient_liquide'])), true);
  assert.equal(evaluer(condition, new Set(['contient_liquide', 'inflammable'])), false);
});

test('une condition vide de toute forme connue lève', () => {
  // Silence ici signifierait une affordance jamais déclenchée, sans message.
  assert.throws(() => evaluer({ peutEtre: ['tranchant'] }, new Set()), /mal formée/);
});

test('les listes vides suivent la logique classique', () => {
  assert.equal(evaluer({ toutes: [] }, new Set()), true);
  assert.equal(evaluer({ auMoins: [] }, new Set()), false);
  assert.equal(evaluer({ sans: [] }, new Set()), true);
});

// ─── Intégrité des règles ───────────────────────────────────────────────────

test('toutes les propriétés citées par les règles existent', () => {
  // Une faute de frappe rendrait l'affordance inatteignable : jamais déclenchée,
  // jamais signalée, et l'énigme correspondante impossible.
  for (const id of IDS) {
    for (const propriete of proprietesCitees(AFFORDANCES[id].requiert)) {
      assert.ok(propriete in PROPRIETES, `${id} exige « ${propriete} », hors vocabulaire`);
    }
    for (const propriete of AFFORDANCES[id].favorise ?? []) {
      assert.ok(propriete in PROPRIETES, `${id} favorise « ${propriete} », hors vocabulaire`);
    }
  }
});

test('chaque affordance porte un libellé et un résumé', () => {
  for (const id of IDS) {
    assert.ok(AFFORDANCES[id].libelle?.trim(), `${id} sans libellé`);
    assert.ok(AFFORDANCES[id].resume?.trim(), `${id} sans résumé`);
  }
});

test('aucune affordance n\'est déclenchée par un objet sans propriété', () => {
  // Une règle satisfaite par l'ensemble vide donnerait cette action à TOUT objet,
  // y compris à ceux que le détecteur n'a pas su décrire.
  assert.deepEqual(affordancesDe(new Set()), []);
});

// ─── Déduction ──────────────────────────────────────────────────────────────

test('un objet tranchant et rigide sait couper', () => {
  assert.ok(actions('tranchant', 'rigide').includes('couper'));
});

test('un objet seulement cassant ne coupe pas', () => {
  // Un verre intact ne tranche rien : il faut d'abord le briser. La règle a été
  // corrigée pour le dire — sa branche `cassant` d'origine n'était satisfaite par
  // aucun objet réel de la base, donc jamais exécutée ni testable.
  // Le tesson viendra avec le mécanisme de transformation (T-017), en objet à
  // part entière, tranchant et rigide comme n'importe quelle lame.
  assert.ok(!actions('cassant', 'creux').includes('couper'));
});

test('un tournevis crochète et fait levier, sans que la règle le nomme', () => {
  // La promesse du jeu tient dans ce test : aucune ligne n'associe « tournevis »
  // à « crocheter ». La déduction vient de la forme seule.
  const trouvees = affordancesDe(chercher('tournevis').proprietes).map((a) => a.id);
  assert.ok(trouvees.includes('crocheter'));
  assert.ok(trouvees.includes('faire_levier'));
});

test('le trombone crochète malgré sa souplesse', () => {
  // Régression : exiger `rigide` excluait le crochet le plus célèbre qui soit.
  assert.ok(permet('crocheter', chercher('trombone').proprietes));
});

test('l\'huile n\'éteint pas un feu', () => {
  // Une solution qui paraît juste et qui échoue est le pire retour possible.
  assert.equal(permet('eteindre', chercher('huile').proprietes), false);
  assert.equal(permet('eteindre', chercher('eau').proprietes), true);
});

test('seul un appareil réellement pilotable pirate', () => {
  assert.equal(permet('pirater', chercher('téléphone').proprietes), true);
  assert.equal(permet('pirater', chercher('télécommande').proprietes), false);
  assert.equal(permet('pirater', chercher('calculatrice').proprietes), false);
});

test('permet refuse une affordance inconnue sans lever', () => {
  assert.equal(permet('téléporter', new Set(['tranchant'])), false);
});

test('affordancesDe accepte un tableau comme un ensemble', () => {
  assert.deepEqual(actions('tranchant', 'rigide'),
    affordancesDe(['tranchant', 'rigide']).map((a) => a.id));
  assert.deepEqual(affordancesDe(null), []);
});

// ─── Qualité ────────────────────────────────────────────────────────────────

test('la qualité récompense l\'objet le mieux adapté sans exclure l\'autre', () => {
  const couteau = affordancesDe(chercher('couteau').proprietes).find((a) => a.id === 'couper');
  const rape = affordancesDe(chercher('râpe').proprietes).find((a) => a.id === 'couper');
  assert.ok(couteau, 'le couteau doit couper');
  assert.ok(rape, 'la râpe doit pouvoir couper, même mal');
  assert.ok(couteau.qualite > rape.qualite, 'le couteau doit être le meilleur outil');
});

test('la qualité reste toujours utilisable', () => {
  // Un plancher à zéro laisserait croire à une action impossible alors qu'elle
  // ne demande que plus de temps.
  for (const entree of CATALOGUE) {
    for (const { id, qualite } of affordancesDe(entree.proprietes)) {
      assert.ok(qualite >= QUALITE_MINIMALE && qualite <= 1,
        `${entree.nom}/${id} : qualité ${qualite} hors bornes`);
    }
  }
});

test('les actions sont classées de la meilleure à la moins bonne', () => {
  const notes = affordancesDe(chercher('téléphone').proprietes).map((a) => a.qualite);
  assert.deepEqual(notes, [...notes].sort((a, b) => b - a));
});

// ─── Explication ────────────────────────────────────────────────────────────

test('une condition se traduit en français lisible', () => {
  const libelleDe = (id) => PROPRIETES[id].libelle.toLowerCase();
  assert.equal(expliquer(AFFORDANCES.faire_levier.requiert, libelleDe), 'rigide et allongé');
  assert.equal(expliquer(AFFORDANCES.crocheter.requiert, libelleDe),
    'mince, allongé et pas lourd');
  assert.equal(expliquer('tranchant', libelleDe), 'tranchant');
});

test('les sous-conditions composées sont parenthésées', () => {
  // Sans parenthèses, « magnétique ou électronique et communicant » se lit à
  // l'envers de la règle. Un indice qui trompe envoie le joueur chercher dans la
  // mauvaise direction avec la conviction d'avoir compris.
  const libelleDe = (id) => PROPRIETES[id].libelle.toLowerCase();
  assert.equal(expliquer(AFFORDANCES.brouiller.requiert, libelleDe),
    'magnétique ou (électronique et communicant)');
});

test('une négation unique se dit « pas », une négation multiple « ni… ni »', () => {
  assert.equal(expliquer({ sans: ['a'] }), 'pas a');
  assert.equal(expliquer({ sans: ['a', 'b'] }), 'ni a ni b');
});

test('on n\'attache rien avec de la nourriture', () => {
  // La banane est souple et allongée ; elle ne lie rien pour autant.
  assert.equal(permet('attacher', chercher('banane').proprietes), false);
  assert.equal(permet('attacher', chercher('corde').proprietes), true);
  assert.equal(permet('attacher', chercher('laisse').proprietes), true);
});

test('l\'explication fonctionne sans table de libellés', () => {
  assert.equal(expliquer({ auMoins: ['a', 'b'] }), 'a ou b');
});

test('proprietesCitees descend dans toute la condition', () => {
  assert.deepEqual([...proprietesCitees(AFFORDANCES.eteindre.requiert)].sort(),
    ['contient_liquide', 'inflammable']);
  assert.deepEqual([...proprietesCitees(AFFORDANCES.brouiller.requiert)].sort(),
    ['communicant', 'electronique', 'magnetique']);
});

// ─── Confrontation à la base réelle ─────────────────────────────────────────
//
// Les tests précédents vérifient que les règles sont bien formées. Ceux-ci
// vérifient qu'elles sont bien CALIBRÉES, ce qui ne se lit pas dans le code.

test('chaque affordance est atteignable par un objet réel', () => {
  // Une affordance que personne ne peut déclencher rend insoluble toute énigme
  // qui la demande. Le joueur chercherait sans fin une solution inexistante.
  for (const id of IDS) {
    const capables = objetsPour(id, CATALOGUE);
    assert.notEqual(capables.length, 0, `aucun objet de la base ne sait « ${id} »`);
  }
});

test('chaque affordance admet plusieurs solutions', () => {
  // Axe de conception validé : « solutions multiples garanties ». Une action que
  // seul un objet précis permettrait ramènerait la chasse à l'objet unique.
  for (const id of IDS) {
    const capables = objetsPour(id, CATALOGUE);
    assert.ok(capables.length >= 3,
      `« ${id} » n'a que ${capables.length} solution(s) : ${capables.map((c) => c.entree.nom)}`);
  }
});

test('aucune affordance n\'est distribuée à tout va', () => {
  // Symétrique du test précédent. Une règle satisfaite par la moitié du catalogue
  // n'exige plus rien du joueur, et l'énigme qui s'appuie dessus n'en est plus une.
  for (const id of IDS) {
    const proportion = objetsPour(id, CATALOGUE).length / CATALOGUE.length;
    assert.ok(proportion <= 0.5,
      `« ${id} » est permise par ${Math.round(proportion * 100)} % de la base`);
  }
});

test('aucun objet de la base n\'est totalement inutile', () => {
  // Promesse du jeu : tout objet réel sert à quelque chose. Un objet sans aucune
  // action serait détecté, nommé, puis rejeté — le moment exact où l'illusion
  // se brise.
  const inertes = CATALOGUE.filter((e) => affordancesDe(e.proprietes).length === 0);
  assert.deepEqual(inertes.map((e) => e.nom), []);
});

test('objetsPour se restreint au catalogue qu\'on lui donne', () => {
  // C'est ainsi que le test de résolubilité (T-014) demandera « avec les seuls
  // objets de cette salle, l'énigme a-t-elle encore une solution ? ».
  const salle = [chercher('cuillère'), chercher('banane'), chercher('livre')];
  assert.deepEqual(objetsPour('couper', salle), []);
  assert.deepEqual(objetsPour('faire_levier', salle).map((c) => c.entree.nom), ['cuillère']);
});

test('objetsPour ignore une affordance inconnue', () => {
  assert.deepEqual(objetsPour('téléporter', CATALOGUE), []);
});
