// Verrouille le semis de végétation (T-036).
//
// Le joueur a signalé « de l'herbe dans le vide ». Le lierre de la serre était
// déclaré sur toute la profondeur, et cette pièce a un GOUFFRE : des touffes
// poussaient au-dessus de trois mètres de rien.
//
// Ce n'était pas une coordonnée mal tapée. Le décor était posé sans qu'on lui
// demande jamais s'il y avait du sol dessous — la question n'existait nulle
// part dans le code. Corriger la coordonnée aurait fait disparaître le symptôme
// et laissé la classe entière ouverte : la salle suivante l'aurait reproduite.
//
// Ces tests ne vérifient donc pas que CETTE herbe n'est plus dans CE vide. Ils
// vérifient qu'aucune plante, dans aucune chambre, présente ou à venir, ne peut
// être semée sans sol sous son emprise.

import test from 'node:test';
import assert from 'node:assert/strict';

import { CHAMBRES } from '../../game/js/gameplay/chambres.js';
import { semer, interdits, SEMABLES, DENSITE, VARIATION } from '../../game/js/rendering/semis.js';
import { departDe, solPorte, solPresent } from '../../game/js/rendering/plan.js';
import { ESPECES } from '../../game/js/rendering/vegetation.js';
import { MODULE } from '../../game/js/rendering/kit.js';

const semisDe = (chambre, options = {}) =>
  semer(chambre, { depart: departDe(chambre), ...options });

// ─── LA règle ───────────────────────────────────────────────────────────────

test('aucune plante ne pousse dans le vide', () => {
  // Le défaut signalé. Il tient en une ligne parce que la contrainte a été
  // portée dans le code plutôt que dans la vigilance de qui écrit une chambre.
  for (const chambre of CHAMBRES) {
    for (const pousse of semisDe(chambre)) {
      assert.ok(solPorte(chambre, pousse.x, pousse.z, pousse.rayon),
        `${chambre.id} : ${pousse.espece} sans sol en (${pousse.x.toFixed(2)}, ${pousse.z.toFixed(2)})`);
    }
  }
});

test('la règle tient sur une chambre au gouffre déplacé', () => {
  // Le test précédent passerait encore si la contrainte était écrite en dur
  // pour le gouffre existant. On en fabrique donc un autre, ailleurs.
  const base = CHAMBRES.find((c) => c.gouffre) ?? CHAMBRES[0];
  const chambre = {
    ...base,
    id: 'essai_gouffre',
    gouffre: { xMin: -2, xMax: 2, zMin: -1, zMax: 1 },
    decor: [], receptacles: {}, terminaux: {}, passerelles: [], poses: {},
  };
  const pousses = semisDe(chambre, { densite: 12 });
  assert.ok(pousses.length > 0, 'aucune plante semée : le test ne prouverait rien');
  for (const pousse of pousses) {
    assert.ok(solPorte(chambre, pousse.x, pousse.z, pousse.rayon),
      `${pousse.espece} au-dessus du nouveau gouffre`);
  }
});

test('une plante dont l\'emprise DÉBORDE du sol est refusée', () => {
  // Tester le seul centre laisserait une touffe à moitié dans le vide, ce qui
  // se voit exactement autant qu'une touffe entièrement dans le vide.
  const chambre = { taille: { largeur: 8, profondeur: 8 }, gouffre: { xMin: -4, xMax: 4, zMin: -1, zMax: 1 } };
  // Un point juste au bord du gouffre : le centre porte, l'emprise non.
  const borde = 1 * MODULE + 0.05;
  assert.equal(solPresent(chambre, 0, borde), true, 'le centre devrait porter');
  assert.equal(solPorte(chambre, 0, borde, 0.4), false, 'l\'emprise déborde et devrait être refusée');
});

// ─── Les autres interdits ───────────────────────────────────────────────────

test('rien ne pousse sur un mécanisme', () => {
  // Une énigme cachée par un buisson est une énigme injouable, et le joueur
  // accuse le jeu, pas le buisson.
  for (const chambre of CHAMBRES) {
    const mecanismes = [
      ...Object.values(chambre.receptacles ?? {}),
      ...Object.values(chambre.terminaux ?? {}),
    ];
    for (const pousse of semisDe(chambre)) {
      for (const mecanisme of mecanismes) {
        const distance = Math.hypot(mecanisme.x * MODULE - pousse.x, mecanisme.z * MODULE - pousse.z);
        assert.ok(distance > pousse.rayon,
          `${chambre.id} : ${pousse.espece} sur un mécanisme`);
      }
    }
  }
});

