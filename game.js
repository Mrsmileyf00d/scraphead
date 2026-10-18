"use strict";

// ============================================
// SCRAPHEAD: SCRAP WARZ
// Stage 1 - Playable combat prototype
// ============================================

const CONFIG = {
  width: 960,
  height: 540,
  gravity: 1100,
  moveSpeed: 270,
  jumpSpeed: 490,
  attackCooldown: 360,
  attackRange: 92,
  attackDamage: 25,
  attackKnockback: 470
};

// GAME STATE: data separate from rendering.
// This structure can later be synchronized online.
const GameState = {
  player: {
    hp: 100,
    maxHp: 100,
    facing: 1,
    grounded: false,
    attackReady: true
  },
  dummy: {
    hp: 100,
    maxHp: 100,
    alive: true
  },
  gameOver: false
};

class ScrapheadScene extends Phaser.Scene {
  constructor() {
    super("ScrapheadScene");
  }

  create() {
    this.resetState();
    this.createTextures();
    this.createArena();
    this.createFighters();
    this.createUI();
    this.createControls();

    this.attackVisual = this.add.rectangle(
      0, 0, 72, 40, 0xffbd45, 0.5
    ).setVisible(false).setDepth(10);

    this.attackGraphics = this.add.graphics()
      .setDepth(11);

    this.message = this.add.text(
      CONFIG.width / 2, 230, "",
      {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#ffffff",
        align: "center",
        stroke: "#101216",
        strokeThickness: 6
      }
    ).setOrigin(0.5).setDepth(20);

    this.physics.world.setBounds(
      0, 0, CONFIG.width, CONFIG.height
    );
  }

  resetState() {
    GameState.player.hp = 100;
    GameState.player.facing = 1;
    GameState.player.grounded = false;
    GameState.player.attackReady = true;
    GameState.dummy.hp = 100;
    GameState.dummy.alive = true;
    GameState.gameOver = false;
  }

  createTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Chunky junk robot.
    g.fillStyle(0x444d59);
    g.fillRect(8, 23, 32, 29);
    g.fillStyle(0x778596);
    g.fillRect(4, 20, 40, 8);
    g.fillStyle(0x303741);
    g.fillRect(11, 51, 10, 13);
    g.fillRect(28, 51, 10, 13);
    g.fillStyle(0xf2b544);
    g.fillRect(9, 3, 30, 23);
    g.fillStyle(0x252a31);
    g.fillRect(13, 8, 22, 12);
    g.fillStyle(0x53f4e7);
    g.fillRect(16, 11, 6, 5);
    g.fillRect(27, 11, 6, 5);
    g.fillStyle(0xabb5c0);
    g.fillRect(41, 29, 9, 8);
    g.fillStyle(0xb7c0cb);
    g.fillRect(48, 32, 16, 8);
    g.generateTexture("robot", 68, 68);
    g.clear();

    // Training dummy.
    g.fillStyle(0x6f4740);
    g.fillRect(11, 20, 28, 34);
    g.fillStyle(0xb87b54);
    g.fillRect(7, 2, 36, 24);
    g.fillStyle(0x29232a);
    g.fillRect(13, 9, 7, 7);
    g.fillRect(30, 9, 7, 7);
    g.fillStyle(0xd8d1bb);
    g.fillRect(15, 31, 20, 5);
    g.fillStyle(0x44434b);
    g.fillRect(12, 53, 10, 12);
    g.fillRect(28, 53, 10, 12);
    g.generateTexture("dummy", 50, 68);

