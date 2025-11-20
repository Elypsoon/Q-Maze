import Phaser from 'phaser';
import { DIFFICULTY_LEVELS, GAME_CONFIG } from '../config/gameConfig';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data) {
    this.selectedDifficulty = data.difficulty || DIFFICULTY_LEVELS.MEDIUM;
    this.bluetoothController = data.bluetoothController || window.bluetoothController;
    
    this.playerName = data.playerName || 'Runner';
  }

  create() {
    this.createMenu();
    
    // Escuchar cambios de tamaño
    this.scale.on('resize', this.resize, this);
  }

  createMenu() {
    // Limpiar elementos anteriores si existen
    if (this.menuContainer) {
      this.menuContainer.destroy();
    }
    
    // Limpiar input HTML anterior si existe
    this.cleanupNameInput();

    const width = this.scale.width;
    const height = this.scale.height;

    // Contenedor para todos los elementos del menú
    this.menuContainer = this.add.container(0, 0);

    // Fondo con gradiente moderno (azul oscuro a morado)
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x0f0c29, 0x302b63, 0x24243e, 0x302b63, 1);
    graphics.fillRect(0, 0, width, height);
    this.menuContainer.add(graphics);

    // Título del juego - ajustado al tamaño de pantalla
    const titleSize = Math.min(100, width / 10);
    const title = this.add.text(width / 2, height * 0.15, 'Q-MAZE', {
      fontSize: titleSize + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#6c5ce7',
      strokeThickness: 8,
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: '#000000',
        blur: 8,
        fill: true
      }
    });
    title.setOrigin(0.5);

    // Subtítulo
    const subtitleSize = Math.min(36, width / 25);
    const subtitle = this.add.text(width / 2, height * 0.25, 'Laberinto Educativo', {
      fontSize: subtitleSize + 'px',
      fontFamily: 'Arial',
      color: '#a29bfe',
      fontStyle: 'italic'
    });
    subtitle.setOrigin(0.5);

    // Descripción
    const descSize = Math.min(24, width / 40);
    const description = this.add.text(width / 2, height * 0.33, 
      'Navega por el laberinto y responde preguntas\n' +
      'para mantener tus vidas. ¡Llega al final!', {
      fontSize: descSize + 'px',
      fontFamily: 'Arial',
      color: '#bdc3c7',
      align: 'center'
    });
    description.setOrigin(0.5);

    // Selector de dificultad
    const diffSize = Math.min(26, width / 38);
    const diffLabel = this.add.text(width / 2, height * 0.43, 'Dificultad:', {
      fontSize: diffSize + 'px',
      fontFamily: 'Arial Black',
      color: '#ecf0f1'
    });
    diffLabel.setOrigin(0.5);

    // Botones de dificultad
    const diffButtonWidth = Math.min(120, width / 8);
    const diffButtonHeight = Math.min(50, height / 15);
    const diffButtonY = height * 0.51;
    const spacing = diffButtonWidth + 20;
    
    // Calcular posición inicial para centrar los 3 botones
    const startX = width / 2 - spacing;
    
    // Botón Fácil
    this.easyButton = this.createDifficultyButton(
      startX, 
      diffButtonY, 
      'Fácil', 
      DIFFICULTY_LEVELS.EASY,
      diffButtonWidth, 
      diffButtonHeight
    );
    
    // Botón Medio
    this.mediumButton = this.createDifficultyButton(
      startX + spacing, 
      diffButtonY, 
      'Medio', 
      DIFFICULTY_LEVELS.MEDIUM,
      diffButtonWidth, 
      diffButtonHeight
    );
    
    // Botón Difícil
    this.hardButton = this.createDifficultyButton(
      startX + spacing * 2, 
      diffButtonY, 
      'Difícil', 
      DIFFICULTY_LEVELS.HARD,
      diffButtonWidth, 
      diffButtonHeight
    );

    // Descripción de la dificultad seleccionada
    const diffDescSize = Math.min(16, width / 60);
    const selectedConfig = GAME_CONFIG[this.selectedDifficulty];
    this.difficultyDescription = this.add.text(
      width / 2, 
      height * 0.56, 
      selectedConfig.DIFFICULTY_DESCRIPTION, 
      {
        fontSize: diffDescSize + 'px',
        fontFamily: 'Arial',
        color: '#95a5a6',
        align: 'center',
        wordWrap: { width: width * 0.8 }
      }
    );
    this.difficultyDescription.setOrigin(0.5);

    // Botón de Jugar
    const buttonWidth = Math.min(240, width / 4.5);
    const buttonHeight = Math.min(55, height / 13);
    const playButton = this.createButton(width / 2, height * 0.68, 'JUGAR', buttonWidth, buttonHeight, () => {
      // Usar el nombre ingresado en el input
      const playerName = this.playerName || 'Runner';
      
      // Limpiar el input antes de cambiar de escena
      this.cleanupNameInput();

      this.scene.start('GameScene', { 
        seed: Date.now(),
        bluetoothController: window.bluetoothController,
        playerName: playerName, // PASA EL NOMBRE AL INICIAR GameScene
        difficulty: this.selectedDifficulty // PASA LA DIFICULTAD SELECCIONADA
      });
    });
    // Botón de Bluetooth
    const bluetoothButton = this.createButton(
      width / 2, 
      height * 0.76, 
      'Mando BT', 
      buttonWidth, 
      buttonHeight, 
      () => {
        // Limpiar el input antes de cambiar de escena
        this.cleanupNameInput();
        
        this.scene.start('BluetoothSetupScene', { 
          bluetoothController: window.bluetoothController 
        });
      },
      0x3498db
    );

    // Campo de nombre del jugador (debajo del botón BT, en horizontal)
    const nameSize = Math.min(18, width / 50);
    const nameLabel = this.add.text(width / 2 - 120, height * 0.84, 'Nombre:', {
      fontSize: nameSize + 'px',
      fontFamily: 'Arial',
      color: '#ecf0f1'
    });
    nameLabel.setOrigin(0.5);

    // Input HTML para el nombre (en la misma línea horizontal)
    const inputWidth = Math.min(200, width * 0.25);
    const inputHeight = Math.min(34, height / 24);
    
    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.id = 'playerNameInput';
    inputElement.value = this.playerName;
    inputElement.placeholder = 'Runner';
    inputElement.maxLength = 20;
    inputElement.style.position = 'absolute';
    inputElement.style.left = `${(width / 2) + 10}px`;
    inputElement.style.top = `${height * 0.84 - (inputHeight / 2)}px`;
    inputElement.style.width = `${inputWidth}px`;
    inputElement.style.height = `${inputHeight}px`;
    inputElement.style.fontSize = `${Math.min(16, width / 60)}px`;
    inputElement.style.fontFamily = 'Arial';
    inputElement.style.padding = '8px';
    inputElement.style.border = '2px solid #3498db';
    inputElement.style.borderRadius = '5px';
    inputElement.style.backgroundColor = '#2c3e50';
    inputElement.style.color = '#ecf0f1';
    inputElement.style.textAlign = 'center';
    inputElement.style.outline = 'none';
    inputElement.style.zIndex = '1000';
    
    inputElement.addEventListener('input', (e) => {
      this.playerName = e.target.value.trim() || 'Runner';
    });
    
    document.body.appendChild(inputElement);
    this.nameInput = inputElement;

    // Agregar elementos al contenedor (no el input HTML, ese está en el DOM)
    this.menuContainer.add([title, subtitle, description, diffLabel, nameLabel, this.difficultyDescription]);

    // Animación de parpadeo en el título
    this.titleTween = this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  resize(gameSize) {
    // Recrear el menú con las nuevas dimensiones
    this.createMenu();
  }
  
  cleanupNameInput() {
    // Limpiar input HTML si existe
    if (this.nameInput) {
      this.nameInput.remove();
      this.nameInput = null;
    }
    
    // También limpiar por ID por si quedó huérfano
    const existingInput = document.getElementById('playerNameInput');
    if (existingInput) {
      existingInput.remove();
    }
  }

  shutdown() {
    // Limpiar el listener cuando se cierre la escena
    this.scale.off('resize', this.resize, this);
    if (this.titleTween) {
      this.titleTween.remove();
    }
    
    // Limpiar input HTML
    this.cleanupNameInput();
  }

  createButton(x, y, text, width, height, callback, color = 0x6c5ce7) {
    const button = this.add.container(x, y);

    // Fondo del botón con sombra
    const shadow = this.add.rectangle(2, 2, width, height, 0x000000, 0.3);
    shadow.setOrigin(0.5);
    
    const bg = this.add.rectangle(0, 0, width, height, color);
    bg.setStrokeStyle(3, 0xffffff, 0.3);

    // Texto del botón
    const buttonTextSize = Math.min(32, width / 7.5);
    const buttonText = this.add.text(0, 0, text, {
      fontSize: buttonTextSize + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#000000',
        blur: 2,
        fill: true
      }
    });
    buttonText.setOrigin(0.5);

    button.add([shadow, bg, buttonText]);
    button.setSize(width, height);
    button.setInteractive({ useHandCursor: true });

    // Guardar color original para hover
    const originalColor = color;
    const hoverColor = Phaser.Display.Color.IntegerToColor(color).lighten(30).color;

    // Efectos hover
    button.on('pointerover', () => {
      bg.setFillStyle(hoverColor);
      this.tweens.add({
        targets: button,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 150,
        ease: 'Back.easeOut'
      });
    });

    button.on('pointerout', () => {
      bg.setFillStyle(originalColor);
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Back.easeIn'
      });
    });

    button.on('pointerdown', () => {
      this.tweens.add({
        targets: button,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: callback
      });
    });

    return button;
  }

  createDifficultyButton(x, y, text, difficulty, width, height) {
    const config = GAME_CONFIG[difficulty];
    const isSelected = this.selectedDifficulty === difficulty;
    
    // Obtener color según la dificultad
    const color = Phaser.Display.Color.HexStringToColor(config.DIFFICULTY_COLOR).color;
    const button = this.add.container(x, y);

    // Fondo del botón
    const bg = this.add.rectangle(0, 0, width, height, color);
    bg.setStrokeStyle(isSelected ? 5 : 2, 0xffffff);
    bg.setAlpha(isSelected ? 1 : 0.7);

    // Texto del botón
    const buttonTextSize = Math.min(22, width / 5);
    const buttonText = this.add.text(0, 0, text, {
      fontSize: buttonTextSize + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff'
    });
    buttonText.setOrigin(0.5);

    button.add([bg, buttonText]);
    button.setSize(width, height);
    button.setInteractive({ useHandCursor: true });

    // Guardar referencias para actualizar después
    button.bg = bg;
    button.difficulty = difficulty;
    button.defaultAlpha = isSelected ? 1 : 0.7;

    // Efectos hover
    button.on('pointerover', () => {
      bg.setAlpha(1);
      this.tweens.add({
        targets: button,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        ease: 'Power2'
      });
    });

    button.on('pointerout', () => {
      const isCurrentlySelected = this.selectedDifficulty === difficulty;
      bg.setAlpha(isCurrentlySelected ? 1 : 0.7);
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Power2'
      });
    });

    button.on('pointerdown', () => {
      this.tweens.add({
        targets: button,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: () => {
          this.selectDifficulty(difficulty);
        }
      });
    });

    this.menuContainer.add(button);
    return button;
  }

  selectDifficulty(difficulty) {
    this.selectedDifficulty = difficulty;
    
    // Actualizar apariencia de todos los botones
    [this.easyButton, this.mediumButton, this.hardButton].forEach(btn => {
      if (btn) {
        const isSelected = btn.difficulty === difficulty;
        btn.bg.setStrokeStyle(isSelected ? 5 : 2, 0xffffff);
        btn.bg.setAlpha(isSelected ? 1 : 0.7);
      }
    });
    
    // Actualizar descripción
    const selectedConfig = GAME_CONFIG[difficulty];
    if (this.difficultyDescription) {
      this.difficultyDescription.setText(selectedConfig.DIFFICULTY_DESCRIPTION);
    }
  }
}
