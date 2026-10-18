const PARTS = window.SCRAP_PARTS || {};
const SLOTS = window.SCRAP_SLOTS || ["arm", "movement", "body", "head", "back", "core"];

const DEFAULT_LOADOUT = window.SCRAP_DEFAULT_LOADOUT || {};
const WIDTH = 960;
const HEIGHT = 600;

const COLORS = {
  background: 0x101216,
  floor: 0x292c31,
  metal: 0x666d75,
  orange: 0xff8a30,
  red: 0xe74747,
  yellow: 0xffd54a,
  green: 0x6bdf91,
  blue: 0x58bfff
};

const gameData = {
  loadout: { ...DEFAULT_LOADOUT },
  selectedSlot: 0,
  mode: "garage",
  scrap: 0
};

class ScrapWarz extends Phaser.Scene {
  constructor() {
    super("ScrapWarz");
  }

  create() {
    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.keys = this.input.keyboard.addKeys(
      "A,D,W,SPACE,J,K,E,Q,ENTER,ESC"
    );

    this.showGarage();
  }

  clearScene() {
    this.physics.world.colliders.destroy();
    this.physics.world.overlapRTree.clear();
    this.children.removeAll(true);
    this.physics.world.pause();
    this.physics.world.resume();
  }

  text(x, y, value, size = 18, color = "#ffffff") {
    return this.add.text(x, y, value, {
      fontFamily: "monospace",
      fontSize: `${size}px`,
      color,
      fontStyle: "bold",
      stroke: "#101216",
      strokeThickness: 3
    });
  }

  panel(x, y, w, h, color = 0x20242a) {
    const box = this.add.rectangle(x, y, w, h, color);
    box.setStrokeStyle(2, 0x505761);
    return box;
  }

  getOptions(slot) {
    const source = PARTS[slot] || PARTS[slot.toLowerCase()] || {};
    let options = [];

    if (Array.isArray(source)) {
      options = source;
    } else if (source && typeof source === "object") {
      options = Object.entries(source).map(([key, item]) => ({
        key,
        ...(typeof item === "object" ? item : { name: String(item) })
      }));
    }

    return options.length ? options : [{
      key: "scrap",
      name: "Scrap Starter",
      damage: 15,
      speed: 0,
      jump: 0,
      description: "A basic junk-built part."
    }];
  }

  getCurrentPart(slot) {
    const options = this.getOptions(slot);
    const selected = gameData.loadout[slot];

    return options.find(part =>
      part.key === selected ||
      part.id === selected ||
      part.name === selected
    ) || options[0];
  }

  getPartName(part) {
    return part?.name || part?.title || part?.key || "Unknown Part";
  }

  getStat(part, stat) {
    return Number(part?.[stat] ?? part?.stats?.[stat] ?? 0);
  }

  showGarage() {
    gameData.mode = "garage";
    this.clearScene();

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x15181d);

    this.text(30, 22, "SCRAPHEAD", 32, "#ff9b43");
    this.text(32, 60, "SCRAP WARZ  /  GARAGE", 15, "#aeb6c2");

    this.panel(30, 105, 400, 410);
    this.text(55, 125, "YOUR ROBOT", 20, "#ffb24e");

    // Robot preview made from shapes, so no image files are needed.
    const robotX = 230;
    const robotY = 280;

    this.add.rectangle(robotX, robotY + 65, 100, 85, 0x565e67)
      .setStrokeStyle(4, 0x171a1f);

    this.add.rectangle(robotX, robotY, 74, 48, 0xb0b8bf)
      .setStrokeStyle(4, 0x171a1f);

    this.add.rectangle(robotX - 18, robotY - 4, 12, 10, 0xffc54a);
    this.add.rectangle(robotX + 18, robotY - 4, 12, 10, 0xffc54a);

    this.add.rectangle(robotX - 58, robotY + 28, 24, 58, 0x777e87);
    this.add.rectangle(robotX + 58, robotY + 28, 24, 58, 0x777e87);

    this.add.rectangle(robotX - 28, robotY + 125, 26, 55, 0x777e87);
    this.add.rectangle(robotX + 28, robotY + 125, 26, 55, 0x777e87);