test('rien ne pousse sur un objet posé', () => {
  // Un objet enfoui sous une fougère est un objet que le joueur ne trouvera
  // pas — et la salle est alors prouvée franchissable sans l'être.
  for (const chambre of CHAMBRES) {
    for (const pousse of semisDe(chambre)) {
      for (const pose of Object.values(chambre.poses ?? {})) {
        const distance = Math.hypot(pose.x * MODULE - pousse.x, pose.z * MODULE - pousse.z);
        assert.ok(distance > pousse.rayon, `${chambre.id} : ${pousse.espece} sur ${JSON.stringify(pose)}`);
      }
    }
  }
});

test('le joueur ne se réveille pas dans un massif', () => {
  for (const chambre of CHAMBRES) {
    const depart = departDe(chambre);
    for (const pousse of semisDe(chambre)) {
      const distance = Math.hypot(depart.x - pousse.x, depart.z - pousse.z);
      assert.ok(distance > pousse.rayon + 0.5,
        `${chambre.id} : ${pousse.espece} à ${distance.toFixed(2)} m du départ`);
    }
  }
});

test('rien ne pousse dans un mur, ni collé contre', () => {
  // Pas seulement « à l'intérieur » : une plante flush contre la cloison entre
  // dans les joints creux des panneaux et son feuillage ressort de l'autre
  // côté. Il lui faut un dégagement, et ce dégagement doit être vérifié —
  // sinon la constante qui le porte peut être mise à n'importe quoi sans que
  // rien ne rougisse.
  const DEGAGEMENT = 0.2;
  for (const chambre of CHAMBRES) {
    const demiX = (chambre.taille.largeur * MODULE) / 2;
    const demiZ = (chambre.taille.profondeur * MODULE) / 2;
    for (const pousse of semisDe(chambre)) {
      assert.ok(Math.abs(pousse.x) + pousse.rayon <= demiX - DEGAGEMENT,
        `${pousse.espece} trop près du mur en X`);
      assert.ok(Math.abs(pousse.z) + pousse.rayon <= demiZ - DEGAGEMENT,
        `${pousse.espece} trop près du mur en Z`);
    }
  }
});

test('deux plantes ne se traversent pas', () => {
  for (const chambre of CHAMBRES) {
    const pousses = semisDe(chambre);
    for (let i = 0; i < pousses.length; i++) {
      for (let j = i + 1; j < pousses.length; j++) {
        const distance = Math.hypot(pousses[i].x - pousses[j].x, pousses[i].z - pousses[j].z);
        assert.ok(distance >= pousses[i].rayon + pousses[j].rayon,
          `${chambre.id} : ${pousses[i].espece} et ${pousses[j].espece} s'interpénètrent`);
      }
    }
  }
});

// ─── Déterminisme et densité ────────────────────────────────────────────────

test('même graine, même jardin', () => {
  // Un décor qui change à chaque chargement rend tout défaut visuel
  // irreproductible : impossible de le montrer, impossible de prouver qu'il
  // est corrigé.
  const chambre = CHAMBRES[0];
  assert.deepEqual(semisDe(chambre, { graine: 3 }), semisDe(chambre, { graine: 3 }));
});

test('deux graines donnent deux jardins', () => {
  const chambre = CHAMBRES[0];
  assert.notDeepEqual(semisDe(chambre, { graine: 3 }), semisDe(chambre, { graine: 4 }));
});

test('chaque chambre reçoit vraiment de la verdure', () => {
  // La contrainte pourrait être respectée en ne semant rien du tout. Ce serait
  // correct, et ce serait un échec — le joueur a demandé PLUS de verdure.
  for (const chambre of CHAMBRES) {
    const pousses = semisDe(chambre);
    assert.ok(pousses.length >= 10,
      `${chambre.id} : ${pousses.length} plantes, la salle reste nue`);
    assert.ok(new Set(pousses.map((p) => p.espece)).size >= 3,
      `${chambre.id} : trop peu d'espèces, la répétition se verra`);
  }
});

test('une salle envahie est plus verte qu\'une salle soignée', () => {
  assert.ok(DENSITE.envahi > DENSITE.soigne);
});

// ─── Cohérence avec les modèles ─────────────────────────────────────────────

