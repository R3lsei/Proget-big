// Verrouille le portage par plate-forme mobile (T-043).
//
// Toute la physique du jeu supposait des obstacles immobiles. Cette hypothèse
// n'était écrite nulle part, et elle a tenu deux salles. Une passerelle
// élévatrice la casse, et les deux façons de se tromper sont connues d'avance :
// la plate-forme traverse le joueur en montant, ou elle le laisse en l'air en
// descendant. Aucune des deux ne lève d'erreur ; toutes deux ne se constatent
// qu'en jouant, une fois sur dix.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  reposeSurPlateforme, boiteDePlateforme, avancerPlateforme,
  TOLERANCE_CONTACT, PAS_MAX,
} from '../../game/js/physics/plateforme.js';

const PLATEFORME = { x: 0, z: 0, largeur: 2.4, longueur: 2.4, epaisseur: 0.16 };
const GABARIT = { rayon: 0.35, hauteur: 1.7 };
const joueur = (x, y, z) => ({ x, y, z, vy: 0, auSol: false });
const passager = (corps) => [{ corps, gabarit: GABARIT }];

// ─── Contact ────────────────────────────────────────────────────────────────

test('un corps posé dessus est porté', () => {
  const boite = boiteDePlateforme(PLATEFORME, 1.5);
  assert.ok(reposeSurPlateforme(joueur(0, 1.5, 0), GABARIT, boite));
});

test('un corps qui passe DESSOUS n\'est jamais emporté', () => {
  // La faute qui envoie le joueur au plafond : tester le chevauchement des
  // boîtes sans regarder de quel côté il est. Un joueur debout sous une
  // plate-forme la chevauche parfaitement.
  const boite = boiteDePlateforme(PLATEFORME, 2.8);
  assert.equal(reposeSurPlateforme(joueur(0, 0, 0), GABARIT, boite), false);
});

test('un corps à côté n\'est pas porté', () => {
  const boite = boiteDePlateforme(PLATEFORME, 1.5);
  assert.equal(reposeSurPlateforme(joueur(3.2, 1.5, 0), GABARIT, boite), false);
});

test('la tolérance de contact absorbe le jeu de la gravité', () => {
  // Entre deux images, la gravité creuse quelques millimètres et la résolution
  // laisse 2 mm de marge. Une tolérance trop serrée fait perdre le contact une
  // image sur trois : la plate-forme lâche son passager en route, par
  // intermittence, ce qui est le pire des symptômes à diagnostiquer.
  const boite = boiteDePlateforme(PLATEFORME, 1.5);
  assert.ok(reposeSurPlateforme(joueur(0, 1.5 - TOLERANCE_CONTACT * 0.8, 0), GABARIT, boite));
  assert.ok(reposeSurPlateforme(joueur(0, 1.5 + TOLERANCE_CONTACT * 0.8, 0), GABARIT, boite));
  assert.equal(
    reposeSurPlateforme(joueur(0, 1.5 - TOLERANCE_CONTACT * 3, 0), GABARIT, boite), false);
});

// ─── Portage ────────────────────────────────────────────────────────────────

test('le passager monte exactement avec la plate-forme', () => {
  const corps = joueur(0, 0, 0);
  const r = avancerPlateforme(PLATEFORME, 0, 2.8, 0.5, 1, passager(corps));
  assert.ok(Math.abs(corps.y - r.hauteur) < 1e-6,
    `plate-forme à ${r.hauteur}, passager à ${corps.y}`);
  assert.ok(r.portes.includes(corps));
});

test('le passager descend avec elle, sans retomber par saccades', () => {
  // Sans portage à la descente, le sol se dérobe et la gravité rattrape le
  // corps image après image : le joueur tressaute pendant toute la descente.
  const corps = joueur(0, 2.8, 0);
  const r = avancerPlateforme(PLATEFORME, 2.8, 0, 0.5, 1, passager(corps));
  assert.ok(Math.abs(corps.y - r.hauteur) < 1e-6);
});

test('un corps qui passe dessous n\'est pas soulevé', () => {
  // Le symptôme serait spectaculaire — le joueur collé au plafond — mais le
  // code qui le produit est une ligne d'apparence anodine.
  const corps = joueur(0, 0, 0);
  avancerPlateforme(PLATEFORME, 2.8, 4, 0.5, 1, passager(corps));
  assert.equal(corps.y, 0);
});