    this.text(65, 435, "BUILD YOUR FIGHTER", 16, "#b7c0cc");
    this.text(65, 464, "Choose a slot and cycle through parts.", 12, "#aeb6c2");

    this.panel(455, 105, 475, 410);
    this.text(480, 125, "EQUIPMENT", 20, "#ffb24e");

    this.slotRows = [];

    SLOTS.forEach((slot, index) => {
      const y = 175 + index * 45;
      const selected = index === gameData.selectedSlot;

      const bg = this.add.rectangle(690, y + 5, 420, 38,
        selected ? 0x414751 : 0x252a31);

      const slotLabel = this.text(495, y - 9,
        `${selected ? ">" : " "} ${String(slot).toUpperCase()}`,
        13, selected ? "#ffffff" : "#b8c0cb");

      const part = this.getCurrentPart(slot);
      const partLabel = this.text(675, y - 9, this.getPartName(part), 12,
        selected ? "#ffd27c" : "#d0d6de");

      this.slotRows.push({ bg, slotLabel, partLabel });
    });

    this.panel(475, 445, 435, 52, 0x171a20);
    this.text(490, 451, "SELECTED PART", 11, "#9da7b5");

    const selectedSlot = SLOTS[gameData.selectedSlot];
    const selectedPart = this.getCurrentPart(selectedSlot);

    this.text(490, 469, this.getPartName(selectedPart), 13, "#ffffff");

    this.text(35, 535,
      "W/S OR ↑/↓: SLOT   A/D OR ←/→: CHANGE PART",
      13, "#d1d7df");

    this.text(35, 558,
      "ENTER: ENTER SCRAP PIT     E: CHANGE PART",
      13, "#ffb24e");

    this.text(665, 535, `SCRAP: ${gameData.scrap}`, 15, "#ffb24e");