    g.destroy();
  }

  createArena() {
    this.add.rectangle(
      480, 270, 960, 540, 0x171c25
    );

    // Background skyline.
    const bg = this.add.graphics();
    bg.fillStyle(0x202630, 1);

    for (let i = 0; i < 16; i++) {
      const x = i * 68;
      const h = 65 + ((i * 37) % 110);
      bg.fillRect(x, 425 - h, 45, h);

      bg.fillStyle(0x3b4148, 0.6);
      for (let y = 440 - h; y < 420; y += 18) {
        bg.fillRect(x + 9, y, 5, 5);
        bg.fillRect(x + 25, y, 5, 5);
      }
      bg.fillStyle(0x202630, 1);
    }

    // Floor.
    this.platforms = this.physics.add.staticGroup();

    const floor = this.add.rectangle(
      480, 502, 960, 76, 0x454b52
    );
    this.physics.add.existing(floor, true);
    this.platforms.add(floor);

    const details = this.add.graphics();
    details.lineStyle(3, 0xf2b544, 1);
    details.lineBetween(0, 464, 960, 464);
    details.lineStyle(1, 0x6a7078, 1);

    for (let x = 0; x < 960; x += 40) {
      details.lineBetween(x, 478, x + 20, 478);
      details.lineBetween(x, 492, x, 530);
    }

    // A raised platform for jumping practice.
    const ledge = this.add.rectangle(
      700, 375, 150, 22, 0x59636c
    );
    this.physics.add.existing(ledge, true);
    this.platforms.add(ledge);

    this.add.text(18, 18, "THE SCRAP PIT // TRAINING BAY", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#f2b544"
    });

    this.add.text(18, 40, "BUILD. BREAK. STEAL.", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#9099a5"
    });
  }

  createFighters() {
    this.player = this.physics.add.sprite(
      190, 420, "robot"
    );
    this.player.setCollideWorldBounds(false);
    this.player.setBounce(0.08);
    this.player.setDragX(1000);
    this.player.setMaxVelocity(420, 900);
    this.player.body.setSize(44, 58);
    this.player.setDepth(5);

    this.dummy = this.physics.add.sprite(
      520, 420, "dummy"
    );
    this.dummy.setCollideWorldBounds(false);
    this.dummy.setBounce(0.12);
    this.dummy.setDragX(180);
    this.dummy.body.setSize(36, 58);
    this.dummy.setDepth(5);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.dummy, this.platforms);

    // Keep the dummy from being pushed around by overlap jitter.
    this.physics.add.collider(this.player, this.dummy);

    this.dummy.setData("flash", false);
  }

  createUI() {
    this.add.text(18, 76, "YOUR ROBOT", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#53f4e7"
    });

    this.playerBarBack = this.add.rectangle(
      110, 104, 180, 15, 0x292e36
    );
    this.playerBar = this.add.rectangle(
      20, 104, 180, 9, 0x53f4e7
    ).setOrigin(0, 0.5);

    this.add.text(370, 76, "TRAINING DUMMY", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ff8c66"
    });

    this.dummyBarBack = this.add.rectangle(
      470, 104, 180, 15, 0x292e36
    );
    this.dummyBar = this.add.rectangle(
      380, 104, 180, 9, 0xff8c66
    ).setOrigin(0, 0.5);

    this.playerHpText = this.add.text(20, 117, "HP: 100 / 100", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#b9c2cd"
    });

    this.dummyHpText = this.add.text(380, 117, "HP: 100 / 100", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#b9c2cd"
    });
  }

  createControls() {
    this.keys = this.input.keyboard.addKeys({
      left: "A",
      right: "D",
      up: "W",
      jump: "SPACE",
      attack: "J",
      attackAlt: "F",
      restart: "R",
      arrowLeft: "LEFT",
      arrowRight: "RIGHT",
      arrowUp: "UP"
    });

    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.scene.restart();
      return;
    }

    if (GameState.gameOver) return;

    this.handleMovement();
    this.handleAttack(time);
    this.handleFalling();
    this.updateUI();
    this.drawAttackEffect();
  }

  handleMovement() {
    const left = this.keys.left.isDown ||
      this.cursors.left.isDown || this.keys.arrowLeft.isDown;

    const right = this.keys.right.isDown ||
      this.cursors.right.isDown || this.keys.arrowRight.isDown;

    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(this.keys.arrowUp);

    if (left && !right) {
      this.player.setVelocityX(-CONFIG.moveSpeed);
      GameState.player.facing = -1;
    } else if (right && !left) {
      this.player.setVelocityX(CONFIG.moveSpeed);
      GameState.player.facing = 1;
    }

    GameState.player.grounded = this.player.body.blocked.down ||
      this.player.body.touching.down;

    if (jumpPressed && GameState.player.grounded) {
      this.player.setVelocityY(-CONFIG.jumpSpeed);
    }

    // Visual lean while moving.
    this.player.setAngle(
      Phaser.Math.Clamp(this.player.body.velocity.x * -0.025, -8, 8)
    );
  }

  handleAttack(time) {
    const pressed = Phaser.Input.Keyboard.JustDown(this.keys.attack) ||
      Phaser.Input.Keyboard.JustDown(this.keys.attackAlt);

    if (!pressed || !GameState.player.attackReady) return;

    GameState.player.attackReady = false;
    this.lastAttackTime = time;

    this.attackVisual.setPosition(
      this.player.x + GameState.player.facing * 55,
      this.player.y - 2
    );
    this.attackVisual.setVisible(true);

    this.time.delayedCall(100, () => {
      if (this.attackVisual && this.attackVisual.active) {
        this.attackVisual.setVisible(false);
      }
    });

    if (!GameState.dummy.alive) return;

    const dx = this.dummy.x - this.player.x;
    const dy = Math.abs(this.dummy.y - this.player.y);
    const facingTarget = dx * GameState.player.facing > 0;

    if (facingTarget &&
        Math.abs(dx) <= CONFIG.attackRange &&
        dy < 70) {
      GameState.dummy.hp = Math.max(
        0, GameState.dummy.hp - CONFIG.attackDamage
      );

      this.dummy.setVelocityX(
        GameState.player.facing * CONFIG.attackKnockback
      );
      this.dummy.setVelocityY(-180);
      this.dummy.setTint(0xffffff);

      this.time.delayedCall(120, () => {
        if (this.dummy && this.dummy.active) {
          this.dummy.clearTint();
        }
      });

      if (GameState.dummy.hp <= 0) {
        GameState.dummy.alive = false;
        this.dummy.setVelocity(
          GameState.player.facing * 550, -350
        );
        this.message.setText("DUMMY DESTROYED!\nPRESS R TO RESTART");
        GameState.gameOver = true;
      }
    }

    this.time.delayedCall(CONFIG.attackCooldown, () => {
      GameState.player.attackReady = true;
    });
  }

  handleFalling() {
    if (this.player.y > CONFIG.height + 80) {
      GameState.player.hp = 0;
      GameState.gameOver = true;
      this.message.setText("ROBOT LOST!\nPRESS R TO RESTART");
    }

    if (this.dummy.y > CONFIG.height + 100) {
      GameState.dummy.hp = 0;
      GameState.dummy.alive = false;
    }
  }

  updateUI() {
    const playerRatio = GameState.player.hp /
      GameState.player.maxHp;
    const dummyRatio = GameState.dummy.hp /
      GameState.dummy.maxHp;

    this.playerBar.width = 180 * playerRatio;
    this.dummyBar.width = 180 * dummyRatio;

    this.playerHpText.setText(
      `HP: ${GameState.player.hp} / ${GameState.player.maxHp}`
    );
    this.dummyHpText.setText(
      `HP: ${GameState.dummy.hp} / ${GameState.dummy.maxHp}`
    );
  }

  drawAttackEffect() {
    this.attackGraphics.clear();

    if (this.attackVisual.visible) {
      this.attackGraphics.lineStyle(3, 0xffe0a0, 0.9);
      this.attackGraphics.strokeRect(
        this.attackVisual.x - 36,
        this.attackVisual.y - 20,
        72, 40
      );
    }
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: CONFIG.width,
  height: CONFIG.height,
  backgroundColor: "#171c25",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: CONFIG.gravity },
      debug: false
    }
  },
  scene: [ScrapheadScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
});