test('une plate-forme qui monte VITE cueille ce qui est sur son chemin', () => {
  // B-014, transposé à la verticale, et c'est le seul cas que les sous-pas
  // protègent — un cas qu'un premier test avait manqué en plaçant le corps
  // déjà au contact, où le découpage ne sert à rien.
  //
  // Ici le corps se tient sur une saillie à 1,50 m ; la plate-forme part de 0
  // et monte à 3 m en UNE image. Sans découpage elle saute de dessous à
  // dessus sans jamais le chevaucher : le corps reste en l'air, la plate-forme
  // le traverse, et rien ne le signale. À vitesse normale cela n'arrive
  // jamais — donc le défaut n'apparaîtrait qu'au premier à-coup, en jeu, chez
  // le joueur, et une fois sur dix.
  const corps = joueur(0, 1.5, 0);
  const r = avancerPlateforme(PLATEFORME, 0, 3, 100, 1, passager(corps));
  assert.ok(Math.abs(corps.y - r.hauteur) < 1e-6,
    `plate-forme à ${r.hauteur}, corps resté à ${corps.y} : traversé`);
  assert.ok(PAS_MAX <= GABARIT.hauteur / 2,
    'le sous-pas doit rester inférieur à la moitié du corps');
});

test('la plate-forme ne dépasse jamais sa consigne', () => {
  // Un dépassement suivi d'un retour fait osciller la plate-forme d'un
  // millimètre indéfiniment, et ce frémissement se lit sur les reflets bien
  // avant qu'on en trouve la cause.
  const r = avancerPlateforme(PLATEFORME, 0, 2.8, 100, 1, []);
  assert.equal(r.hauteur, 2.8);
  const s = avancerPlateforme(PLATEFORME, 2.8, 0, 100, 1, []);
  assert.equal(s.hauteur, 0);
});

test('arrivée à destination, elle cesse de bouger', () => {
  const corps = joueur(0, 2.8, 0);
  const r = avancerPlateforme(PLATEFORME, 2.8, 2.8, 0.5, 1, passager(corps));
  assert.equal(r.hauteur, 2.8);
  assert.equal(corps.y, 2.8);
  assert.equal(r.portes.length, 0);
});

test('le passager arrive au sol de la plate-forme, pas en chute libre', () => {
  // La vitesse verticale accumulée pendant la montée doit être annulée. Sinon
  // le corps replonge dès l'arrêt et traverse son propre plancher avant que la
  // résolution ne le rattrape.
  const corps = joueur(0, 0, 0);
  corps.vy = -9;
  avancerPlateforme(PLATEFORME, 0, 1, 0.5, 1, passager(corps));
  assert.equal(corps.vy, 0);
  assert.equal(corps.auSol, true);
});

test('plusieurs corps sont portés ensemble', () => {
  // Le joueur ET l'objet lourd qu'il vient de poser. Ne porter que le joueur
  // laisserait la caisse traverser le plancher de la passerelle.
  const a = joueur(-0.6, 0, 0);
  const b = joueur(0.6, 0, 0.4);
  const r = avancerPlateforme(PLATEFORME, 0, 1.2, 0.6, 1,
    [{ corps: a, gabarit: GABARIT }, { corps: b, gabarit: GABARIT }]);
  assert.equal(r.portes.length, 2);
  assert.ok(Math.abs(a.y - r.hauteur) < 1e-6);
  assert.ok(Math.abs(b.y - r.hauteur) < 1e-6);
});

test('une plate-forme et sa boîte disent la même chose', () => {
  // Deux calculs parallèles pour la même géométrie finissent toujours par
  // diverger — c'est arrivé au sol et au semis, et l'herbe poussait dans le
  // vide. Le rendu comme la physique passent par cette seule formule.
  const boite = boiteDePlateforme(PLATEFORME, 2.8);
  assert.equal(boite.maxY, 2.8);
  assert.equal(boite.minY, 2.8 - PLATEFORME.epaisseur);
  assert.equal(boite.maxX - boite.minX, PLATEFORME.largeur);
  assert.equal(boite.maxZ - boite.minZ, PLATEFORME.longueur);
});
