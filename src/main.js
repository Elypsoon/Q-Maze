import Phaser from "phaser";
import MenuScene from "./scenes/MenuScene";
import GameScene from "./scenes/GameScene";
import QuestionScene from "./scenes/QuestionScene";

const config = {
  type: Phaser.WEBGL, // Forzar WebGL para mejor rendimiento
  scale: {
    mode: Phaser.Scale.RESIZE, 
    parent: "game",
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
    // Mejorar la resolución y nitidez - usar el doble de resolución
    resolution: Math.max(2, window.devicePixelRatio || 2),
  },
  scene: [MenuScene, GameScene, QuestionScene],
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  backgroundColor: '#1a1a2e',
  // Configuración de renderizado para mejor calidad
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false,
    powerPreference: "high-performance" // Usar GPU de alto rendimiento
  }
};

const game = new Phaser.Game(config);

// Event listener para ajustar el tamaño cuando se redimensione la ventana
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
