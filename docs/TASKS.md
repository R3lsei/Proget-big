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
| T-015 | Grammaire d'énigmes et chargeur de salles | T-012 ✅ |
| T-017 | Transformation d'objets (briser un objet cassant → tesson tranchant) | T-012 ✅ |
| T-023 | Espèces manquantes : lianes et mousses pour les zones envahies | T-021 ✅ |
| T-024 | Textures de matières et occlusion ambiante | T-020 ✅ |

---

## ✅ Terminé

| ID | Tâche | Résultat |
|---|---|---|
| T-031 | **Le jeu se lance sans rien installer** | Trois livraisons de suite ont échoué au LANCEMENT — écran gris, page 404, Python absent — pendant que 296 tests passaient au vert. Le jeu était juste et injouable, et c'est le joueur qui a fait la QA, capture par capture. Serveur de secours en PowerShell pur (`TcpListener`, donc aucun droit administrateur requis) : plus aucune installation exigée sur Windows. Et surtout `npm run lancement`, qui démarre les deux serveurs pour de vrai et réclame la page **plus les 28 modules qu'elle charge** — un import cassé donnait un écran gris muet, il donne une ligne rouge. Bloquant en CI. 5 mutations sur 5 détectées, après réécriture d'un test non discriminant : `fetch` normalise `/../` avant l'envoi, si bien que la vérification anti-remontée passait quoi qu'il arrive |
| T-001 | Banc de mesure hors-ligne | **Abandonné.** Trois tentatives, aucune mesure obtenue : session ONNX refusée, puis page servie depuis le cache. Le coût a dépassé le bénéfice. Remplacé par T-016, qui mesure la même chose sans rien demander au joueur. Le banc reste dans `tools/` pour qui veut. Décision assumée : on conçoit pour le pire cas (scan lent), l'ergonomie s'adapte à la mesure réelle |
| T-000 | Conception validée (7 axes) | SPEC, GAMEPLAY, ARCHITECTURE écrits |
| T-000b | Faisabilité open-vocabulary | transformers.js v4.2.0 disponible, bundle autonome 510 Ko, WebGPU détecté |
| T-000c | Banc de mesure livré | `tools/spike-detection/`, zéro erreur JS |
| T-030 | **La caméra est branchée** | Chaîne complète : webcam → détection → base curatée → sacoche → matérialisation. Vérifiée en navigateur avec une webcam simulée : montrer un téléphone, l'invoquer, le prendre, pirater la console, voir le pont sortir. **Aucun objet de la serre n'est programmable** — cette console ne s'ouvre qu'à la caméra, et pourtant la salle reste franchissable sans elle par le boîtier. 18 tests, dont celui qui interdit qu'une chambre exige la caméra |
| T-029 | Gouffre réel et restauration | Les zones étaient purement logiques : le vérificateur jurait que la plate-forme exigeait le pont, et le joueur y marchait sur un sol plein. Le gouffre est désormais creusé, donc la séparation est physique. Tout ce qui y tombe remonte — objet à sa place, joueur au départ, objet invoqué rendu à l'inventaire. Supprimer la classe de problème plutôt que prouver qu'elle n'arrive jamais. 11 tests ; mutation, 7 sur 7 |
| T-028 | **Le vérificateur comprend l'espace** | Point fixe de progression : avec ce qu'on atteint, qu'active-t-on ; avec ce qu'on active, qu'atteint-on de plus. Attrape le piège des chaînes de mini-épreuves — l'outil qui sort la passerelle placé de l'autre côté de la passerelle. Sans lui, la salle était annoncée franchissable et ne l'était pas. 8 tests ; mutation, 5 sur 5 après correction d'un test non discriminant |
| T-027 | Inventaire des objets scannés | Un objet montré reste acquis pour toute la partie — le remontrer serait une punition, pas une mécanique. Plafond de 2 matérialisations simultanées : sans lui, une énigme d'arbitrage n'exige plus rien. La sauvegarde n'écrit que des noms, jamais les propriétés. 17 tests |
| T-026 | Terminaux piratables et passerelles | Mécanisme déclenché par une ACTION et **verrouillé**, distinct du réceptacle maintenu par une présence. Une passerelle rétractable devient franchissable une fois sortie, et son collider n'existe que déployé. Deux voies pour un même pont : console (programmable) ou boîtier (conducteur), pour qu'un joueur sans appareil ne soit jamais bloqué. Vérificateur étendu — il aplatit les passerelles en la condition qui les sort. 6 tests ; mutation, 6 sur 6 après correction d'un test non discriminant |
| T-025 | **Le jeu tourne** | Joueur branché sur les chambres : ZQSD, souris, saut, prendre/poser. Boucle complète vérifiée en navigateur — marcher jusqu'à la brique, la poser sur la plaque, voir la porte s'ouvrir, la franchir. 15 tests dont l'intégration de bout en bout. A révélé le défaut de type/instance et un déplacement dépendant de la fréquence d'images |
| T-022 | Chambres déclarées | **Un fichier, deux lecteurs** : la même déclaration nourrit le bâtisseur 3D et le vérificateur de résolubilité. Rien à synchroniser, donc rien à oublier. Deux chambres réelles bâties et prouvées. La barrière anti-blocage protège désormais de vraies salles. Colliders dérivés de la géométrie posée, position de départ calculée. 16 tests ; a trouvé deux conventions cardinales contradictoires et un décor placé hors de la pièce |
| T-021 | Végétation à base de vrais modèles | Chaîne complète établie : récupération de modèles libres, simplification, compression Draco + WebP, instanciation. Plante en pot 5,8 Mo → 1,1 Mo, version lointaine à 12 % → 516 Ko. Un massif coûte un appel de dessin par partie du modèle, pas un par plante. Crédits vérifiés par test — l'oubli d'une licence sur la version dérivée a été rattrapé en dix minutes. 11 tests |
| T-020 | Kit modulaire et direction artistique | Refonte de la carte engagée : grille de 1,2 m, panneaux à joints creux, verrières, un soleil unique porteur d'ombres à la place de vingt lampes ponctuelles. Deux états du lieu — cœur soigné, périphérie envahie. Palette gelée en trois familles. 24 tests verrouillant les invariants invisibles à l'œil : matériaux partagés, feuillage instancié, décor déterministe, lierre plaqué. **Végétation encore insuffisante** — voir T-021 |
| T-014 | **Résolubilité bloquante** | Prouve qu'une salle est franchissable avec ses seuls objets. Le cœur n'est pas une suite de vérifications mais un **couplage maximal** : deux plaques simultanées peuvent avoir la même unique brique pour solution — chacune satisfaisable, l'ensemble non. Refuse de conclure au-delà de 16 mécanismes plutôt que d'annoncer une preuve non exhaustive. Branché en CI (`npm run verifier`), bloquant au même titre qu'un test. 22 tests ; mutation, 7 régressions sur 7 détectées après correction d'un test non discriminant |
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
