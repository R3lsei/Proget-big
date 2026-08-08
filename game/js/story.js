// story.js — L'histoire du Sujet 23 : chapitres, épreuves, et logique
// objet réel → capacité → obstacle. C'est ici que tout se connecte.

import { findItemWithCap, CAPS } from './items.js';
import {
  openDoor, openVent, disableSecuCam, extinguishFire, breakCabinet,
  disableLasers, calmDog, validateBadge, neutralizeSteam, openLocker,
  getSecuCamActive, getFireActive, getLasersActive, getDogCalm, getDogPosition,
  getSteamActive, getSteamOn,
  setInteractLabel,
} from './world.js';
import {
  speak, sfxSuccess, sfxDeny, sfxDoorOpen, sfxGlassBreak, sfxAlarm,
  sfxDogBark, sfxFire, sfxPickup,
} from './audio.js';

// ------------------------------------------------------------------
// Interface HUD (injectée par main.js)
// ------------------------------------------------------------------
let ui = null;
export function bindUI(uiApi) { ui = uiApi; }

export const state = {
  chapter: 0,
  handsFree: false,       // liens coupés ?
  inventory: [],
  hasBadge: false,
  codeKnown: false,
  finished: false,
};

// ------------------------------------------------------------------
// Chapitres
// ------------------------------------------------------------------
const CHAPTERS = [
  {
    title: 'CHAPITRE 1 — LE RÉVEIL', sub: 'Cellule C-23, niveau -4',
    objective: 'Vos poignets sont attachés par un lien plastique. Trouvez chez vous un objet qui COUPE (ciseaux, couteau…) et montrez-le à la caméra [C].',
  },
  {
    title: 'CHAPITRE 2 — LE BLOC A', sub: 'Couloir de détention',
    objective: 'Sortez de la cellule : crochetez la porte (brosse à dents, fourchette…) ou ouvrez la grille d\'aération en faisant levier (cuillère…).',
  },
  {
    title: 'CHAPITRE 3 — ŒIL POUR ŒIL', sub: 'Surveillance active',
    objective: 'Une caméra garde la porte codée. Neutralisez-la (pirater : téléphone, ordinateur… / distraire : objet à lancer), puis déchiffrez le code à 4 chiffres : un livre scanné fournit l\'énigme du protocole, et le journal du gardien cache un indice plus direct.',
  },
  {
    title: 'CHAPITRE 4 — LA ZONE CHAUDE', sub: 'Laboratoire 3 — Biocontrôle',
    objective: 'Un feu chimique bloque le passage : éteignez-le avec un LIQUIDE (bouteille, tasse…). L\'armoire sécurisée contient un badge niveau 4 : brisez la vitre ou crochetez-la. Enfin, une conduite de vapeur crache devant le sas : protégez-vous (cravate, parapluie, sac…) ou chronométrez les jets (horloge, téléphone…).',
  },
  {
    title: 'CHAPITRE 5 — LE CŒUR DE NOVA-7', sub: 'Salle serveurs',
    objective: 'Une grille laser barre la salle. Piratez le terminal de sécurité (téléphone, ordinateur portable, clavier…). La sortie est proche.',
  },
  {
    title: 'CHAPITRE FINAL — LA SURFACE', sub: 'Hangar de sortie',
    objective: 'Un chien de garde affamé rôde devant la porte blindée. Nourrissez-le (fruit, sandwich…), passez votre badge niveau 4, et montez vers la lumière.',
  },
];

export function startChapter(n) {
  if (n <= state.chapter && n !== 0) return;
  state.chapter = n;
  const ch = CHAPTERS[n];
  ui.banner(ch.title, ch.sub);
  ui.objective(ch.objective);
}

export function beginGame() {
  startChapter(0);
  ui.subtitle('Voix inconnue', 'Sujet 23… tu m\'entends ? Je suis le Dr Lenoir. Ils ont effacé ta mémoire, mais pas ton lien neural. Tout objet réel que tu montreras à ta caméra, je peux le matérialiser dans le complexe. Commence par couper tes liens : montre-moi quelque chose qui coupe.');
  speak('Sujet 23, tu m\'entends ? Ici le docteur Lenoir. Montre à ta caméra un objet qui coupe, et je le matérialiserai pour libérer tes mains.');
}

