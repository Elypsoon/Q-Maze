import Phaser from 'phaser';
import MazeGenerator from '../utils/MazeGenerator';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    // Parámetros del juego
    this.seed = data.seed || Date.now();
    this.lives = 3;
    this.score = 0;
    
    // Configuración del laberinto
    this.mazeRows = 15;
    this.mazeCols = 15;
    this.cellSize = 40;
    
    // Temporizadores
    this.totalTimeLimit = 300; // 5 minutos en segundos
    this.questionTimeInterval = 20; // Cada 20 segundos lanza pregunta
    this.timeElapsed = 0;
    this.timeSinceLastQuestion = 0;
    
    // Estado del juego
    this.gameOver = false;
    this.wallTouched = false;
    this.questionActive = false;
    this.invulnerable = false; // Estado de invulnerabilidad
  }

  create() {
    const { width, height } = this.scale;

    // Calcular el tamaño del laberinto basado en el área disponible
    // Reservamos espacio para el panel de estadísticas
    const uiPanelWidth = 250;
    const availableWidth = width - uiPanelWidth - 40; // margen
    const availableHeight = height - 40; // margen
    
    // Calcular el tamaño óptimo de celda
    const maxCellWidth = Math.floor(availableWidth / this.mazeCols);
    const maxCellHeight = Math.floor(availableHeight / this.mazeRows);
    this.cellSize = Math.min(maxCellWidth, maxCellHeight);
    
    // Calcular el offset para centrar el laberinto
    this.mazeOffsetX = 20;
    this.mazeOffsetY = (height - (this.mazeRows * this.cellSize)) / 2;

    // Generar el laberinto
    this.generateMaze();

    // Crear el jugador
    this.createPlayer();

    // Crear UI
    this.createUI();

    // Configurar controles
    this.cursors = this.input.keyboard.createCursorKeys();

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
              fontSize: Math.max(16, this.cellSize / 2) + 'px',
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
      fontSize: Math.max(10, this.cellSize / 5) + 'px',
      fontFamily: 'Arial',
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
      fontSize: Math.max(10, this.cellSize / 5) + 'px',
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
    const { width, height } = this.scale;
    
    // Crear panel de estadísticas en el lado derecho
    const panelX = width - 240;
    const panelY = 20;
    const panelWidth = 220;
    const panelHeight = 400;
    
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
    panel.setScrollFactor(0);
    panel.setDepth(100);

    // Título del panel
    const panelTitle = this.add.text(panelX + panelWidth / 2, panelY + 20, 'ESTADÍSTICAS', {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#ecf0f1'
    });
    panelTitle.setOrigin(0.5, 0);
    panelTitle.setScrollFactor(0);
    panelTitle.setDepth(101);

    // Línea divisoria
    const divider = this.add.rectangle(
      panelX + panelWidth / 2,
      panelY + 50,
      panelWidth - 20,
      2,
      0x7f8c8d
    );
    divider.setScrollFactor(0);
    divider.setDepth(101);

    // Textos de estadísticas
    const textConfig = {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ecf0f1'
    };

    this.livesText = this.add.text(panelX + 15, panelY + 70, '', textConfig);
    this.livesText.setScrollFactor(0);
    this.livesText.setDepth(101);

    this.timeText = this.add.text(panelX + 15, panelY + 130, '', textConfig);
    this.timeText.setScrollFactor(0);
    this.timeText.setDepth(101);

    this.questionTimerText = this.add.text(panelX + 15, panelY + 210, '', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ecf0f1'
    });
    this.questionTimerText.setScrollFactor(0);
    this.questionTimerText.setDepth(101);

    this.scoreText = this.add.text(panelX + 15, panelY + 290, '', textConfig);
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(101);

    // Indicador de invulnerabilidad
    this.invulnerableText = this.add.text(panelX + 15, panelY + 340, '', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#f39c12'
    });
    this.invulnerableText.setScrollFactor(0);
    this.invulnerableText.setDepth(101);

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
    if (this.gameOver || this.questionActive) return;

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
      this.score += 500;
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
      this.score += 50;
      this.showFeedback('¡Correcto! +50 puntos', 0x2ecc71);
    } else {
      this.lives--;
      this.showFeedback('¡Incorrecto! -1 vida', 0xe74c3c);
      
      if (this.lives <= 0) {
        this.endGame(false, '¡Se acabaron las vidas!');
      }
    }

    // Activar invulnerabilidad por 1 segundos
    this.invulnerable = true;
    
    // Efecto visual de invulnerabilidad (parpadeo)
    this.tweens.add({
      targets: this.player,
      alpha: 0.5,
      duration: 200,
      yoyo: true,
      repeat: 4, // 5 parpadeos en 1 segundos
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
        fontSize: '16px',
        fontFamily: 'Arial',
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
        fontSize: '24px',
        fontFamily: 'Arial',
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

  update(time, delta) {
    if (this.gameOver || this.questionActive) {
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
}