test('chaque espèce semable existe et a une hauteur mesurée', () => {
  // Une espèce semée sans modèle correspondant ne pousse jamais, en silence :
  // la salle est moins verte et rien ne le dit.
  for (const semable of SEMABLES) {
    const espece = ESPECES[semable.espece];
    assert.ok(espece, `« ${semable.espece} » semée mais absente du catalogue`);
    assert.ok(espece.hauteur > 0, `« ${semable.espece} » sans hauteur : l'échelle serait infinie`);
  }
});

test('chaque espèce vise une taille tenant sous plafond', () => {
  // Les modèles sont modelés pour le plein air : la grande plante fait 3,76 m
  // pour une salle de 3,6 m sous plafond. Sans taille visée, la serre devenait
  // une jungle à hauteur d'homme.
  for (const semable of SEMABLES) {
    assert.ok(semable.hauteurVisee > 0, `« ${semable.espece} » sans taille visée`);
    assert.ok(semable.hauteurVisee < 2.4,
      `« ${semable.espece} » visée à ${semable.hauteurVisee} m : elle masquera la salle`);
  }
});

test('l\'espace réservé est celui que la plante occupe vraiment', () => {
  // Le rayon n'est plus déclaré mais DÉRIVÉ de l'emprise mesurée du modèle et
  // du facteur d'échelle. C'était le vrai défaut derrière les fleurs géantes :
  // les rayons écrits à l'estime servaient à espacer des plantes dont ils ne
  // décrivaient pas la taille. On vérifie ici que les deux coïncident.
  for (const chambre of CHAMBRES) {
    for (const pousse of semisDe(chambre)) {
      const modele = ESPECES[pousse.espece];
      const rayonReel = (modele.emprise / 2) * pousse.echelle;
      assert.ok(Math.abs(pousse.rayon - rayonReel) < 1e-9,
        `${pousse.espece} : réservé ${pousse.rayon.toFixed(2)} m, occupe ${rayonReel.toFixed(2)} m`);
      assert.ok(pousse.rayon < 1.2, `${pousse.espece} : rayon démesuré (${pousse.rayon.toFixed(2)} m)`);
    }
  }
});

test('aucune plante SEMÉE ne dépasse la taille voulue, en hauteur COMME en largeur', () => {
  // Mettre à l'échelle par la seule hauteur explose la largeur des modèles
  // plats — c'est ce qui a produit des fleurs plus larges qu'une plaque de
  // pression au milieu de la salle de réveil.
  //
  // Ce test mesure les plantes RÉELLEMENT produites. La première version
  // recalculait le `Math.min` de son côté et comparait le résultat à
  // lui-même : elle passait au vert même en remettant le défaut d'origine.
  // Un test qui rejoue la formule qu'il vérifie ne vérifie rien.
  const parEspece = new Map(SEMABLES.map((s) => [s.espece, s]));
  for (const chambre of CHAMBRES) {
    for (const pousse of semisDe(chambre)) {
      const modele = ESPECES[pousse.espece];
      const voulu = parEspece.get(pousse.espece);
      assert.ok(modele.emprise > 0, `« ${pousse.espece} » : emprise du modèle non mesurée`);
      assert.ok(modele.hauteur * pousse.echelle <= voulu.hauteurVisee * VARIATION.max + 1e-9,
        `${pousse.espece} : ${(modele.hauteur * pousse.echelle).toFixed(2)} m de haut pour ${voulu.hauteurVisee} m voulus`);
      assert.ok(modele.emprise * pousse.echelle <= voulu.empriseVisee * VARIATION.max + 1e-9,
        `${pousse.espece} : ${(modele.emprise * pousse.echelle).toFixed(2)} m de large pour ${voulu.empriseVisee} m voulus`);
    }
  }
});

test('les zones interdites sont déduites de la chambre, pas listées à la main', () => {
  // Ajouter un mécanisme doit suffire à protéger son emplacement. Une liste
  // tenue à part oublierait celui ajouté la semaine suivante.
  const chambre = {
    taille: { largeur: 8, profondeur: 8 },
    receptacles: { neuf: { type: 'plaque_pression', x: 1, z: 1 } },
    porte: { mur: 'nord', ouverture: 2 },
  };
  const zones = interdits(chambre, { x: 0, z: 3 });
  assert.ok(zones.some((z) => Math.hypot(z.x - MODULE, z.z - MODULE) < 0.01),
    'le réceptacle déclaré n\'a pas produit de zone interdite');
});
