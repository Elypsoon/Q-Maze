import Phaser from 'phaser';
import BluetoothController from '../services/BluetoothController';

export default class BluetoothSetupScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BluetoothSetupScene' });
  }

  init(data) {
    this.bluetoothController = data.bluetoothController;
    
    // Sistema de navegación
    this.selectedOption = 0; // 0=Conectar, 1=Volver
    this.navigationCooldown = false;
    this.navigationRepeatDelay = 200;
  }

  create() {
    this.createUI();
  }

  createUI() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Contenedor principal
    this.container = this.add.container(0, 0);

    // Fondo oscuro
    const overlay = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.9);
    overlay.setOrigin(0, 0);

    // Panel
    const panelWidth = Math.min(600, width * 0.85);
    const panelHeight = Math.min(500, height * 0.8);
    
    // Panel con bordes redondeados
    const panel = this.add.graphics();
    panel.fillStyle(0x2c3e50, 1);
    panel.lineStyle(4, 0x3498db, 1);
    panel.fillRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 20);
    panel.strokeRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 20);

    // Título
    const titleSize = Math.min(36, width / 22);
    const title = this.add.text(width / 2, height / 2 - panelHeight / 2 + 50, '🎮 MANDO BLUETOOTH', {
      fontSize: titleSize + 'px',
      fontFamily: 'Arial Black',
      color: '#3498db'
    });
    title.setOrigin(0.5);

    // Estado de conexión
    const statusSize = Math.min(22, width / 32);
    this.statusText = this.add.text(width / 2, height / 2 - panelHeight / 2 + 110, 'Desconectado', {
      fontSize: statusSize + 'px',
      fontFamily: 'Arial',
      color: '#95a5a6',
      align: 'center'
    });
    this.statusText.setOrigin(0.5);

    // Información
    const infoSize = Math.min(16, width / 50);
    const info = this.add.text(width / 2, height / 2 - 20, 
      'Conecta tu mando ESP32 vía Bluetooth\n' +
      'para jugar de forma inalámbrica.\n\n' +
      '🕹️ Joystick: Movimiento\n' +
      '🔴 Arcade: Seleccionar\n' +
      '🔵 SW: Pausa', {
      fontSize: infoSize + 'px',
      fontFamily: 'Arial',
      color: '#ecf0f1',
      align: 'center',
      lineSpacing: 6
    });
    info.setOrigin(0.5);

    // Botón Conectar
    const buttonWidth = Math.min(280, panelWidth * 0.7);
    const buttonHeight = Math.min(55, height * 0.08);
    
    this.connectButton = this.createButton(
      width / 2,
      height / 2 + 100,
      '📡 Conectar',
      buttonWidth,
      buttonHeight,
      () => this.connectBluetooth(),
      0x3498db
    );

    // Botón Volver
    const backButton = this.createButton(
      width / 2,
      height / 2 + 170,
      '← Volver',
      buttonWidth,
      buttonHeight,
      () => this.goBack(),
      0x95a5a6
    );

    // Agregar elementos al contenedor
    this.container.add([overlay, panel, title, this.statusText, info, this.connectButton, backButton]);
    
    // Animación de entrada
    this.container.setAlpha(0);
    this.container.setScale(0.9);
    this.tweens.add({
        targets: this.container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Power2'
    });

    // Verificar si ya está conectado
    this.updateStatus();

    // Configurar callbacks del Bluetooth
    if (this.bluetoothController) {
      this.bluetoothController.on('connect', (deviceName) => {
        console.log('✅ Evento de conexión recibido:', deviceName);
        this.updateStatus();
      });

      this.bluetoothController.on('disconnect', () => {
        console.log('❌ Evento de desconexión recibido');
        this.updateStatus();
      });
    }

    // Verificar estado de conexión periódicamente
    this.connectionCheckTimer = this.time.addEvent({
      delay: 1000, // Cada segundo
      callback: () => {
        this.updateStatus();
      },
      loop: true
    });
    
    // Guardar referencias de botones para navegación
    this.buttons = [
      { container: this.connectButton, action: () => this.connectBluetooth() },
      { container: backButton, action: () => this.goBack() }
    ];
    
    // Configurar controles
    this.setupControls();
    
    // Aplicar highlight inicial
    this.updateSelectionHighlight(-1, this.selectedOption);

    // Escuchar cambios de tamaño
    this.scale.on('resize', this.resize, this);
  }

  async connectBluetooth() {
    if (this.bluetoothController.isConnected()) {
      this.bluetoothController.disconnect();
      this.updateStatus();
      return;
    }

    this.statusText.setText('Conectando...');
    this.statusText.setColor('#f39c12');

    try {
      await this.bluetoothController.connect();
      this.updateStatus();
    } catch (error) {
      this.statusText.setText('Error: ' + error.message);
      this.statusText.setColor('#e74c3c');
      
      // Volver al estado desconectado después de 3 segundos
      this.time.delayedCall(3000, () => {
        if (!this.bluetoothController.isConnected()) {
          this.updateStatus();
        }
      });
    }
  }

  updateStatus() {
    if (this.bluetoothController.isConnected()) {
      const deviceInfo = this.bluetoothController.getDeviceInfo();
      this.statusText.setText(`✓ ${deviceInfo.name || 'ESP32'}`);
      this.statusText.setColor('#2ecc71');
      
      // Cambiar texto del botón
      if (this.connectButton && this.connectButton.list && this.connectButton.list[1]) {
        this.connectButton.list[1].setText('🔌 Desconectar');
      }
    } else {
      this.statusText.setText('⚠ Desconectado');
      this.statusText.setColor('#95a5a6');
      
      // Restaurar texto del botón
      if (this.connectButton && this.connectButton.list && this.connectButton.list[1]) {
        this.connectButton.list[1].setText('📡 Conectar');
      }
    }
  }

  createButton(x, y, text, width, height, callback, color = 0x3498db) {
    const button = this.add.container(x, y);
    
    // Fondo del botón (Rounded)
    const bg = this.add.graphics();
    
    const drawBg = (strokeColor, strokeWidth) => {
        bg.clear();
        bg.fillStyle(color, 1);
        bg.lineStyle(strokeWidth, strokeColor, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
    };
    
    drawBg(0xffffff, 3);
    
    // Texto del botón
    const buttonTextSize = Math.min(20, width / 14);
    const buttonText = this.add.text(0, 0, text, {
      fontSize: buttonTextSize + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff'
    });
    buttonText.setOrigin(0.5);
    
    button.add([bg, buttonText]);
    button.setSize(width, height);
    button.setInteractive({ useHandCursor: true });
    button.setDepth(2500); // Asegurar que esté por encima del panel
    
    // Efectos hover
    button.on('pointerover', () => {
      drawBg(0xf39c12, 4);
      this.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100
      });
    });
    
    button.on('pointerout', () => {
      drawBg(0xffffff, 3);
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
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: callback
      });
    });
    
    return button;
  }

  goBack() {
    // Limpiar callbacks antes de cambiar de escena
    if (this.bluetoothController && this.bluetoothDataHandler) {
      this.bluetoothController.off('data', this.bluetoothDataHandler);
      this.bluetoothDataHandler = null;
    }
    
    this.scene.start('MenuScene', { 
      bluetoothController: this.bluetoothController,
      skipAnimations: true
    });
  }

  resize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    // Recrear UI con nuevas dimensiones
    if (this.container) {
      this.container.destroy();
    }
    this.createUI();
  }

  shutdown() {
    this.scale.off('resize', this.resize, this);
    
    // Limpiar timer de verificación
    if (this.connectionCheckTimer) {
      this.connectionCheckTimer.remove();
    }
    
    // Limpiar callback de Bluetooth
    if (this.bluetoothController && this.bluetoothDataHandler) {
      this.bluetoothController.off('data', this.bluetoothDataHandler);
    }
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
        
        // Navegación ARRIBA
        if (currentState.up && !this.navigationCooldown) {
          this.moveSelection(-1);
          this.startNavigationCooldown();
        }
        
        // Navegación ABAJO
        if (currentState.down && !this.navigationCooldown) {
          this.moveSelection(1);
          this.startNavigationCooldown();
        }
        
      } else if (event.type === 'button') {
        if (event.key === 'select') {
          this.confirmSelection();
        } else if (event.key === 'pause') {
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
    
    // Navegación con teclas
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.moveSelection(-1);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.moveSelection(1);
    }

    // Confirmar con SPACE o ENTER
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || 
        Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.confirmSelection();
    }
    
    // Volver con ESC
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.goBack();
    }
  }

  moveSelection(direction) {
    const previousOption = this.selectedOption;
    this.selectedOption += direction;

    // Wrap around
    if (this.selectedOption < 0) {
      this.selectedOption = this.buttons.length - 1;
    } else if (this.selectedOption >= this.buttons.length) {
      this.selectedOption = 0;
    }

    // Actualizar visualmente
    this.updateSelectionHighlight(previousOption, this.selectedOption);
  }

  updateSelectionHighlight(previousIndex, currentIndex) {
    if (!this.buttons) return;

    // Quitar highlight del anterior
    if (previousIndex >= 0 && previousIndex < this.buttons.length) {
      const prevButton = this.buttons[previousIndex].container;
      this.tweens.add({
        targets: prevButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    }

    // Agregar highlight al actual
    if (currentIndex >= 0 && currentIndex < this.buttons.length) {
      const currButton = this.buttons[currentIndex].container;
      this.tweens.add({
        targets: currButton,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        ease: 'Back.easeOut'
      });
    }
  }

  confirmSelection() {
    if (!this.buttons || this.selectedOption < 0 || 
        this.selectedOption >= this.buttons.length) {
      return;
    }

    const selectedButton = this.buttons[this.selectedOption];
    
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
