import Phaser from 'phaser';

// URL base del backend
const API_BASE_URL = 'http://localhost:3000/api';

export default class OptionsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OptionsScene' });
  }

  init(data) {
    this.bluetoothController = data.bluetoothController || window.bluetoothController;
    this.difficulty = data.difficulty;
    
    // Obtener configuración global (persiste entre escenas)
    if (!window.gameSettings) {
      window.gameSettings = {
        volume: 0.5,
        playerName: 'Runner',
        selectedCategories: ['all'] // Array de categorías seleccionadas
      };
    }
    
    this.volume = window.gameSettings.volume;
    this.playerName = window.gameSettings.playerName;
    this.selectedCategories = window.gameSettings.selectedCategories || ['all'];
    
    this.categories = ['all']; // Inicializar con "Todas"
    this.loadingCategories = true;
    
    // Sistema de navegación
    this.navigationCooldown = false;
    this.navigationRepeatDelay = 200;
  }

  async create() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Fondo con gradiente
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x0f0c29, 0x302b63, 0x24243e, 0x302b63, 1);
    graphics.fillRect(0, 0, width, height);
    
    // Crear partículas de fondo
    this.createBackgroundParticles(width, height);

    // Título
    const titleSize = Math.min(64, width / 15);
    const title = this.add.text(width / 2, height * 0.12, '⚙️ OPCIONES', {
      fontSize: titleSize + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#6c5ce7',
      strokeThickness: 6
    });
    title.setOrigin(0.5);

    // Cargar categorías desde el backend
    await this.loadCategories();

    // Sección 1: Volumen General
    this.createVolumeSection(width, height);

    // Sección 2: Categoría de Preguntas
    this.createCategorySection(width, height);

    // Sección 3: Nombre del Jugador
    this.createNameSection(width, height);

    // Botón Volver
    this.createBackButton(width, height);
    
    // Configurar controles de teclado/mando
    this.setupControls();

    // Escuchar cambios de tamaño
    this.scale.on('resize', this.resize, this);
  }

  async loadCategories() {
    try {
      const response = await fetch(`${API_BASE_URL}/questions/categories`);
      if (response.ok) {
        const data = await response.json();
        // data.categories es un array de strings con las categorías únicas
        this.categories = ['all', ...data.categories];
      } else {
        console.warn('No se pudieron cargar las categorías, usando valor por defecto');
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
    this.loadingCategories = false;
  }

  createBackgroundParticles(width, height) {
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
  }

  createVolumeSection(width, height) {
    const sectionY = height * 0.28;
    
    // Título de sección
    const volumeLabel = this.add.text(width / 2, sectionY, '🔊 VOLUMEN GENERAL', {
      fontSize: Math.min(28, width / 30) + 'px',
      fontFamily: 'Arial Black',
      color: '#ecf0f1'
    });
    volumeLabel.setOrigin(0.5);

    // Barra de volumen
    const barWidth = Math.min(400, width * 0.6);
    const barHeight = 20;
    const barY = sectionY + 50;

    // Fondo de la barra
    const barBg = this.add.rectangle(width / 2, barY, barWidth, barHeight, 0x34495e);
    barBg.setStrokeStyle(2, 0x7f8c8d);

    // Barra de progreso (relleno) - CORREGIDA: origen en (0, 0.5) y posición inicial correcta
    const barStartX = width / 2 - barWidth / 2;
    this.volumeBar = this.add.rectangle(
      barStartX,
      barY,
      barWidth * this.volume,
      barHeight,
      0x6c5ce7
    );
    this.volumeBar.setOrigin(0, 0.5);
    
    // Guardar referencia al ancho y posición para actualizaciones
    this.volumeBarWidth = barWidth;
    this.volumeBarStartX = barStartX;

    // Texto de porcentaje
    this.volumeText = this.add.text(width / 2, barY + 30, `${Math.floor(this.volume * 100)}%`, {
      fontSize: Math.min(24, width / 35) + 'px',
      fontFamily: 'Arial',
      color: '#a29bfe'
    });
    this.volumeText.setOrigin(0.5);

    // Botones - y +
    const btnSize = Math.min(40, width / 25);
    const minusBtn = this.createVolumeButton(width / 2 - barWidth / 2 - 60, barY, '-', btnSize, -0.1);
    const plusBtn = this.createVolumeButton(width / 2 + barWidth / 2 + 60, barY, '+', btnSize, 0.1);

    // Hacer la barra interactiva (click para ajustar)
    barBg.setInteractive();
    barBg.on('pointerdown', (pointer) => {
      const localX = pointer.x - (width / 2 - barWidth / 2);
      const newVolume = Phaser.Math.Clamp(localX / barWidth, 0, 1);
      this.setVolume(newVolume);
    });
  }

  createVolumeButton(x, y, text, size, change) {
    const button = this.add.container(x, y);
    
    const bg = this.add.circle(0, 0, size / 2, 0x3498db);
    bg.setStrokeStyle(3, 0xffffff);
    
    const label = this.add.text(0, 0, text, {
      fontSize: Math.min(32, size) + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff'
    });
    label.setOrigin(0.5);
    
    button.add([bg, label]);
    button.setSize(size, size);
    button.setInteractive({ useHandCursor: true });
    
    button.on('pointerover', () => {
      bg.setFillStyle(0x2980b9);
    });
    
    button.on('pointerout', () => {
      bg.setFillStyle(0x3498db);
    });
    
    button.on('pointerdown', () => {
      const newVolume = Phaser.Math.Clamp(this.volume + change, 0, 1);
      this.setVolume(newVolume);
    });
    
    return button;
  }

  setVolume(value) {
    this.volume = Phaser.Math.Clamp(value, 0, 1);
    
    // Actualizar configuración global
    window.gameSettings.volume = this.volume;
    
    // Aplicar volumen a todos los sonidos
    this.sound.setVolume(this.volume);
    
    // Actualizar UI usando las referencias guardadas
    this.volumeBar.width = this.volumeBarWidth * this.volume;
    this.volumeBar.x = this.volumeBarStartX;
    this.volumeText.setText(`${Math.floor(this.volume * 100)}%`);
  }

  createCategorySection(width, height) {
    const sectionY = height * 0.48;
    
    // Título de sección
    const categoryLabel = this.add.text(width / 2, sectionY, '📚 CATEGORÍAS DE PREGUNTAS', {
      fontSize: Math.min(28, width / 30) + 'px',
      fontFamily: 'Arial Black',
      color: '#ecf0f1'
    });
    categoryLabel.setOrigin(0.5);

    // Contenedor scrollable para las categorías
    const listY = sectionY + 40;
    const listHeight = Math.min(120, height * 0.15);
    
    this.categoryContainer = this.add.container(0, listY);
    this.categoryCheckboxes = [];
    
    // Crear checkboxes para cada categoría
    this.updateCategoryList(width, listY);
  }

  updateCategoryList(width, startY) {
    // Limpiar checkboxes anteriores
    this.categoryCheckboxes.forEach(cb => cb.destroy());
    this.categoryCheckboxes = [];
    
    const boxSize = 24;
    const spacing = 35;
    const maxPerRow = 3;
    const startX = width / 2 - ((maxPerRow - 1) * 150) / 2;
    
    this.categories.forEach((category, index) => {
      const row = Math.floor(index / maxPerRow);
      const col = index % maxPerRow;
      const x = startX + col * 150;
      const y = startY + row * spacing;
      
      const checkbox = this.createCategoryCheckbox(x, y, category, boxSize);
      this.categoryCheckboxes.push(checkbox);
    });
  }
  
  createCategoryCheckbox(x, y, category, size) {
    const container = this.add.container(x, y);
    
    // Checkbox (cuadrado)
    const box = this.add.rectangle(0, 0, size, size, 0x34495e);
    box.setStrokeStyle(2, 0x6c5ce7);
    
    // Checkmark (tick)
    const isSelected = this.selectedCategories.includes(category);
    const check = this.add.text(0, 0, '✓', {
      fontSize: (size - 4) + 'px',
      fontFamily: 'Arial Black',
      color: '#2ecc71'
    });
    check.setOrigin(0.5);
    check.setVisible(isSelected);
    
    // Label
    const displayText = category === 'all' ? 'Todas' : category;
    const label = this.add.text(size / 2 + 10, 0, displayText, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ecf0f1'
    });
    label.setOrigin(0, 0.5);
    
    container.add([box, check, label]);
    container.setSize(150, size);
    container.setInteractive({ useHandCursor: true });
    
    // Efectos hover
    container.on('pointerover', () => {
      box.setStrokeStyle(3, '#a29bfe');
    });
    
    container.on('pointerout', () => {
      box.setStrokeStyle(2, 0x6c5ce7);
    });
    
    container.on('pointerdown', () => {
      this.toggleCategory(category, check);
    });
    
    return container;
  }
  
  toggleCategory(category, checkmark) {
    if (category === 'all') {
      // Si se selecciona "Todas", deseleccionar todo lo demás
      this.selectedCategories = ['all'];
    } else {
      // Remover "all" si se selecciona una categoría específica
      const allIndex = this.selectedCategories.indexOf('all');
      if (allIndex > -1) {
        this.selectedCategories.splice(allIndex, 1);
      }
      
      // Toggle de la categoría
      const index = this.selectedCategories.indexOf(category);
      if (index > -1) {
        this.selectedCategories.splice(index, 1);
      } else {
        this.selectedCategories.push(category);
      }
      
      // Si no hay ninguna seleccionada, volver a "all"
      if (this.selectedCategories.length === 0) {
        this.selectedCategories = ['all'];
      }
    }
    
    // Actualizar configuración global
    window.gameSettings.selectedCategories = this.selectedCategories;
    
    // Actualizar todos los checkboxes
    this.categoryCheckboxes.forEach(cb => {
      const children = cb.list;
      const check = children[1]; // El checkmark es el segundo elemento
      const label = children[2];
      
      // Obtener la categoría de este checkbox desde el label
      const labelText = label.text;
      const cat = labelText === 'Todas' ? 'all' : labelText;
      
      check.setVisible(this.selectedCategories.includes(cat));
    });
  }

  createArrowButton(x, y, text, size, callback) {
    const button = this.add.container(x, y);
    
    const bg = this.add.circle(0, 0, size / 2, 0xe67e22);
    bg.setStrokeStyle(3, 0xffffff);
    
    const label = this.add.text(0, 0, text, {
      fontSize: Math.min(28, size * 0.7) + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff'
    });
    label.setOrigin(0.5);
    
    button.add([bg, label]);
    button.setSize(size, size);
    button.setInteractive({ useHandCursor: true });
    
    button.on('pointerover', () => {
      bg.setFillStyle(0xd35400);
      this.tweens.add({
        targets: button,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100
      });
    });
    
    button.on('pointerout', () => {
      bg.setFillStyle(0xe67e22);
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });
    
    button.on('pointerdown', () => {
      this.tweens.add({
        targets: button,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 50,
        yoyo: true,
        onComplete: callback
      });
    });
    
    return button;
  }

  createNameSection(width, height) {
    const sectionY = height * 0.7;
    
    // Título de sección
    const nameLabel = this.add.text(width / 2, sectionY, '👤 NOMBRE DEL JUGADOR', {
      fontSize: Math.min(28, width / 30) + 'px',
      fontFamily: 'Arial Black',
      color: '#ecf0f1'
    });
    nameLabel.setOrigin(0.5);

    // Input de nombre (HTML)
    this.createNameInput(width, height, sectionY + 50);
  }

  createNameInput(width, height, y) {
    // Limpiar input anterior si existe
    this.cleanupNameInput();

    const inputWidth = Math.min(400, width * 0.6);
    const inputHeight = 50;

    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.value = this.playerName;
    this.nameInput.maxLength = 20;
    this.nameInput.placeholder = 'Escribe tu nombre...';
    
    this.nameInput.style.position = 'absolute';
    this.nameInput.style.left = `${width / 2 - inputWidth / 2}px`;
    this.nameInput.style.top = `${y - inputHeight / 2}px`;
    this.nameInput.style.width = `${inputWidth}px`;
    this.nameInput.style.height = `${inputHeight}px`;
    this.nameInput.style.fontSize = '20px';
    this.nameInput.style.fontFamily = 'Arial';
    this.nameInput.style.textAlign = 'center';
    this.nameInput.style.border = '3px solid #6c5ce7';
    this.nameInput.style.borderRadius = '10px';
    this.nameInput.style.outline = 'none';
    this.nameInput.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    this.nameInput.style.color = '#ffffff';
    this.nameInput.style.boxShadow = '0 4px 15px rgba(108, 92, 231, 0.4)';
    this.nameInput.style.transition = 'all 0.3s ease';
    this.nameInput.style.zIndex = '1000';

    // Eventos de estilo
    this.nameInput.addEventListener('focus', () => {
      this.nameInput.style.boxShadow = '0 6px 20px rgba(108, 92, 231, 0.6)';
      this.nameInput.style.transform = 'scale(1.02)';
      this.nameInput.style.borderColor = '#a29bfe';
    });

    this.nameInput.addEventListener('blur', () => {
      this.nameInput.style.boxShadow = '0 4px 15px rgba(108, 92, 231, 0.4)';
      this.nameInput.style.transform = 'scale(1)';
      this.nameInput.style.borderColor = '#6c5ce7';
    });

    // Actualizar nombre en tiempo real
    this.nameInput.addEventListener('input', (e) => {
      this.playerName = e.target.value || 'Runner';
      window.gameSettings.playerName = this.playerName;
    });

    document.body.appendChild(this.nameInput);
  }

  cleanupNameInput() {
    if (this.nameInput && this.nameInput.parentNode) {
      this.nameInput.parentNode.removeChild(this.nameInput);
      this.nameInput = null;
    }
  }

  createBackButton(width, height) {
    const buttonWidth = Math.min(200, width / 5);
    const buttonHeight = Math.min(50, height / 15);
    const buttonY = height * 0.88;

    this.backButton = this.add.container(width / 2, buttonY);
    
    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x27ae60);
    bg.setStrokeStyle(3, 0xffffff);
    
    const text = this.add.text(0, 0, '← VOLVER', {
      fontSize: Math.min(24, width / 35) + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff'
    });
    text.setOrigin(0.5);
    
    this.backButton.add([bg, text]);
    this.backButton.setSize(buttonWidth, buttonHeight);
    this.backButton.setInteractive({ useHandCursor: true });
    
    this.backButton.on('pointerover', () => {
      bg.setFillStyle(0x229954);
      this.tweens.add({
        targets: this.backButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100
      });
    });
    
    this.backButton.on('pointerout', () => {
      bg.setFillStyle(0x27ae60);
      this.tweens.add({
        targets: this.backButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });
    
    this.backButton.on('pointerdown', () => {
      this.tweens.add({
        targets: this.backButton,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: () => {
          this.cleanupNameInput();
          this.scene.start('MenuScene', {
            bluetoothController: this.bluetoothController,
            difficulty: this.difficulty,
            skipAnimations: true
          });
        }
      });
    });
  }

  resize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;
    
    // Recrear toda la escena con las nuevas dimensiones
    this.scene.restart({
      bluetoothController: this.bluetoothController,
      difficulty: this.difficulty
    });
  }

  shutdown() {
    this.cleanupNameInput();
    this.scale.off('resize', this.resize, this);
    
    // Limpiar callback de Bluetooth
    if (this.bluetoothController && this.bluetoothDataHandler) {
      this.bluetoothController.off('data', this.bluetoothDataHandler);
    }
  }

  setupControls() {
    // Teclas de dirección y confirmación
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

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
        
        // Navegación IZQUIERDA - disminuir volumen
        if (currentState.left && !this.navigationCooldown) {
          this.adjustVolume(-0.1);
          this.startNavigationCooldown();
        }
        
        // Navegación DERECHA - aumentar volumen
        if (currentState.right && !this.navigationCooldown) {
          this.adjustVolume(0.1);
          this.startNavigationCooldown();
        }
        
      } else if (event.type === 'button') {
        if (event.key === 'select' || event.key === 'pause') {
          this.goBack();
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
    
    // Control de volumen con flechas
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.adjustVolume(-0.1);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.adjustVolume(0.1);
    }

    // Volver con ESC, SPACE o ENTER
    if (Phaser.Input.Keyboard.JustDown(this.escKey) ||
        Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
        Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.goBack();
    }
  }

  adjustVolume(change) {
    this.setVolume(this.volume + change);
  }

  goBack() {
    // Limpiar callbacks antes de cambiar de escena
    if (this.bluetoothController && this.bluetoothDataHandler) {
      this.bluetoothController.off('data', this.bluetoothDataHandler);
      this.bluetoothDataHandler = null;
    }
    
    this.cleanupNameInput();
    this.scene.start('MenuScene', {
      bluetoothController: this.bluetoothController,
      difficulty: this.difficulty,
      skipAnimations: true
    });
  }
}
