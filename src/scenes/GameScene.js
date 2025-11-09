import Phaser from 'phaser';
import MazeGenerator from '../utils/MazeGenerator';
import { GAME_CONFIG } from './QuestionScene';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    // Parámetros del juego
    this.seed = data.seed || Date.now();
    this.lives = 3;
    this.score = 0;
    
    // Configuración del tamaño del laberinto
    this.mazeRows = 20;
    this.mazeCols = 20;
    this.cellSize = 40;
    
    // Temporizadores
    this.totalTimeLimit = 300; // 5 minutos en segundos
    this.questionTimeInterval = 20; // Cada 20 segundos lanza pregunta (aumentado de 20)
    this.timeElapsed = 0;
    this.timeSinceLastQuestion = 0;
    
    // Estado del juego
    this.gameOver = false;
    this.wallTouched = false;
    this.questionActive = false;
    this.invulnerable = false; // Estado de invulnerabilidad
    this.isPaused = false; // Estado de pausa
  }

  create() {
    this.calculateDimensions();
    
    // Generar el laberinto
    this.generateMaze();

    // Crear el jugador
    this.createPlayer();

    // Crear UI
    this.createUI();

    // Configurar controles
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Tecla de pausa (ESC o P)
    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.pauseKeyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    // Configurar cámara para que siga al jugador pero dentro de los límites del laberinto
    const mazeWidth = this.mazeCols * this.cellSize;
    const mazeHeight = this.mazeRows * this.cellSize;
    this.cameras.main.setBounds(
      this.mazeOffsetX,
      this.mazeOffsetY,
      mazeWidth,
      mazeHeight
    );
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Iniciar temporizadores
    this.startTimers();
    
    // Escuchar cambios de tamaño
    this.scale.on('resize', this.resize, this);
  }

  calculateDimensions() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Calcular el tamaño del laberinto basado en el área disponible
    // Reducimos el espacio reservado para el panel UI para que el laberinto sea más grande
    const uiPanelWidth = Math.min(240, width * 0.18);
    const availableWidth = width - uiPanelWidth - 30;
    const availableHeight = height - 30;
    
    // Calcular el tamaño óptimo de celda
    const maxCellWidth = Math.floor(availableWidth / this.mazeCols);
    const maxCellHeight = Math.floor(availableHeight / this.mazeRows);
    this.cellSize = Math.min(maxCellWidth, maxCellHeight, 45);
    
    // Calcular el offset para centrar el laberinto
    this.mazeOffsetX = 15;
    this.mazeOffsetY = Math.max(15, (height - (this.mazeRows * this.cellSize)) / 2);
  }

  generateMaze() {
    const generator = new MazeGenerator(this.mazeRows, this.mazeCols, this.seed);
    this.maze = generator.generate();

    // Grupo para las paredes
    this.walls = this.physics.add.staticGroup();
    
    // Grupo para las zonas de preguntas (usando Group en lugar de StaticGroup)
    this.questionZones = this.physics.add.group();
    
    // Array para trackear las zonas visitadas
    this.visitedZones = new Set();

    // Dibujar el laberinto
    for (let row = 0; row < this.mazeRows; row++) {
      for (let col = 0; col < this.mazeCols; col++) {
        const cell = this.maze[row][col];
        const x = this.mazeOffsetX + col * this.cellSize;
        const y = this.mazeOffsetY + row * this.cellSize;

        // Dibujar el suelo de la celda
        const floor = this.add.rectangle(
          x + this.cellSize / 2,
          y + this.cellSize / 2,
          this.cellSize - 2,
          this.cellSize - 2,
          cell.isQuestionZone ? 0x3498db : 0x34495e
        );

        // Si es zona de pregunta, añadir un símbolo
        if (cell.isQuestionZone) {
          const questionMark = this.add.text(
            x + this.cellSize / 2,
            y + this.cellSize / 2,
            '?',
            {
              fontSize: Math.max(20, this.cellSize / 1.5) + 'px',
              fontFamily: 'Arial Black',
              color: '#ffffff'
            }
          );
          questionMark.setOrigin(0.5);
          
          // Guardar referencia al texto para poder actualizarlo
          cell.questionMarkText = questionMark;
          cell.floorRect = floor;

          // Añadir zona de pregunta física como trigger (isSensor = true)
          const zone = this.add.rectangle(
            x + this.cellSize / 2,
            y + this.cellSize / 2,
            this.cellSize - 2,
            this.cellSize - 2,
            0x3498db,
            0 // Transparente, solo para detección
          );
          zone.setData('isQuestionZone', true);
          zone.setData('visited', false);
          zone.setData('row', row);
          zone.setData('col', col);
          zone.setData('zoneId', `${row}-${col}`);
          
          this.physics.add.existing(zone);
          zone.body.setAllowGravity(false);
          zone.body.moves = false;
          
          this.questionZones.add(zone);
        }

        // Dibujar las paredes
        const wallThickness = 4;
        
        if (cell.walls.top) {
          const wall = this.add.rectangle(
            x + this.cellSize / 2,
            y,
            this.cellSize,
            wallThickness,
            0xe74c3c
          );
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
        }
        
        if (cell.walls.right) {
          const wall = this.add.rectangle(
            x + this.cellSize,
            y + this.cellSize / 2,
            wallThickness,
            this.cellSize,
            0xe74c3c
          );
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
        }
        
        if (cell.walls.bottom) {
          const wall = this.add.rectangle(
            x + this.cellSize / 2,
            y + this.cellSize,
            this.cellSize,
            wallThickness,
            0xe74c3c
          );
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
        }
        
        if (cell.walls.left) {
          const wall = this.add.rectangle(
            x,
            y + this.cellSize / 2,
            wallThickness,
            this.cellSize,
            0xe74c3c
          );
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
        }
      }
    }

    // Marcar el inicio (verde)
    const startX = this.mazeOffsetX + this.cellSize / 2;
    const startY = this.mazeOffsetY + this.cellSize / 2;
    const start = this.add.rectangle(
      startX,
      startY,
      this.cellSize - 4,
      this.cellSize - 4,
      0x2ecc71
    );
    this.add.text(startX, startY, 'INICIO', {
      fontSize: Math.max(14, this.cellSize / 3.5) + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Marcar el final (amarillo)
    const endX = this.mazeOffsetX + (this.mazeCols - 1) * this.cellSize + this.cellSize / 2;
    const endY = this.mazeOffsetY + (this.mazeRows - 1) * this.cellSize + this.cellSize / 2;
    this.goal = this.add.rectangle(
      endX,
      endY,
      this.cellSize - 4,
      this.cellSize - 4,
      0xf39c12
    );
    this.add.text(endX, endY, 'META', {
      fontSize: Math.max(14, this.cellSize / 3.5) + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Hacer la meta física para detectar colisión
    this.physics.add.existing(this.goal);
  }

  createPlayer() {
    // Crear el jugador en el inicio del laberinto
    const playerSize = Math.max(8, this.cellSize / 3.5);
    this.player = this.add.circle(
      this.mazeOffsetX + this.cellSize / 2,
      this.mazeOffsetY + this.cellSize / 2,
      playerSize,
      0xecf0f1
    );
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    // Colisiones físicas con paredes
    this.physics.add.collider(this.player, this.walls, this.onWallTouch, null, this);
    
    // Overlap con zonas de preguntas (no bloquean el movimiento)
    this.physics.add.overlap(this.player, this.questionZones, this.onQuestionZone, null, this);
    
    // Colisión con la meta
    this.physics.add.overlap(this.player, this.goal, this.onReachGoal, null, this);
  }

  createUI() {
    // Limpiar UI anterior si existe
    if (this.uiContainer) {
      this.uiContainer.destroy();
    }

    const width = this.scale.width;
    const height = this.scale.height;
    
    // Crear contenedor para la UI
    this.uiContainer = this.add.container(0, 0);
    this.uiContainer.setScrollFactor(0);
    this.uiContainer.setDepth(100);
    
    // Crear panel de estadísticas en el lado derecho (responsive)
    const panelWidth = Math.min(220, width * 0.2);
    const panelHeight = Math.min(400, height * 0.7);
    const panelX = width - panelWidth - 10;
    const panelY = 20;
    
    // Fondo del panel
    const panel = this.add.rectangle(
      panelX + panelWidth / 2,
      panelY + panelHeight / 2,
      panelWidth,
      panelHeight,
      0x2c3e50,
      0.95
    );
    panel.setStrokeStyle(3, 0xe74c3c);

    // Tamaños de fuente adaptativos - Aumentados
    const titleFontSize = Math.min(26, width * 0.024);
    const mainFontSize = Math.min(20, width * 0.019);
    const smallFontSize = Math.min(18, width * 0.017);
    const tinyFontSize = Math.min(16, width * 0.015);

    // Título del panel
    const panelTitle = this.add.text(panelX + panelWidth / 2, panelY + 20, 'ESTADÍSTICAS', {
      fontSize: titleFontSize + 'px',
      fontFamily: 'Arial Black',
      color: '#ecf0f1'
    });
    panelTitle.setOrigin(0.5, 0);

    // Línea divisoria
    const divider = this.add.rectangle(
      panelX + panelWidth / 2,
      panelY + 50,
      panelWidth - 20,
      2,
      0x7f8c8d
    );

    // Textos de estadísticas
    const textConfig = {
      fontSize: mainFontSize + 'px',
      fontFamily: 'Arial',
      color: '#ecf0f1'
    };

    this.livesText = this.add.text(panelX + 15, panelY + 70, '', textConfig);
    this.timeText = this.add.text(panelX + 15, panelY + 130, '', textConfig);
    this.questionTimerText = this.add.text(panelX + 15, panelY + 210, '', {
      fontSize: smallFontSize + 'px',
      fontFamily: 'Arial',
      color: '#ecf0f1'
    });
    this.scoreText = this.add.text(panelX + 15, panelY + 290, '', textConfig);
    
    // Indicador de invulnerabilidad
    this.invulnerableText = this.add.text(panelX + 15, panelY + 340, '', {
      fontSize: tinyFontSize + 'px',
      fontFamily: 'Arial',
      color: '#f39c12'
    });

    // Añadir todos los elementos al contenedor
    this.uiContainer.add([
      panel, panelTitle, divider, 
      this.livesText, this.timeText, 
      this.questionTimerText, this.scoreText, 
      this.invulnerableText
    ]);

    this.updateUI();
  }

  updateUI() {
    const heartIcons = '❤️'.repeat(this.lives) + '🖤'.repeat(3 - this.lives);
    this.livesText.setText(`VIDAS\n${heartIcons}\n${this.lives}/3`);
    
    const timeRemaining = Math.floor(this.totalTimeLimit - this.timeElapsed);
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    this.timeText.setText(`TIEMPO TOTAL\n⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`);
    
    const questionTime = Math.floor(this.questionTimeInterval - this.timeSinceLastQuestion);
    this.questionTimerText.setText(`PRÓXIMA PREGUNTA\n❓ ${questionTime}s`);
    
    this.scoreText.setText(`PUNTUACIÓN\n⭐ ${this.score} pts`);

    // Actualizar indicador de invulnerabilidad
    if (this.invulnerable) {
      this.invulnerableText.setText(`🛡️ INVULNERABLE`);
    } else {
      this.invulnerableText.setText('');
    }
  }

  startTimers() {
    // Timer principal del juego
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimers,
      callbackScope: this,
      loop: true
    });
  }

  updateTimers() {
    if (this.gameOver || this.questionActive || this.isPaused) return;

    this.timeElapsed++;
    this.timeSinceLastQuestion++;

    // Verificar si se acabó el tiempo total
    if (this.timeElapsed >= this.totalTimeLimit) {
      this.endGame(false, '¡Se acabó el tiempo!');
      return;
    }

    // Verificar si es momento de lanzar pregunta por tiempo
    if (this.timeSinceLastQuestion >= this.questionTimeInterval) {
      this.launchQuestion('tiempo');
    }

    this.updateUI();
  }

  onWallTouch(player, wall) {
    // Las paredes bloquean físicamente (collider)
    // Solo lanzar pregunta si no está en invulnerabilidad y no hay pregunta activa
    if (!this.wallTouched && !this.questionActive && !this.invulnerable) {
      this.wallTouched = true;
      this.launchQuestion('pared');
      
      // Reset después de un momento para evitar múltiples detecciones
      this.time.delayedCall(500, () => {
        this.wallTouched = false;
      });
    }
    // La colisión física ocurre de todos modos, solo evitamos lanzar la pregunta
  }

  onQuestionZone(player, zone) {
    // Verificar si es una zona de pregunta válida y no visitada
    const zoneId = zone.getData('zoneId');
    const visited = zone.getData('visited');
    
    if (!this.questionActive && !visited && zone.getData('isQuestionZone')) {
      // Marcar como visitada para no lanzar pregunta de nuevo
      zone.setData('visited', true);
      zone.setData('isQuestionZone', false);
      this.visitedZones.add(zoneId);
      
      // Cambiar la apariencia de la zona
      const row = zone.getData('row');
      const col = zone.getData('col');
      const cell = this.maze[row][col];
      
      // Actualizar color del suelo
      if (cell.floorRect) {
        cell.floorRect.setFillStyle(0x95a5a6);
      }
      
      // Eliminar el símbolo de interrogación
      if (cell.questionMarkText) {
        cell.questionMarkText.setText('✓');
        cell.questionMarkText.setColor('#7f8c8d');
      }
      
      this.launchQuestion('zona');
    }
  }

  onReachGoal(player, goal) {
    if (!this.gameOver) {
      // Usar configuración del servidor (futuro)
      this.score += GAME_CONFIG.POINTS_COMPLETE_MAZE;
      this.endGame(true, '¡Felicidades! ¡Completaste el laberinto!');
    }
  }

  launchQuestion(reason) {
    this.questionActive = true;
    this.timeSinceLastQuestion = 0;

    // Pausar el movimiento del jugador
    this.player.body.setVelocity(0);

    // Iniciar la escena de preguntas
    this.scene.pause();
    this.scene.launch('QuestionScene', {
      reason: reason,
      onAnswer: this.onQuestionAnswered.bind(this)
    });
  }

  onQuestionAnswered(correct) {
    this.questionActive = false;
    this.scene.resume();

    if (correct) {
      // Usar configuración del servidor (futuro)
      this.score += GAME_CONFIG.POINTS_CORRECT_ANSWER;
      this.showFeedback(`¡Correcto! +${GAME_CONFIG.POINTS_CORRECT_ANSWER} puntos`, 0x2ecc71);
    } else {
      this.lives--;
      this.showFeedback('¡Incorrecto! -1 vida', 0xe74c3c);
      
      if (this.lives <= 0) {
        this.endGame(false, '¡Se acabaron las vidas!');
      }
    }

    // Activar invulnerabilidad (duración desde configuración)
    this.invulnerable = true;
    
    // Calcular número de parpadeos según la duración
    const invulnerabilityDuration = GAME_CONFIG.INVULNERABILITY_DURATION;
    const blinkDuration = 200; // Duración de cada parpadeo
    const repeatCount = Math.floor(invulnerabilityDuration / (blinkDuration * 2)) - 1;
    
    // Efecto visual de invulnerabilidad (parpadeo)
    this.tweens.add({
      targets: this.player,
      alpha: 0.5,
      duration: blinkDuration,
      yoyo: true,
      repeat: repeatCount,
      onComplete: () => {
        this.player.alpha = 1;
        this.invulnerable = false;
        this.updateUI();
      }
    });

    this.updateUI();
  }

  showFeedback(message, color) {
    const feedback = this.add.text(
      this.player.x,
      this.player.y - 30,
      message,
      {
        fontSize: '20px',
        fontFamily: 'Arial Black',
        color: '#ffffff',
        backgroundColor: Phaser.Display.Color.IntegerToColor(color).rgba,
        padding: { x: 10, y: 5 }
      }
    );
    feedback.setOrigin(0.5);

    this.tweens.add({
      targets: feedback,
      y: feedback.y - 40,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => feedback.destroy()
    });
  }

  endGame(won, message) {
    this.gameOver = true;
    
    // Detener el jugador
    this.player.body.setVelocity(0);

    // Mostrar mensaje final
    const finalMessage = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      message + '\n\n' +
      `Puntuación final: ${this.score}\n` +
      `Tiempo usado: ${Math.floor(this.timeElapsed)}s\n\n` +
      'Presiona ESPACIO para volver al menú',
      {
        fontSize: '28px',
        fontFamily: 'Arial Black',
        color: '#ffffff',
        backgroundColor: won ? '#27ae60' : '#c0392b',
        padding: { x: 20, y: 20 },
        align: 'center'
      }
    );
    finalMessage.setOrigin(0.5);
    finalMessage.setScrollFactor(0);

    // Permitir volver al menú
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.stop('QuestionScene');
      this.scene.start('MenuScene');
    });
  }

  togglePause() {
    if (this.gameOver || this.questionActive) return;
    
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      // Pausar física
      this.physics.pause();
      
      // Pausar temporizadores
      if (this.gameTimer) {
        this.gameTimer.paused = true;
      }
      
      // Mostrar menú de pausa
      this.showPauseMenu();
    } else {
      // Reanudar física
      this.physics.resume();
      
      // Reanudar temporizadores
      if (this.gameTimer) {
        this.gameTimer.paused = false;
      }
      
      // Ocultar menú de pausa
      this.hidePauseMenu();
    }
  }

  showPauseMenu() {
    const width = this.scale.width;
    const height = this.scale.height;
    
    // Contenedor para el menú de pausa
    this.pauseContainer = this.add.container(0, 0);
    this.pauseContainer.setScrollFactor(0);
    this.pauseContainer.setDepth(10000);
    
    // Overlay oscuro
    const overlay = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.8);
    overlay.setOrigin(0, 0);
    
    // Panel del menú
    const panelWidth = Math.min(500, width * 0.8);
    const panelHeight = Math.min(450, height * 0.7);
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x2c3e50);
    panel.setStrokeStyle(4, 0xe74c3c);
    
    // Título
    const titleSize = Math.min(48, width / 20);
    const title = this.add.text(width / 2, height / 2 - panelHeight / 2 + 60, '⏸️ PAUSA', {
      fontSize: titleSize + 'px',
      fontFamily: 'Arial Black',
      color: '#ecf0f1'
    });
    title.setOrigin(0.5);
    
    // Agregar elementos base al contenedor
    this.pauseContainer.add([overlay, panel, title]);
    
    // Botones
    const buttonWidth = Math.min(300, panelWidth * 0.7);
    const buttonHeight = Math.min(60, height * 0.08);
    const startY = height / 2 - 50;
    const spacing = buttonHeight + 20;
    
    // Botón Reanudar
    this.createPauseButton(
      width / 2,
      startY,
      '▶️ Reanudar',
      buttonWidth,
      buttonHeight,
      () => this.togglePause(),
      0x27ae60
    );
    
    // Botón Reiniciar
    this.createPauseButton(
      width / 2,
      startY + spacing,
      '🔄 Reiniciar',
      buttonWidth,
      buttonHeight,
      () => this.restartGame(),
      0x3498db
    );
    
    // Botón Salir
    this.createPauseButton(
      width / 2,
      startY + spacing * 2,
      '🚪 Salir al Menú',
      buttonWidth,
      buttonHeight,
      () => this.exitToMenu(),
      0xe74c3c
    );
    
    // Instrucción
    const instrSize = Math.min(18, width / 50);
    const instruction = this.add.text(width / 2, height / 2 + panelHeight / 2 - 40, 'Presiona ESC o P para reanudar', {
      fontSize: instrSize + 'px',
      fontFamily: 'Arial',
      color: '#95a5a6',
      align: 'center'
    });
    instruction.setOrigin(0.5);
    
    // Agregar instrucción al contenedor
    this.pauseContainer.add(instruction);
  }

  createPauseButton(x, y, text, width, height, callback, color = 0xe94560) {
    const button = this.add.container(x, y);
    button.setDepth(10001); // Mayor que el contenedor de pausa
    
    // Fondo del botón
    const bg = this.add.rectangle(0, 0, width, height, color);
    bg.setStrokeStyle(3, 0xffffff);
    
    // Texto del botón
    const buttonTextSize = Math.min(24, width / 12);
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
      bg.setStrokeStyle(4, 0xf39c12);
      this.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100
      });
    });
    
    button.on('pointerout', () => {
      bg.setStrokeStyle(3, 0xffffff);
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
    
    // Agregar el botón al contenedor de pausa
    this.pauseContainer.add(button);
    return button;
  }

  hidePauseMenu() {
    if (this.pauseContainer) {
      this.pauseContainer.destroy();
      this.pauseContainer = null;
    }
    if (this.pauseButtons) {
      this.pauseButtons = [];
    }
  }

  restartGame() {
    this.hidePauseMenu();
    this.scene.stop('QuestionScene');
    this.scene.restart({ seed: Date.now() });
  }

  exitToMenu() {
    this.hidePauseMenu();
    this.scene.stop('QuestionScene');
    this.scene.start('MenuScene');
  }

  update(time, delta) {
    // Verificar tecla de pausa
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey) || Phaser.Input.Keyboard.JustDown(this.pauseKeyP)) {
      this.togglePause();
      return;
    }
    
    if (this.gameOver || this.questionActive || this.isPaused) {
      this.player.body.setVelocity(0);
      return;
    }

    // Movimiento del jugador
    const speed = 150;

    this.player.body.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(speed);
    }

    if (this.cursors.up.isDown) {
      this.player.body.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.player.body.setVelocityY(speed);
    }
  }

  resize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    // Actualizar la cámara
    this.cameras.main.setSize(width, height);
    
    // Recrear UI con las nuevas dimensiones
    this.createUI();
    
    // Recrear menú de pausa si está activo
    if (this.isPaused && this.pauseContainer) {
      this.hidePauseMenu();
      this.showPauseMenu();
    }
  }

  shutdown() {
    // Limpiar el listener cuando se cierre la escena
    this.scale.off('resize', this.resize, this);
    
    // Limpiar menú de pausa si existe
    this.hidePauseMenu();
  }
}
