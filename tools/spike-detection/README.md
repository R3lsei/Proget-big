# Banc de mesure — détection open-vocabulary

Mesure sur **votre** machine ce qu'aucune documentation ne peut prédire : le
temps de chargement du modèle, la latence d'inférence et la justesse de la
reconnaissance. Ses résultats conditionnent le design du scanner et plusieurs
documents de conception — c'est la tâche T-001, bloquante.

## Lancer

**Le plus simple** — double-cliquez à la racine du projet :

- Windows : `MESURER-LA-DETECTION-Windows.bat`
- macOS / Linux : `MESURER-LA-DETECTION-Mac-Linux.command`

Le navigateur s'ouvre tout seul.

En ligne de commande :

```bash
python mesurer.py          # depuis la racine du projet
```

Une connexion internet est nécessaire : la bibliothèque et les poids du modèle
(~50-150 Mo) sont téléchargés au premier lancement, puis mis en cache par le
navigateur.

**Aucune image ne quitte votre ordinateur.** L'inférence est locale.

## Ce qu'il faut me communiquer

En fin de mesure, la section « Verdict » affiche une ligne
« Chiffres à reporter dans PERFORMANCE.md ». Copiez-la.

## Pourquoi la bibliothèque n'est pas versionnée

`@huggingface/transformers` est chargée depuis un CDN plutôt que copiée dans le
dépôt, pour trois raisons :

1. **Le banc a de toute façon besoin du réseau** pour les poids du modèle :
   vendorer la bibliothèque n'apporterait aucune capacité hors-ligne.
2. Un bundle minifié de 510 Ko de code tiers dans l'historique Git est de la
   dette : il ne se relit pas, ne se révise pas, et grossit chaque clone.
3. Il déclenche un faux positif de l'analyse de secrets de GitHub — le nom de
   classe `AlbertForSequenceClassification` fait 31 caractères alphanumériques
   et correspond au motif d'une clé d'API.

Le jeu final, lui, embarquera ses dépendances : il doit fonctionner hors-ligne
et sous une politique de sécurité de contenu stricte. C'est prévu au jalon 4.

## Mode hors-ligne (facultatif)

Pour exécuter le banc sans réseau pour la bibliothèque :

```bash
npm install @huggingface/transformers@4.2.0 esbuild
npx esbuild entree.js --bundle --format=esm --minify \
  --external:onnxruntime-node --external:sharp \
  --outfile=lib/detection.min.js
```

avec `entree.js` contenant :

```js
export { pipeline, env } from '@huggingface/transformers';
```

La page utilise automatiquement `lib/detection.min.js` s'il existe.
Les poids du modèle resteront téléchargés depuis HuggingFace.
