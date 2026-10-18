"use strict";

const WIDTH = 960;
const HEIGHT = 600;
const SLOT_LIST = Array.isArray(window.SCRAP_SLOTS) && window.SCRAP_SLOTS.length
  ? window.SCRAP_SLOTS
  : [
      { key: "arm", label: "ARM" },
      { key: "movement", label: "MOVEMENT" },
      { key: "body", label: "BODY" },
      { key: "head", label: "HEAD" },
      { key: "back", label: "BACK" },
      { key: "core", label: "POWER CORE" }
    ];
const PARTS = window.SCRAP_PARTS || {};
const DEFAULT_LOADOUT = window.SCRAP_DEFAULT_LOADOUT || {
  arm: "rustyFist",
  movement: "scrapLegs",
  body: "scrapFrame",
  head: "junkHead",
  back: "emptyBack",
  core: "basicCore"
};

const GAME_STATE = {
  mode: "garage",
  selectedSlot: 0,
  scrap: 0,
  wave: 1,
  loadout: { ...DEFAULT_LOADOUT }
};

function slotList() {
  return SLOT_LIST;
}

function getOptionsForSlot(slotKey) {
  const source = PARTS[slotKey] || {};
  return Object.keys(source).map((key) => ({
    key,
    ...source[key]
  }));
}

function getCurrentPart(slotKey, loadout = GAME_STATE.loadout) {
  const options = getOptionsForSlot(slotKey);
  const currentKey = loadout[slotKey] || options[0]?.key || "rustyFist";
  return options.find((item) => item.key === currentKey) || options[0] || { key: currentKey, name: "Scrap Part" };
}

function getRobotStats(loadout = GAME_STATE.loadout) {
  const arm = PARTS.arm[loadout.arm] || PARTS.arm.rustyFist;
  const movement = PARTS.movement[loadout.movement] || PARTS.movement.scrapLegs;
  const body = PARTS.body[loadout.body] || PARTS.body.scrapFrame;
  const head = PARTS.head[loadout.head] || PARTS.head.junkHead;
  const back = PARTS.back[loadout.back] || PARTS.back.emptyBack;
  const core = PARTS.core[loadout.core] || PARTS.core.basicCore;

  const energy = (arm.energy || 0) + (movement.energy || 0) + (body.energy || 0) + (head.energy || 0) + (back.energy || 0);
  const armor = Math.max(0, (body.armor || 0) + (back.name === "Back Armor" ? 15 : 0) + (loadout.core === "unstableCore" ? -10 : 0));
  const damage = Math.round((arm.damage || 12) * (loadout.head === "targeter" ? 1.2 : 1));
  const speed = Math.max(90, (movement.speed || 220) + (body.speed || 0) + (arm.speed || 0));
  const jump = movement.jump || 500;
  const range = arm.range || 72;
  const cooldown = arm.cooldown || 350;
  const maxHp = 100 + armor * 2;

  return {
    damage,
    speed,
    jump,
    range,
    cooldown,
    armor,
    maxHp,
    energy,
    capacity: core.capacity || 3,
    valid: energy <= (core.capacity || 3)
  };
}

class ScrapheadScene extends Phaser.Scene {
  constructor() {
    super("ScrapheadScene");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x101216);
    this.keys = this.input.keyboard.addKeys({
      left: "A",
      right: "D",
      up: "W",
      jump: "SPACE",
      punch: "J",
      heavy: "K",
      enter: "ENTER",
      esc: "ESC",
      p: "P",
      s: "S"
    });

    this.input.keyboard.on("keydown", (event) => {
      const key = event.key;
      const lower = key.toLowerCase();

      if (GAME_STATE.mode === "garage") {
        if (key === "ArrowLeft" || lower === "a") {
          this.changeSelectedPart(-1);
        } else if (key === "ArrowRight" || lower === "d") {
          this.changeSelectedPart(1);
        } else if (key === "ArrowUp" || lower === "w") {
          GAME_STATE.selectedSlot = (GAME_STATE.selectedSlot - 1 + slotList().length) % slotList().length;
          this.renderGarage();
        } else if (key === "ArrowDown" || lower === "s") {
          GAME_STATE.selectedSlot = (GAME_STATE.selectedSlot + 1) % slotList().length;
          this.renderGarage();
        } else if (key === "Enter" || lower === "e") {
          this.startBattle();
        }
      }
    });

