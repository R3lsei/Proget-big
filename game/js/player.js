// player.js — Contrôleur FPS : ZQSD (clavier AZERTY), souris, saut, gravité, collisions.

import * as THREE from 'three';
import { colliders } from './world.js';
import { sfxFootstep, sfxJump, sfxLand } from './audio.js';

const EYE = 1.62;          // hauteur des yeux
const HEIGHT = 1.75;       // taille du sujet 23
const RADIUS = 0.32;       // rayon de collision
const SPEED = 3.6;         // m/s marche
const RUN = 5.6;           // m/s course (Shift)
const JUMP_V = 4.6;
const GRAVITY = 12.5;

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.position = new THREE.Vector3(0, 0, 0.9); // pieds, dans la cellule
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

    this.syncCamera();
  }

  requestLock() { this.dom.requestPointerLock({ unadjustedMovement: true }).catch(() => this.dom.requestPointerLock()); }

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

    // déplacement axe par axe avec résolution de collision
    this.tryMove(move.x * dt, 0, 0);
    this.tryMove(0, 0, move.z * dt);
    this.tryMove(0, this.velocity.y * dt, 0);

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

  tryMove(dx, dy, dz) {
    this.position.x += dx;
    this.position.y += dy;
    this.position.z += dz;
    const pbox = this.bbox();
    for (const c of colliders) {
      if (!pbox.intersectsBox(c)) continue;
      if (dx > 0) this.position.x = c.min.x - RADIUS;
      else if (dx < 0) this.position.x = c.max.x + RADIUS;
      if (dz > 0) this.position.z = c.min.z - RADIUS;
      else if (dz < 0) this.position.z = c.max.z + RADIUS;
      if (dy < 0 && c.max.y < 1.3) { // atterrit sur un obstacle bas
        this.position.y = c.max.y + 0.002;
        this.velocity.y = 0;
        this.onGround = true;
      } else if (dy > 0) {
        this.velocity.y = 0;
        this.position.y = c.min.y - HEIGHT;
      }
      pbox.setFromCenterAndSize(
        new THREE.Vector3(this.position.x, this.position.y + HEIGHT / 2, this.position.z),
        new THREE.Vector3(RADIUS * 2, HEIGHT, RADIUS * 2)
      );
    }
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

  /** Repousse le joueur (laser, chien) */
  pushBack(strength = 3) {
    const back = this.forwardDir.multiplyScalar(-strength);
    this.tryMove(back.x * 0.1, 0, 0);
    this.tryMove(0, 0, back.z * 0.1);
  }
}
