"use strict";

// SCRAPHEAD: SCRAP WARZ
// STAGE 2 - BREAKABLE PARTS
// Phaser 3 | No image files required

const W = 960;
const H = 540;

const CFG = {
  speed: 260,
  jump: 490,
  gravity: 1100,
  attackRange: 100,
  attackDamage: 25,
  attackCooldown: 350
};

// Keep gameplay data separate from the drawing.
const State = {
  player: {
    hp: 100,
    maxHp: 100,
    facing: 1,
    parts: {
      head: true,
      arm: true,
      legs: true,
      armor: true
    }
  },
  dummy: {
    hp: 100,
    maxHp: 100,
    parts: {
      head: true,
      arm: true,
      legs: true,
      armor: true
    }
  }
};

class Scraphead extends Phaser.Scene {
  constructor() {
    super("Scraphead");
  }

  create() {
    this.makeTextures();
    this.createArena();
    this.createRobots();
    this.createControls();
    this.createHUD();

    this.droppedParts = this.physics.add.group();

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.dummy, this.platforms);
    this.physics.add.collider(this.droppedParts, this.platforms);

    this.physics.add.overlap(
      this.player,
      this.droppedParts,
      this.collectPart,
      null,
      this
    );

    this.physics.add.collider(
      this.player,
      this.dummy,
      this.bumpDummy,
      null,
      this
    );

    this.drawings = this.add.graphics().setDepth(5);

    this.attackBox = this.add.rectangle(
      0, 0, 72, 46, 0xffd166, 0.45
    ).setVisible(false).setDepth(8);

    this.notice = this.add.text(
      W / 2, 220, "",
      {
        fontFamily: "monospace",
        fontSize: "25px",
        color: "#ffffff",
        align: "center",
        stroke: "#101216",
        strokeThickness: 5
      }
    ).setOrigin(0.5).setDepth(20);

    this.noticeTimer = null;
    this.lastBump = 0;
    this.lastAttack = 0;
    this.attackUntil = 0;
    this.ended = false;

