# CHANGELOG

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Versionnement [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté
- **Vocabulaire de propriétés physiques** (T-010) : 30 propriétés observables en
  7 familles, socle du passage `objet → propriétés → affordances`. Une propriété
  décrit un fait vérifiable (`tranchant`), jamais un usage (`peutCouper`) : c'est
  ce qui permettra à un objet jamais prévu d'être utile. Chaque propriété porte
  un critère formulé en question fermée, contrat commun à la base curatée et au
  repli sémantique. Gelé en profondeur, versionné, 21 tests dont une empreinte
  exacte de la liste.
- **Module de physique indépendant** (T-003) : la résolution de collisions
  quitte `player.js` pour `physics/`, opérant sur des boîtes de six nombres
  plutôt que sur des `THREE.Box3`. La physique ne dépend plus du rendu et se
  teste en millisecondes. 15 tests verrouillent B-001.
- **Harnais de test JavaScript** (T-002) : 18 tests en 0,5 s, sans aucune
  dépendance de développement. Lanceur natif de Node, résolveur du spécificateur
  `three` vers la copie vendorée du jeu, exécution automatique en CI pour
  JavaScript et Python. Première suite : le moteur de règles objet → capacités,
  verrouillé avant sa migration vers `perception/affordances.js`.
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
- **Le banc de mesure ne bloque plus le développement** (T-001 abandonné). Trois
  tentatives, aucune mesure obtenue : le coût a dépassé le bénéfice. Le jeu est
  désormais conçu pour le pire cas — scan lent, animation d'attente soignée — et
  mesurera lui-même sa latence en cours de partie (T-016). La durée d'animation
  devient un paramètre ajusté à l'exécution, pas une hypothèse figée dans le code.
  Le banc reste disponible dans `tools/` pour qui veut le lancer.
- **Appels de dessin : 1414 → 337** (−76 %) par fusion des géométries statiques
  zone par zone. Maillages en scène : 844 → 213.
- Refonte visuelle : laboratoire blanc lumineux remplaçant l'ambiance sombre.
- Props modélisés à partir de primitives assemblées à arêtes biseautées.
- Lumières : 25 sources → pool de 6 suivant le joueur, coût de shader constant.

### Corrigé
- **Banc de mesure servi depuis le cache du navigateur** (B-015) : `mesurer.py`
  n'envoyait aucun en-tête de cache, laissant le navigateur appliquer une
  fraîcheur heuristique et resservir une version périmée sans même revalider.
  Un correctif livré paraissait alors sans effet. Corrigé par `no-store` côté
  serveur *et* par un paramètre d'URL unique à chaque lancement — le premier
  seul ne suffit pas, puisqu'il n'agit que sur les réponses qui partent
  réellement. Une estampille de version est désormais affichée sur la page.
- **Échec de chargement du modèle sans repli ni diagnostic** (B-016) : le banc
  ne tentait qu'une configuration et tronquait le message d'erreur à 60
  caractères, ce qui ne laissait voir qu'un chemin de compilation d'ONNX
  Runtime. Il descend maintenant une échelle de quatre combinaisons
  matériel/précision et journalise chaque refus en entier.
- **Traversée d'obstacle sur déplacement long** (B-014) : trouvé par les tests
  de T-003, jamais observé en jeu. Un pas plus long que le gabarit du joueur
  franchissait un mur sans le détecter — invisible à 120 FPS, atteignable sur
  un à-coup de 100 ms. Corrigé par découpage en sous-pas.
- **Joueur éjecté hors de la carte** après avoir coupé ses liens (B-001).
- Fusion de géométries silencieusement inopérante sur groupes mixtes (B-002).
- Matériaux clonés empêchant toute fusion (B-003).
- Fusion globale supprimant l'élimination hors champ (B-004).
- Plantage au démarrage sur Firefox (B-007).
- Panneau du scanner débordant sur écran court (B-006).

### Connu
Voir [KNOWN_BUGS.md](docs/KNOWN_BUGS.md).
