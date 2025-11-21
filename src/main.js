import Phaser from "phaser";
import PreloadScene from "./scenes/PreloadScene";
import MenuScene from "./scenes/MenuScene";
import OptionsScene from "./scenes/OptionsScene";
import GameScene from "./scenes/GameScene";
import QuestionScene from "./scenes/QuestionScene";
import BluetoothSetupScene from "./scenes/BluetoothSetupScene";
import BluetoothController from "./services/BluetoothController";

// Crear instancia global del controlador Bluetooth
window.bluetoothController = new BluetoothController();

const config = {
  type: Phaser.WEBGL,
  scale: {
    mode: Phaser.Scale.RESIZE, 
    parent: "game",
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
    // Obtiene la mejor resolución posible según el dispositivo
    resolution: Math.max(2, window.devicePixelRatio || 2),
  },
  scene: [PreloadScene, MenuScene, OptionsScene, GameScene, QuestionScene, BluetoothSetupScene],
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  backgroundColor: '#1a1a2e',
  // Configuración de renderizado
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false,
    powerPreference: "high-performance" // Usar GPU si es posible
  }
};

const game = new Phaser.Game(config);

// Event listener para ajustar el tamaño cuando se redimensione la ventana
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
