# Documentation NOVA-7

Point d'entrée de la documentation. Chaque document a **un** rôle ; en cas de
contradiction, l'ordre ci-dessous fait autorité.

## Par ordre d'autorité

| # | Document | Répond à |
|---|---|---|
| 1 | [SPEC.md](SPEC.md) | Que construit-on, et pourquoi ? Périmètre, piliers, critères de réussite. |
| 2 | [GAMEPLAY.md](GAMEPLAY.md) | Comment un objet réel devient une solution ? Propriétés, affordances, énigmes. |
| 3 | [ARCHITECTURE.md](ARCHITECTURE.md) | Comment le code est-il organisé ? Modules, dépendances interdites, patterns. |
| 4 | [BALANCING.md](BALANCING.md) | Comment garantir qu'aucun joueur ne se bloque ? Foyer minimal, difficulté. |

## Pour développer

| Document | Répond à |
|---|---|
| [TASKS.md](TASKS.md) | Que faire **maintenant** ? |
| [ROADMAP.md](ROADMAP.md) | Dans quel ordre, et pourquoi cet ordre ? |
| [CODING_STANDARD.md](CODING_STANDARD.md) | Comment écrire le code ? |
| [TEST_PLAN.md](TEST_PLAN.md) | Que faut-il tester, et à quel niveau ? |
| [PERFORMANCE.md](PERFORMANCE.md) | Quels budgets, quels seuils bloquants ? |

## Par système

| Document | Système |
|---|---|
| [AI.md](AI.md) | Comportements des PNJ (à ne pas confondre avec la perception) |
| [SAVE_SYSTEM.md](SAVE_SYSTEM.md) | Sauvegarde, versions, migrations |
| [UI_GUIDELINES.md](UI_GUIDELINES.md) | Interface, accessibilité, retours |

## Suivi

| Document | Contenu |
|---|---|
| [../CHANGELOG.md](../CHANGELOG.md) | Ce qui a changé |
| [KNOWN_BUGS.md](KNOWN_BUGS.md) | Bugs ouverts et non-régressions à préserver |

---

## Règle d'or

**La documentation se met à jour dans le même commit que le code.**
Une documentation en retard est pire qu'absente : elle induit en erreur.