    this.input.keyboard.off("keydown");
    this.input.keyboard.on("keydown", event => {
      if (gameData.mode !== "garage") return;

      if (["ArrowUp", "w", "W"].includes(event.key)) {
        gameData.selectedSlot =
          (gameData.selectedSlot - 1 + SLOTS.length) % SLOTS.length;
        this.showGarage();
      } else if (["ArrowDown", "s", "S"].includes(event.key)) {
        gameData.selectedSlot =
          (gameData.selectedSlot + 1) % SLOTS.length;
        this.showGarage();
      } else if (["ArrowLeft", "a", "A", "ArrowRight", "d", "D", "e", "E"].includes(event.key)) {
        this.cyclePart(event.key === "ArrowLeft" || event.key.toLowerCase() === "a" ? -1 : 1);
      } else if (event.key === "Enter") {
        this.startBattle();
      }
    });
  }

  cyclePart(direction) {
    const slot = SLOTS[gameData.selectedSlot];
    const options = this.getOptions(slot);
    const current = this.getCurrentPart(slot);

    let index = options.indexOf(current);
    index = (index + direction + options.length) % options.length;

    const part = options[index];
    gameData.loadout[slot] = part.key || part.id || part.name;

    this.showGarage();
  }

  startBattle() {
    gameData.mode = "battle";
    this.clearScene();

    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x171a20);

    // Background machinery.
    for (let i = 0; i < 10; i++) {
      this.add.rectangle(i * 110 + 20, 90, 65, 75, 0x22262c)
        .setStrokeStyle(2, 0x343a43);
    }

    this.text(25, 18, "THE SCRAP PIT", 28, "#ff9b43");
    this.text(28, 53, "SURVIVE THE MACHINERY. SMASH THE DUMMY.", 12, "#c0c7d1");

    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(WIDTH / 2, 570, null)
      .setDisplaySize(WIDTH, 60)
      .setTint(COLORS.floor)
      .refreshBody();

    // Raised platforms.
    this.makePlatform(165, 435, 210, 22);
    this.makePlatform(480, 470, 180, 22);
    this.makePlatform(795, 420, 190, 22);

    this.makeConveyor(340, 510, 160, 18, 1);
    this.makeConveyor(660, 510, 160, 18, -1);

    this.makeSpikes(55, 535, 95);
    this.makeSpikes(810, 535, 100);

    this.makeCrusher(450, 150);
    this.makeCrusher(720, 230);

    this.barrels = this.physics.add.group();
    this.makeBarrel(285, 490);
    this.makeBarrel(570, 445);

    this.droppedParts = this.physics.add.group();

    this.player = this.createFighter(170, 350, 0x49b8ff, "YOU");
    this.dummy = this.createFighter(770, 350, 0xe74b4b, "DUMMY");

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.dummy, this.platforms);
    this.physics.add.collider(this.player, this.dummy);
    this.physics.add.collider(this.barrels, this.platforms);
    this.physics.add.collider(this.droppedParts, this.platforms);

    this.physics.add.overlap(this.player, this.barrels, (player, barrel) => {
      if (barrel.active && barrel.exploding !== true) {
        this.explodeBarrel(barrel);
      }
    });

    this.physics.add.overlap(this.player, this.droppedParts, (player, part) => {
      if (!part.active) return;
      part.destroy();
      gameData.scrap += 1;
      this.scrapLabel?.setText(`SCRAP: ${gameData.scrap}`);
      this.notify("SCRAP COLLECTED +1");
    });

    this.physics.add.overlap(this.player, this.spikes, () => {
      this.damageFighter(this.player, 10, "SPIKES!");
    });

    this.physics.add.overlap(this.dummy, this.spikes, () => {
      this.damageFighter(this.dummy, 15, "DUMMY HIT!");
    });

    this.physics.add.overlap(this.player, this.crushers, (player, crusher) => {
      if (crusher.isDown && !player.isDead) {
        this.damageFighter(player, 25, "CRUSHED!");
        player.setVelocityY(-230);
      }
    });

    this.physics.add.overlap(this.dummy, this.crushers, (dummy, crusher) => {
      if (crusher.isDown && !dummy.isDead) {
        this.damageFighter(dummy, 30, "DUMMY CRUSHED!");
        dummy.setVelocityY(-230);
      }
    });

    this.physics.add.overlap(this.player, this.explosionZones, (player, zone) => {
      if (zone.active) this.damageFighter(player, 18, "BOOM!");
    });

    this.physics.add.overlap(this.dummy, this.explosionZones, (dummy, zone) => {
      if (zone.active) this.damageFighter(dummy, 25, "BOOM!");
    });

    this.playerHealth = 100;
    this.dummyHealth = 100;
    this.player.isDead = false;
    this.dummy.isDead = false;

    this.healthText = this.text(25, 78, "YOU: 100 HP", 15, "#58bfff");
    this.dummyHealthText = this.text(740, 78, "DUMMY: 100 HP", 15, "#ff6b6b");
    this.scrapLabel = this.text(25, 105, `SCRAP: ${gameData.scrap}`, 13, "#ffb24e");

    this.text(25, 580,
      "A/D MOVE   W/SPACE JUMP   J PUNCH   K HEAVY HIT   E GARAGE",
      11, "#ffffff");

    this.input.keyboard.off("keydown");
    this.input.keyboard.on("keydown", event => {
      if (gameData.mode !== "battle") return;

      if (event.key.toLowerCase() === "e" || event.key === "Escape") {
        this.showGarage();
      }
    });

    this.attackCooldown = 0;
    this.heavyCooldown = 0;
    this.playerDamageCooldown = 0;
    this.dummyDamageCooldown = 0;
    this.dummyAttackTimer = 0;

    this.explosionZones = this.physics.add.staticGroup();
    this.crushers = this.physics.add.group({ allowGravity: false });
    this.spikes = this.physics.add.staticGroup();

    // Rebuild hazard overlaps now that their groups exist.
    this.physics.add.overlap(this.player, this.spikes, () => {
      this.damageFighter(this.player, 10, "SPIKES!");
    });
    this.physics.add.overlap(this.dummy, this.spikes, () => {
      this.damageFighter(this.dummy, 15, "SPIKES!");
    });

    this.spikeObjects.forEach(spike => this.spikes.add(spike));
    this.crusherObjects.forEach(crusher => this.crushers.add(crusher));

    this.physics.add.overlap(this.player, this.crushers, (p, c) => {
      if (c.isDown) this.damageFighter(p, 25, "CRUSHED!");
    });
    this.physics.add.overlap(this.dummy, this.crushers, (p, c) => {
      if (c.isDown) this.damageFighter(p, 30, "CRUSHED!");
    });

    this.physics.add.overlap(this.player, this.explosionZones, () => {
      this.damageFighter(this.player, 18, "BOOM!");
    });
    this.physics.add.overlap(this.dummy, this.explosionZones, () => {
      this.damageFighter(this.dummy, 25, "BOOM!");
    });

    this.makeHazardTimers();
  }

  makePlatform(x, y, w, h) {
    const platform = this.platforms.create(x, y, null);
    platform.setDisplaySize(w, h);
    platform.setTint(0x656d77);
    platform.refreshBody();
    return platform;
  }

  makeConveyor(x, y, w, h, direction) {
    const belt = this.add.rectangle(x, y, w, h, 0x484f59)
      .setStrokeStyle(2, 0xffa13d);

    this.text(x - w / 2 + 5, y - 8,
      direction > 0 ? ">>>>>>>>>" : "<<<<<<<", 12, "#ffbd66");

    this.physics.add.existing(belt, true);
    belt.isConveyor = true;
    belt.direction = direction;
    belt.width = w;
    belt.height = h;

    this.conveyorBelts = this.conveyorBelts || [];
    this.conveyorBelts.push(belt);
  }

  makeSpikes(x, y, width) {
    this.spikeObjects = this.spikeObjects || [];

    const count = Math.floor(width / 22);

    for (let i = 0; i < count; i++) {
      const sx = x - width / 2 + i * 22 + 11;

      const spike = this.add.triangle(sx, y, 0, 24, 12, 0, 24, 24, 0xc4cbd4);
      spike.setStrokeStyle(2, 0x535b66);
      this.physics.add.existing(spike, true);

      spike.body.setSize(20, 22);
      this.spikeObjects.push(spike);
    }
  }

  makeCrusher(x, y) {
    this.crusherObjects = this.crusherObjects || [];

    const crusher = this.add.rectangle(x, y, 82, 30, 0x9b4b43)
      .setStrokeStyle(4, 0xe7a08a);

    this.physics.add.existing(crusher);
    crusher.body.setAllowGravity(false);
    crusher.body.setImmovable(true);
    crusher.isDown = false;
    crusher.baseY = y;
    crusher.nextSlam = 1600 + Math.random() * 1200;

    this.add.rectangle(x, y - 22, 100, 10, 0x555d67);

    this.crusherObjects.push(crusher);
  }

  makeBarrel(x, y) {
    const barrel = this.barrels.create(x, y, null);

    barrel.setDisplaySize(34, 42);
    barrel.setTint(0xb94c38);
    barrel.setCircle(17);
    barrel.setBounce(0.25);
    barrel.setCollideWorldBounds(true);
    barrel.setDragX(60);
    barrel.exploding = false;

    this.add.rectangle(x, y - 6, 24, 6, 0xffd05a)
      .setDepth(3);

    return barrel;
  }

  createFighter(x, y, color, label) {
    const fighter = this.physics.add.sprite(x, y, null);

    fighter.setDisplaySize(42, 65);
    fighter.setTint(color);
    fighter.setCollideWorldBounds(true);
    fighter.setBounce(0.05);
    fighter.setDragX(250);
    fighter.setMaxVelocity(300, 700);
    fighter.body.setSize(38, 62);

    const eye = this.add.rectangle(x, y - 12, 20, 7, 0xffdf6b);
    eye.setDepth(3);

    fighter.eye = eye;
    fighter.label = label;
    fighter.isDead = false;
    fighter.setData("hp", 100);

    this.text(x - 28, y - 48, label, 10, "#ffffff");

    return fighter;
  }

  makeHazardTimers() {
    this.conveyorBelts = this.conveyorBelts || [];

    this.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (gameData.mode !== "battle") return;

        for (const belt of this.conveyorBelts) {
          for (const fighter of [this.player, this.dummy]) {
            if (!fighter?.active || fighter.isDead) continue;

            const nearBelt =
              Math.abs(fighter.x - belt.x) < belt.width / 2 &&
              Math.abs((fighter.y + 32) - belt.y) < 27;

            if (nearBelt) {
              fighter.setVelocityX(fighter.body.velocity.x + belt.direction * 14);
            }
          }
        }
      }
    });

    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (gameData.mode !== "battle") return;

        for (const crusher of this.crusherObjects) {
          crusher.nextSlam -= 100;

          if (crusher.nextSlam <= 0 && !crusher.isDown) {
            crusher.isDown = true;
            crusher.body.setVelocityY(550);
            crusher.nextSlam = 2200 + Math.random() * 1300;

            this.time.delayedCall(450, () => {
              if (!crusher.active) return;
              crusher.body.setVelocityY(0);
              crusher.y = crusher.baseY + 90;
              crusher.body.reset(crusher.x, crusher.y);

              this.time.delayedCall(400, () => {
                if (!crusher.active) return;
                crusher.isDown = false;
                crusher.body.setVelocityY(-420);

                this.time.delayedCall(350, () => {
                  if (!crusher.active) return;
                  crusher.body.setVelocityY(0);
                  crusher.y = crusher.baseY;
                  crusher.body.reset(crusher.x, crusher.y);
                });
              });
            });
          }
        }
      }
    });
  }

  damageFighter(fighter, amount, message) {
    if (!fighter?.active || fighter.isDead) return;

    const isPlayer = fighter === this.player;
    const now = this.time.now;

    if (isPlayer) {
      if (now < this.playerDamageCooldown) return;
      this.playerDamageCooldown = now + 650;
      this.playerHealth = Math.max(0, this.playerHealth - amount);
      this.healthText?.setText(`YOU: ${this.playerHealth} HP`);
    } else {
      if (now < this.dummyDamageCooldown) return;
      this.dummyDamageCooldown = now + 650;
      this.dummyHealth = Math.max(0, this.dummyHealth - amount);
      this.dummyHealthText?.setText(`DUMMY: ${this.dummyHealth} HP`);
    }

    fighter.setVelocityY(-180);
    fighter.setTint(0xffffff);
    this.time.delayedCall(150, () => {
      if (fighter.active) fighter.setTint(isPlayer ? 0x49b8ff : 0xe74b4b);
    });

    this.notify(message);

    const hp = isPlayer ? this.playerHealth : this.dummyHealth;

    if (hp <= 0) {
      fighter.isDead = true;
      fighter.setVelocity(0, -180);
      fighter.setAlpha(0.5);

      if (!isPlayer) {
        gameData.scrap += 3;
        this.scrapLabel?.setText(`SCRAP: ${gameData.scrap}`);
        this.dropParts(fighter.x, fighter.y);
        this.notify("DUMMY DESTROYED! +3 SCRAP");
      } else {
        this.notify("ROBOT WRECKED! PRESS E FOR GARAGE");
      }
    }
  }

  notify(message) {
    if (this.notice) this.notice.destroy();

    this.notice = this.text(WIDTH / 2, 135, message, 17, "#ffd27c");
    this.notice.setOrigin(0.5);

    this.time.delayedCall(1100, () => {
      if (this.notice?.active) this.notice.destroy();
    });
  }

  dropParts(x, y) {
    for (let i = 0; i < 3; i++) {
      const part = this.droppedParts.create(x + (i - 1) * 22, y - 10, null);

      part.setDisplaySize(18, 18);
      part.setTint([0xffb34d, 0x6bdcff, 0xb8c0ca][i]);
      part.setBounce(0.65);
      part.setVelocity((i - 1) * 100, -200);
      part.setCollideWorldBounds(true);
    }
  }

  explodeBarrel(barrel) {
    if (!barrel.active || barrel.exploding) return;

    barrel.exploding = true;
    barrel.setTint(0xffd34d);
    barrel.setVelocity(0, 0);

    this.time.delayedCall(400, () => {
      if (!barrel.active || gameData.mode !== "battle") return;

      const blast = this.add.circle(barrel.x, barrel.y, 88, 0xff692e, 0.45);
      blast.setStrokeStyle(4, 0xffd34d);

      const blastX = barrel.x;
      const blastY = barrel.y;

      for (const fighter of [this.player, this.dummy]) {
        if (!fighter?.active || fighter.isDead) continue;

        const distance = Phaser.Math.Distance.Between(
          blastX, blastY, fighter.x, fighter.y
        );

        if (distance < 110) {
          const direction = fighter.x < blastX ? -1 : 1;
          fighter.setVelocityX(direction * 400);
          fighter.setVelocityY(-320);
          this.damageFighter(fighter, fighter === this.player ? 18 : 25, "BARREL BOOM!");
        }
      }

      this.time.delayedCall(250, () => blast.destroy());
      barrel.destroy();
    });
  }

  attack(heavy = false) {
    if (this.attackCooldown > this.time.now && !heavy) return;
    if (this.heavyCooldown > this.time.now && heavy) return;
    if (this.player.isDead) return;

    if (heavy) this.heavyCooldown = this.time.now + 850;
    else this.attackCooldown = this.time.now + 350;

    const facing = this.player.flipX ? -1 : 1;
    const range = heavy ? 92 : 65;
    const damage = heavy ? 28 : 14;

    this.player.setVelocityX(facing * (heavy ? 210 : 100));

    const hitX = this.player.x + facing * range;

    this.add.rectangle(hitX, this.player.y, heavy ? 65 : 45, 34,
      heavy ? 0xff6b3d : 0xffd15b, 0.5);

    if (this.dummy.active && !this.dummy.isDead &&
        Math.abs(this.dummy.x - hitX) < range &&
        Math.abs(this.dummy.y - this.player.y) < 65) {
      this.damageFighter(this.dummy, damage, heavy ? "HEAVY HIT!" : "SMACK!");

      const knockback = heavy ? 420 : 230;
      this.dummy.setVelocityX(facing * knockback);
      this.dummy.setVelocityY(heavy ? -280 : -130);

      if (Math.abs(this.dummy.x - this.player.x) < 100) {
        this.notify(heavy ? "SCRAP SMASH!" : "HIT!");
      }
    }

    // Punches can also set off nearby barrels.
    this.barrels.getChildren().forEach(barrel => {
      if (barrel.active &&
          Math.abs(barrel.x - hitX) < 55 &&
          Math.abs(barrel.y - this.player.y) < 65) {
        this.explodeBarrel(barrel);
      }
    });
  }

  update(time, delta) {
    if (gameData.mode !== "battle" || !this.player?.active) return;

    const player = this.player;
    const dummy = this.dummy;

    if (!player.isDead) {
      const speed = 210;

      if (this.keys.A.isDown) {
        player.setVelocityX(-speed);
        player.flipX = true;
      } else if (this.keys.D.isDown) {
        player.setVelocityX(speed);
        player.flipX = false;
      }

      const grounded = player.body.blocked.down || player.body.touching.down;

      if ((Phaser.Input.Keyboard.JustDown(this.keys.W) ||
           Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) && grounded) {
        player.setVelocityY(-430);
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.J)) this.attack(false);
      if (Phaser.Input.Keyboard.JustDown(this.keys.K)) this.attack(true);
    }

    // Basic dummy AI: approach, then swing.
    if (dummy?.active && !dummy.isDead && !player.isDead) {
      this.dummyAttackTimer -= delta;

      const distance = player.x - dummy.x;

      if (Math.abs(distance) > 75) {
        dummy.setVelocityX(Math.sign(distance) * 95);
      } else {
        dummy.setVelocityX(0);

        if (this.dummyAttackTimer <= 0) {
          this.dummyAttackTimer = 1500;
          player.setVelocityX(Math.sign(distance) * 180);
          this.damageFighter(player, 7, "DUMMY PUNCHED YOU!");
        }
      }

      dummy.flipX = distance < 0;
    }

    for (const fighter of [player, dummy]) {
      if (fighter?.active && fighter.eye?.active) {
        fighter.eye.setPosition(fighter.x + (fighter.flipX ? -4 : 4), fighter.y - 12);
      }
    }

    // Falling off the arena costs health and returns the robot to the floor.
    for (const fighter of [player, dummy]) {
      if (!fighter?.active || fighter.isDead || fighter.y < HEIGHT + 100) continue;

      this.damageFighter(fighter, 20, "FELL INTO THE PIT!");

      if (!fighter.isDead) {
        fighter.setPosition(fighter === player ? 170 : 770, 330);
        fighter.setVelocity(0, 0);
      }
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: document.body,
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
