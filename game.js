"use strict";

const WIDTH = 960;
const HEIGHT = 600;
const PARTS = window.SCRAP_PARTS || {};
const SLOT_META = Array.isArray(window.SCRAP_SLOTS) ? window.SCRAP_SLOTS : [
  { key: "arm", label: "ARM" },
  { key: "movement", label: "MOVEMENT" },
  { key: "body", label: "BODY" },
  { key: "head", label: "HEAD" },
  { key: "back", label: "BACK" },
  { key: "core", label: "POWER CORE" }
];
const DEFAULT_LOADOUT = window.SCRAP_DEFAULT_LOADOUT || {
  arm: "rustyFist",
  movement: "scrapLegs",
  body: "scrapFrame",
  head: "junkHead",
  back: "emptyBack",
  core: "basicCore"
};

const gameData = {
  loadout: { ...DEFAULT_LOADOUT },
  selectedSlot: 0,
  scrap: 0,
  mode: "garage",
  wave: 1,
  currentBattle: null,
  playerHP: 100,
  playerMaxHP: 100
};

function normalizeSlot(slot) {
  if (typeof slot === "string") {
    return { key: slot, label: slot.toUpperCase() };
  }
  return slot;
}

function slotList() {
  return SLOT_META.map(normalizeSlot);
}

function getSlotOptions(slotKey) {
  const source = PARTS[slotKey] || {};
  return Object.keys(source).map((key) => ({
    key,
    ...source[key]
  }));
}

function getPartForSlot(slotKey, selectedKey) {
  const options = getSlotOptions(slotKey);
  if (!options.length) {
    return { key: "scrap", name: "Scrap Starter" };
  }
  return options.find((p) => p.key === selectedKey) || options[0];
}

function getBuildStats(loadout) {
  const arm = PARTS.arm[loadout.arm] || PARTS.arm.rustyFist;
  const movement = PARTS.movement[loadout.movement] || PARTS.movement.scrapLegs;
  const body = PARTS.body[loadout.body] || PARTS.body.scrapFrame;
  const head = PARTS.head[loadout.head] || PARTS.head.junkHead;
  const back = PARTS.back[loadout.back] || PARTS.back.emptyBack;
  const core = PARTS.core[loadout.core] || PARTS.core.basicCore;

  const energy = (arm.energy || 0) + (movement.energy || 0) + (body.energy || 0) + (head.energy || 0) + (back.energy || 0);
  const damage = Math.round((arm.damage || 0) * (loadout.head === "targeter" ? 1.2 : 1));
  const speed = Math.max(75, (movement.speed || 0) + (body.speed || 0) + (arm.speed || 0) + (back.name === "Back Armor" ? -10 : 0));
  const jump = movement.jump || 0;
  const armor = Math.max(0, (body.armor || 0) + (back.name === "Back Armor" ? 15 : 0) + (loadout.core === "unstableCore" ? -10 : 0));

  return {
    damage,
    speed,
    jump,
    armor,
    range: arm.range || 72,
    cooldown: arm.cooldown || 350,
    energy,
    capacity: core.capacity || 3,
    valid: energy <= (core.capacity || 3),
    armName: arm.name,
    movementName: movement.name,
    backName: back.name
  };
}

class ScrapWarz extends Phaser.Scene {
  constructor() {
    super("ScrapWarz");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x101216);
    this.keys = this.input.keyboard.addKeys({
      a: "A",
      d: "D",
      w: "W",
      space: "SPACE",
      j: "J",
      k: "K",
      e: "E",
      r: "R",
      enter: "ENTER",
      esc: "ESC"
    });

