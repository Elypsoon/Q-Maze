import Phaser from 'phaser';

// URL base del backend
const API_BASE_URL = 'http://localhost:3000/api';

export default class HistoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HistoryScene' });
  }

  init(data) {
    this.bluetoothController = data.bluetoothController || window.bluetoothController;
    this.difficulty = data.difficulty;
    
    // Sistema de navegación
    this.navigationCooldown = false;
    this.navigationRepeatDelay = 200;
    this.scrollOffset = 0;
    this.maxScroll = 0;
    this.scrollSpeed = 30;
  }

  async create() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Contenedor principal
    this.container = this.add.container(0, 0);

    // Fondo con gradiente
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x0f0c29, 0x302b63, 0x24243e, 0x302b63, 1);
    graphics.fillRect(0, 0, width, height);
    this.container.add(graphics);

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
    this.container.add(particles);

    // Título
    const titleSize = Math.min(64, width / 15);
    const title = this.add.text(width / 2, height * 0.08, '📊 HISTORIAL DE JUEGO', {
      fontSize: titleSize + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#6c5ce7',
      strokeThickness: 6
    });
    title.setOrigin(0.5);
    this.container.add(title);

    // Texto de carga
    this.loadingText = this.add.text(width / 2, height / 2, 'Cargando historial...', {
      fontSize: Math.min(24, width / 35) + 'px',
      fontFamily: 'Arial',
      color: '#a29bfe'
    });
    this.loadingText.setOrigin(0.5);
    this.container.add(this.loadingText);

    // Cargar datos del historial
    await this.loadHistory();

    // Crear área de scroll
    this.createScrollableTable(width, height);

    // Ajustar solo los encabezados para que queden completamente visibles
    if (this.tableContainer && this.sessions && this.sessions.length > 0) {
      const headerHeight = 30;
      const headerCenterY = headerHeight / 2; // colocar el centro del fondo del encabezado dentro de la máscara

      // El primer hijo agregado en createScrollableTable es el fondo del encabezado
      const headerBg = this.tableContainer.list[0];
      if (headerBg && headerBg.setY) {
        headerBg.setY(headerCenterY);
      }

      // Mover los textos del encabezado (están directamente dentro de tableContainer, no en rowsContainer)
      this.tableContainer.list.forEach(child => {
        if (child instanceof Phaser.GameObjects.Text) {
          child.setY(headerCenterY);
        }
      });

      // Ajustar la posición del contenedor de filas para que comience después del encabezado
      if (this.rowsContainer) {
        this.rowsContainer.setY(headerHeight + 10);
      }
    }
    this.createBackButton(width, height);

    // Configurar controles
    this.setupControls();

    // Escuchar cambios de tamaño
    this.scale.on('resize', this.resize, this);
  }

  async loadHistory() {
    try {
      const response = await fetch(`${API_BASE_URL}/game/sessions`);
      if (response.ok) {
        const data = await response.json();
        this.sessions = data || [];
        console.log('📊 Sesiones cargadas:', this.sessions.length);
      } else {
        console.warn('No se pudo cargar el historial');
        this.sessions = [];
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
      this.sessions = [];
    }

    // Eliminar texto de carga
    if (this.loadingText) {
      this.loadingText.destroy();
    }
  }

  createScrollableTable(width, height) {
    const tableY = height * 0.18;
    const tableHeight = height * 0.65;
    const tableWidth = Math.min(1000, width * 0.9);

    // Contenedor para la tabla con máscara
    this.tableContainer = this.add.container(width / 2, tableY);
    this.container.add(this.tableContainer);

    // Crear zona de máscara
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(width / 2 - tableWidth / 2, tableY, tableWidth, tableHeight);
    const mask = maskShape.createGeometryMask();
    this.tableContainer.setMask(mask);

    if (this.sessions.length === 0) {
      const noData = this.add.text(0, tableHeight / 2, 'No hay sesiones de juego registradas', {
        fontSize: Math.min(24, width / 35) + 'px',
        fontFamily: 'Arial',
        color: '#95a5a6',
        align: 'center'
      });
      noData.setOrigin(0.5);
      this.tableContainer.add(noData);
      return;
    }

    // Encabezados de tabla
    const headerBg = this.add.rectangle(0, 0, tableWidth, 40, 0x6c5ce7, 0.9);
    this.tableContainer.add(headerBg);

    const colWidths = [0.15, 0.25, 0.15, 0.15, 0.15, 0.15]; // Proporciones de columnas
    const headers = ['ID', 'Jugador', 'Puntos', 'Tiempo', 'Resultado', 'Fecha'];
    let currentX = -tableWidth / 2 + 20;

    headers.forEach((header, i) => {
      const headerText = this.add.text(currentX, 0, header, {
        fontSize: Math.min(18, width / 50) + 'px',
        fontFamily: 'Arial Black',
        color: '#ffffff'
      });
      headerText.setOrigin(0, 0.5);
      this.tableContainer.add(headerText);
      currentX += tableWidth * colWidths[i];
    });

    // Contenedor de filas (movible para scroll)
    this.rowsContainer = this.add.container(0, 50);
    this.tableContainer.add(this.rowsContainer);

    // Crear filas de datos
    const rowHeight = 35;
    this.sessions.forEach((session, index) => {
      const y = index * rowHeight;

      // Fondo alternado
      const rowBg = this.add.rectangle(0, y, tableWidth, rowHeight - 2, 
        index % 2 === 0 ? 0x2d3436 : 0x353b48, 0.8);
      this.rowsContainer.add(rowBg);

      // Formatear fecha
      const date = new Date(session.createdAt);
      const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

      // Formatear tiempo
      const minutes = Math.floor(session.timeTaken / 60);
      const seconds = session.timeTaken % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      // Resultado con color
      const resultColor = session.result === 'win' ? '#2ecc71' : '#e74c3c';
      const resultText = session.result === 'win' ? '✓ Victoria' : '✗ Derrota';

      const rowData = [
        session.id.toString(),
        session.playerName,
        session.score.toString(),
        timeStr,
        { text: resultText, color: resultColor },
        dateStr
      ];

      currentX = -tableWidth / 2 + 20;
      rowData.forEach((data, i) => {
        const isResult = typeof data === 'object';
        const text = isResult ? data.text : data;
        const color = isResult ? data.color : '#ecf0f1';

        const cellText = this.add.text(currentX, y, text, {
          fontSize: Math.min(16, width / 60) + 'px',
          fontFamily: 'Arial',
          color: color
        });
        cellText.setOrigin(0, 0.5);
        this.rowsContainer.add(cellText);
        currentX += tableWidth * colWidths[i];
      });
    });

    // Calcular scroll máximo
    const totalHeight = this.sessions.length * rowHeight;
    this.maxScroll = Math.max(0, totalHeight - tableHeight + 50);

    // Indicador de scroll si es necesario
    if (this.maxScroll > 0) {
      const scrollHint = this.add.text(width / 2, tableY + tableHeight + 20, 
        '↑↓ Usa las flechas o joystick para hacer scroll', {
        fontSize: Math.min(16, width / 60) + 'px',
        fontFamily: 'Arial',
        color: '#a29bfe',
        align: 'center'
      });
      scrollHint.setOrigin(0.5);
      this.container.add(scrollHint);
    }
  }

  createBackButton(width, height) {
    const buttonWidth = Math.min(200, width / 5);
    const buttonHeight = Math.min(50, height / 15);
    const buttonY = height * 0.92;

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
          this.goBack();
        }
      });
    });

    this.container.add(this.backButton);
  }

  setupControls() {
    // Teclas de dirección
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

        // Scroll con joystick
        if (currentState.up && !this.navigationCooldown) {
          this.scroll(-1);
          this.startNavigationCooldown();
        }

        if (currentState.down && !this.navigationCooldown) {
          this.scroll(1);
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

    // Scroll con teclado
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.scroll(-1);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.scroll(1);
    }

    // Volver con ESC, SPACE o ENTER
    if (Phaser.Input.Keyboard.JustDown(this.escKey) ||
        Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
        Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.goBack();
    }
  }

  scroll(direction) {
    if (!this.rowsContainer || this.maxScroll === 0) return;

    this.scrollOffset += direction * this.scrollSpeed;
    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, this.maxScroll);

    this.tweens.add({
      targets: this.rowsContainer,
      y: 50 - this.scrollOffset,
      duration: 100,
      ease: 'Power2'
    });
  }

  goBack() {
    // Limpiar callbacks antes de cambiar de escena
    if (this.bluetoothController && this.bluetoothDataHandler) {
      this.bluetoothController.off('data', this.bluetoothDataHandler);
      this.bluetoothDataHandler = null;
    }

    this.scene.start('MenuScene', {
      bluetoothController: this.bluetoothController,
      difficulty: this.difficulty,
      skipAnimations: true
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
    this.scale.off('resize', this.resize, this);

    // Limpiar callback de Bluetooth
    if (this.bluetoothController && this.bluetoothDataHandler) {
      this.bluetoothController.off('data', this.bluetoothDataHandler);
    }
  }
}
