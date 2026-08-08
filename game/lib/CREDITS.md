# Bibliothèques embarquées

Ces fichiers ne sont pas de nous. Ils sont copiés dans le dépôt plutôt
qu'installés, pour que le jeu tourne sans réseau et sans étape d'installation —
mais leurs licences continuent de s'appliquer, et **redistribuer sans les
mentions ci-dessous serait une infraction**, y compris pour un projet gratuit.

## three.js — moteur de rendu

- `three.module.js` (révision **160**)
- `GLTFLoader.js`, `DRACOLoader.js`, `EXRLoader.js`, `RoomEnvironment.js`,
  `BufferGeometryUtils.js`, `meshopt_decoder.module.js`, `draco/`
- `post/` — chaîne de post-traitement : `EffectComposer`, `Pass`, `RenderPass`,
  `ShaderPass`, `MaskPass`, `UnrealBloomPass`, `OutputPass`, `CopyShader`,
  `LuminosityHighPassShader`, `OutputShader`

Les fichiers de `post/` viennent de `examples/jsm/` de la même révision. Seuls
leurs chemins d'import relatifs ont été modifiés, le dossier étant aplati ; le
code lui-même est inchangé.

> The MIT License
>
> Copyright © 2010-2023 three.js authors
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
> THE SOFTWARE.

## fflate — décompression

- `fflate.module.js`, utilisé par `EXRLoader`
- Licence **MIT**, © 2020 Arjun Barrett

## TensorFlow.js et COCO-SSD — reconnaissance d'objets

- `tf.min.js`, `coco-ssd.min.js` (coco-ssd 2.2.3)
- Licence **Apache 2.0**, © Google LLC

Les poids du modèle et leur provenance sont documentés séparément dans
[`model/CREDITS.md`](model/CREDITS.md).

## Ce qu'il reste à faire avant toute publication

Un écran de crédits **dans le jeu** reste à écrire. Ce fichier suffit pour le
dépôt, pas pour une distribution au public : le modèle de plante en pot est en
**CC-BY 4.0** (voir [`../models/vegetation/CREDITS.md`](../models/vegetation/CREDITS.md)),
et cette licence exige une attribution visible par l'utilisateur, pas seulement
par qui lit le code source.