// ------------------------------------------------------------------
// Matérialisation d'un objet scanné
// ------------------------------------------------------------------
export function materializeItem(item) {
  state.inventory.push(item);
  sfxPickup();
  ui.notify(`${item.emoji} <b>${cap1(item.name)}</b> matérialisé·e.<br><small>${item.caps.map((c) => CAPS[c].icon + ' ' + CAPS[c].label).join(' · ')}</small>`);
  speak(`Ça, c'est ${item.name}. ${capsSentence(item)}`);
  ui.refreshInventory();

  // Chapitre 1 : couper les liens dès qu'un objet coupant arrive
  if (!state.handsFree && item.caps.includes('couper')) {
    setTimeout(() => cutBonds(item), 1200);
  }
}

function capsSentence(item) {
  const labels = item.caps.map((c) => CAPS[c].desc);
  return 'Critères établis : ' + labels.join(' ; ') + '.';
}

function cutBonds(item) {
  state.handsFree = true;
  ui.onHandsFree();
  sfxSuccess();
  ui.subtitle('Dr Lenoir', `${cap1(item.name)}… parfait. Tes liens sont coupés. Maintenant, sors de cette cellule : la serrure est mécanique, et la grille d'aération n'est que scellée.`);
  speak('Liens sectionnés. Bien joué. Maintenant, sors de cette cellule.');
  startChapter(1);
}

// ------------------------------------------------------------------
// Interactions avec les obstacles
// ------------------------------------------------------------------
function need(cap) { return findItemWithCap(state.inventory, cap); }

function consume(item) {
  if (item.usesLeft !== Infinity) {
    item.usesLeft--;
    if (item.usesLeft <= 0) {
      state.inventory = state.inventory.filter((i) => i !== item);
      ui.notify(`${item.emoji} ${cap1(item.name)} — consommé·e.`, true);
    }
  }
  ui.refreshInventory();
}

function deny(msg, spoken) {
  sfxDeny();
  ui.notify(msg, true);
  if (spoken) speak(spoken);
}

export function interact(id, player) {
  switch (id) {
    case 'grille_cellule': return tryVent(player);
    case 'porte_cellule': return tryCellDoor();
    case 'cam_secu': return trySecuCam();
    case 'porte_code': return tryCodedDoor();
    case 'feu': return tryFire();
    case 'armoire': return tryCabinet();
    case 'terminal_srv': return tryTerminal();
    case 'chien': return tryDog();
    case 'lecteur_badge': return tryBadgeReader();
    case 'valve_vapeur': return trySteamValve();
    case 'casier': return tryLocker();
    case 'porte_labo_srv': return trySasDoor();
    case 'porte_srv_hangar': return openFreeDoor('porte_srv_hangar');
  }
}

function trySteamValve() {
  if (!getSteamActive()) return;
  const shield = need('proteger');
  const timer = need('temps');
  if (shield) {
    neutralizeSteam();
    sfxSuccess();
    ui.notify(`${shield.emoji} Protégé·e par ${shield.name}, vous refermez la valve brûlante à mains couvertes.`);
    speak('Valve refermée. La vapeur est coupée, le sas est accessible.');
  } else if (timer) {
    neutralizeSteam();
    sfxSuccess();
    ui.notify(`${timer.emoji} Grâce à ${timer.name}, vous chronométrez les jets : 2,6 s de vapeur, 1,4 s de répit… et vous refermez la valve entre deux souffles !`);
    speak('Cycle chronométré. Valve refermée entre deux jets. Bien vu.');
  } else {
    deny('♨️ La valve est brûlante. <b>Protégez-vous</b> (cravate, parapluie, sac…) ou <b>chronométrez</b> les jets (horloge, téléphone…).', 'Cette vapeur découpe la peau. Protège-toi, ou chronomètre les jets.');
  }
}

let lockerOpen = false;
function tryLocker() {
  if (lockerOpen) return;
  const tool = need('crocheter') || need('levier') || need('couper');
  if (!tool) return deny('🔒 Un cadenas ordinaire. De quoi <b>crocheter</b>, <b>couper</b> ou <b>faire levier</b> en viendrait à bout.', null);
  lockerOpen = true;
  openLocker();
  sfxPickup();
  ui.notify('📓 <b>Journal du gardien</b> : « Ils ont encore augmenté la dose du 23. Le protocole 7-3-1-9 me donne la nausée. Si quelqu\'un lit ça un jour : je suis désolé. »');
  ui.subtitle('Dr Lenoir', 'Un journal… Alors même leurs gardiens doutaient. Garde ça en tête, Sujet 23 : tu n\'es pas le monstre de cette histoire.');
  speak('Même les gardiens doutaient. Tu n\'es pas le monstre de cette histoire.');
}

