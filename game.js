"use strict";

const W = 960;
const H = 540;
const PARTS = window.SCRAP_PARTS;
const SLOTS = window.SCRAP_SLOTS;

const GameData = {
  loadout: { ...window.SCRAP_DEFAULT_LOADOUT },
  unlocked: {
    arm: ["rustyFist", "hammer", "sword", "drill", "scrapGun"],
    movement: ["scrapLegs", "wheels", "springLegs", "rocketLegs"],
    body: ["scrapFrame", "ironArmor", "heavyFrame", "shieldFrame"],
    head: ["junkHead", "scanner", "targeter", "nightVision"],
    back: ["emptyBack", "jetpack", "booster", "turret", "extraArmor"],
    core: ["basicCore", "strongCore", "unstableCore"]
  }
};

function getBuildStats(loadout) {
  const get = slot => PARTS[slot][loadout[slot]];

  const core = get("core");
  const arm = get("arm");
  const movement = get("movement");
  const body = get("body");
  const head = get("head");
  const back = get("back");

  const energy = arm.energy + movement.energy +
    body.energy + head.energy + back.energy;

  return {
    energy,
    capacity: core.capacity,
    valid: energy <= core.capacity,
    speed: Math.max(70, movement.speed + body.speed +
      (arm.speed || 0) + (back.key === "extraArmor" ? -10 : 0)),
    jump: movement.jump,
    armor: Math.max(0, body.armor +
      (back.key === "extraArmor" ? 15 : 0) +
      (core === PARTS.core.unstableCore ? -10 : 0)),
    damage: Math.round(arm.damage *
      (loadout.head === "targeter" ? 1.2 : 1)),
    range: arm.range,
    cooldown: arm.cooldown,
    armName: arm.name,
    movementName: movement.name,
    backName: back.name
  };
}

class ScrapheadGame extends Phaser.Scene {
  constructor() {
    super("ScrapheadGame");
  }

  create() {
    this.mode = "garage";
    this.selectedSlot = 0;
    this.slotTexts = [];
    this.partTexts = [];
    this.pickups = [];
    this.dummyHP = 100;
    this.playerHP = 100;
    this.lastAttack = 0;
    this.facing = 1;
    this.message = "";

    this.makeTextures();
    this.showGarage();
  }

  makeTextures() {
    const g = this.make.graphics({
      x: 0, y: 0, add: false
    });

    g.fillStyle(0x454d59);
    g.fillRect(0, 0, 960, 76);
    g.lineStyle(3, 0xf2b544);
    g.lineBetween(0, 2, 960, 2);
    g.generateTexture("floor", 960, 76);
    g.clear();

    g.fillStyle(0x657383);
    g.fillRect(0, 0, 150, 22);
    g.generateTexture("ledge", 150, 22);
    g.clear();

    g.fillStyle(0x454f5d);
    g.fillRect(8, 23, 32, 29);
    g.fillStyle(0xf2b544);
    g.fillRect(9, 3, 30, 23);
    g.fillStyle(0x252a31);
    g.fillRect(13, 8, 22, 12);
    g.fillStyle(0x53f4e7);
    g.fillRect(16, 11, 6, 5);
    g.fillRect(27, 11, 6, 5);
    g.fillStyle(0x8793a2);
    g.fillRect(11, 51, 10, 13);
    g.fillRect(28, 51, 10, 13);
    g.generateTexture("robot", 48, 68);
    g.clear();

    g.fillStyle(0x75493f);
    g.fillRect(11, 20, 28, 34);
    g.fillStyle(0xb87b54);
    g.fillRect(7, 2, 36, 24);
    g.fillStyle(0x29232a);
    g.fillRect(13, 9, 7, 7);
    g.fillRect(30, 9, 7, 7);
    g.fillStyle(0x44434b);
    g.fillRect(12, 53, 10, 12);
    g.fillRect(28, 53, 10, 12);
    g.generateTexture("dummy", 50, 68);
    g.clear();

    const colors = {
      arm: 0x53f4e7,
      movement: 0x8793a2,
      body: 0xc06c49,
      head: 0xf2b544,
      back: 0x9c78e8,
      core: 0x6ce17b
    };

    for (const [slot, color] of Object.entries(colors)) {
      g.fillStyle(color);
      g.fillRect(0, 0, 28, 24);
      g.lineStyle(2, 0xffffff);
      g.strokeRect(0, 0, 28, 24);
      g.generateTexture("pickup_" + slot, 28, 24);
      g.clear();
    }

    g.destroy();
  }

