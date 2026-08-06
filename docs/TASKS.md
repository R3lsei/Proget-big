# TASKS — NOVA-7

> Tâches actives. Une seule fonctionnalité à la fois, validée avant la suivante.
> Vue d'ensemble : [ROADMAP.md](ROADMAP.md).

**Jalon courant : 2 — Le cœur du jeu**

---

## 🟡 Prêt à démarrer

| ID | Tâche | Dépend de |
|---|---|---|
| T-004 | Vérification automatique des règles de dépendance | T-002 ✅ |
| T-005 | Seuils de performance bloquants en CI | T-002 ✅ |
| T-006 | Verrouiller B-002 (fusion) et B-004 (élimination hors champ) | T-002 ✅ |

## ⚪ Jalon 2 — Le cœur du jeu

| ID | Tâche | Dépend de |
|---|---|---|
| T-012 | Moteur d'affordances (fonctions pures) | T-010 ✅, T-011 ✅ |
| T-013 | Repli sémantique hors base | T-011 ✅ |
| T-016 | Mesure embarquée de la latence de scan | T-012 |
| T-014 | **Test de résolubilité bloquant** | T-012 |
| T-015 | Grammaire d'énigmes et chargeur de salles | T-012 |

---

## ✅ Terminé

| ID | Tâche | Résultat |
|---|---|---|
| T-001 | Banc de mesure hors-ligne | **Abandonné.** Trois tentatives, aucune mesure obtenue : session ONNX refusée, puis page servie depuis le cache. Le coût a dépassé le bénéfice. Remplacé par T-016, qui mesure la même chose sans rien demander au joueur. Le banc reste dans `tools/` pour qui veut. Décision assumée : on conçoit pour le pire cas (scan lent), l'ergonomie s'adapte à la mesure réelle |
| T-000 | Conception validée (7 axes) | SPEC, GAMEPLAY, ARCHITECTURE écrits |
| T-000b | Faisabilité open-vocabulary | transformers.js v4.2.0 disponible, bundle autonome 510 Ko, WebGPU détecté |
| T-000c | Banc de mesure livré | `tools/spike-detection/`, zéro erreur JS |
| T-011 | Base curatée d'objets français | 408 objets en 9 catégories, 444 entrées avec synonymes. Chaque propriété du vocabulaire est portée par au moins un objet — aucune affordance n'est inatteignable. Recherche tolérante : casse, accents, articles, pluriels. 22 tests ; verrouillage vérifié par mutation, 5 régressions sur 5 détectées |
| T-010 | Vocabulaire de propriétés | 30 propriétés en 7 familles, gelé en profondeur, versionné 1.0.0. Chaque propriété est un **fait observable**, formulé en question fermée : même contrat pour la base curatée et pour le repli sémantique. 21 tests, dont un test d'empreinte qui rend toute modification volontaire. Verrouillage vérifié par mutation : 4 régressions sur 4 sont détectées |
| T-003 | Module `physics/` extrait + B-001 verrouillé | 15 tests de collision. Colliders passés en boîtes plates : la physique ne dépend plus de three. A révélé B-014 (traversée sur déplacement long), corrigé |
| T-002 | Harnais de test JS | 18 tests, 0,5 s, **zéro dépendance**. Lanceur natif Node, résolveur `three` vers la copie vendorée, exécution en CI (JS + Python) |

---

## Definition of Done

Une tâche n'est close que si **tout** est vrai :

- [ ] Le code respecte CODING_STANDARD.md
- [ ] Les tests sont écrits **et** passent
- [ ] Les seuils de performance tiennent
- [ ] La documentation concernée est à jour
- [ ] CHANGELOG.md est renseigné
- [ ] Aucune règle de dépendance violée
