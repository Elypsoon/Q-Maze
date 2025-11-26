import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Crear pantalla de carga
    const bg = this.add.graphics();
    bg.fillStyle(0x0f0c29);
    bg.fillRect(0, 0, width, height);

    // Título
    const title = this.add.text(width / 2, height / 2 - 100, 'Q-MAZE', {
      fontSize: '80px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#6c5ce7',
      strokeThickness: 8
    });
    title.setOrigin(0.5);

    // Texto de carga
    const loadingText = this.add.text(width / 2, height / 2, 'Cargando...', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#a29bfe'
    });
    loadingText.setOrigin(0.5);

    // Barra de progreso - fondo
    const progressBarWidth = 400;
    const progressBarHeight = 30;
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - progressBarWidth / 2, height / 2 + 50, progressBarWidth, progressBarHeight);

    // Barra de progreso - relleno
    const progressBar = this.add.graphics();

    // Texto de porcentaje
    const percentText = this.add.text(width / 2, height / 2 + 65, '0%', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff'
    });
    percentText.setOrigin(0.5);

    // Actualizar barra de progreso
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x6c5ce7, 1);
      progressBar.fillRect(
        width / 2 - progressBarWidth / 2 + 5,
        height / 2 + 55,
        (progressBarWidth - 10) * value,
        progressBarHeight - 10
      );
      percentText.setText(Math.floor(value * 100) + '%');
    });

    this.load.on('complete', () => {
      loadingText.setText('¡Listo!');
      progressBar.destroy();
      progressBox.destroy();
      percentText.destroy();
    });

    // Cargar todos los audios del juego
    this.load.audio('menuMusic', 'assets/audio/menu.mp3');
    this.load.audio('gameMusic', 'assets/audio/game.mp3');
    this.load.audio('questionsMusic', 'assets/audio/questions.mp3');
    this.load.audio('crash1', 'assets/audio/crash1.mp3');
    this.load.audio('crash2', 'assets/audio/crash2.mp3');
    this.load.audio('win', 'assets/audio/win.mp3');
    this.load.audio('lose', 'assets/audio/lose.mp3');
  }

  create() {
    // Inicializar configuración global si no existe
    if (!window.gameSettings) {
      window.gameSettings = {
        volume: 0.5,
        playerName: 'Runner',
        selectedCategories: ['all'] // Array para múltiples categorías
      };
    }
    
    // Aplicar volumen global
    this.sound.setVolume(window.gameSettings.volume);
    
    // Asegurar que el BluetoothController esté disponible globalmente
    if (!window.bluetoothController) {
      console.warn('⚠️ BluetoothController no encontrado en window, creando nueva instancia');
      // Importación dinámica por si acaso
      import('../services/BluetoothController').then((module) => {
        window.bluetoothController = new module.default();
      });
    }
    
    // Pequeña pausa para mostrar "¡Listo!" y luego ir al menú
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene', {
        bluetoothController: window.bluetoothController
      });
    });
  }
}
