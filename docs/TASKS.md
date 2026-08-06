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
| T-013 | Repli sémantique hors base | T-011 ✅ |
| T-016 | Mesure embarquée de la latence de scan | T-012 ✅ |
| T-014 | **Test de résolubilité bloquant** | T-012 ✅ |
| T-015 | Grammaire d'énigmes et chargeur de salles | T-012 ✅ |
| T-017 | Transformation d'objets (briser un objet cassant → tesson tranchant) | T-012 ✅ |

---

## ✅ Terminé

| ID | Tâche | Résultat |
|---|---|---|
| T-001 | Banc de mesure hors-ligne | **Abandonné.** Trois tentatives, aucune mesure obtenue : session ONNX refusée, puis page servie depuis le cache. Le coût a dépassé le bénéfice. Remplacé par T-016, qui mesure la même chose sans rien demander au joueur. Le banc reste dans `tools/` pour qui veut. Décision assumée : on conçoit pour le pire cas (scan lent), l'ergonomie s'adapte à la mesure réelle |
| T-000 | Conception validée (7 axes) | SPEC, GAMEPLAY, ARCHITECTURE écrits |
| T-000b | Faisabilité open-vocabulary | transformers.js v4.2.0 disponible, bundle autonome 510 Ko, WebGPU détecté |
| T-000c | Banc de mesure livré | `tools/spike-detection/`, zéro erreur JS |
| T-019 | Portage d'objets contraints | Prendre, transporter, poser. Réutilise le résolveur de collisions de T-003 : un objet porté ne traverse pas un mur, et rompt s'il reste bloqué plutôt que d'être tenu à travers la géométrie. Lissage indépendant de la fréquence d'images — même geste à 60 et à 120 FPS. Aimantation sur réceptacle sans rien accorder sur la condition. 25 tests ; mutation, 7 régressions sur 7 détectées après correction d'un test non discriminant |
| T-018 | Mécanismes physiques | 10 réceptacles (plaque de pression, borne de pontage, fente, rail magnétique, cellule optique…) exprimés dans le même vocabulaire de propriétés que les affordances : un cube du décor et une brique montrée à la caméra passent par la même règle. La grammaire de conditions, sortie vers `utils/`, sert désormais aussi aux circuits de portes — une porte s'écrit comme une affordance, sans code nouveau. 24 tests ; mutation, 5 régressions sur 5 détectées |
| T-012 | Moteur d'affordances | 25 actions déduites de règles déclaratives, jamais d'une table objet → usage. Conditions en données : elles s'expliquent au joueur, s'inversent pour le test de résolubilité, et se relisent. Gradation de qualité pour que l'objet improvisé fonctionne sans valoir l'outil idéal. 31 tests, dont 5 confrontant les règles à la base réelle — ils ont trouvé une branche morte et 10 objets sans usage. Verrouillage vérifié par mutation, 6 régressions sur 6 détectées |
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
