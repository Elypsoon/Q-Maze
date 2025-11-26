import Phaser from 'phaser';
import { DIFFICULTY_LEVELS, GAME_CONFIG } from '../config/gameConfig';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data) {
    this.selectedDifficulty = data.difficulty || DIFFICULTY_LEVELS.MEDIUM;
    this.bluetoothController = data.bluetoothController || window.bluetoothController;
    
    // Inicializar configuración global si no existe
    if (!window.gameSettings) {
      window.gameSettings = {
        volume: 0.5,
        playerName: 'Runner',
        selectedCategory: 'all'
      };
    }
    
    // Usar nombre de la configuración global
    this.playerName = window.gameSettings.playerName;
    
    // Flag para saber si venimos de otra escena (no animar si es true)
    this.skipAnimations = data.skipAnimations || false;
    
    // Sistema de navegación
    this.selectedOption = 0; // 0=JUGAR, 1=Mando, 2=Opciones
    this.navigationCooldown = false;
    this.navigationRepeatDelay = 200;
  }

  create() {
    // Aplicar volumen global
    this.sound.setVolume(window.gameSettings.volume);
    
    // Iniciar música del menú en loop (verificar si ya existe y está sonando)
    const existingMusic = this.sound.get('menuMusic');
    if (!existingMusic || !existingMusic.isPlaying) {
      if (existingMusic) {
        existingMusic.play();
      } else {
        this.menuMusic = this.sound.add('menuMusic', { loop: true, volume: 0.5 });
        this.menuMusic.play();
      }
    }
    
    this.createMenu();
    
    // Configurar controles de teclado/mando
    this.setupControls();
    
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

    // Crear textura para partículas si no existe
    if (!this.textures.exists('particle')) {
        const particleGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        particleGraphics.fillStyle(0xffffff, 1);
        particleGraphics.fillCircle(4, 4, 4);
        particleGraphics.generateTexture('particle', 8, 8);
    }

    // Partículas de fondo
    const particles = this.add.particles(0, 0, 'particle', {
        x: { min: 0, max: width },
        y: { min: 0, max: height },
        quantity: 2,
        frequency: 100,
        lifespan: 4000,
        gravityY: -10,
        speed: { min: 10, max: 30 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.4, end: 0 },
        blendMode: 'ADD'
    });
    this.menuContainer.add(particles);

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
    if (!this.skipAnimations) {
      this.easyButton.setAlpha(0);
      this.easyButton.setY(diffButtonY + 20);
      this.tweens.add({
        targets: this.easyButton,
        alpha: 1,
        y: diffButtonY,
        duration: 400,
        delay: 300,
        ease: 'Back.easeOut'
      });
    }
    
    // Botón Medio
    this.mediumButton = this.createDifficultyButton(
      startX + spacing, 
      diffButtonY, 
      'Medio', 
      DIFFICULTY_LEVELS.MEDIUM,
      diffButtonWidth, 
      diffButtonHeight
    );
    if (!this.skipAnimations) {
      this.mediumButton.setAlpha(0);
      this.mediumButton.setY(diffButtonY + 20);
      this.tweens.add({
        targets: this.mediumButton,
        alpha: 1,
        y: diffButtonY,
        duration: 400,
        delay: 400,
        ease: 'Back.easeOut'
      });
    }
    
    // Botón Difícil
    this.hardButton = this.createDifficultyButton(
      startX + spacing * 2, 
      diffButtonY, 
      'Difícil', 
      DIFFICULTY_LEVELS.HARD,
      diffButtonWidth, 
      diffButtonHeight
    );
    if (!this.skipAnimations) {
      this.hardButton.setAlpha(0);
      this.hardButton.setY(diffButtonY + 20);
      this.tweens.add({
        targets: this.hardButton,
        alpha: 1,
        y: diffButtonY,
        duration: 400,
        delay: 500,
        ease: 'Back.easeOut'
      });
    }

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
    this.playButton = this.createButton(width / 2, height * 0.68, 'JUGAR', buttonWidth, buttonHeight, () => {
      this.onPlayButtonClick();
    });
    
    // Animación de entrada para el botón de jugar (solo si no se saltan animaciones)
    if (!this.skipAnimations) {
      this.playButton.setAlpha(0);
      this.playButton.setScale(0.8);
      this.tweens.add({
        targets: this.playButton,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 400,
        delay: 700,
        ease: 'Back.easeOut'
      });
    }
    
    // Botón de Bluetooth
    this.bluetoothButton = this.createButton(
      width / 2, 
      height * 0.76, 
      'Mando', 
      buttonWidth, 
      buttonHeight, 
      () => {
        this.onBluetoothButtonClick();
      },
      0x9b59b6
    );
    
    // Animación de entrada para el botón de Bluetooth (solo si no se saltan animaciones)
    if (!this.skipAnimations) {
      this.bluetoothButton.setAlpha(0);
      this.bluetoothButton.setScale(0.8);
      this.tweens.add({
        targets: this.bluetoothButton,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 400,
        delay: 800,
        ease: 'Back.easeOut'
      });
    }
    
    // Botón de Opciones
    this.optionsButton = this.createButton(
      width / 2,
      height * 0.84,
      'Opciones',
      buttonWidth,
      buttonHeight,
      () => {
        this.onOptionsButtonClick();
      },
      0xe67e22
    );
    
    // Animación de entrada para el botón de opciones (solo si no se saltan animaciones)
    if (!this.skipAnimations) {
      this.optionsButton.setAlpha(0);
      this.optionsButton.setScale(0.8);
      this.tweens.add({
        targets: this.optionsButton,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 400,
        delay: 900,
        ease: 'Back.easeOut'
      });
    }

    // Guardar referencia a botones principales para navegación
    this.mainButtons = [
      { container: this.playButton, action: () => this.onPlayButtonClick() },
      { container: this.bluetoothButton, action: () => this.onBluetoothButtonClick() },
      { container: this.optionsButton, action: () => this.onOptionsButtonClick() }
    ];
    
    this.menuContainer.add([
      title,
      subtitle,
      description,
      diffLabel,
      this.easyButton,
      this.mediumButton,
      this.hardButton,
      this.playButton,
      this.bluetoothButton,
      this.optionsButton
    ]);
    
    // Aplicar highlight inicial al primer botón
    this.updateMenuSelectionHighlight(-1, this.selectedOption);

    // Crear partículas de fondo para darle vida
    this.createBackgroundParticles(width, height);
  }

  createBackgroundParticles(width, height) {
    const particles = this.add.particles(0, 0, 'particle', {
        x: { min: 0, max: width },
        y: { min: 0, max: height },
        lifespan: 4000,
        speedY: { min: -20, max: -50 },
        scale: { start: 0.2, end: 0 },
        quantity: 2,
        blendMode: 'ADD',
        emitting: true
    });
    
    // Si no tenemos textura de partícula, creamos una simple
    if (!this.textures.exists('particle')) {
        const graphics = this.make.graphics({x: 0, y: 0, add: false});
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('particle', 8, 8);
    }
    
    this.menuContainer.add(particles);
    this.menuContainer.sendToBack(particles);
    // Asegurar que el fondo siga atrás
    this.menuContainer.sendToBack(this.menuContainer.list[0]); 
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
    
    // Limpiar callback de Bluetooth
    if (this.bluetoothController && this.bluetoothDataHandler) {
      this.bluetoothController.off('data', this.bluetoothDataHandler);
      console.log('🎮 MenuScene: Callback Bluetooth eliminado');
    }
  }

  createButton(x, y, text, width, height, callback, color = 0x6c5ce7) {
    const button = this.add.container(x, y);

    // Fondo del botón con sombra (Rounded)
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(-width/2 + 4, -height/2 + 4, width, height, 15);
    
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.lineStyle(2, 0xffffff, 0.5);
    bg.fillRoundedRect(-width/2, -height/2, width, height, 15);
    bg.strokeRoundedRect(-width/2, -height/2, width, height, 15);

    // Texto del botón
    const buttonTextSize = Math.min(24, width / 7.5);
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
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.lineStyle(2, 0xffffff, 0.8);
      bg.fillRoundedRect(-width/2, -height/2, width, height, 15);
      bg.strokeRoundedRect(-width/2, -height/2, width, height, 15);
      
      this.tweens.add({
        targets: button,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 150,
        ease: 'Back.easeOut'
      });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(originalColor, 1);
      bg.lineStyle(2, 0xffffff, 0.5);
      bg.fillRoundedRect(-width/2, -height/2, width, height, 15);
      bg.strokeRoundedRect(-width/2, -height/2, width, height, 15);

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

    // Fondo del botón (Rounded)
    const bg = this.add.graphics();
    
    const drawBg = (selected) => {
        bg.clear();
        bg.fillStyle(color, selected ? 1 : 0.7);
        bg.lineStyle(selected ? 4 : 2, 0xffffff, selected ? 1 : 0.5);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
    };
    
    drawBg(isSelected);

    // Texto del botón
    const buttonTextSize = Math.min(18, width / 5);
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
    button.drawBg = drawBg; // Función para redibujar
    button.difficulty = difficulty;

    // Efectos hover
    button.on('pointerover', () => {
      const isCurrentlySelected = this.selectedDifficulty === difficulty;
      bg.clear();
      bg.fillStyle(color, 1);
      bg.lineStyle(isCurrentlySelected ? 4 : 2, 0xffffff, 1);
      bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
      bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);

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
      drawBg(isCurrentlySelected);
      
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
        btn.drawBg(isSelected);
      }
    });
    
    // Actualizar descripción
    const selectedConfig = GAME_CONFIG[difficulty];
    if (this.difficultyDescription) {
      this.difficultyDescription.setText(selectedConfig.DIFFICULTY_DESCRIPTION);
    }
  }

  setupControls() {
    // Teclas de dirección
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Configurar callbacks del controlador Bluetooth si existe
    if (this.bluetoothController) {
      this.bluetoothDataHandler = (events) => {
        this.handleBluetoothInput(events);
      };
      this.bluetoothController.on('data', this.bluetoothDataHandler);
    }
  }

  handleBluetoothInput(events) {
    if (!events) return;

    events.forEach(event => {
      if (event.type === 'direction' && event.state) {
        const currentState = event.state;
        
        // Navegación ARRIBA - con cooldown
        if (currentState.up && !this.navigationCooldown) {
          this.moveMenuSelection(-1);
          this.startNavigationCooldown();
        }
        
        // Navegación ABAJO - con cooldown
        if (currentState.down && !this.navigationCooldown) {
          this.moveMenuSelection(1);
          this.startNavigationCooldown();
        }
        
        // Navegación IZQUIERDA - cambiar dificultad
        if (currentState.left && !this.navigationCooldown) {
          this.changeDifficulty(-1);
          this.startNavigationCooldown();
        }
        
        // Navegación DERECHA - cambiar dificultad
        if (currentState.right && !this.navigationCooldown) {
          this.changeDifficulty(1);
          this.startNavigationCooldown();
        }
        
      } else if (event.type === 'button') {
        if (event.key === 'select') {
          this.confirmMenuSelection();
        }
      }
    });
  }

  startNavigationCooldown() {
    this.navigationCooldown = true;
    this.time.delayedCall(this.navigationRepeatDelay, () => {
      this.navigationCooldown = false;
    });
  }

  update() {
    // Verificar que los controles estén inicializados
    if (!this.cursors) return;
    
    // Navegación con teclas de dirección
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.moveMenuSelection(-1);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.moveMenuSelection(1);
    }
    
    // Navegación horizontal para cambiar dificultad
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.changeDifficulty(-1);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.changeDifficulty(1);
    }

    // Confirmar con SPACE o ENTER
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || 
        Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.confirmMenuSelection();
    }
  }

  moveMenuSelection(direction) {
    const previousOption = this.selectedOption;
    this.selectedOption += direction;

    // Wrap around
    if (this.selectedOption < 0) {
      this.selectedOption = this.mainButtons.length - 1;
    } else if (this.selectedOption >= this.mainButtons.length) {
      this.selectedOption = 0;
    }

    // Actualizar visualmente
    this.updateMenuSelectionHighlight(previousOption, this.selectedOption);
  }

  updateMenuSelectionHighlight(previousIndex, currentIndex) {
    // Quitar highlight del anterior
    if (previousIndex >= 0 && previousIndex < this.mainButtons.length) {
      const prevButton = this.mainButtons[previousIndex].container;
      this.tweens.add({
        targets: prevButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    }

    // Agregar highlight al actual
    if (currentIndex >= 0 && currentIndex < this.mainButtons.length) {
      const currButton = this.mainButtons[currentIndex].container;
      this.tweens.add({
        targets: currButton,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        ease: 'Back.easeOut'
      });
    }
  }

  confirmMenuSelection() {
    if (this.selectedOption >= 0 && this.selectedOption < this.mainButtons.length) {
      const selectedButton = this.mainButtons[this.selectedOption];
      
      // Animación de confirmación
      this.tweens.add({
        targets: selectedButton.container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: () => {
          selectedButton.action();
        }
      });
    }
  }

  onPlayButtonClick() {
    const playerName = window.gameSettings.playerName;
    
    // Limpiar callbacks antes de cambiar de escena
    if (this.bluetoothController && this.bluetoothDataHandler) {
      this.bluetoothController.off('data', this.bluetoothDataHandler);
      this.bluetoothDataHandler = null;
    }
    
    // Detener música del menú
    if (this.menuMusic) {
      this.menuMusic.stop();
    }

    this.scene.start('GameScene', { 
      seed: Date.now(),
      bluetoothController: window.bluetoothController,
      playerName: playerName,
      difficulty: this.selectedDifficulty
    });
  }

  onBluetoothButtonClick() {
    // Limpiar callbacks antes de cambiar de escena
    if (this.bluetoothController && this.bluetoothDataHandler) {
      this.bluetoothController.off('data', this.bluetoothDataHandler);
      this.bluetoothDataHandler = null;
    }
    
    this.scene.start('BluetoothSetupScene', { 
      bluetoothController: window.bluetoothController,
      difficulty: this.selectedDifficulty,
      playerName: window.gameSettings.playerName
    });
  }

  onOptionsButtonClick() {
    // Limpiar callbacks antes de cambiar de escena
    if (this.bluetoothController && this.bluetoothDataHandler) {
      this.bluetoothController.off('data', this.bluetoothDataHandler);
      this.bluetoothDataHandler = null;
    }
    
    this.scene.start('OptionsScene', {
      bluetoothController: window.bluetoothController,
      difficulty: this.selectedDifficulty
    });
  }

  changeDifficulty(direction) {
    const difficulties = [DIFFICULTY_LEVELS.EASY, DIFFICULTY_LEVELS.MEDIUM, DIFFICULTY_LEVELS.HARD];
    const currentIndex = difficulties.indexOf(this.selectedDifficulty);
    let newIndex = currentIndex + direction;

    // Wrap around
    if (newIndex < 0) {
      newIndex = difficulties.length - 1;
    } else if (newIndex >= difficulties.length) {
      newIndex = 0;
    }

    this.selectDifficulty(difficulties[newIndex]);
  }
}
