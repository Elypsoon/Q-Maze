import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
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

    const width = this.scale.width;
    const height = this.scale.height;

    // Contenedor para todos los elementos del menú
    this.menuContainer = this.add.container(0, 0);

    // Fondo con gradiente simulado
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    graphics.fillRect(0, 0, width, height);
    this.menuContainer.add(graphics);

    // Título del juego - ajustado al tamaño de pantalla
    const titleSize = Math.min(100, width / 10);
    const title = this.add.text(width / 2, height * 0.15, 'Q-MAZE', {
      fontSize: titleSize + 'px',
      fontFamily: 'Arial Black',
      color: '#0f3460',
      stroke: '#e94560',
      strokeThickness: 8
    });
    title.setOrigin(0.5);

    // Subtítulo
    const subtitleSize = Math.min(36, width / 25);
    const subtitle = this.add.text(width / 2, height * 0.25, 'Laberinto con trivia', {
      fontSize: subtitleSize + 'px',
      fontFamily: 'Arial',
      color: '#f1f1f1'
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

    // Botón de Jugar
    const buttonWidth = Math.min(250, width / 4);
    const buttonHeight = Math.min(60, height / 12);
    const playButton = this.createButton(width / 2, height * 0.48, 'JUGAR', buttonWidth, buttonHeight, () => {
      this.scene.start('GameScene', { seed: Date.now() });
    });

    // Instrucciones
    const instrSize = Math.min(18, width / 55);
    const instructions = this.add.text(width / 2, height * 0.65, 
      'Controles: ← ↑ → ↓ para moverte | ESC/P para pausar\n\n' +
      '• Gana puntos al avanzar hacia la meta (máx. 800)\n' +
      '• Responde preguntas para conservar vidas\n' +
      '• Bonificaciones al completar: tiempo y vidas restantes\n' +
      '• ¡Completa el laberinto rápido para máxima puntuación!', {
      fontSize: instrSize + 'px',
      fontFamily: 'Arial',
      color: '#95a5a6',
      align: 'center',
      lineSpacing: 5
    });
    instructions.setOrigin(0.5);

    // Agregar elementos al contenedor
    this.menuContainer.add([title, subtitle, description, instructions]);

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

  shutdown() {
    // Limpiar el listener cuando se cierre la escena
    this.scale.off('resize', this.resize, this);
    if (this.titleTween) {
      this.titleTween.remove();
    }
  }

  createButton(x, y, text, width, height, callback) {
    const button = this.add.container(x, y);

    // Fondo del botón
    const bg = this.add.rectangle(0, 0, width, height, 0xe94560);
    bg.setStrokeStyle(3, 0x0f3460);

    // Texto del botón
    const buttonTextSize = Math.min(36, width / 7);
    const buttonText = this.add.text(0, 0, text, {
      fontSize: buttonTextSize + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff'
    });
    buttonText.setOrigin(0.5);

    button.add([bg, buttonText]);
    button.setSize(width, height);
    button.setInteractive({ useHandCursor: true });

    // Efectos hover
    button.on('pointerover', () => {
      bg.setFillStyle(0xff6b81);
      this.tweens.add({
        targets: button,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        ease: 'Power2'
      });
    });

    button.on('pointerout', () => {
      bg.setFillStyle(0xe94560);
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
        onComplete: callback
      });
    });

    return button;
  }
}
