# ARCHITECTURE — NOVA-7

> Comment le code est organisé, et surtout : **quelles dépendances sont interdites**.

## 1. Principe directeur

Le code est découpé par **responsabilité**, pas par type de fichier. Chaque
module expose une interface étroite et ignore l'existence des autres, sauf
dépendance déclarée ci-dessous.

La règle qui compte : **les dépendances vont toujours vers le bas.** Un module
ne connaît jamais un module d'un étage supérieur.

```
┌─────────────────────────────────────────────────────────┐
│  app/          amorçage, boucle principale, assemblage  │
├─────────────────────────────────────────────────────────┤
│  ui/    quest/   dialogue/   save/                      │  présentation
├─────────────────────────────────────────────────────────┤
│  gameplay/   inventory/   perception/   ai/             │  règles du jeu
├─────────────────────────────────────────────────────────┤
│  rendering/  physics/  audio/  input/  animation/       │  services
├─────────────────────────────────────────────────────────┤
│  core/       utils/                                     │  socle
└─────────────────────────────────────────────────────────┘
```

## 2. Les modules

| Module | Responsabilité | Ne connaît jamais |
|---|---|---|
| `core/` | Bus d'événements, machine à états, horloge, journal, conteneur de services | tout le reste |
| `utils/` | Maths, structures, grammaire de conditions, aides pures. **Aucun état.** | tout le reste |
| `perception/` | Caméra, inférence, propriétés, affordances | rendu, UI, gameplay |
| `gameplay/` | Énigmes, prédicats, règles de résolution, progression | rendu, UI |
| `inventory/` | Objets matérialisés, consommation, état | rendu, UI |
| `rendering/` | Three.js, scène, matériaux, fusion statique, HDRI | gameplay, UI |
| `physics/` | Collisions, gravité, déplacement | rendu, gameplay |
| `input/` | Clavier, souris, verrouillage pointeur, remappage | tout sauf `core` |
| `audio/` | Musique adaptative, SFX, voix | gameplay |
| `animation/` | Interpolations, cycles, machines d'anim | gameplay |
| `ai/` | Machines à états des PNJ | rendu |
| `quest/` | Chapitres, objectifs, déblocages | rendu |
| `dialogue/` | Répliques, sous-titres, déclencheurs | rendu |
| `save/` | Sérialisation, versions, migrations | rendu |
| `ui/` | HUD, menus, scanner, inventaire | gameplay (via événements uniquement) |
| `app/` | Assemble tout. Le seul module autorisé à tout connaître | — |

## 3. La règle de communication

**L'UI ne lit jamais l'état du gameplay directement.** Elle écoute des
événements et émet des intentions. C'est ce qui permet de refondre entièrement
l'interface sans toucher aux règles du jeu.

```js
// ✗ INTERDIT — l'UI fouille dans le gameplay
if (gameplay.puzzles.current.solved) { afficherVictoire(); }

// ✓ CORRECT — l'UI réagit à un fait déclaré
bus.on('enigme:resolue', ({ id, objetUtilise }) => afficherVictoire(objetUtilise));
```

Le bus d'événements est dans `core/`. Les noms d'événements sont déclarés dans
un seul fichier (`core/evenements.js`) : pas de chaîne magique dispersée.

## 4. Le module `perception/` en détail

C'est le module le plus critique et le plus susceptible de changer (modèle
d'IA, seuils, backend). Il est donc le plus strictement isolé.

```
perception/
  camera.js         acquisition du flux, cycle de vie, indicateur de confidentialité
  detecteur.js      interface abstraite : image → [{ label, score, boite }]
  detecteurs/
    owlv2.js        implémentation open-vocabulary (par défaut)
    cocossd.js      implémentation de repli, 80 classes
  proprietes.js     label → propriétés (base curatée + repli sémantique)
  affordances.js    propriétés → affordances (règles pures, testables sans IA)
  base/
    objets.fr.json  ~500 objets courants et leurs propriétés
```

**Point clé** : `affordances.js` est une fonction pure. Elle se teste sans
caméra, sans modèle, sans navigateur — donc en CI, instantanément. C'est là que
vit la logique de jeu, pas dans le détecteur.

Changer de modèle d'IA = écrire un fichier dans `detecteurs/`. Aucun autre
module ne bouge.

## 5. Patterns retenus (et pourquoi)

| Pattern | Où | Justification |
|---|---|---|
| **Stratégie** | `detecteurs/` | Permet de changer de modèle sans toucher au jeu, et de tester avec un détecteur simulé. |
| **Observateur** | bus d'événements | Découple UI et gameplay. |
| **Machine à états** | `ai/`, `core/` | Comportements PNJ lisibles et débogables. Pas de behaviour tree tant qu'un état simple suffit. |
| **Fabrique** | `rendering/props` | Un point unique décide entre modèle importé et procédural. |
| **Commande** | `input/` | Rend le remappage et le rejeu de session triviaux. |

Patterns **écartés** : ECS (surdimensionné pour ~50 entités, coût cognitif
disproportionné), injection de dépendances complète (un conteneur simple suffit).

## 6. Ce qu'on garde de l'existant

Décision validée : restructurer, ne pas réécrire. Ces systèmes sont éprouvés et
migrent tels quels, avec leurs tests.

| Acquis | Vers | Pourquoi le garder |
|---|---|---|
| Moteur de règles capacités | `perception/affordances.js` | La bonne idée du prototype, à généraliser |
| Résolution de collisions par axe | `physics/` | Corrige une éjection hors carte due à un résidu flottant |
| Correction des colliders de portes | `physics/` | `setFromObject` ignorait la matrice parente |
| Fusion des géométries statiques | `rendering/` | −76 % d'appels de dessin, mesuré |
| Pool de lumières | `rendering/` | Coût de shader constant |
| Pipeline de voix | `audio/` | Fonctionne, avec repli synthèse |
| Import de modèles + DRACO | `rendering/` | Fonctionne, avec repli procédural |

## 7. Dette technique connue et assumée

| Point | Décision |
|---|---|
| Aucun test JS aujourd'hui | **Corrigé en priorité 1.** Voir TEST_PLAN.md |
| Modèles IA chargés depuis un CDN externe | Accepté en v1 web ; empaquetés en version desktop |
| `world.js` fait 1000+ lignes | Découpé lors de la migration vers `rendering/` |
| Textes en dur en français | Externalisés dès la mise en place de la localisation |
