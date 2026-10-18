"use strict";

window.SCRAP_PARTS = {
  arm: {
    rustyFist: {
      name: "Rusty Fist",
      damage: 18,
      range: 72,
      cooldown: 350,
      energy: 0,
      speed: 0,
      jump: 0,
      armor: 0,
      drawback: "Basic, reliable damage",
      description: "A dependable scrap-metal fist."
    },
    hammer: {
      name: "Junk Hammer",
      damage: 32,
      range: 92,
      cooldown: 800,
      energy: 2,
      speed: -25,
      jump: 0,
      armor: 0,
      drawback: "Slow attacks, slower movement",
      description: "Huge damage with a heavy swing."
    },
    sword: {
      name: "Scrap Sword",
      damage: 24,
      range: 110,
      cooldown: 420,
      energy: 1,
      speed: 0,
      jump: 0,
      armor: 0,
      drawback: "Costs energy",
      description: "A quick blade from scrap metal."
    },
    drill: {
      name: "Power Drill",
      damage: 13,
      range: 64,
      cooldown: 200,
      energy: 3,
      speed: 0,
      jump: 0,
      armor: 0,
      drawback: "Low damage, high power use",
      description: "Rapid attacks at close range."
    },
    scrapGun: {
      name: "Scrap Shooter",
      damage: 20,
      range: 240,
      cooldown: 650,
      energy: 2,
      speed: 0,
      jump: 0,
      armor: 0,
      drawback: "Long cooldown; uses energy",
      description: "A ranged prototype equipped on the arm."
    }
  },
  movement: {
    scrapLegs: {
      name: "Scrap Legs",
      speed: 240,
      jump: 500,
      energy: 0,
      drawback: "No special movement",
      description: "Balanced walking and jumping."
    },
    wheels: {
      name: "Junk Wheels",
      speed: 330,
      jump: 0,
      energy: 0,
      drawback: "Cannot jump",
      description: "Fast on flat ground."
    },
    springLegs: {
      name: "Spring Legs",
      speed: 210,
      jump: 630,
      energy: 1,
      drawback: "Slower running",
      description: "Huge jumps, slower movement."
    },
    rocketLegs: {
      name: "Rocket Legs",
      speed: 270,
      jump: 580,
      energy: 3,
      drawback: "Consumes power; harder to control",
      description: "Boosted jumps with a sharper control curve."
    }
  },
  body: {
    scrapFrame: {
      name: "Scrap Frame",
      armor: 0,
      speed: 0,
      energy: 0,
      drawback: "No protection",
      description: "A basic lightweight frame."
    },
    ironArmor: {
      name: "Iron Armor",
      armor: 28,
      speed: -20,
      energy: 1,
      drawback: "Reduces movement speed",
      description: "Extra protection at a cost."
    },
    heavyFrame: {
      name: "Heavy Frame",
      armor: 45,
      speed: -50,
      energy: 2,
      drawback: "Very slow",
      description: "Built to take a beating."
    },
    shieldFrame: {
      name: "Shield Frame",
      armor: 20,
      speed: -10,
      energy: 2,
      drawback: "Uses more power",
      description: "Defensive all-rounder."
    }
  },
  head: {
    junkHead: {
      name: "Junk Head",
      energy: 0,
      drawback: "No special ability",
      description: "A bucket with glowing eyes."
    },
    scanner: {
      name: "Scanner Head",
      energy: 1,
      drawback: "Consumes power",
      description: "Highlights nearby loot and hazards."
    },
    targeter: {
      name: "Targeting Head",
      energy: 2,
      drawback: "Higher power use",
      description: "Increases weapon damage by 20%."
    },
    nightVision: {
      name: "Night Vision",
      energy: 1,
      drawback: "Consumes power",
      description: "Improves visibility in dim arenas."
    }
  },
  back: {
    emptyBack: {
      name: "Empty Back",
      energy: 0,
      drawback: "No special ability",
      description: "Nothing attached."
    },
    jetpack: {
      name: "Junk Jetpack",
      energy: 3,
      drawback: "Consumes power when jumping",
      description: "Extra lift on jump."
    },
    booster: {
      name: "Dash Booster",
      energy: 2,
      drawback: "Consumes power",
      description: "Extra speed while moving."
    },
    turret: {
      name: "Mini Turret",
      energy: 3,
      drawback: "High power use",
      description: "A future automated attack module."
    },
    extraArmor: {
      name: "Back Armor",
      energy: 1,
      drawback: "Slight speed penalty",
      description: "Extra protection from behind."
    }
  },
  core: {
    basicCore: {
      name: "Basic Core",
      capacity: 3,
      drawback: "Limited equipment power",
      description: "A standard power source."
    },
    strongCore: {
      name: "Strong Core",
      capacity: 6,
      drawback: "No extra armor",
      description: "Supports more powerful equipment."
    },
    unstableCore: {
      name: "Unstable Core",
      capacity: 9,
      drawback: "Reduces armor by 10",
      description: "High capacity, unstable output."
    }
  }
};

window.SCRAP_SLOTS = [
  { key: "arm", label: "ARM" },
  { key: "movement", label: "MOVEMENT" },
  { key: "body", label: "BODY" },
  { key: "head", label: "HEAD" },
  { key: "back", label: "BACK" },
  { key: "core", label: "POWER CORE" }
];

window.SCRAP_DEFAULT_LOADOUT = {
  arm: "rustyFist",
  movement: "scrapLegs",
  body: "scrapFrame",
  head: "junkHead",
  back: "emptyBack",
  core: "basicCore"
};
