import Phaser from "phaser";
import MenuScene from "./scenes/MenuScene";
import GameScene from "./scenes/GameScene";
import QuestionScene from "./scenes/QuestionScene";

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE, 
    parent: "game",
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
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

// Event listener para ajustar el tamaño cuando se redimensione la ventana
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