    this.input.keyboard.on("keydown", (event) => {
      const key = event.key;
      const lower = key.toLowerCase();

      if (gameData.mode === "garage") {
        if (key === "ArrowUp" || lower === "w") {
          gameData.selectedSlot = (gameData.selectedSlot - 1 + slotList().length) % slotList().length;
          this.showGarage();
        } else if (key === "ArrowDown" || lower === "s") {
          gameData.selectedSlot = (gameData.selectedSlot + 1) % slotList().length;
          this.showGarage();
        } else if (key === "ArrowLeft" || lower === "a") {
          this.cyclePart(-1);
        } else if (key === "ArrowRight" || lower === "d") {
          this.cyclePart(1);
        } else if (key === "Enter" || lower === "e") {
          this.startBattle();
        }
      } else if (gameData.mode === "battle") {
        if (key === "Escape" || lower === "e") {
          this.showGarage();
        }
      }
    });

    this.showGarage();
  }

  clearScreen() {
    this.children.removeAll(true);
    if (this.physics && this.physics.world && this.physics.world.colliders) {
      this.physics.world.colliders.destroy();
    }
  }

  text(x, y, value, size = 16, color = "#ffffff", options = {}) {
    return this.add.text(x, y, value, {
      fontFamily: "monospace",
      fontSize: `${size}px`,
      color,
      stroke: "#101216",
      strokeThickness: options.strokeThickness ?? 3,
      fontStyle: options.fontStyle ?? "bold"
    });
  }

  panel(x, y, w, h, color = 0x20242a) {
    const box = this.add.rectangle(x, y, w, h, color);
    box.setStrokeStyle(2, 0x505761);
    return box;
  }

  garageRobotPreview() {
    const centerX = 225;
    const centerY = 290;

    this.add.rectangle(centerX, centerY + 70, 104, 92, 0x565e67).setStrokeStyle(4, 0x171a1f);
    this.add.rectangle(centerX, centerY, 72, 50, 0xb0b8bf).setStrokeStyle(4, 0x171a1f);
    this.add.rectangle(centerX - 18, centerY - 4, 12, 10, 0xffc54a);
    this.add.rectangle(centerX + 18, centerY - 4, 12, 10, 0xffc54a);
    this.add.rectangle(centerX - 58, centerY + 28, 24, 62, 0x777e87);
    this.add.rectangle(centerX + 58, centerY + 28, 24, 62, 0x777e87);
    this.add.rectangle(centerX - 28, centerY + 114, 28, 56, 0x777e87);
    this.add.rectangle(centerX + 28, centerY + 114, 28, 56, 0x777e87);
  }

  showGarage() {
    gameData.mode = "garage";
    this.clearScreen();

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x15181d);
    this.text(30, 22, "SCRAPHEAD", 32, "#ff9b43");
    this.text(32, 60, "SCRAP WARZ / ROBOT GARAGE", 14, "#b8c0ca");

    this.panel(225, 290, 365, 390, 0x20242a);
    this.text(60, 115, "YOUR ROBOT", 20, "#ffb24e");
    this.garageRobotPreview();
    this.text(66, 455, "PICK YOUR PARTS", 15, "#ffb24e");
    this.text(66, 480, "Different parts alter your", 12, "#b8c0ca");
    this.text(66, 498, "fighting style and energy use.", 12, "#b8c0ca");

    this.panel(690, 300, 485, 390, 0x20242a);
    this.text(470, 115, "EQUIPMENT", 20, "#ffb24e");

    const slots = slotList();
    slots.forEach((slot, index) => {
      const y = 165 + index * 43;
      const selected = index === gameData.selectedSlot;
      const slotKey = slot.key;
      const part = getPartForSlot(slotKey, gameData.loadout[slotKey]);

      this.add.rectangle(690, y + 7, 440, 36, selected ? 0x414751 : 0x252a31);
      this.text(485, y, `${selected ? ">" : " "} ${slot.label}`, 13, selected ? "#ffffff" : "#b8c0ca");
      this.text(690, y, part.name, 13, selected ? "#ffd27c" : "#d0d6de");
    });

    const selectedSlot = slotList()[gameData.selectedSlot];
    const selectedPart = getPartForSlot(selectedSlot.key, gameData.loadout[selectedSlot.key]);
    const stats = getBuildStats(gameData.loadout);

    this.panel(665, 470, 270, 110, 0x171a20);
    this.text(500, 442, "SELECTED PART", 12, "#9da7b5");
    this.text(500, 462, selectedPart.name, 15, "#ffffff");
    this.text(500, 488, `DAMAGE: ${stats.damage}  SPEED: ${stats.speed}`, 12, "#dfe6ee");
    this.text(500, 507, `JUMP: ${stats.jump}  ARMOR: ${stats.armor}`, 12, "#dfe6ee");
    this.text(500, 526, `ENERGY: ${stats.energy}/${stats.capacity}`, 12, stats.valid ? "#6bdf91" : "#ff7d7d");

    this.text(35, 540, "W/S or ↑/↓: SLOT   A/D or ←/→: CHANGE PART   ENTER: FIGHT", 13, "#ffffff");
    this.text(35, 565, `SCRAP: ${gameData.scrap}`, 13, "#ffb24e");
    this.text(690, 565, "STAGE 5: AI BRAWL", 13, "#6bdf91");
  }

  cyclePart(direction) {
    const slots = slotList();
    const slot = slots[gameData.selectedSlot];
    const options = getSlotOptions(slot.key);
    const currentKey = gameData.loadout[slot.key];
    const currentIndex = options.findIndex((part) => part.key === currentKey);
    const nextIndex = (currentIndex + direction + options.length) % options.length;
    gameData.loadout[slot.key] = options[nextIndex].key;
    this.showGarage();
  }

  startBattle() {
    gameData.mode = "battle";
    gameData.wave = 1;
    this.clearScreen();

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x171a20);
    this.text(25, 18, "THE SCRAP PIT", 28, "#ff9b43");
    this.text(28, 52, "SURVIVE THE WAVES OF ROBOT FIGHTERS", 12, "#c0c7d1");

    this.player = this.makeFighter(170, 330, 0x49b8ff, "YOU");
    this.player.maxHP = 100;
    this.player.hp = 100;
    this.player.setDepth(3);

    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);

    this.ground = this.add.rectangle(WIDTH / 2, 575, WIDTH, 50, 0x292c31);
    this.physics.add.existing(this.ground, true);
    this.add.rectangle(165, 445, 210, 22, 0x656d77);
    this.add.rectangle(480, 470, 180, 22, 0x656d77);
    this.add.rectangle(795, 425, 190, 22, 0x656d77);
    this.physics.add.existing(this.add.rectangle(165, 445, 210, 22, 0x656d77), true);
    this.physics.add.existing(this.add.rectangle(480, 470, 180, 22, 0x656d77), true);
    this.physics.add.existing(this.add.rectangle(795, 425, 190, 22, 0x656d77), true);

    this.conveyorLeft = this.makeConveyor(340, 520, 160, 18, 1);
    this.conveyorRight = this.makeConveyor(660, 520, 160, 18, -1);
    this.spikes = this.makeSpikes();
    this.barrels = this.physics.add.group();
    this.makeBarrel(285, 490);
    this.makeBarrel(575, 438);

    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.conveyorLeft);
    this.physics.add.collider(this.player, this.conveyorRight);
    this.physics.add.collider(this.player, this.spikes);
    this.physics.add.collider(this.player, this.barrels);

    this.playerHPText = this.text(25, 80, "YOU: 100 HP", 15, "#58bfff");
    this.waveText = this.text(25, 103, "WAVE: 1", 15, "#ffb24e");
    this.enemyText = this.text(700, 80, "ENEMIES: 0", 15, "#ff7777");
    this.scrapText = this.text(700, 103, `SCRAP: ${gameData.scrap}`, 15, "#ffb24e");

    this.enemies = [];
    this.spawnWave();
    this.playerCooldown = 0;
    this.playerAttackCooldown = 0;
    this.lastDamageNotice = 0;
  }

  makeFighter(x, y, fillColor, label) {
    const body = this.add.rectangle(x, y, 42, 62, fillColor);
    this.physics.add.existing(body);
    body.body.setAllowGravity(true);
    body.body.setSize(38, 62);
    body.body.setCollideWorldBounds(true);
    body.body.setMaxVelocity(400, 900);
    body.body.setDragX(350);
    body.setDepth(2);

    const eye = this.add.rectangle(x, y - 12, 20, 7, 0xffdf6b);
    eye.setDepth(4);
    body.eye = eye;
    body.label = label;
    body.hp = 100;
    body.maxHP = 100;
    body.isDead = false;
    body.aiType = "brawler";
    body.attackCooldown = 0;
    body.facing = 1;
    body.nameText = this.text(x - 28, y - 48, label, 10, "#ffffff");
    return body;
  }

  makeConveyor(x, y, w, h, dir) {
    const belt = this.add.rectangle(x, y, w, h, 0x484f59);
    belt.setStrokeStyle(2, 0xffa13d);
    this.physics.add.existing(belt, true);
    belt.direction = dir;
    belt.body.setSize(w, h);
    return belt;
  }

  makeSpikes() {
    const group = this.physics.add.staticGroup();
    const spikeCoords = [
      { x: 55, y: 545 },
      { x: 85, y: 545 },
      { x: 875, y: 545 },
      { x: 905, y: 545 }
    ];
    spikeCoords.forEach((p) => {
      const s = this.add.triangle(p.x, p.y, 0, 22, 12, 0, 24, 22, 0xc4cbd4);
      s.setStrokeStyle(2, 0x535b66);
      this.physics.add.existing(s, true);
      group.add(s);
    });
    return group;
  }

  makeBarrel(x, y) {
    const barrel = this.add.rectangle(x, y, 32, 42, 0xb94c38);
    this.physics.add.existing(barrel);
    barrel.body.setAllowGravity(true);
    barrel.body.setCollideWorldBounds(true);
    barrel.body.setBounce(0.2);
    barrel.exploding = false;
    barrel.setDepth(2);
    this.barrels.add(barrel);
  }

  spawnWave() {
    this.enemies = [];
    const count = Math.min(1 + (gameData.wave - 1), 5);
    const types = ["brawler", "runner", "scrapper"];
    for (let i = 0; i < count; i++) {
      const type = types[(gameData.wave + i - 1) % types.length];
      const color = type === "brawler" ? 0xe74b4b : type === "runner" ? 0x6bdf91 : 0xff9b43;
      const enemy = this.makeFighter(750 + (i % 2) * 70, 330 - Math.floor(i / 2) * 55, color, type.toUpperCase());
      enemy.aiType = type;
      enemy.hp = 70 + gameData.wave * 11;
      enemy.maxHP = enemy.hp;
      enemy.speed = type === "brawler" ? 120 : type === "runner" ? 160 : 135;
      enemy.damage = type === "brawler" ? 12 : type === "runner" ? 7 : 9;
      enemy.attackCooldown = 0;
      enemy.facing = -1;
      enemy.label = this.text(enemy.x - 30, enemy.y - 48, type.toUpperCase(), 10, "#ffffff");
      enemy.nameText = enemy.label;
      this.physics.add.collider(enemy, this.ground);
      this.physics.add.collider(enemy, this.conveyorLeft);
      this.physics.add.collider(enemy, this.conveyorRight);
      this.physics.add.collider(enemy, this.spikes);
      this.enemies.push(enemy);
    }
    this.waveText.setText(`WAVE: ${gameData.wave}`);
    this.enemyText.setText(`ENEMIES: ${this.enemies.length}`);
    this.showBattleMessage(`WAVE ${gameData.wave}!`);
  }

  showBattleMessage(text) {
    if (this.noticeText) this.noticeText.destroy();
    this.noticeText = this.text(WIDTH / 2, 130, text, 18, "#ffd27c");
    this.noticeText.setOrigin(0.5);
    this.time.delayedCall(1100, () => {
      if (this.noticeText) {
        this.noticeText.destroy();
        this.noticeText = null;
      }
    });
  }

  damagePlayer(amount, text) {
    if (!this.player || this.player.isDead) return;
    if (this.time.now < this.playerCooldown) return;
    this.playerCooldown = this.time.now + 600;
    gameData.playerHP = Math.max(0, gameData.playerHP - amount);
    this.playerHPText.setText(`YOU: ${gameData.playerHP} HP`);
    this.player.setVelocityY(-170);
    this.showBattleMessage(text);
    if (gameData.playerHP <= 0) {
      this.player.isDead = true;
      this.player.setAlpha(0.4);
      this.showBattleMessage("YOU'RE WRECKED! PRESS E");
    }
  }

  damageEnemy(enemy, amount, knockDir) {
    if (!enemy || enemy.isDead) return;
    enemy.hp = Math.max(0, enemy.hp - amount);
    enemy.setVelocityX(knockDir * 230);
    enemy.setVelocityY(-120);
    enemy.setFillStyle(0xffffff);
    this.time.delayedCall(120, () => {
      if (enemy && !enemy.isDead) {
        const palette = { brawler: 0xe74b4b, runner: 0x6bdf91, scrapper: 0xff9b43 };
        enemy.setFillStyle(palette[enemy.aiType] || 0xffffff);
      }
    });

    if (enemy.hp <= 0) {
      enemy.isDead = true;
      enemy.setAlpha(0.35);
      enemy.visible = false;
      enemy.eye.setVisible(false);
      if (enemy.nameText) enemy.nameText.setVisible(false);
      gameData.scrap += 2;
      this.scrapText.setText(`SCRAP: ${gameData.scrap}`);
      this.showBattleMessage(`${enemy.aiType.toUpperCase()} WRECKED! +2 SCRAP`);
    }
  }

  attack(heavy = false) {
    if (!this.player || this.player.isDead) return;
    if (this.time.now < this.playerAttackCooldown) return;

    const facing = this.player.facing || 1;
    const hitX = this.player.x + facing * (heavy ? 95 : 65);
    const hitBox = this.add.rectangle(hitX, this.player.y, heavy ? 64 : 42, 26, heavy ? 0xff6b3d : 0xffd15b, 0.45);
    this.time.delayedCall(80, () => hitBox.destroy());

    this.playerAttackCooldown = this.time.now + (heavy ? 750 : 350);
    this.player.setVelocityX(facing * (heavy ? 170 : 90));

    let hitEnemy = null;
    for (const enemy of this.enemies) {
      if (!enemy || enemy.isDead || !enemy.active) continue;
      if (Math.abs(enemy.x - hitX) < (heavy ? 90 : 60) && Math.abs(enemy.y - this.player.y) < 60) {
        hitEnemy = enemy;
        break;
      }
    }

    if (hitEnemy) {
      this.damageEnemy(hitEnemy, heavy ? 35 : 18, facing);
    }
  }

  update(time, delta) {
    if (gameData.mode !== "battle" || !this.player) return;

    const p = this.player;

    const left = this.keys.a.isDown;
    const right = this.keys.d.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.keys.w) || Phaser.Input.Keyboard.JustDown(this.keys.space);

    if (!p.isDead) {
      if (left && !right) {
        p.setVelocityX(-220);
        p.facing = -1;
      } else if (right && !left) {
        p.setVelocityX(220);
        p.facing = 1;
      } else {
        p.setVelocityX(0);
      }

      const grounded = p.body.blocked.down || p.body.touching.down;
      if (jump && grounded) {
        p.setVelocityY(-430);
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.j)) this.attack(false);
      if (Phaser.Input.Keyboard.JustDown(this.keys.k)) this.attack(true);
    }

    p.eye.x = p.x + (p.facing > 0 ? 4 : -4);
    p.eye.y = p.y - 12;
    p.nameText.x = p.x - 30;
    p.nameText.y = p.y - 48;

    let aliveCount = 0;
    for (const enemy of this.enemies) {
      if (!enemy || enemy.isDead) continue;
      aliveCount++;

      enemy.facing = enemy.x < p.x ? 1 : -1;
      enemy.eye.x = enemy.x + (enemy.facing > 0 ? 4 : -4);
      enemy.eye.y = enemy.y - 12;
      enemy.nameText.x = enemy.x - 34;
      enemy.nameText.y = enemy.y - 48;

      const dx = p.x - enemy.x;
      const absX = Math.abs(dx);
      const direction = dx >= 0 ? 1 : -1;

      if (enemy.aiType === "brawler") {
        if (absX > 90) {
          enemy.setVelocityX(direction * enemy.speed);
        } else {
          enemy.setVelocityX(0);
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = 1300;
            this.damagePlayer(enemy.damage, "BRAWLER HIT!");
          }
        }
      } else if (enemy.aiType === "runner") {
        if (absX < 140) {
          enemy.setVelocityX(-direction * enemy.speed);
        } else if (absX > 220) {
          enemy.setVelocityX(direction * enemy.speed * 0.85);
        } else {
          enemy.setVelocityX(0);
        }
        if (absX < 70 && enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 900;
          this.damagePlayer(enemy.damage, "RUNNER HIT!");
        }
      } else if (enemy.aiType === "scrapper") {
        if (absX > 80) {
          enemy.setVelocityX(direction * enemy.speed);
        } else {
          enemy.setVelocityX(0);
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = 850;
            this.damagePlayer(enemy.damage, "SCRAPPER HIT!");
          }
        }
        if ((enemy.body.blocked.down || enemy.body.touching.down) && Math.random() < 0.005) {
          enemy.setVelocityY(-340);
        }
      }

      enemy.attackCooldown -= delta;
      enemy.setVelocityY(enemy.body.velocity.y);

      if (enemy.y > HEIGHT + 80) {
        enemy.isDead = true;
        enemy.visible = false;
        enemy.eye.visible = false;
        if (enemy.nameText) enemy.nameText.visible = false;
      }
    }

    this.enemyText.setText(`ENEMIES: ${aliveCount}`);

    if (aliveCount === 0 && !p.isDead) {
      gameData.wave += 1;
      this.spawnWave();
    }

    this.conveyorApplyForce();

    if (this.player.y > HEIGHT + 100) {
      this.damagePlayer(18, "FELL INTO THE PIT!");
      p.setPosition(170, 330);
    }
  }

  conveyorApplyForce() {
    if (!this.player) return;
    const playerNearLeft = Math.abs(this.player.x - this.conveyorLeft.x) < 80 && Math.abs(this.player.y - this.conveyorLeft.y) < 30;
    const playerNearRight = Math.abs(this.player.x - this.conveyorRight.x) < 80 && Math.abs(this.player.y - this.conveyorRight.y) < 30;
    if (playerNearLeft) this.player.setVelocityX(this.player.body.velocity.x + 10);
    if (playerNearRight) this.player.setVelocityX(this.player.body.velocity.x - 10);

    for (const enemy of this.enemies || []) {
      if (!enemy || enemy.isDead) continue;
      const nearLeft = Math.abs(enemy.x - this.conveyorLeft.x) < 80 && Math.abs(enemy.y - this.conveyorLeft.y) < 30;
      const nearRight = Math.abs(enemy.x - this.conveyorRight.x) < 80 && Math.abs(enemy.y - this.conveyorRight.y) < 30;
      if (nearLeft) enemy.setVelocityX(enemy.body.velocity.x + 10);
      if (nearRight) enemy.setVelocityX(enemy.body.velocity.x - 10);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: "game",
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
  scene: [ScrapWarz]
};

new Phaser.Game(config);

