# CHANGELOG

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Versionnement [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté
- **Le vérificateur comprend l'espace** (T-028) : il ne connaissait que les
  objets. Il prouvait qu'une solution existe sans jamais vérifier qu'on peut
  l'**atteindre** — et c'est exactement là que se cassent les chambres à
  enchaînements :
  *l'outil qui sort la passerelle se trouve de l'autre côté de la passerelle.*
  Chaque exigence a une solution, la salle n'en a aucune, et le filet annonçait
  « franchissable ».
  Une chambre déclare désormais ses zones et ce qui en ouvre l'accès. La
  vérification calcule un point fixe : avec ce qu'on atteint, qu'active-t-on ;
  avec ce qu'on active, qu'atteint-on de plus. La croissance étant monotone, le
  calcul termine toujours.
  Il reste volontairement permissif là où il le faut : une passerelle sortie le
  reste, donc un objet placé au-delà est récupérable et compte comme solution.
  Une barrière qui crie à tort finit contournée.
- **Terminaux piratables et passerelles** (T-026) : un terminal se déclenche par
  une **action** et reste **enclenché**, là où un réceptacle se maintient par une
  présence. La distinction n'est pas cosmétique : les confondre obligerait le
  joueur à rester planté devant la console, téléphone en main, pendant que la
  passerelle est sortie — donc à ne jamais pouvoir l'emprunter.
  Une passerelle rétractable ne devient un sol qu'une fois déployée ; son
  collider n'existe pas avant.
  Deux voies pour un même pont : la console exige un appareil programmable, le
  boîtier seulement de quoi ponter deux contacts. Un joueur sans téléphone n'est
  donc jamais bloqué — c'est la règle des solutions multiples appliquée au
  piratage.
- **Inventaire des objets scannés** (T-027) : un objet montré à la caméra reste
  acquis pour toute la partie. Aller chercher un couteau est un geste physique ;
  l'exiger deux fois est une punition, pas une mécanique.
  Le nombre d'objets **matérialisés en même temps** est plafonné à deux, la
  collection ne l'étant pas. Sans ce plafond, une chambre qui force à choisir
  quelle plaque lester n'exige plus rien : on invoque autant de briques que
  nécessaire. Un dépassement refuse la nouvelle invocation plutôt que de retirer
  la plus ancienne — voir un objet disparaître d'une plaque parce qu'on en a
  invoqué un autre ailleurs serait incompréhensible.
  La sauvegarde n'écrit que des noms : recopier les propriétés figerait une
  partie sur une version périmée du vocabulaire.
- **Le jeu tourne** (T-025) : le joueur est branché sur les chambres. Se
  déplacer, regarder, sauter, prendre et poser. La boucle complète est vérifiée
  dans un vrai navigateur : marcher jusqu'à la brique, la porter sur la plaque,
  la porte s'ouvre et se franchit. Tous les modules existaient et étaient testés
  séparément ; c'est leur enchaînement qui n'avait jamais tourné.
- **Chambres déclarées** (T-022) : une seule déclaration par chambre, lue par
  deux programmes qui n'ont rien à voir — le bâtisseur 3D la construit, le
  vérificateur de résolubilité la prouve franchissable. Ailleurs, le niveau et
  sa validation vivent dans deux fichiers : on déplace un objet dans l'un, on
  oublie l'autre, et la salle validée n'est plus celle qu'on joue. Ici il n'y a
  rien à synchroniser.
  Deux chambres existent, bâties et prouvées : la salle de réveil et la serre
  abandonnée. La barrière anti-blocage protège enfin de vraies salles au lieu de
  tourner à vide.
  Les boîtes de collision sont dérivées de la géométrie réellement posée, jamais
  redéclarées : un mur qu'on voit est un mur qui arrête, et l'ouverture d'une
  porte reste franchissable. La position de départ est calculée, pas écrite —
  une position à la main finit dans une cloison au premier redimensionnement.
- **Végétation à base de vrais modèles** (T-021) : le feuillage procédural a été
  tenté trois fois et a donné, dans l'ordre, du confetti vert, un feu d'artifice
  et des roseaux clairsemés. La structure était juste, l'approche ne l'était pas :
  une plante générée par formule ne fait pas illusion.
  Chaîne d'assets établie de bout en bout — récupération de modèles libres,
  simplification, compression Draco et WebP, instanciation. La plante passe de
  5,8 Mo à 1,1 Mo, et sa version lointaine à 516 Ko pour 12 % des triangles :
  répéter le modèle détaillé au fond d'une salle coûtait 5,7 millions de
  triangles pour des plantes hautes de quinze pixels.
  Un massif coûte un appel de dessin par partie du modèle, jamais un par plante.
  Les licences sont vérifiées par un test : l'oubli de déclarer la version
  dérivée en CC-BY a été rattrapé dix minutes après avoir été commis.
- **Direction artistique et kit modulaire** (T-020) : refonte de la carte engagée,
  en chambres fermées style Portal, futuriste et végétalisé. Le lieu a deux états
  — cœur entretenu, périphérie envahie — et la progression bascule de l'un à
  l'autre : c'est le décor qui raconte depuis combien de temps le complexe tourne
  sans personne.
  Le changement technique décisif est l'éclairage : **un soleil unique traversant
  des verrières**, au lieu de vingt lampes ponctuelles. Une seule carte d'ombre au
  lieu de vingt, et des ombres portées franches — la correction du défaut le plus
  visible de l'ancienne carte, où chaque objet semblait collé au sol plutôt que
  posé dessus.
  Règle qui prime sur l'esthétique : le décor n'occulte jamais un élément
  interactif. Une liane devant une plaque de pression, et le joueur cherche pour
  une mauvaise raison sans jamais savoir pourquoi. Un test l'interdit.
- **Garantie de résolubilité** (T-014) : une salle impossible ne plante pas, ne
  lève rien, et ne se découvre qu'après des heures de jeu perdues — le joueur
  cherche une solution inexistante puis abandonne en se croyant en tort. Le
  vérificateur prouve qu'un chemin existe avec les seuls objets présents, et
  bloque la CI sinon. Il ne se contente pas de vérifier chaque exigence
  séparément : deux plaques à maintenir en même temps peuvent avoir la même
  unique brique pour solution, cas où chacune est satisfaisable mais pas
  l'ensemble. C'est un couplage maximal, avec relogement — une affectation
  gloutonne déclarerait insolubles des salles qui ne le sont pas.
  Au-delà de seize mécanismes, il refuse de conclure plutôt que d'annoncer une
  preuve qui n'en serait plus une. Sur une liste de salles vide, il annonce
  explicitement n'avoir rien vérifié : « zéro échec » n'est pas une preuve.
- **Portage d'objets** (T-019) : prendre, transporter et poser, ce qui rend
  jouables les mécanismes de T-018 — sans portage, une plaque de pression n'est
  qu'une règle qu'on ne peut pas déclencher. Objets contraints : pas de rotation
  ni de roulement, comme dans Portal et pour la même raison — un objet parti sous
  un décor rend la salle insoluble, et le joueur ne peut pas distinguer un bug de
  sa propre impasse. L'objet porté passe par le résolveur de collisions du joueur :
  impossible de traverser un mur en le poussant devant soi. Le lissage du suivi
  est indépendant de la fréquence d'images, sans quoi l'objet collerait à la vue
  à 120 FPS et traînerait à 60.
- **Mécanismes physiques** (T-018) : dix réceptacles — plaque de pression, borne
  de pontage, fente de lecteur, rail magnétique, cellule optique, déversoir… Ce
  second pilier de jeu se joue **sans aucun objet réel**, ce qui corrige une
  dépendance que la conception n'avait pas traitée : jusqu'ici, un joueur sans
  rien sous la main était bloqué.
  Les deux piliers n'en font qu'un : un réceptacle n'accepte pas « un cube », il
  accepte une condition sur des propriétés. Un cube du décor et une brique montrée
  à la caméra passent par la même règle, et le vocabulaire ne sert qu'une fois.
  La plaque de pression refuse le poids du joueur — sans quoi il suffirait de se
  tenir dessus, la porte s'ouvrirait, et il ne pourrait pas la franchir.
- **Moteur d'affordances** (T-012) : 25 actions déduites des seules propriétés
  physiques. Aucune règle ne nomme un objet — un tournevis crochète parce qu'il
  est mince et allongé, pas parce qu'une ligne le dit. Les conditions sont des
  **données** et non des fonctions : elles se traduisent en indices (« il vous
  faut quelque chose de mince, allongé et pas lourd »), s'inversent pour vérifier
  qu'une énigme a une solution, et se relisent. Une gradation de qualité permet à
  l'objet improvisé de fonctionner sans valoir l'outil idéal, ce qui récompense
  l'ingéniosité sans jamais transformer une bonne idée en impasse.
- **Base curatée d'objets français** (T-011) : 408 objets en 9 catégories
  relisibles séparément, 444 entrées interrogeables avec les synonymes. Chaque
  objet est décrit par ses propriétés physiques, jamais par ses usages. La
  recherche absorbe casse, accents, articles et pluriels, parce que le libellé
  vient de trois sources qui n'écrivent pas pareil. Un test garantit que chaque
  propriété du vocabulaire est portée par au moins un objet : sans lui, une
  affordance pourrait devenir inatteignable et rendre une énigme insoluble.
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
- **Grammaire de conditions déplacée vers le socle** (`utils/conditions.js`).
  Écrite pour les affordances, elle s'est révélée valable pour tout ensemble de
  faits : une porte qui s'ouvre sur deux plaques enfoncées s'écrit exactement
  comme une règle d'objet, et s'explique avec la même fonction. La laisser dans
  `perception/` aurait forcé le gameplay à dépendre de la perception pour une
  simple structure logique. Aucun comportement changé, 106 tests toujours verts.
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
- **Mécanismes jamais activés en jeu** (B-022) : `receptaclesActifs` cherchait le
  type du réceptacle sous le nom de son INSTANCE. Une chambre nomme ses
  mécanismes librement — « plaque_gauche » — et ce nom n'existe évidemment pas
  dans le catalogue des types : la plaque ne s'activait jamais, sans message.
  Invisible jusqu'au premier assemblage complet, parce que les tests unitaires
  nommaient les instances comme leur type et masquaient la confusion.
- **Déplacement dépendant de la fréquence d'images** (B-023) : chaque image
  appliquait un pas borné, si bien qu'une machine lente déplaçait le joueur
  moins vite en temps réel — 0,84 m parcourus au lieu de 3,50 lors du premier
  essai en navigateur. Remplacé par un pas de simulation fixe, découplé de
  l'affichage.
- **Deux conventions cardinales contradictoires** (B-020) : « nord » désignait
  +Z pour placer les murs et −Z pour orienter le joueur. Résultat : le joueur
  démarrait collé à la porte de sortie et regardait dedans. Une seule normale
  sert désormais à placer le mur, poser la porte et orienter le regard.
- **Décor placé hors de la pièce** (B-021) : les positions de décor de la serre
  étaient écrites en mètres alors que le format est en modules de 1,2 m. Le
  lierre se retrouvait à sept mètres du centre dans une pièce qui s'arrête à six,
  donc encastré dans le mur — où il bloquait le passage.
- **Dix objets réels sans aucun usage** (B-017) : plateau, assiette, planche à
  découper, ruban adhésif, interrupteur et cinq autres étaient reconnus puis
  rejetés — l'instant exact où le joueur cesse de croire au système. Deux causes :
  deux actions manquaient au moteur (`se protéger`, `attiser`) et sept objets
  avaient des propriétés physiques oubliées. Trouvé par un test, pas en jeu.
- **Branche de règle morte dans `couper`** (B-018) : la condition acceptait
  `tranchant et (rigide ou cassant)`, mais aucun objet réel n'est tranchant *et*
  cassant — un verre ne coupe qu'une fois brisé. La branche anticipait une
  transformation inexistante (T-017) et n'était donc jamais exécutée.
- **Indice trompeur sur les conditions imbriquées** (B-019) : « magnétique ou
  électronique et communicant » se lisait à l'envers de la règle. Les
  sous-conditions composées sont désormais parenthésées.
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