    this.physics.world.setBounds(0, 0, W, H);
  }

  makeTextures() {
    const g = this.make.graphics({
      x: 0, y: 0, add: false
    });

    g.fillStyle(0x454d59);
    g.fillRect(0, 0, 960, 76);
    g.lineStyle(3, 0xf2b544);
    g.lineBetween(0, 2, 960, 2);
    g.lineStyle(1, 0x737b84);

    for (let x = 0; x < 960; x += 40) {
      g.lineBetween(x, 15, x, 76);
    }

    g.generateTexture("floor", 960, 76);
    g.clear();

    g.fillStyle(0x66717c);
    g.fillRect(0, 0, 150, 22);
    g.lineStyle(3, 0xf2b544);
    g.lineBetween(0, 2, 150, 2);
    g.generateTexture("ledge", 150, 22);
    g.clear();

    const colors = {
      head: 0xf2b544,
      arm: 0x53f4e7,
      legs: 0x8793a2,
      armor: 0xc06c49
    };

    for (const [name, color] of Object.entries(colors)) {
      g.fillStyle(color);
      g.fillRect(2, 2, 26, 22);
      g.fillStyle(0x252a31);
      g.fillRect(7, 7, 5, 5);
      g.fillRect(17, 7, 5, 5);
      g.lineStyle(2, 0xffffff, 0.55);
      g.strokeRect(2, 2, 26, 22);
      g.generateTexture("part_" + name, 30, 26);
      g.clear();
    }

    g.destroy();
  }

  createArena() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x171c25);

    const bg = this.add.graphics();
    bg.fillStyle(0x242b35);

    for (let i = 0; i < 16; i++) {
      const x = i * 65;
      const height = 65 + (i * 37) % 110;
      bg.fillRect(x, 420 - height, 45, height);
    }

    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(480, 502, "floor");
    this.platforms.create(700, 375, "ledge");

    this.add.text(18, 18, "THE SCRAP PIT // PARTS TEST", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#f2b544"
    });

    this.add.text(18, 39,
      "BREAK PARTS. GRAB JUNK. KEEP FIGHTING.", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#aeb4be"
      }
    );
  }

  createRobots() {
    // Invisible rectangular physics bodies.
    // The robot pieces are drawn separately.
    this.player = this.add.rectangle(
      190, 425, 42, 60, 0x000000, 0
    );
    this.physics.add.existing(this.player);
    this.player.body.setBounce(0.05);
    this.player.body.setDragX(900);
    this.player.body.setMaxVelocity(400, 900);

    this.dummy = this.add.rectangle(
      510, 425, 42, 60, 0x000000, 0
    );
    this.physics.add.existing(this.dummy);
    this.dummy.body.setBounce(0.1);
    this.dummy.body.setDragX(160);
    this.dummy.body.setMaxVelocity(600, 900);
  }

  createControls() {
    this.keys = this.input.keyboard.addKeys({
      a: "A",
      d: "D",
      w: "W",
      space: "SPACE",
      j: "J",
      f: "F",
      r: "R",
      left: "LEFT",
      right: "RIGHT",
      up: "UP"
    });

    this.cursors = this.input.keyboard.createCursorKeys();
  }

  createHUD() {
    this.add.text(18, 75, "YOUR ROBOT", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#53f4e7"
    });

    this.add.rectangle(110, 103, 180, 14, 0x303741);
    this.playerBar = this.add.rectangle(
      20, 103, 180, 8, 0x53f4e7
    ).setOrigin(0, 0.5);

    this.playerHP = this.add.text(20, 114, "", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#d8e0e8"
    });

    this.add.text(370, 75, "TRAINING DUMMY", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ff8c66"
    });

    this.add.rectangle(470, 103, 180, 14, 0x303741);
    this.dummyBar = this.add.rectangle(
      380, 103, 180, 8, 0xff8c66
    ).setOrigin(0, 0.5);

    this.dummyHP = this.add.text(380, 114, "", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#d8e0e8"
    });

    this.partStatus = this.add.text(18, 142, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffffff",
      lineSpacing: 5
    });

    this.add.text(18, 440,
      "DROPPED PARTS CAN BE PICKED UP", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#f2b544"
      }
    );
  }

  update(time) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.scene.restart();
      return;
    }

    if (!this.ended) {
      this.moveRobot();
      this.attack(time);
      this.checkFalls();
    }

    this.drawRobots();
    this.updateHUD();
    this.updateAttackVisual(time);
  }

  moveRobot() {
    const left = this.keys.a.isDown || this.keys.left.isDown;
    const right = this.keys.d.isDown || this.keys.right.isDown;

    const jump = Phaser.Input.Keyboard.JustDown(this.keys.w) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.up);

    // Losing legs makes the robot slower.
    const speed = State.player.parts.legs
      ? CFG.speed : 95;

    if (left && !right) {
      this.player.body.setVelocityX(-speed);
      State.player.facing = -1;
    } else if (right && !left) {
      this.player.body.setVelocityX(speed);
      State.player.facing = 1;
    }

    const grounded = this.player.body.blocked.down ||
      this.player.body.touching.down;

    if (jump && grounded && State.player.parts.legs) {
      this.player.body.setVelocityY(-CFG.jump);
    }
  }

  attack(time) {
    const pressed =
      Phaser.Input.Keyboard.JustDown(this.keys.j) ||
      Phaser.Input.Keyboard.JustDown(this.keys.f);

    if (!pressed || time - this.lastAttack < CFG.attackCooldown) {
      return;
    }

    // Losing your arm removes your melee attack.
    if (!State.player.parts.arm) {
      this.showNotice("NO ARM! PICK ONE UP!");
      return;
    }

    this.lastAttack = time;
    this.attackUntil = time + 110;

    const dx = this.dummy.x - this.player.x;
    const dy = Math.abs(this.dummy.y - this.player.y);
    const inFront = dx * State.player.facing > 0;

    if (
      State.dummy.hp > 0 &&
      inFront &&
      Math.abs(dx) < CFG.attackRange &&
      dy < 70
    ) {
      State.dummy.hp = Math.max(
        0, State.dummy.hp - CFG.attackDamage
      );

      this.dummy.body.setVelocityX(
        State.player.facing * 410
      );
      this.dummy.body.setVelocityY(-160);

      // Each threshold breaks off a different dummy part.
      if (State.dummy.hp <= 75 && State.dummy.parts.armor) {
        this.detachPart("dummy", "armor");
      }

      if (State.dummy.hp <= 50 && State.dummy.parts.arm) {
        this.detachPart("dummy", "arm");
      }

      if (State.dummy.hp <= 25 && State.dummy.parts.head) {
        this.detachPart("dummy", "head");
      }

      if (State.dummy.hp <= 0) {
        if (State.dummy.parts.legs) {
          this.detachPart("dummy", "legs");
        }

        this.showNotice("DUMMY DESTROYED!\nPRESS R TO RESET");
        this.ended = true;
      }
    }
  }

  detachPart(who, partName) {
    const robotState = State[who];

    if (!robotState.parts[partName]) return;
    robotState.parts[partName] = false;

    const robot = who === "player" ? this.player : this.dummy;

    const part = this.physics.add.image(
      robot.x + Phaser.Math.Between(-12, 12),
      robot.y - 15,
      "part_" + partName
    );

    part.setDepth(7);
    part.setBounce(0.45);
    part.setCollideWorldBounds(true);
    part.setVelocity(
      Phaser.Math.Between(-220, 220),
      Phaser.Math.Between(-350, -180)
    );
    part.setData("partName", partName);
    part.setData("owner", who);
    part.setData("pickedUp", false);

    this.droppedParts.add(part);
    this.physics.add.collider(part, this.platforms);

    this.showNotice(
      (who === "player" ? "YOU LOST YOUR " : "DUMMY LOST ITS ") +
      partName.toUpperCase() + "!"
    );
  }

  collectPart(robot, part) {
    if (!part.active || part.getData("pickedUp")) return;

    const name = part.getData("partName");

    // Only restore the player's missing slot.
    if (!State.player.parts[name]) {
      State.player.parts[name] = true;
      part.setData("pickedUp", true);
      part.destroy();

      this.showNotice("PICKED UP: " + name.toUpperCase());
    } else {
      // Already have this part: destroy duplicate for now.
      part.destroy();
    }
  }

  bumpDummy() {
    // Contact with the dummy can knock a player's part loose.
    const now = this.time.now;

    if (now - this.lastBump < 1800 || this.ended) return;
    if (State.dummy.hp <= 0) return;

    this.lastBump = now;

    const missing = Object.keys(State.player.parts).filter(
      key => State.player.parts[key]
    );

    if (missing.length === 0) return;

    // Only lose a part when moving into the dummy.
    if (Math.abs(this.player.body.velocity.x) < 100) return;

    const chosen = Phaser.Utils.Array.GetRandom(missing);
    this.detachPart("player", chosen);
    this.player.body.setVelocityX(
      this.player.x < this.dummy.x ? -200 : 200
    );
  }

  checkFalls() {
    if (this.player.y > H + 100) {
      State.player.hp = 0;
      this.ended = true;
      this.showNotice("ROBOT LOST!\nPRESS R TO RESET");
    }

    if (this.dummy.y > H + 100) {
      State.dummy.hp = 0;
      this.ended = true;
      this.showNotice("DUMMY FELL!\nPRESS R TO RESET");
    }
  }

  drawRobots() {
    const g = this.drawings;
    g.clear();

    // Draw player's attached armor and body.
    this.drawRobot(g, this.player, State.player.parts, true);

    // Draw dummy if it is still on screen.
    if (this.dummy.y < H + 100) {
      this.drawRobot(g, this.dummy, State.dummy.parts, false);
    }
  }

  drawRobot(g, body, parts, isPlayer) {
    const x = body.x;
    const y = body.y;
    const facing = isPlayer ? State.player.facing : -1;

    // Legs.
    if (parts.legs) {
      g.fillStyle(0x778392);
      g.fillRect(x - 15, y + 14, 11, 16);
      g.fillRect(x + 4, y + 14, 11, 16);
      g.fillStyle(0x252a31);
      g.fillRect(x - 18, y + 27, 16, 5);
      g.fillRect(x + 2, y + 27, 16, 5);
    }

    // Body.
    g.fillStyle(isPlayer ? 0x454f5d : 0x75493f);
    g.fillRect(x - 21, y - 15, 42, 31);

    // Armor plate.
    if (parts.armor) {
      g.fillStyle(isPlayer ? 0x657383 : 0xb16f51);
      g.fillRect(x - 18, y - 11, 36, 20);
      g.lineStyle(2, 0x252a31);
      g.strokeRect(x - 18, y - 11, 36, 20);
    }

    // Head.
    if (parts.head) {
      g.fillStyle(isPlayer ? 0xf2b544 : 0xc58a62);
      g.fillRect(x - 17, y - 34, 34, 22);

      g.fillStyle(isPlayer ? 0x53f4e7 : 0x29232a);
      g.fillRect(x - 11, y - 27, 7, 5);
      g.fillRect(x + 4, y - 27, 7, 5);
    }

    // Arm and weapon.
    if (parts.arm) {
      const armX = x + facing * 17;
      g.fillStyle(isPlayer ? 0x53f4e7 : 0xb87b54);
      g.fillRect(armX - 3, y - 8, 11, 17);

      g.fillStyle(isPlayer ? 0xc3d0db : 0x5e626c);
      g.fillRect(
        armX + facing * 5, y - 4, facing * 19, 8
      );
    }
  }

  updateAttackVisual(time) {
    const active = time < this.attackUntil &&
      State.player.parts.arm;

    this.attackBox.setVisible(active);

    if (active) {
      this.attackBox.setPosition(
        this.player.x + State.player.facing * 50,
        this.player.y - 2
      );
    }
  }

  updateHUD() {
    this.playerBar.width = 180 *
      (State.player.hp / State.player.maxHp);

    this.dummyBar.width = 180 *
      (State.dummy.hp / State.dummy.maxHp);

    this.playerHP.setText(
      `HP: ${State.player.hp} / ${State.player.maxHp}`
    );

    this.dummyHP.setText(
      `HP: ${State.dummy.hp} / ${State.dummy.maxHp}`
    );

    const p = State.player.parts;

    this.partStatus.setText(
      "YOUR PARTS\n" +
      `HEAD: ${p.head ? "OK" : "MISSING"}   ` +
      `ARM: ${p.arm ? "OK" : "MISSING"}\n` +
      `LEGS: ${p.legs ? "OK" : "MISSING"}   ` +
      `ARMOR: ${p.armor ? "OK" : "MISSING"}`
    );
  }

  showNotice(message) {
    this.notice.setText(message);

    if (this.noticeTimer) {
      this.noticeTimer.remove(false);
    }

    this.noticeTimer = this.time.delayedCall(1200, () => {
      if (!this.ended) this.notice.setText("");
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#171c25",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: CFG.gravity },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [Scraphead]
});

