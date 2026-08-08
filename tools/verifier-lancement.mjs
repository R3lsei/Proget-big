// Vérifie que le jeu DÉMARRE — pas qu'il est correct, mais qu'il s'ouvre.
//
// Pourquoi cet outil existe : la suite de tests passait à 296 sur 296 pendant
// que le joueur voyait un écran gris, puis une page 404, puis un message de
// Windows sur le Microsoft Store. Aucun de ces échecs n'était un défaut du
// jeu ; tous étaient des défauts de LIVRAISON, et aucun test ne regardait de
// ce côté. C'est le joueur qui a fait ce travail, capture d'écran par capture
// d'écran. Trois fois. C'est trois fois de trop.
//
// Ce script fait donc ce que fait un joueur : il lance chaque serveur pour de
// vrai, puis demande la page ET tous les modules qu'elle finit par charger.
// Un import cassé, un fichier renommé, un chemin qui ne résout pas : tout cela
// donne un écran gris muet en navigateur, et une ligne rouge ici.
//
// Ce qu'il ne peut PAS voir, et qu'il faut savoir : il tourne sous Linux. Le
// leurre « python.exe » du Microsoft Store est propre à Windows et restera
// hors de portée d'un test automatique. Seule la relecture protège de
// celui-là — d'où le commentaire qui l'explique dans le fichier .bat.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { connect } from 'node:net';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const JEU = join(RACINE, 'game');
const PAGE = 'chambres.html';

let echecs = 0;
const echouer = (message) => { console.error(`  ✗ ${message}`); echecs++; };
const reussir = (message) => console.log(`  ✓ ${message}`);

// ─── Le graphe des modules ──────────────────────────────────────────────────