  clearScreen() {
    this.children.removeAll(true);
    this.slotTexts = [];
    this.partTexts = [];
    this.pickups = [];
  }

  addButton(x, y, width, height, label, callback, color = 0x343b46) {
    const box = this.add.rectangle(
      x, y, width, height, color
    ).setStrokeStyle(2, 0x687381).setInteractive({
      useHandCursor: true
    });

    const text = this.add.text(x, y, label, {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: width - 12 }
    }).setOrigin(0.5);

    box.on("pointerover", () => box.setFillStyle(0x515c6a));
    box.on("pointerout", () => box.setFillStyle(color));
    box.on("pointerdown", callback);

    return { box, text };
  }

  showGarage() {
    this.clearScreen();
    this.mode = "garage";

    this.add.rectangle(W / 2, H / 2, W, H, 0x151a22);

    this.add.text(36, 22, "SCRAPHEAD // GARAGE", {
      fontFamily: "monospace",
      fontSize: "26px",
      color: "#f2b544"
    });

    this.add.text(36, 55,
      "BUILD YOUR ROBOT. EVERY PART HAS A PRICE.", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#aeb4be"
      }
    );

    this.add.text(38, 100, "EQUIPMENT SLOTS", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#53f4e7"
    });

    SLOTS.forEach((slot, i) => {
      const y = 137 + i * 54;
      const selected = i === this.selectedSlot;

      const b = this.addButton(
        190, y, 300, 43,
        slot.label + "  |  " + PARTS[slot.key][GameData.loadout[slot.key]].name,
        () => {
          this.selectedSlot = i;
          this.showGarage();
        },
        selected ? 0x465563 : 0x292f39
      );

      if (selected) {
        b.box.setStrokeStyle(2, 0xf2b544);
      }

      this.slotTexts.push(b);
    });

    this.add.text(535, 105, "PART SELECTOR", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#53f4e7"
    });

    const slot = SLOTS[this.selectedSlot];
    const options = GameData.unlocked[slot.key];
    const currentIndex = options.indexOf(GameData.loadout[slot.key]);
    const currentKey = options[currentIndex];
    const item = PARTS[slot.key][currentKey];

    this.add.text(535, 145, item.name, {
      fontFamily: "monospace",
      fontSize: "23px",
      color: "#f2b544",
      wordWrap: { width: 380 }
    });

    this.add.text(535, 185,
      this.wrap(item.description, 42), {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#e0e5eb",
        lineSpacing: 5
      }
    );

    this.add.text(535, 238,
      this.wrap("DOWNSIDE: " + item.drawback, 42), {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ff9d79",
        lineSpacing: 5
      }
    );

    this.addButton(595, 315, 105, 42, "< PREV", () => {
      this.cyclePart(-1);
    });

    this.addButton(820, 315, 105, 42, "NEXT >", () => {
      this.cyclePart(1);
    });

    this.addButton(710, 370, 210, 42, "EQUIP PART", () => {
      GameData.loadout[slot.key] = currentKey;
      this.showGarage();
    }, 0x33594d);

    const stats = getBuildStats(GameData.loadout);
    this.add.text(535, 430,
      `POWER: ${stats.energy} / ${stats.capacity}\n` +
      `BUILD: ${stats.valid ? "READY" : "OVERLOADED"}\n` +
      `DAMAGE: ${stats.damage}   ARMOR: ${stats.armor}\n` +
      `SPEED: ${stats.speed}   JUMP: ${stats.jump}`, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: stats.valid ? "#bce8c7" : "#ff7474",
        lineSpacing: 5
      }
    );

    this.addButton(780, 495, 300, 42,
      stats.valid ? "ENTER THE SCRAP PIT" : "FIX POWER OVERLOAD",
      () => {
        if (getBuildStats(GameData.loadout).valid) {
          this.startBattle();
        } else {
          this.message = "Your equipment needs more power capacity!";
        }
      },
      stats.valid ? 0x8b5a25 : 0x542e2e
    );

    this.add.text(38, 486,
      "Tip: select a slot, preview a part, then equip it.", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#aeb4be"
      }
    );
  }

  wrap(text, width) {
    const words = text.split(" ");
    const lines = [];
    let line = "";

    for (const word of words) {
      if ((line + " " + word).trim().length > width) {
        lines.push(line);
        line = word;
      } else {
        line = (line + " " + word).trim();
      }
    }

    if (line) lines.push(line);
    return lines.join("\n");
  }

  cyclePart(direction) {
    const slot = SLOTS[this.selectedSlot];
    const options = GameData.unlocked[slot.key];
    const index = options.indexOf(GameData.loadout[slot.key]);
    const next = (index + direction + options.length) % options.length;

    // Preview only. Press EQUIP PART to save the selection.
    this.previewKey = options[next];
    GameData.loadout[slot.key] = options[next];
    this.showGarage();
  }

  startBattle() {
    this.clearScreen();
    this.mode = "battle";
    this.dummyHP = 100;
    this.playerHP = 100;
    this.lastAttack = 0;
    this.brokenSlots = new Set();
    this.dummyBroken = new Set();
    this.droppedParts = this.physics.add.group();

    this.add.rectangle(W / 2, H / 2, W, H, 0x171c25);

    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(480, 502, "floor");
    this.platforms.create(700, 375, "ledge");

    this.add.text(18, 18, "THE SCRAP PIT // LOADOUT ACTIVE", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#f2b544"
    });

    this.player = this.physics.add.sprite(190, 420, "robot");
    this.player.setCollideWorldBounds(false);
    this.player.setDragX(900);
    this.player.setMaxVelocity(450, 900);

    this.dummy = this.physics.add.sprite(520, 420, "dummy");
    this.dummy.setCollideWorldBounds(false);
    this.dummy.setDragX(180);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.dummy, this.platforms);
    this.physics.add.collider(this.droppedParts, this.platforms);

    this.physics.add.overlap(
      this.player, this.droppedParts, this.collectPickup, null, this
    );

    this.keys = this.input.keyboard.addKeys({
      a: "A", d: "D", w: "W", space: "SPACE",
      j: "J", f: "F", r: "R",
      left: "LEFT", right: "RIGHT", up: "UP"
    });
    this.cursors = this.input.keyboard.createCursorKeys();

    this.add.text(18, 65, "YOUR ROBOT", {
      fontFamily: "monospace", fontSize: "12px", color: "#53f4e7"
    });
    this.playerBar = this.add.rectangle(20, 91, 180, 9, 0x53f4e7)
      .setOrigin(0, 0.5);

    this.add.text(280, 65, "DUMMY", {
      fontFamily: "monospace", fontSize: "12px", color: "#ff8c66"
    });
    this.dummyBar = this.add.rectangle(280, 91, 180, 9, 0xff8c66)
      .setOrigin(0, 0.5);

    this.battleInfo = this.add.text(18, 110, "", {
      fontFamily: "monospace", fontSize: "12px", color: "#e8e8e8",
      lineSpacing: 5
    });

    this.notice = this.add.text(W / 2, 220, "", {
      fontFamily: "monospace", fontSize: "25px", color: "#ffffff",
      align: "center", stroke: "#101216", strokeThickness: 5
    }).setOrigin(0.5).setDepth(20);

    this.attackBox = this.add.rectangle(
      0, 0, 70, 40, 0xffd166, 0.5
    ).setVisible(false).setDepth(10);

    this.addButton(830, 40, 200, 38, "BACK TO GARAGE", () => {
      this.showGarage();
    }, 0x343b46);
  }

  update(time) {
    if (this.mode !== "battle" || !this.player || !this.player.active) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.startBattle();
      return;
    }

    const stats = getBuildStats(GameData.loadout);
    const left = this.keys.a.isDown || this.keys.left.isDown;
    const right = this.keys.d.isDown || this.keys.right.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.keys.w) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.up);

    let speed = stats.speed;

    if (GameData.loadout.back === "booster" && (left || right)) {
      speed += 60;
    }

    if (left && !right) {
      this.player.setVelocityX(-speed);
      this.facing = -1;
    } else if (right && !left) {
      this.player.setVelocityX(speed);
      this.facing = 1;
    }

    const grounded = this.player.body.blocked.down ||
      this.player.body.touching.down;

    if (jump && grounded && stats.jump > 0) {
      let jumpPower = stats.jump;
      if (GameData.loadout.back === "jetpack") jumpPower += 100;
      this.player.setVelocityY(-jumpPower);
    }

    const attack = Phaser.Input.Keyboard.JustDown(this.keys.j) ||
      Phaser.Input.Keyboard.JustDown(this.keys.f);

    if (attack && time - this.lastAttack >= stats.cooldown) {
      this.lastAttack = time;
      this.attackBox.setPosition(
        this.player.x + this.facing * (stats.range / 2),
        this.player.y
      );
      this.attackBox.setVisible(true);
      this.time.delayedCall(120, () => {
        if (this.attackBox && this.attackBox.active) {
          this.attackBox.setVisible(false);
        }
      });

      const dx = this.dummy.x - this.player.x;
      const dy = Math.abs(this.dummy.y - this.player.y);

      if (this.dummyHP > 0 && dx * this.facing > 0 &&
          Math.abs(dx) < stats.range && dy < 75) {
        this.dummyHP = Math.max(0, this.dummyHP - stats.damage);
        this.dummy.setVelocityX(this.facing * 400);
        this.dummy.setVelocityY(-170);

        if (this.dummyHP <= 75) this.dropDummyPart("arm");
        if (this.dummyHP <= 50) this.dropDummyPart("body");
        if (this.dummyHP <= 25) this.dropDummyPart("head");
        if (this.dummyHP <= 0) {
          this.notice.setText("DUMMY DESTROYED!\nR TO RESTART");
        }
      }
    }

    if (this.player.y > H + 80) {
      this.notice.setText("ROBOT LOST!\nR TO RESTART");
    }

    this.playerBar.width = 180 * (this.playerHP / 100);
    this.dummyBar.width = 180 * (this.dummyHP / 100);

    this.battleInfo.setText(
      `ARM: ${PARTS.arm[GameData.loadout.arm].name}\n` +
      `MOVEMENT: ${PARTS.movement[GameData.loadout.movement].name}\n` +
      `DAMAGE: ${stats.damage}  ARMOR: ${stats.armor}\n` +
      `POWER: ${stats.energy}/${stats.capacity}`
    );
  }

  dropDummyPart(slot) {
    if (this.dummyBroken.has(slot)) return;
    this.dummyBroken.add(slot);

    const item = this.physics.add.image(
      this.dummy.x, this.dummy.y - 20, "pickup_" + slot
    );

    item.setBounce(0.4);
    item.setCollideWorldBounds(true);
    item.setVelocity(
      Phaser.Math.Between(-180, 180), -240
    );
    item.setData("slot", slot);
    item.setData("collected", false);

    this.droppedParts.add(item);
    this.physics.add.collider(item, this.platforms);

    this.notice.setText("DUMMY DROPPED A " + slot.toUpperCase() + " PART!");
  }

  collectPickup(player, item) {
    if (!item.active || item.getData("collected")) return;
    item.setData("collected", true);

    const slot = item.getData("slot");
    const choices = GameData.unlocked[slot];

    if (choices && choices.length) {
      const newPart = choices.find(key =>
        key !== GameData.loadout[slot] &&
        !GameData.unlocked[slot].includes(key + "_collected")
      );

      if (newPart) {
        // All catalog parts are available in the garage in this prototype.
        this.notice.setText("SCRAP COLLECTED: " + slot.toUpperCase());
      } else {
        this.notice.setText("SCRAP COLLECTED!");
      }
    }

    item.destroy();
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
    arcade: { gravity: { y: 1100 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [ScrapheadGame]
});