function trySasDoor() {
  if (getSteamActive()) {
    return deny('♨️ Impossible d\'atteindre le panneau du sas : la vapeur balaie l\'accès. Refermez la valve d\'abord.', 'La vapeur bloque le sas. Occupe-toi de la valve.');
  }
  openFreeDoor('porte_labo_srv');
}

let ventOpen = false;
function tryVent(player) {
  if (!ventOpen) {
    const tool = need('levier');
    if (!tool) return deny('🪛 La grille est scellée. Il faut un objet pour <b>faire levier</b> (cuillère, fourchette…).', 'Il te faut un objet pour faire levier.');
    ventOpen = true;
    openVent();
    sfxGlassBreak();
    ui.notify(`${tool.emoji} ${cap1(tool.name)} fait sauter les rivets. Le conduit est ouvert !`);
    speak('La grille cède. Rampe dans le conduit.');
    setInteractLabel('grille_cellule', 'Conduit ouvert — [E] ramper vers le couloir');
  } else {
    // ramper : fondu au noir + téléportation dans le couloir
    ui.fadeTeleport(() => {
      player.position.set(0.8, 0, -3.4);
      player.yaw = Math.PI + 0.4;
    });
    onEnterCorridor();
  }
}

let cellDoorOpen = false;
function tryCellDoor() {
  if (cellDoorOpen) return;
  const tool = need('crocheter');
  if (!tool) return deny('🔓 Serrure mécanique. Il faut de quoi <b>crocheter</b> (brosse à dents, fourchette, ciseaux…).', 'Cette serrure se crochète. Trouve le bon outil.');
  cellDoorOpen = true;
  openDoor('porte_cellule');
  sfxDoorOpen();
  ui.notify(`${tool.emoji} ${cap1(tool.name)} vient à bout de la serrure. La porte s'ouvre !`);
  speak('Serrure crochetée. La voie est libre.');
  onEnterCorridor();
}

function onEnterCorridor() {
  if (state.chapter < 2) {
    startChapter(2);
    setTimeout(() => {
      ui.subtitle('Dr Lenoir', 'Attention : une caméra balaie le fond du couloir. Tant qu\'elle est active, la porte codée reste en confinement. Pirate-la, ou offre-lui une diversion.');
      speak('Attention, caméra active au fond du couloir. Neutralise-la avant la porte.');
    }, 3500);
  }
}

function trySecuCam() {
  if (!getSecuCamActive()) return;
  const hack = need('pirater');
  const throwable = need('distraire');
  if (hack) {
    disableSecuCam();
    sfxSuccess();
    ui.notify(`${hack.emoji} ${cap1(hack.name)} intercepte le flux : caméra gelée sur une image vide.`);
    speak('Caméra piratée. Le confinement de la porte est levé.');
  } else if (throwable) {
    disableSecuCam();
    consume(throwable);
    sfxGlassBreak();
    ui.notify(`${throwable.emoji} ${cap1(throwable.name)} vole à travers le couloir — la caméra pivote et se bloque contre le mur !`);
    speak('Belle diversion. La caméra est aveuglée.');
  } else {
    deny('👁️ Il faut <b>pirater</b> (téléphone, PC…) ou <b>distraire</b> avec un objet à lancer.', 'Pirate la caméra, ou lance quelque chose pour la détourner.');
  }
}

let codedDoorOpen = false;
const DOOR_CODE = '7319';
function tryCodedDoor() {
  if (codedDoorOpen) return;
  if (getSecuCamActive()) {
    sfxAlarm(2);
    return deny('🚨 CONFINEMENT ACTIF — la caméra vous observe. Neutralisez-la d\'abord.', 'La caméra t\'observe. Neutralise-la d\'abord.');
  }
  const book = need('savoir');
  const hack = need('pirater');
  let hint;
  if (book) {
    hint = `📖 Une page cornée dans ${book.name} : « Sept salles gardent trois étages. Un seul sujet reste. Neuf gardiens veillent. » À vous de traduire en chiffres.`;
    speak('Une page cornée. Sept salles gardent trois étages. Un seul sujet reste. Neuf gardiens veillent.');
  } else {
    hint = 'Code à 4 chiffres inconnu. Un indice existe forcément : un livre à scanner… ou le journal d\'un gardien, quelque part dans le bloc.';
  }
  ui.keypad({
    hint,
    answer: DOOR_CODE,
    canHack: !!hack,
    hackLabel: hack ? `PIRATER (avec ${hack.name})` : 'PIRATER LE CLAVIER',
    check: (code) => code === DOOR_CODE,
    onSuccess: (viaHack) => {
      codedDoorOpen = true;
      sfxSuccess();
      if (viaHack) {
        ui.notify(`${hack.emoji} ${cap1(hack.name)} force le clavier : code ${DOOR_CODE.split('').join('-')} extrait de la mémoire.`);
        speak('Clavier piraté. Porte déverrouillée.');
      } else {
        ui.notify(`🔢 CODE ACCEPTÉ — vous avez déchiffré l'énigme du protocole. Porte déverrouillée !`);
        speak('Code accepté. Belle déduction, Sujet 23.');
      }
      openDoor('porte_code');
      sfxDoorOpen();
      startChapter(3);
      setTimeout(() => sfxFire(true), 800);
    },
    onFail: () => {
      sfxDeny();
      ui.notify('🔢 Code refusé. Réfléchissez : chaque phrase de l\'indice cache un chiffre.', true);
    },
  });
}