/** Chemins importés par un fichier, résolus contre le dossier du jeu. */
function importsDe(fichier) {
  const source = readFileSync(fichier, 'utf8');
  const chemins = [];
  // Couvre `import x from '…'`, `import '…'`, `export … from '…'` et
  // `import('…')` — les quatre formes utilisées dans le projet.
  const motif = /(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g;
  for (const trouve of source.matchAll(motif)) {
    const cible = trouve[1];
    if (cible === 'three') { chemins.push(join(JEU, 'lib/three.module.js')); continue; }
    if (cible.startsWith('.')) chemins.push(resolve(dirname(fichier), cible));
  }
  return chemins;
}

/** Tous les modules atteignables depuis la page, en largeur d'abord. */
function grapheDepuis(entree) {
  const vus = new Set();
  const aVoir = [entree];
  while (aVoir.length) {
    const fichier = aVoir.pop();
    if (vus.has(fichier)) continue;
    vus.add(fichier);
    if (!existsSync(fichier)) continue;   // signalé plus bas, pas ici
    for (const suivant of importsDe(fichier)) aVoir.push(suivant);
  }
  return [...vus];
}

// ─── Vérifications statiques ────────────────────────────────────────────────

console.log('\nFichiers de lancement');

for (const lanceur of [
  'jouer.py', 'tools/serveur.ps1',
  'JOUER-LES-CHAMBRES-Windows.bat', 'JOUER-LES-CHAMBRES-Mac-Linux.command',
]) {
  if (existsSync(join(RACINE, lanceur))) reussir(lanceur);
  else echouer(`${lanceur} est absent`);
}

// Un lanceur qui appelle un fichier absent est exactement le défaut qui a
// produit la page 404 : le serveur démarre, et n'a rien à servir.
const bat = readFileSync(join(RACINE, 'JOUER-LES-CHAMBRES-Windows.bat'), 'utf8');
for (const appele of ['jouer.py', 'tools\\serveur.ps1']) {
  if (!bat.includes(appele)) { echouer(`le .bat n'appelle pas ${appele}`); continue; }
  if (existsSync(join(RACINE, appele.replace('\\', '/')))) reussir(`le .bat appelle ${appele}, qui existe`);
  else echouer(`le .bat appelle ${appele}, qui n'existe PAS`);
}

console.log('\nGraphe des modules');

const entree = join(JEU, 'js/app/partie.js');
const modules = grapheDepuis(entree);
const manquants = modules.filter((m) => !existsSync(m));
if (manquants.length) {
  for (const m of manquants) echouer(`import cassé : ${relative(RACINE, m)}`);
} else {
  reussir(`${modules.length} modules, tous présents depuis ${relative(RACINE, entree)}`);
}

// ─── Vérifications vivantes ─────────────────────────────────────────────────

/** Envoie une requête HTTP telle quelle, sans normalisation du chemin. */
function requeteBrute(port, chemin) {
  return new Promise((terminer) => {
    const prise = connect(port, '127.0.0.1', () => {
      prise.write(`GET ${chemin} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`);
    });
    let recu = '';
    prise.setTimeout(5000, () => prise.destroy());
    prise.on('data', (bloc) => { recu += bloc; });
    prise.on('close', () => terminer(recu));
    prise.on('error', () => terminer(''));
  });
}

/** Lance un serveur, interroge chaque ressource, l'arrête. */
async function essayerServeur(nom, commande, args, port) {
  console.log(`\nServeur : ${nom}`);
  const processus = spawn(commande, args, { cwd: RACINE, stdio: 'ignore' });
  const fini = new Promise((f) => processus.on('exit', f));
  try {
    // On attend que le port réponde plutôt que de dormir un temps fixe : une
    // attente arbitraire est soit trop courte (échec au hasard), soit trop
    // longue (tout le monde la paie).
    const base = `http://127.0.0.1:${port}`;
    let pret = false;
    for (let essai = 0; essai < 100 && !pret; essai++) {
      try { await fetch(`${base}/${PAGE}`); pret = true; }
      catch { await new Promise((f) => setTimeout(f, 100)); }
    }
    if (!pret) { echouer(`${nom} n'a jamais répondu sur le port ${port}`); return; }

    const aDemander = [PAGE, ...modules.map((m) => relative(JEU, m).split('\\').join('/'))];
    let servis = 0;
    for (const ressource of aDemander) {
      const reponse = await fetch(`${base}/${ressource}`);
      if (!reponse.ok) { echouer(`${ressource} → ${reponse.status}`); continue; }
      const octets = (await reponse.arrayBuffer()).byteLength;
      if (octets === 0) { echouer(`${ressource} servi vide`); continue; }
      servis++;
    }
    reussir(`${servis} ressources servies en 200, dont la page et tous ses modules`);

    // Le type MIME n'est pas cosmétique : un module servi en text/plain est
    // REFUSÉ par le navigateur, et l'écran reste gris sans un mot d'erreur.
    const type = (await fetch(`${base}/js/app/partie.js`)).headers.get('content-type') ?? '';
    if (type.includes('javascript')) reussir(`les modules sont servis en ${type}`);
    else echouer(`module servi en « ${type} » : le navigateur le refusera`);

    // Le serveur ne doit rien servir au-dessus de game/. À vérifier par une
    // socket brute : `fetch` normalise « /../ » AVANT d'émettre, si bien que la
    // requête n'atteint jamais le serveur et que le test passe quoi qu'il
    // arrive. Écrite ainsi, la vérification laissait vivre la mutation qui
    // supprime la garde — un test qui ne distingue rien vaut moins que pas de
    // test, parce qu'il rassure.
    const remontees = ['/../jouer.py', '/..%2fjouer.py', '/%2e%2e/jouer.py'];
    let fuites = 0;
    for (const chemin of remontees) {
      const reponse = await requeteBrute(port, chemin);
      if (/^HTTP\/1\.[01] 200/.test(reponse)) {
        echouer(`le serveur sert « ${chemin} », hors du dossier game/`);
        fuites++;
      }
    }
    if (!fuites) reussir(`${remontees.length} chemins remontant hors de game/ sont refusés`);
  } finally {
    processus.kill('SIGTERM');
    await fini;
  }
}

const dispo = (binaire) => {
  const r = spawn('sh', ['-c', `command -v ${binaire}`], { stdio: 'ignore' });
  return new Promise((f) => r.on('exit', (code) => f(code === 0)));
};

if (await dispo('python3')) {
  await essayerServeur('python3 jouer.py', 'python3', ['jouer.py', '8710'], 8710);
} else {
  console.log('\nServeur : python3 absent — non vérifié');
}

if (await dispo('pwsh')) {
  await essayerServeur('pwsh tools/serveur.ps1', 'pwsh',
    ['-NoProfile', '-File', 'tools/serveur.ps1', '-Port', '8720'], 8720);
} else {
  // Sur Windows, c'est CE serveur-là qui tournera chez la plupart des joueurs :
  // ne pas pouvoir le vérifier est une lacune, pas un détail.
  console.log('\nServeur : pwsh absent — le serveur PowerShell n\'a PAS été vérifié');
}

console.log('');
if (echecs) {
  console.error(`${echecs} problème(s) de lancement. Le jeu ne démarrerait pas.\n`);
  process.exit(1);
}
console.log('Le jeu démarre et se sert entièrement.\n');
