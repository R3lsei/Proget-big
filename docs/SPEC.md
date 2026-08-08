# SPEC — NOVA-7

> Spécification produit. Décrit **ce que** nous construisons et **pourquoi**.
> Le « comment » est dans [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Le produit en une phrase

Un jeu d'énigmes à la première personne où le joueur résout les obstacles en
**montrant à sa webcam de vrais objets de son domicile**, que le jeu reconnaît,
analyse et matérialise.

## 2. Les trois piliers

Toute décision de design doit servir au moins un pilier. Une fonctionnalité qui
n'en sert aucun est coupée, quelle que soit sa qualité.

| Pilier | Ce que ça signifie concrètement |
|---|---|
| **P1 — Le réel entre dans le jeu** | La caméra n'est pas un gadget : c'est le seul moyen d'agir sur le monde. Aucune énigme ne se résout sans objet réel. |
| **P2 — Le jeu raisonne, il ne compare pas** | Le jeu ne cherche pas « une clé ». Il cherche « quelque chose de rigide, fin et allongé ». Le joueur est récompensé d'avoir compris le problème, pas d'avoir deviné l'objet attendu. |
| **P3 — Aucun joueur ne reste bloqué** | Toute énigme est résoluble avec au moins 8 objets du **foyer minimal** (voir BALANCING.md). Vérifié automatiquement en intégration continue. |

## 3. Public et positionnement

- **Cible** : joueurs de puzzle games narratifs (Portal, The Room, Return of the Obra Dinn). 25-45 ans, jouent seuls, aiment comprendre un système.
- **Argument de vente** : la mécanique se démontre en 10 secondes dans un GIF. C'est un atout viral rare — la plateforme web sert cette démonstration.
- **Durée** : 4 à 6 heures, 12 salles.

## 4. Périmètre

### Dans la v1

- Détection open-vocabulary (n'importe quel objet, pas une liste figée)
- Système de propriétés physiques et d'affordances
- 12 salles conçues à la main, progression narrative
- Doublage FR/EN, sous-titres obligatoires
- Sauvegarde automatique versionnée
- Version web (démo) + version empaquetée (vente)

### Explicitement hors périmètre

| Coupé | Raison |
|---|---|
| Multijoueur, réseau, anti-triche | Ne sert aucun pilier. Coût supérieur à la boucle principale entière. |
| Économie, crafting, boutique | Dilue P2 : transforme un jeu de raisonnement en jeu de collection. |
| Génération procédurale de niveaux | La variation vient déjà du réel (P1). Générer des énigmes cohérentes est un problème non résolu. |
| DLC | Décision post-lancement, pas un objectif de conception. |
| Modding | Reporté après v1. L'API de salles est conçue pour, mais non publiée. |

## 5. Contraintes non négociables

**Vie privée.** Aucune image de la caméra ne quitte la machine. L'inférence est
locale. Un indicateur visible signale toute activité caméra. Le consentement est
explicite et révocable. C'est une exigence légale (RGPD) *et* un argument de vente.

**Accessibilité.** Sous-titres pour tout contenu parlé. Remappage complet des
commandes. Contrastes conformes WCAG AA minimum sur l'interface. Aucune énigme
ne repose sur la perception des couleurs seule.

**Performance.** Voir [PERFORMANCE.md](PERFORMANCE.md). L'inférence ne doit
jamais tourner pendant que le joueur se déplace.

## 6. Critères de réussite

La v1 est considérée réussie si :

1. Un joueur qui n'a jamais vu le jeu résout la première salle sans aide écrite.
2. Aucun blocage rapporté en playtest sur 10 sessions complètes.
3. 120 FPS tenus en déplacement sur la machine de référence (voir PERFORMANCE.md).
4. Le taux de joueurs qui terminent la première salle dépasse 80 % (rétention du tutoriel).
5. Au moins 30 % des résolutions observées en playtest utilisent un objet
   non anticipé par le concepteur — preuve que P2 fonctionne.

## 7. Risque principal identifié

**La latence d'inférence n'est pas mesurée.** Tout le design du scanner en
dépend. Aucune ligne de code de gameplay ne sera écrite avant l'exécution du
banc de mesure (`tools/spike-detection/`). Si la médiane dépasse 1 s, le design
du scanner change et cette spécification est révisée.
