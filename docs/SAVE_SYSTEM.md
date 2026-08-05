# SAVE_SYSTEM — NOVA-7

> Une sauvegarde qui casse au premier correctif est pire que pas de sauvegarde.
> Le versionnement est prévu **dès la v1**, pas ajouté après le premier incident.

## 1. Principes

1. **Sauvegarde automatique** à chaque salle terminée. Aucun bouton à penser.
2. **Format versionné** avec migrations écrites dès le premier schéma.
3. **Tolérante à la corruption** : une sauvegarde illisible ramène au début de
   la salle, jamais à un écran d'erreur.
4. **On sauvegarde la progression, pas la scène** : quelles énigmes sont
   résolues, pas la position exacte de chaque objet.

## 2. Ce qu'on sauvegarde

```jsonc
{
  "version": 1,
  "cree": "2026-08-05T14:00:00Z",
  "modifie": "2026-08-05T15:12:00Z",
  "progression": {
    "salle": 7,
    "enigmesResolues": ["s1_liens", "s2_porte", "s3_camera"],
    "proprietesEnseignees": ["tranchant", "rigide", "allonge", "liquide"]
  },
  "inventaire": [
    { "label": "ciseaux", "proprietes": ["tranchant", "rigide"], "usages": null }
  ],
  "statistiques": {
    "tempsDeJeu": 4820,
    "objetsScannes": 23,
    "solutionsNonAnticipees": 4
  },
  "options": { "langue": "fr", "sousTitres": true, "sensibilite": 1.0 }
}
```

**Ce qu'on ne sauvegarde pas** : positions des props, état du rendu, images de
la caméra. La scène est reconstruite depuis la progression.

**Aucune image, aucun descripteur biométrique n'est jamais écrit sur disque.**
Seule l'étiquette textuelle de l'objet est conservée.

## 3. Migrations

Chaque montée de version fournit une fonction de migration. Elles s'enchaînent :
une sauvegarde v1 lue par un jeu v4 traverse 1→2→3→4.

```js
const MIGRATIONS = {
  1: (s) => s,
  2: (s) => ({ ...s, version: 2, statistiques: s.statistiques ?? valeursParDefaut() }),
};
```

**Règle** : on n'édite jamais une migration déjà livrée. On en ajoute une.

## 4. Corruption

| Cas | Comportement |
|---|---|
| JSON illisible | Sauvegarde ignorée, nouvelle partie, ancienne archivée en `.corrompu` |
| Version inconnue (plus récente) | Refus explicite : « sauvegarde d'une version plus récente » |
| Champ manquant | Valeur par défaut, avertissement au journal |
| Salle inexistante | Retour à la dernière salle valide |

Jamais d'écran d'erreur. Le joueur doit toujours pouvoir continuer à jouer.

## 5. Stockage

| Plateforme | Support | Remarque |
|---|---|---|
| Web | `localStorage` | ~5 Mo, largement suffisant |
| Desktop | fichier JSON | Dossier utilisateur standard |

Écriture **atomique** : on écrit dans une clé temporaire, on valide la relecture,
puis on remplace. Une coupure pendant l'écriture ne détruit pas la sauvegarde
précédente.

## 6. Tests obligatoires

- Aller-retour sérialisation/désérialisation
- Chaque migration, isolément et en chaîne
- JSON tronqué, JSON vide, JSON valide mais hors schéma
- Version future refusée proprement
- Écriture interrompue → l'ancienne sauvegarde survit
- Quota `localStorage` dépassé
