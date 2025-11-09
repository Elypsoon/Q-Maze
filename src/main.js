import Phaser from "phaser";
import MenuScene from "./scenes/MenuScene";
import GameScene from "./scenes/GameScene";
import QuestionScene from "./scenes/QuestionScene";

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    parent: "game",
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1200,
    height: 800
  },
  scene: [MenuScene, GameScene, QuestionScene],
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  backgroundColor: '#1a1a2e'
};

const game = new Phaser.Game(config);
