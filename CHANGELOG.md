# CHANGELOG

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Versionnement [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté
- **Conception NOVA-7 validée** sur sept axes : périmètre 4-6 h, détection
  open-vocabulary, structure puzzle-box, plateforme web puis desktop, système
  de propriétés hybride, garantie de résolubilité, restructuration sans réécriture.
- **Banc de mesure de détection** (`tools/spike-detection/`) : mesure sur la
  machine cible le temps de chargement du modèle, la latence d'inférence et la
  justesse. Bundle autonome transformers.js + onnxruntime-web (510 Ko).
- **Documentation de conception** : SPEC, GAMEPLAY, ARCHITECTURE, BALANCING,
  TEST_PLAN, PERFORMANCE, ROADMAP, TASKS, SAVE_SYSTEM, AI, UI_GUIDELINES,
  CODING_STANDARD, KNOWN_BUGS.
- Import de modèles 3D (`.glb`/`.gltf`) avec décodeurs DRACO et meshopt,
  mise à l'échelle et positionnement automatiques, repli procédural.
- Éclairage par image d'environnement : HDRI de laboratoire réel.
- Intégration ElevenLabs : doublage des 74 répliques, avec repli sur la
  synthèse du navigateur. Deux parcours : clé API ou téléchargement manuel.
- Assistant guidé d'installation des voix, lanceurs cliquables.
- Énigme du clavier à code : le joueur déduit le code d'une devinette.
- Épreuve de la conduite de vapeur et secret du casier du gardien.

### Modifié
- **Appels de dessin : 1414 → 337** (−76 %) par fusion des géométries statiques
  zone par zone. Maillages en scène : 844 → 213.
- Refonte visuelle : laboratoire blanc lumineux remplaçant l'ambiance sombre.
- Props modélisés à partir de primitives assemblées à arêtes biseautées.
- Lumières : 25 sources → pool de 6 suivant le joueur, coût de shader constant.

### Corrigé
- **Joueur éjecté hors de la carte** après avoir coupé ses liens (B-001).
- Fusion de géométries silencieusement inopérante sur groupes mixtes (B-002).
- Matériaux clonés empêchant toute fusion (B-003).
- Fusion globale supprimant l'élimination hors champ (B-004).
- Plantage au démarrage sur Firefox (B-007).
- Panneau du scanner débordant sur écran court (B-006).

### Connu
Voir [KNOWN_BUGS.md](docs/KNOWN_BUGS.md).
