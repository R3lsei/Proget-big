# TASKS — NOVA-7

> Tâches actives. Une seule fonctionnalité à la fois, validée avant la suivante.
> Vue d'ensemble : [ROADMAP.md](ROADMAP.md).

**Jalon courant : 0 — Lever l'incertitude**

---

## 🔴 En attente de vous

### T-001 · Exécuter le banc de mesure
**Bloque tout le reste.** Aucune ligne de gameplay ne sera écrite avant.

```bash
cd tools/spike-detection
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

1. Cliquer « Charger le modèle » (premier chargement long, c'est mesuré)
2. Activer la caméra, montrer quelques objets
3. Cliquer « Mesurer 10 inférences »
4. **Me communiquer le bloc « Chiffres à reporter »**

Ce que ça décide :
- médiane < 300 ms → scan instantané, ergonomie simple
- 300-1000 ms → scan à la demande + animation d'attente soignée
- \> 1000 ms → changement de modèle ou bascule sur l'approche hybride

---

## 🟡 Prêt à démarrer

| ID | Tâche | Dépend de |
|---|---|---|
| T-003 | Verrouiller les 3 non-régressions connues | T-002 ✅ |
| T-004 | Vérification automatique des règles de dépendance | T-002 ✅ |
| T-005 | Seuils de performance bloquants en CI | T-002 ✅ |

> T-003 exige d'extraire la résolution de collisions de `player.js` vers un
> module `physics/` indépendant de three : la logique porte sur des boîtes
> englobantes (six nombres), pas sur une bibliothèque de rendu. C'est à la fois
> le test de non-régression et le premier pas de la migration.

## ⚪ Jalon 2 — Le cœur du jeu

| ID | Tâche | Dépend de |
|---|---|---|
| T-010 | Vocabulaire de propriétés (gelé, versionné) | T-002 |
| T-011 | Base curatée ~500 objets français | T-010 |
| T-012 | Moteur d'affordances (fonctions pures) | T-010 |
| T-013 | Repli sémantique hors base | T-011, T-001 |
| T-014 | **Test de résolubilité bloquant** | T-012 |
| T-015 | Grammaire d'énigmes et chargeur de salles | T-012 |

---

## ✅ Terminé

| ID | Tâche | Résultat |
|---|---|---|
| T-000 | Conception validée (7 axes) | SPEC, GAMEPLAY, ARCHITECTURE écrits |
| T-000b | Faisabilité open-vocabulary | transformers.js v4.2.0 disponible, bundle autonome 510 Ko, WebGPU détecté |
| T-000c | Banc de mesure livré | `tools/spike-detection/`, zéro erreur JS |
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
