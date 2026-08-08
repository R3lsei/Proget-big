// player.js — Contrôleur FPS : ZQSD (clavier AZERTY), souris, saut, gravité, collisions.

import * as THREE from 'three';
import { colliders } from './world.js';
import { deplacerSurAxe, contraindreAuxLimites } from './physics/collision.js';
import { sfxFootstep, sfxJump, sfxLand } from './audio.js';

// Emprise du complexe. Sortir de ces bornes est forcément un bug : on ramène
// alors le joueur à sa dernière position valide (voir physics/collision.js).
const LIMITES = { minX: -8.5, maxX: 8.5, minY: -1, maxY: 7, minZ: -62, maxZ: 3.5 };

const EYE = 1.62;          // hauteur des yeux
const HEIGHT = 1.75;       // taille du sujet 23
const RADIUS = 0.32;       // rayon de collision
const SPEED = 3.6;         // m/s marche
const RUN = 5.6;           // m/s course (Shift)
const JUMP_V = 4.6;
const GRAVITY = 12.5;

/** Gabarit du joueur, tel que le voit la physique. */
const GABARIT = { rayon: RADIUS, hauteur: HEIGHT };

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.position = new THREE.Vector3(0, 0, 0.9); // pieds, dans la cellule
    this.lastSafe = this.position.clone();
    this.velocity = new THREE.Vector3();
    this.yaw = Math.PI;      // regarde le mur du fond au réveil
    this.pitch = 0;
    this.onGround = true;
    this.keys = {};
    this.enabled = false;    // verrouillé tant que les liens ne sont pas coupés
    this.locked = false;     // pointer lock actif
    this.bob = 0;
    this.stepTimer = 0;
    this._wasAirborne = false;

    // ZQSD par position physique (e.code) : sur un clavier AZERTY,
    // Z-Q-S-D occupent les codes KeyW-KeyA-KeyS-KeyD. Les flèches marchent aussi.
    document.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });
    document.addEventListener('pointerlockerror', () => this.enableFallback());

    this.syncCamera();
  }

  requestLock() {
    let p;
    try {
      p = this.dom.requestPointerLock({ unadjustedMovement: true });
    } catch (_) { /* API sans options */ }
    // Firefox renvoie undefined, Chrome une Promise qui peut rejeter
    if (p && p.catch) p.catch(() => { try { this.dom.requestPointerLock(); } catch (_) {} });
    setTimeout(() => { if (!this.locked) this.enableFallback(); }, 900);
  }

  /** Mode compatibilité : pointer lock indisponible (iframe, mobile…) →
   *  on regarde en faisant glisser la souris, le jeu reste jouable. */
  enableFallback() {
    if (this.fallback) return;
    this.fallback = true;
    if (window.NOVA) window.NOVA.debug = true;
    let drag = false;
    this.dom.addEventListener('mousedown', () => { drag = true; });
    window.addEventListener('mouseup', () => { drag = false; });
    window.addEventListener('mousemove', (e) => {
      if (!drag || this.locked) return;
      this.yaw -= e.movementX * 0.0028;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - e.movementY * 0.0028));
    });
  }

  get forwardDir() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  update(dt) {
    if (!this.locked && !(window.NOVA && window.NOVA.debug)) { this.syncCamera(); return; }

    const fwd = this.forwardDir;
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const move = new THREE.Vector3();

    if (this.enabled) {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) move.add(fwd);
      if (this.keys['KeyS'] || this.keys['ArrowDown']) move.sub(fwd);
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) move.sub(right);
      if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(right);
    }

    const running = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speed = running ? RUN : SPEED;
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);

    // saut + gravité
    if (this.enabled && this.keys['Space'] && this.onGround) {
      this.velocity.y = JUMP_V;
      this.onGround = false;
      sfxJump();
    }
    this.velocity.y -= GRAVITY * dt;

    // Déplacement axe par axe, délégué au module de physique. La logique y est
    // pure et testée (tests/js/collision.test.js) ; ici on ne fait que traduire
    // entre les Vector3 de three et le corps plat qu'attend la physique.
    const corps = {
      x: this.position.x, y: this.position.y, z: this.position.z,
      vy: this.velocity.y, auSol: this.onGround,
    };
    deplacerSurAxe(corps, 'x', move.x * dt, colliders, GABARIT);
    deplacerSurAxe(corps, 'z', move.z * dt, colliders, GABARIT);
    deplacerSurAxe(corps, 'y', corps.vy * dt, colliders, GABARIT);

    if (contraindreAuxLimites(corps, LIMITES, this.lastSafe)) {
      this.velocity.set(0, 0, 0);
    }
    this.position.set(corps.x, corps.y, corps.z);
    this.velocity.y = corps.vy;
    this.onGround = corps.auSol;
    if (this.onGround) this.lastSafe.copy(this.position);

    // sol
    if (this.position.y <= 0) {
      this.position.y = 0;
      if (this._wasAirborne) sfxLand();
      this.velocity.y = 0;
      this.onGround = true;
      this._wasAirborne = false;
    } else if (!this.onGround) {
      this._wasAirborne = true;
    }

    // head-bob + bruits de pas
    const moving = move.lengthSq() > 0 && this.onGround;
    if (moving) {
      this.bob += dt * (running ? 11 : 8);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        sfxFootstep();
        this.stepTimer = running ? 0.32 : 0.46;
      }
    } else {
      this.bob *= 0.9;
      this.stepTimer = 0.1;
    }

    this.syncCamera();
  }

  bbox() {
    return new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(this.position.x, this.position.y + HEIGHT / 2, this.position.z),
      new THREE.Vector3(RADIUS * 2, HEIGHT, RADIUS * 2)
    );
  }

  syncCamera() {
    const bobY = Math.sin(this.bob) * 0.035;
    const bobX = Math.cos(this.bob * 0.5) * 0.02;
    this.camera.position.set(
      this.position.x + bobX,
      this.position.y + EYE + bobY,
      this.position.z
    );
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  /** Repousse le joueur (feu, laser, vapeur, chien) */
  pushBack(strength = 3) {
    const back = this.forwardDir.multiplyScalar(-strength);
    const corps = {
      x: this.position.x, y: this.position.y, z: this.position.z,
      vy: this.velocity.y, auSol: this.onGround,
    };
    deplacerSurAxe(corps, 'x', back.x * 0.1, colliders, GABARIT);
    deplacerSurAxe(corps, 'z', back.z * 0.1, colliders, GABARIT);
    this.position.set(corps.x, corps.y, corps.z);
  }
}