function tryFire() {
  if (!getFireActive()) return;
  const liquid = need('liquide');
  if (!liquid) return deny('🔥 Le feu chimique vous barre la route. Il faut un <b>liquide</b> (bouteille, tasse, bol…).', 'Ce feu ne s\'éteindra qu\'avec un liquide. Une bouteille fera l\'affaire.');
  extinguishFire();
  sfxFire(false);
  consume(liquid);
  sfxSuccess();
  ui.notify(`${liquid.emoji} ${cap1(liquid.name)} noie les flammes dans un nuage de vapeur. Passage dégagé !`);
  speak('Feu éteint. Traverse vite, avant que ça ne reprenne.');
  ui.subtitle('Dr Lenoir', 'Bien. L\'armoire au fond du labo contient un badge niveau 4 : tu en auras besoin pour l\'ascenseur de surface. Vitre blindée… enfin, blindée contre les poings.');
}

let cabinetOpen = false;
function tryCabinet() {
  if (cabinetOpen) return;
  const smash = need('casser');
  const pick = need('crocheter');
  if (smash) {
    sfxGlassBreak();
    ui.notify(`${smash.emoji} ${cap1(smash.name)} pulvérise la vitre !`);
    speak('Vitre brisée.');
  } else if (pick) {
    sfxSuccess();
    ui.notify(`${pick.emoji} ${cap1(pick.name)} fait céder la serrure de l'armoire.`);
    speak('Armoire crochetée.');
  } else {
    return deny('🗄️ Vitre blindée. <b>Brisez-la</b> (bouteille, ballon, vase…) ou <b>crochetez</b> la serrure.', 'Brise la vitre, ou crochète la serrure.');
  }
  cabinetOpen = true;
  breakCabinet();
  state.hasBadge = true;
  setTimeout(() => {
    sfxPickup();
    ui.notify('🪪 <b>Badge d\'accès — NIVEAU 4</b> récupéré !');
    speak('Badge niveau 4 récupéré. Direction la salle des serveurs.');
    ui.refreshInventory();
    startChapter(4);
  }, 700);
}

function openFreeDoor(id) {
  openDoor(id);
  sfxDoorOpen();
  if (id === 'porte_srv_hangar') startChapter(5);
}

function tryTerminal() {
  if (!getLasersActive()) return;
  const hack = need('pirater');
  if (!hack) return deny('💻 Session verrouillée. Il faut de quoi <b>pirater</b> (téléphone, PC, clavier, souris…).', 'Ce terminal se pirate. Téléphone ou ordinateur, à toi de voir.');
  disableLasers();
  sfxSuccess();
  ui.notify(`${hack.emoji} ${cap1(hack.name)} injecte le protocole de maintenance : GRILLE LASER DÉSACTIVÉE.`);
  speak('Grille laser désactivée. Le cœur de NOVA 7 est à toi. La sortie est droit devant.');
  ui.subtitle('Dr Lenoir', 'Tu y es presque. Derrière cette salle : le hangar, l\'ascenseur… la surface. Mais ils ont laissé leur chien de garde. Il n\'a pas mangé depuis des jours.');
}

let dogWarned = false;
function tryDog() {
  if (getDogCalm()) return;
  const food = need('nourrir');
  const toy = need('distraire');
  if (food) {
    calmDog();
    consume(food);
    sfxSuccess();
    ui.notify(`${food.emoji} Vous lancez ${food.name} — le chien se jette dessus, queue frétillante !`);
    speak('Le chien est occupé à manger. File vers la porte.');
  } else if (toy) {
    calmDog();
    consume(toy);
    ui.notify(`${toy.emoji} ${cap1(toy.name)} roule au loin — le chien détale à sa poursuite !`);
    speak('Le chien est distrait. Vite, la porte.');
  } else {
    sfxDogBark();
    if (!dogWarned) {
      dogWarned = true;
      ui.subtitle('Dr Lenoir', 'Doucement ! Il est affamé : montre à ta caméra quelque chose à manger — un fruit, un sandwich — et je le matérialiserai.');
    }
    deny('🐕 Le chien montre les crocs. <b>Nourrissez-le</b> (fruit, sandwich…) ou <b>distrayez-le</b>.', 'Recule ! Trouve-lui à manger.');
  }
}

