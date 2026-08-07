# Modèle de reconnaissance d'objets

**SSDLite MobileNet V2**, entraîné sur COCO 2017.

- Origine : [TensorFlow.js models](https://github.com/tensorflow/tfjs-models),
  paquet `@tensorflow-models/coco-ssd`
- Poids : `https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/`
- Licence : **Apache 2.0** — redistribution autorisée, attribution requise
- Version de la bibliothèque : coco-ssd 2.2.3

## Pourquoi ces 18 Mo sont dans le dépôt

Sans eux, la bibliothèque va chercher les poids sur les serveurs de Google au
premier scan. Le jeu marcherait donc chez qui a du réseau, et échouerait chez
qui n'en a pas — sur un mécanisme qui est le cœur du jeu, et sans rien dire de
compréhensible. Le joueur a déjà connu quatre échecs de lancement ; on
n'ajoute pas une cinquième cause d'échec pour économiser de la place.

Avec ces fichiers, **aucune requête ne quitte la machine** : la promesse faite
au joueur — « aucune image ne sort de votre ordinateur » — devient vraie du
premier lancement au dernier, réseau ou pas. Vérifié en navigateur : zéro
requête hors `localhost` pendant un scan complet.

## Ce que ce modèle sait et ne sait pas

80 classes fixes, dont une quarantaine sont utilisées par le jeu (voir
`js/perception/detecteurs/cocossd.js`). C'est un **repli**, pas la cible : le
projet vise l'open-vocabulary, où n'importe quel objet montré est reconnu. La
frontière posée par `detecteur.js` permet de changer de modèle sans toucher une
ligne de règles de jeu.
