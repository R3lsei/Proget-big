// Prépare les modèles de végétation pour le jeu.
//
// Chaîne : sélection → empaquetage GLB → Draco (géométrie) → WebP (textures).
//
// Ce script existe pour que la préparation soit REJOUABLE. La première fois
// (T-021), elle avait été faite à la main, en ligne de commande ; six semaines
// plus tard il ne restait ni la liste des modèles retenus, ni les réglages de
// compression, ni la raison des choix. Refaire le travail coûtait autant que
// l'inventer. Un script est la seule documentation qui ne se périme pas.
//
// Il ne tourne PAS en CI : il exige `@gltf-transform/cli`, que le projet n'a
// pas en dépendance — le harnais de test est resté sans aucune dépendance et
// doit le rester. On l'exécute à la main quand on ajoute des modèles, et on
// versionne les .glb produits.
//
// Usage :
//   npm i -g @gltf-transform/cli
//   node tools/preparer-vegetation.mjs <dossier glTF source> <dossier sortie>

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

/**
 * Modèles retenus, et pourquoi ceux-là.
 *
 * Le lot d'origine en compte 68, dont une majorité d'arbres de plein champ —
 * pins, chênes, arbres morts de plusieurs mètres. Ils n'ont rien à faire dans
 * un complexe de recherche : une chambre fait 3,6 m sous plafond. Importer tout
 * un lot parce qu'il est gratuit est le meilleur moyen d'alourdir le jeu de
 * fichiers que personne ne verra jamais.
 *
 * `echelle` ramène chaque modèle à une taille crédible en intérieur, et
 * `hauteurMax` sert de garde-fou vérifié après compression.
 */
export const RETENUS = Object.freeze([
  // Couvre-sol : c'est ce qui envahit un lieu abandonné.
  { fichier: 'Grass_Common_Short', nom: 'herbe-courte', echelle: 1.0, hauteurMax: 0.5 },
  { fichier: 'Grass_Common_Tall', nom: 'herbe-haute', echelle: 1.0, hauteurMax: 1.0 },
  { fichier: 'Grass_Wispy_Short', nom: 'herbe-fine-courte', echelle: 1.0, hauteurMax: 0.5 },
  { fichier: 'Grass_Wispy_Tall', nom: 'herbe-fine-haute', echelle: 1.0, hauteurMax: 1.0 },
  { fichier: 'Clover_1', nom: 'trefle-1', echelle: 1.0, hauteurMax: 0.4 },
  { fichier: 'Clover_2', nom: 'trefle-2', echelle: 1.0, hauteurMax: 0.4 },

  // Volume moyen : ce qui casse la ligne du sol et remplit les angles.
  { fichier: 'Fern_1', nom: 'fougere', echelle: 1.0, hauteurMax: 1.4 },
  { fichier: 'Plant_1', nom: 'plante-1', echelle: 1.0, hauteurMax: 1.2 },
  { fichier: 'Plant_1_Big', nom: 'plante-1-grande', echelle: 1.0, hauteurMax: 2.0 },
  { fichier: 'Plant_7', nom: 'plante-7', echelle: 1.0, hauteurMax: 1.2 },
  { fichier: 'Plant_7_Big', nom: 'plante-7-grande', echelle: 1.0, hauteurMax: 2.0 },
  { fichier: 'Bush_Common', nom: 'buisson', echelle: 1.0, hauteurMax: 1.8 },
  { fichier: 'Bush_Common_Flowers', nom: 'buisson-fleuri', echelle: 1.0, hauteurMax: 1.8 },

  // Ponctuations : elles racontent l'abandon mieux qu'une masse de feuillage.
  { fichier: 'Mushroom_Common', nom: 'champignon', echelle: 1.0, hauteurMax: 0.4 },
  { fichier: 'Flower_3_Group', nom: 'fleurs-3', echelle: 1.0, hauteurMax: 0.6 },
  { fichier: 'Flower_4_Group', nom: 'fleurs-4', echelle: 1.0, hauteurMax: 0.6 },
  { fichier: 'Pebble_Round_1', nom: 'caillou-1', echelle: 1.0, hauteurMax: 0.3 },
  { fichier: 'Pebble_Round_3', nom: 'caillou-2', echelle: 1.0, hauteurMax: 0.3 },
  { fichier: 'Rock_Medium_1', nom: 'rocher', echelle: 1.0, hauteurMax: 1.2 },
]);

/** Côté maximal des textures, en pixels. */
const TEXTURE = 512;

function gltf(...args) {
  return execFileSync('gltf-transform', args, { encoding: 'utf8', stdio: 'pipe' });
}

function main() {
  const [source, sortie] = process.argv.slice(2);
  if (!source || !sortie) {
    console.error('Usage : node tools/preparer-vegetation.mjs <glTF source> <sortie>');
    process.exit(1);
  }
  mkdirSync(sortie, { recursive: true });

  let total = 0;
  const rapport = [];
  for (const modele of RETENUS) {
    const entree = join(source, `${modele.fichier}.gltf`);
    if (!existsSync(entree)) {
      console.error(`  ✗ ${modele.fichier} absent de ${source}`);
      process.exitCode = 1;
      continue;
    }
    const cible = join(sortie, `${modele.nom}.glb`);

    // `optimize` enchaîne déduplication, quantification, Draco et compression
    // de textures. Les textures des plantes sont des aplats de couleur : 512 px
    // suffisent, et 2048 px n'auraient coûté que du temps de chargement.
    gltf('optimize', entree, cible,
      '--compress', 'draco',
      '--texture-compress', 'webp',
      '--texture-size', String(TEXTURE),
      '--simplify', 'false');   // la géométrie est déjà basse en polygones

    const octets = statSync(cible).size;
    total += octets;
    rapport.push({ nom: modele.nom, octets });
    console.log(`  ✓ ${modele.nom.padEnd(20)} ${(octets / 1024).toFixed(0)} Ko`);
  }

  console.log(`\n  ${rapport.length} modèles, ${(total / 1024 / 1024).toFixed(1)} Mo au total.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