    this.renderGarage();
  }

  clearStage() {
    this.children.removeAll(true);
    if (this.physics && this.physics.world && this.physics.world.colliders) {
      this.physics.world.colliders.destroy();
    }
  }

  text(x, y, value, size = 16, color = "#ffffff", opts = {}) {
    return this.add.text(x, y, value, {
      fontFamily: "monospace",
      fontSize: `${size}px`,
      color,
      stroke: "#101216",
      strokeThickness: opts.strokeThickness ?? 3,
      fontStyle: opts.fontStyle ?? "bold"
    });
  }

  panel(x, y, w, h, color = 0x20242a) {
    const box = this.add.rectangle(x, y, w, h, color);
    box.setStrokeStyle(2, 0x505761);
    return box;
  }

  makePreviewRobot(centerX, centerY, color) {
    const body = this.add.rectangle(centerX, centerY, 64, 76, color);
    body.setStrokeStyle(4, 0x171a1f);
    this.add.rectangle(centerX, centerY - 10, 28, 8, 0xffd267);
    this.add.rectangle(centerX - 38, centerY + 18, 16, 60, 0x8b929b);
    this.add.rectangle(centerX + 38, centerY + 18, 16, 60, 0x8b929b);
    this.add.rectangle(centerX - 18, centerY + 82, 14, 46, 0x7e8a96);
    this.add.rectangle(centerX + 18, centerY + 82, 14, 46, 0x7e8a96);
  }

  renderGarage() {
    GAME_STATE.mode = "garage";
    this.clearStage();

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x15181d);
    this.text(28, 20, "SCRAPHEAD", 32, "#ff9b43");
    this.text(32, 62, "SCRAP WARZ / ROBOT GARAGE", 14, "#c0c5cc");

    this.panel(230, 305, 370, 420, 0x20242a);
    this.text(72, 120, "YOUR ROBOT", 22, "#ffb24e");
    this.makePreviewRobot(230, 300, 0x4db8ff);

    this.panel(700, 305, 450, 420, 0x20242a);
    this.text(500, 120, "EQUIPMENT", 22, "#ffb24e");

    const slots = slotList();
    slots.forEach((slot, index) => {
      const y = 165 + index * 42;
      const active = index === GAME_STATE.selectedSlot;
      const part = getCurrentPart(slot.key, GAME_STATE.loadout);
      const box = this.add.rectangle(700, y, 390, 32, active ? 0x3a4048 : 0x242a31);
      box.setStrokeStyle(2, 0x505761);
      this.text(500, y - 8, `${active ? ">" : " "} ${slot.label}`, 13, active ? "#ffffff" : "#b8c0ca");
      this.text(705, y - 8, part.name, 13, active ? "#ffd585" : "#dfe6ee");
    });

    const slot = slots[GAME_STATE.selectedSlot];
    const currentPart = getCurrentPart(slot.key, GAME_STATE.loadout);
    const stats = getRobotStats(GAME_STATE.loadout);
    this.panel(670, 495, 300, 120, 0x181d22);
    this.text(505, 450, "SELECTED PART", 12, "#a8b0bd");
    this.text(505, 470, currentPart.name, 16, "#ffffff");
    this.text(505, 495, `DAMAGE: ${stats.damage}   RANGE: ${stats.range}`, 12, "#edf3ff");
    this.text(505, 514, `SPEED: ${stats.speed}   JUMP: ${stats.jump}`, 12, "#edf3ff");
    this.text(505, 533, `ENERGY: ${stats.energy}/${stats.capacity}`, 12, stats.valid ? "#7be29a" : "#ff7d7d");

    this.text(30, 540, "W/S or ↑/↓: SLOT   A/D or ←/→: PART   ENTER: BATTLE", 13, "#ffffff");
    this.text(30, 566, `SCRAP: ${GAME_STATE.scrap}`, 13, "#ffb24e");
    this.text(720, 566, `WAVE ${GAME_STATE.wave}`, 13, "#7be29a");
  }

  changeSelectedPart(delta) {
    const slot = slotList()[GAME_STATE.selectedSlot];
    const options = getOptionsForSlot(slot.key);
    const currentKey = GAME_STATE.loadout[slot.key] || options[0]?.key;
    const currentIndex = options.findIndex((item) => item.key === currentKey);
    const nextIndex = (currentIndex + delta + options.length) % options.length;
    GAME_STATE.loadout[slot.key] = options[nextIndex].key;
    this.renderGarage();
  }

  startBattle() {
    GAME_STATE.mode = "battle";
    this.clearStage();

    const ground = this.add.rectangle(WIDTH / 2, HEIGHT - 18, WIDTH, 36, 0x2b2f35);
    this.physics.add.existing(ground, true);
    this.ground = ground;

    this.platforms = this.physics.add.staticGroup();
    const platform1 = this.add.rectangle(210, 440, 180, 18, 0x5f6770);
    const platform2 = this.add.rectangle(500, 470, 190, 18, 0x5f6770);
    const platform3 = this.add.rectangle(770, 430, 180, 18, 0x5f6770);
    this.physics.add.existing(platform1, true);
    this.physics.add.existing(platform2, true);
    this.physics.add.existing(platform3, true);
    this.platforms.add(platform1);
    this.platforms.add(platform2);
    this.platforms.add(platform3);

    this.conveyors = [
      this.makeConveyor(350, 560, 150, 18, 1),
      this.makeConveyor(650, 560, 150, 18, -1)
    ];

    this.spikes = this.physics.add.staticGroup();
    [40, 90, 840, 890].forEach((x) => {
      const s = this.add.triangle(x, 569, 0, 28, 20, 0, 40, 28, 0xc7c9d2);
      s.setDepth(2);
      this.physics.add.existing(s, true);
      this.spikes.add(s);
    });

    this.barrels = this.physics.add.group();
    this.makeBarrel(285, 495);
    this.makeBarrel(600, 430);

    this.player = this.createRobot(130, 300, "player", "YOU", GAME_STATE.loadout, 0x4db8ff);
    this.player.sprite.setDepth(3);
    this.player.sprite.body.setCollideWorldBounds(true);

    this.enemies = [];
    this.droppedParts = [];
    this.player.attackCooldown = 0;
    this.player.hitCooldown = 0;

    this.spawnWave();

    this.playerHpText = this.text(18, 18, `YOU: ${this.player.hp}/${this.player.maxHp} HP`, 16, "#58bfff");
    this.waveText = this.text(18, 42, `WAVE: ${GAME_STATE.wave}`, 15, "#ffb24e");
    this.scrapText = this.text(730, 18, `SCRAP: ${GAME_STATE.scrap}`, 15, "#ffb24e");
    this.enemyText = this.text(720, 42, "ENEMIES: 0", 15, "#ff7f7f");
    this.notice = this.text(WIDTH / 2, 120, "WAVE 1", 20, "#ffd27a");
    this.notice.setOrigin(0.5);
    this.time.delayedCall(1000, () => this.notice.destroy());

    this.physics.add.collider(this.player.sprite, this.ground);
    this.physics.add.collider(this.player.sprite, this.platforms);
    this.physics.add.collider(this.player.sprite, this.barrels);
    this.physics.add.collider(this.player.sprite, this.spikes);
    this.physics.add.collider(this.player.sprite, this.conveyors);
  }

  makeConveyor(x, y, w, h, dir) {
    const belt = this.add.rectangle(x, y, w, h, 0x444a52);
    belt.setStrokeStyle(2, 0xffa13d);
    this.physics.add.existing(belt, true);
    belt.direction = dir;
    return belt;
  }

  makeBarrel(x, y) {
    const barrel = this.add.rectangle(x, y, 24, 32, 0xb9543f);
    this.physics.add.existing(barrel);
    barrel.body.setAllowGravity(true);
    barrel.body.setCollideWorldBounds(true);
    barrel.body.setBounce(0.2);
    barrel.setDepth(2);
    this.barrels.add(barrel);
  }

  createRobot(x, y, team, label, loadout, color) {
    const sprite = this.add.rectangle(x, y, 52, 72, color);
    sprite.setStrokeStyle(2, 0x171a1f);
    this.physics.add.existing(sprite);
    sprite.body.setSize(48, 68);
    sprite.body.setAllowGravity(true);
    sprite.body.setCollideWorldBounds(true);
    sprite.body.setDragX(700);
    sprite.body.setMaxVelocity(420, 900);

    const robot = {
      team,
      label,
      sprite,
      facing: team === "player" ? 1 : -1,
      loadout: { ...DEFAULT_LOADOUT, ...loadout },
      hp: 100,
      maxHp: 100,
      attackCooldown: 0,
      hitCooldown: 0,
      parts: {},
      detached: [],
      nameText: this.text(x - 18, y - 46, label, 10, "#ffffff")
    };

    this.applyLoadout(robot);
    return robot;
  }

  applyLoadout(robot) {
    robot.parts = {};
    const base = { ...DEFAULT_LOADOUT, ...robot.loadout };
    for (const slot of slotList()) {
      const key = base[slot.key] || "rustyFist";
      const info = PARTS[slot.key]?.[key] || { key, name: "Scrap Part" };
      robot.parts[slot.key] = {
        slot: slot.key,
        key,
        info,
        health: 100,
        detached: false
      };
    }
    robot.maxHp = 100 + this.getArmorValue(robot) * 2;
    robot.hp = robot.maxHp;
  }

  getArmorValue(robot) {
    let armor = 0;
    for (const slot of slotList()) {
      const part = robot.parts[slot.key];
      if (part && !part.detached) {
        armor += part.info.armor || 0;
      }
    }
    return armor;
  }

  getRobotStatsForRobot(robot) {
    let damage = 12;
    let speed = 220;
    let jump = 500;
    let range = 72;
    let cooldown = 350;
    let armor = 0;
    let energy = 0;
    let capacity = 3;

    for (const slot of slotList()) {
      const part = robot.parts[slot.key];
      if (!part || part.detached) continue;
      const info = part.info || {};
      damage += info.damage || 0;
      speed += info.speed || 0;
      jump += info.jump || 0;
      armor += info.armor || 0;
      energy += info.energy || 0;
      range = Math.max(range, info.range || range);
      cooldown = Math.min(cooldown, info.cooldown || cooldown);
      if (slot.key === "core" && info.capacity) capacity = info.capacity;
    }

    if (robot.loadout.head === "targeter") {
      damage = Math.round(damage * 1.2);
    }

    return { damage, speed, jump, range, cooldown, armor, energy, capacity, maxHp: 100 + armor * 2 };
  }

  updateRobotVisual(robot) {
    const x = robot.sprite.x;
    const y = robot.sprite.y;
    robot.sprite.setVelocityX(Math.max(-240, Math.min(240, robot.sprite.body.velocity.x)));
    robot.sprite.setAngle(Phaser.Math.Clamp(robot.sprite.body.velocity.x * -0.04, -8, 8));
    robot.sprite.setFillStyle(robot.team === "player" ? 0x4db8ff : 0xe76b5b);
    robot.nameText.x = x - 22;
    robot.nameText.y = y - 48;
  }

  spawnWave() {
    const count = Math.min(1 + GAME_STATE.wave, 5);
    for (let i = 0; i < count; i++) {
      const enemy = this.createRobot(820 + (i % 2) * 60, 300 - Math.floor(i / 2) * 70, "enemy", `BOT ${i + 1}`, {
        arm: i % 2 === 0 ? "sword" : "drill",
        movement: i % 3 === 0 ? "wheels" : "scrapLegs",
        body: i % 2 === 0 ? "ironArmor" : "scrapFrame",
        head: i % 3 === 0 ? "scanner" : "junkHead",
        back: i % 2 === 0 ? "booster" : "emptyBack",
        core: i % 2 === 0 ? "strongCore" : "basicCore"
      }, 0xe76b5b);
      enemy.sprite.body.setVelocityX(-60 - i * 10);
      this.physics.add.collider(enemy.sprite, this.ground);
      this.physics.add.collider(enemy.sprite, this.platforms);
      this.physics.add.collider(enemy.sprite, this.spikes);
      this.physics.add.collider(enemy.sprite, this.barrels);
      this.physics.add.collider(enemy.sprite, this.conveyors);
      this.enemies.push(enemy);
    }

    this.enemyText.setText(`ENEMIES: ${this.enemies.length}`);
    this.notice = this.text(WIDTH / 2, 120, `WAVE ${GAME_STATE.wave}`, 22, "#ffd27a");
    this.notice.setOrigin(0.5);
    this.time.delayedCall(1000, () => this.notice.destroy());
  }

  doAttack(attacker, heavy = false) {
    if (!attacker || attacker.hitCooldown > 0) return;
    const stats = this.getRobotStatsForRobot(attacker);
    const range = heavy ? stats.range + 30 : stats.range;
    const targetList = attacker.team === "player" ? this.enemies : [this.player];
    const facingDir = attacker.facing;

    for (const target of targetList) {
      if (!target || target.hp <= 0) continue;
      const dx = target.sprite.x - attacker.sprite.x;
      const inFront = (facingDir === 1 && dx > 0) || (facingDir === -1 && dx < 0);
      const closeEnough = Math.abs(dx) <= range && Math.abs(attacker.sprite.y - target.sprite.y) < 80;
      if (inFront && closeEnough) {
        const damage = heavy ? stats.damage + 15 : stats.damage;
        this.damageRobot(target, damage, attacker.sprite.x < target.sprite.x ? 1 : -1, heavy ? "HEAVY HIT" : "BLOW");
        attacker.hitCooldown = stats.cooldown;
        attacker.sprite.setVelocityX(attacker.facing * (heavy ? 150 : 110));
        break;
      }
    }
  }

  damageRobot(robot, amount, kickDir = 1, label = "HIT") {
    if (!robot || robot.hp <= 0) return;
    robot.hp = Math.max(0, robot.hp - amount);
    robot.sprite.setVelocityX(kickDir * 220);
    robot.sprite.setVelocityY(-180);

    const slots = Object.keys(robot.parts).filter((key) => robot.parts[key] && !robot.parts[key].detached);
    if (slots.length > 0) {
      const slotKey = slots[Math.floor(Math.random() * slots.length)];
      const part = robot.parts[slotKey];
      part.health = Math.max(0, part.health - amount * 0.8);
      if (part.health <= 0) {
        this.detachPart(robot, slotKey);
      }
    }

    if (robot.hp <= 0) {
      robot.hp = 0;
      if (robot.team === "player") {
        this.notice = this.text(WIDTH / 2, 120, "YOU WERE DESTROYED!", 20, "#ff8b7d");
        this.notice.setOrigin(0.5);
        this.time.delayedCall(1200, () => this.scene.restart());
      } else {
        robot.sprite.setVisible(false);
        robot.nameText.setVisible(false);
        GAME_STATE.scrap += 2;
        this.scrapText.setText(`SCRAP: ${GAME_STATE.scrap}`);
      }
    }
  }

  detachPart(robot, slotKey) {
    const part = robot.parts[slotKey];
    if (!part || part.detached) return;
    part.detached = true;

    const loose = this.add.rectangle(robot.sprite.x + 20, robot.sprite.y - 10, 20, 20, 0x7c8794);
    this.physics.add.existing(loose);
    loose.body.setAllowGravity(true);
    loose.body.setCollideWorldBounds(true);
    loose.body.setVelocity(robot.facing * 180, -170);
    loose.setDepth(2);
    loose.slotKey = slotKey;
    loose.owner = robot;
    this.droppedParts.push(loose);
    robot.nameText.setText(robot.label);
  }

  attemptPickup(robot) {
    if (!robot || robot.team !== "player") return;
    for (let i = this.droppedParts.length - 1; i >= 0; i--) {
      const part = this.droppedParts[i];
      if (!part || !part.active) continue;
      const dx = Math.abs(part.x - robot.sprite.x);
      const dy = Math.abs(part.y - robot.sprite.y);
      if (dx < 40 && dy < 40) {
        const slotKey = part.slotKey;
        if (robot.parts[slotKey]) {
          robot.parts[slotKey].detached = false;
          robot.parts[slotKey].health = 100;
          part.destroy();
          this.droppedParts.splice(i, 1);
        }
      }
    }
  }

  handleEnemyAI(enemy) {
    if (!enemy || enemy.hp <= 0) return;
    const dx = this.player.sprite.x - enemy.sprite.x;
    const absX = Math.abs(dx);
    enemy.facing = dx >= 0 ? 1 : -1;
    enemy.sprite.body.setAccelerationX(0);

    if (absX > 90) {
      enemy.sprite.setVelocityX(enemy.facing * (this.getRobotStatsForRobot(enemy).speed / 1.7));
    } else {
      enemy.sprite.setVelocityX(0);
      if (enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 900;
        this.doAttack(enemy, false);
      }
    }

    const grounded = enemy.sprite.body.blocked.down || enemy.sprite.body.touching.down;
    if (grounded && Math.random() < 0.01) {
      enemy.sprite.setVelocityY(-420);
    }

    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - 16);
    enemy.hitCooldown = Math.max(0, enemy.hitCooldown - 16);
    this.updateRobotVisual(enemy);
  }

  update(time, delta) {
    if (GAME_STATE.mode !== "battle") return;

    const player = this.player;
    if (player) {
      const left = this.keys.left.isDown;
      const right = this.keys.right.isDown;
      const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.jump);
      const moveSpeed = this.getRobotStatsForRobot(player).speed;

      if (this.keys.left.isDown && !this.keys.right.isDown) {
        player.sprite.setVelocityX(-moveSpeed);
        player.facing = -1;
      } else if (this.keys.right.isDown && !this.keys.left.isDown) {
        player.sprite.setVelocityX(moveSpeed);
        player.facing = 1;
      } else {
        player.sprite.setVelocityX(player.sprite.body.velocity.x * 0.82);
      }

      const grounded = player.sprite.body.blocked.down || player.sprite.body.touching.down;
      if (jumpPressed && grounded) {
        player.sprite.setVelocityY(-this.getRobotStatsForRobot(player).jump);
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.punch)) {
        this.doAttack(player, false);
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.heavy)) {
        this.doAttack(player, true);
      }

      this.attemptPickup(player);
      player.hitCooldown = Math.max(0, player.hitCooldown - delta);
      player.attackCooldown = Math.max(0, player.attackCooldown - delta);
      this.updateRobotVisual(player);

      const playerStats = this.getRobotStatsForRobot(player);
      player.maxHp = playerStats.maxHp;
      this.playerHpText.setText(`YOU: ${Math.max(0, Math.round(player.hp))}/${player.maxHp} HP`);
    }

    for (const enemy of this.enemies) {
      if (!enemy || enemy.hp <= 0) continue;
      this.handleEnemyAI(enemy);
    }

    this.enemies = this.enemies.filter((enemy) => enemy && enemy.hp > 0 && enemy.sprite.active);
    this.enemyText.setText(`ENEMIES: ${this.enemies.length}`);

    if (this.droppedParts.length) {
      for (const dropped of this.droppedParts) {
        if (!dropped || !dropped.active) continue;
        dropped.setVelocityY(dropped.body.velocity.y + 0.3);
      }
    }

    this.applyConveyors();
    this.checkPit();

    if (this.enemies.length === 0) {
      GAME_STATE.wave += 1;
      this.spawnWave();
    }
  }

  applyConveyors() {
    if (!this.player) return;
    for (const belt of this.conveyors || []) {
      const nearPlayer = Math.abs(this.player.sprite.x - belt.x) < 90 && Math.abs(this.player.sprite.y - belt.y) < 30;
      if (nearPlayer) {
        this.player.sprite.setVelocityX(this.player.sprite.body.velocity.x + belt.direction * 20);
      }
      for (const enemy of this.enemies) {
        if (!enemy || enemy.hp <= 0) continue;
        const nearEnemy = Math.abs(enemy.sprite.x - belt.x) < 90 && Math.abs(enemy.sprite.y - belt.y) < 30;
        if (nearEnemy) {
          enemy.sprite.setVelocityX(enemy.sprite.body.velocity.x + belt.direction * 18);
        }
      }
    }
  }

  checkPit() {
    if (!this.player) return;
    if (this.player.sprite.y > HEIGHT + 50) {
      this.player.hp = 0;
      this.notice = this.text(WIDTH / 2, 120, "YOU FELL INTO THE PIT!", 20, "#ff8b7d");
      this.notice.setOrigin(0.5);
      this.time.delayedCall(1200, () => this.scene.restart());
    }
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#101216",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [ScrapheadScene]
});

window.SCRAPHEAD = {
  version: "modular-robot-poc",
  state: GAME_STATE,
  parts: PARTS,
  slots: SLOT_LIST
};