function tryBadgeReader() {
  if (!state.hasBadge) {
    sfxAlarm(1);
    return deny('🪪 « ACCÈS NIVEAU 4 REQUIS ». Le badge est dans l\'armoire du laboratoire.', 'Accès refusé. Il te faut le badge niveau 4 du laboratoire.');
  }
  if (!getDogCalm()) {
    sfxDogBark();
    return deny('🐕 Impossible de rester immobile devant le lecteur : le chien vous charge !', 'Occupe-toi du chien d\'abord !');
  }
  validateBadge();
  sfxDoorOpen();
  sfxSuccess();
  ui.notify('🪪 BADGE ACCEPTÉ — Porte blindée déverrouillée. L\'ascenseur vous attend.');
  speak('Accès autorisé. Monte dans l\'ascenseur, Sujet 23. Tu es libre.');
  ui.objective('Entrez dans la lumière de l\'ascenseur. La surface vous attend.');
}

// ------------------------------------------------------------------
// Événements continus (appelé chaque frame par main.js)
// ------------------------------------------------------------------
let alarmCooldown = 0;
let barkCooldown = 0;
export function tick(dt, player) {
  if (state.finished) return;
  alarmCooldown -= dt;
  barkCooldown -= dt;
  const p = player.position;

  // caméra de surveillance : passer dessous déclenche l'alarme
  if (getSecuCamActive() && p.z < -15.5 && p.z > -21 && alarmCooldown <= 0) {
    alarmCooldown = 6;
    sfxAlarm(3);
    ui.damageFlash();
    ui.notify('🚨 La caméra vous a repéré ! Le confinement de la porte est renforcé.', true);
    speak('Repéré ! Baisse-toi et neutralise cette caméra !');
  }

  // feu : s'approcher trop près brûle
  if (getFireActive() && p.z < -26.3 && p.z > -29.7 && Math.abs(p.x) < 2.2) {
    ui.damageFlash();
    player.pushBack(5);
    if (alarmCooldown <= 0) { alarmCooldown = 3; deny('🔥 La chaleur est insoutenable !', null); }
  }

  // vapeur : traverser pendant un jet ébouillante
  if (getSteamOn() && p.z < -33.9 && p.z > -35.0 && Math.abs(p.x) < 1.4) {
    ui.damageFlash();
    player.pushBack(5);
    if (alarmCooldown <= 0) { alarmCooldown = 3; deny('♨️ La vapeur bouillante vous repousse !', null); }
  }

  // lasers : toucher la grille électrise
  if (getLasersActive() && p.z < -40.5 && p.z > -41.5) {
    ui.damageFlash();
    player.pushBack(6);
    if (alarmCooldown <= 0) { alarmCooldown = 3; deny('⚡ La grille laser vous repousse violemment !', null); }
  }

  // chien : s'approcher le fait aboyer
  const dogPos = getDogPosition();
  if (dogPos && !getDogCalm() && p.distanceTo(dogPos) < 3.4) {
    if (barkCooldown <= 0) { barkCooldown = 2.2; sfxDogBark(); }
    if (p.distanceTo(dogPos) < 1.8) { ui.damageFlash(); player.pushBack(7); }
  }

  // victoire : entrer dans l'ascenseur
  if (p.z < -58.6 && !state.finished) {
    state.finished = true;
    ui.ending(
      'Les portes se referment. L\'ascenseur s\'arrache aux profondeurs de NOVA-7, et pour la première fois ' +
      'depuis des mois, vous sentez l\'air changer. En haut : la nuit, la pluie, le monde réel — celui-là même ' +
      'd\'où venaient les objets qui vous ont sauvé. Le Dr Lenoir grésille une dernière fois dans votre oreille : ' +
      '« Bien joué, Sujet 23. Mais NOVA-7 n\'était que le niveau -4… il en reste trois. »'
    );
    speak('Bien joué, Sujet 23. Tu es libre. Mais NOVA 7 n\'était que le niveau moins 4. Il en reste trois.');
  }
}

const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
