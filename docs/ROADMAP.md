# ROADMAP — NOVA-7

> Ordonnée par **réduction de risque**, pas par confort de développement.
> On attaque toujours en premier ce qui peut invalider le reste.

## Jalon 0 — Lever l'incertitude (bloquant)

**Rien d'autre ne commence avant.** Le design entier repose sur une hypothèse
non mesurée : la latence de l'inférence open-vocabulary.

- [ ] Exécuter `tools/spike-detection/` sur la machine cible
- [ ] Consigner backend, temps de chargement, latence médiane et p90
- [ ] Reporter les chiffres dans PERFORMANCE.md
- [ ] **Décision** : OWLv2 tel quel · modèle quantifié · hybride COCO+CLIP
- [ ] Réviser SPEC.md si la médiane dépasse 1 s

> Si ce jalon échoue, on économise des mois. C'est tout son intérêt.

## Jalon 1 — Filet de sécurité

Aucune refonte ne commence sans tests : sinon on casse en silence ce qui marche.

- [ ] Harnais de test JS (exécution en CI, < 2 s)
- [ ] Verrouiller les 3 non-régressions connues (physique, portes, fusion)
- [ ] Seuils de performance bloquants en CI
- [ ] Squelette des modules et **règles de dépendance vérifiées automatiquement**

## Jalon 2 — Le cœur du jeu

Le système qui rend tout le reste possible. Testable sans caméra ni rendu.

- [ ] `perception/proprietes.js` + base curatée (~500 objets)
- [ ] `perception/affordances.js` (fonctions pures, couverture complète)
- [ ] Repli sémantique pour objets hors base
- [ ] **Test de résolubilité bloquant** (énigmes × foyer minimal ≥ 8)
- [ ] Grammaire d'énigmes et chargeur de salles

## Jalon 3 — Perception réelle

- [ ] Interface `detecteur` + implémentation OWLv2
- [ ] Détecteur COCO-SSD en repli
- [ ] Détecteur simulé pour les tests
- [ ] Cycle de vie caméra + indicateur de confidentialité
- [ ] Ergonomie du scanner **conçue autour de la latence mesurée au jalon 0**

## Jalon 4 — Migration de l'existant

- [ ] `physics/` (avec ses corrections et ses tests)
- [ ] `rendering/` (fusion statique, pool de lumières, HDRI, import de modèles)
- [ ] `audio/` (voix, repli synthèse)
- [ ] `input/` avec remappage
- [ ] Découpage de `world.js`

## Jalon 5 — Première salle irréprochable

Une seule salle, mais au niveau de finition final. Elle sert d'étalon : toutes
les suivantes doivent l'égaler.

- [ ] Salle 1 : géométrie, éclairage, audio, dialogue, énigme
- [ ] Tutoriel diégétique (aucun texte explicatif)
- [ ] Playtest sur 5 personnes n'ayant jamais vu le jeu
- [ ] **Porte de qualité** : 80 % la terminent sans aide

## Jalon 6 — Contenu

Les 11 salles restantes, par lots de 3, chaque lot playtesté avant le suivant.

- [ ] Salles 2-4 · propriétés de forme et matière
- [ ] Salles 5-7 · consommables, propriétés opposées
- [ ] Salles 8-10 · chaînes d'objets, électronique
- [ ] Salles 11-12 · prédicats complets, final

## Jalon 7 — Production

- [ ] Sauvegarde versionnée + migrations
- [ ] Localisation FR/EN complète
- [ ] Menus, options, accessibilité
- [ ] Musique adaptative
- [ ] Succès
- [ ] Empaquetage desktop
- [ ] Passe d'optimisation finale

## Hors périmètre v1

Modding, DLC, salles communautaires. L'architecture les autorise ; on ne les
construit pas maintenant.

---

## Règle de progression

**Aucun jalon ne démarre tant que le précédent n'est pas validé** :
tests au vert, documentation à jour, CHANGELOG écrit.
