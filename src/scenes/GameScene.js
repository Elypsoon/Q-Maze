import Phaser from 'phaser';
import MazeGenerator from '../utils/MazeGenerator';
import InputManager from '../utils/InputManager';
import { DIFFICULTY_LEVELS, getConfigForDifficulty } from '../config/gameConfig';

// URL base del backend (puerto 3000)
const API_BASE_URL = 'http://localhost:3000/api';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    // Obtener configuración del nivel de dificultad seleccionado
    const difficulty = data.difficulty || DIFFICULTY_LEVELS.MEDIUM;
    this.localConfig = getConfigForDifficulty(difficulty);
    
    // Parámetros del juego
    this.seed = data.seed || Date.now();
    this.lives = this.localConfig.LIVES;
    this.score = 0;
    
    // --- Historial de respuestas ---
    this.playerName = data.playerName || 'Invitado'; // Obtiene el nombre
    this.sessionAnswers = []; // Array para almacenar las respuestas

    // Configuración del tamaño del laberinto (desde config local)
    this.mazeRows = this.localConfig.MAZE_ROWS;
    this.mazeCols = this.localConfig.MAZE_COLS;
    this.cellSize = this.localConfig.CELL_SIZE;
    
    // Temporizadores (desde config local)
    this.totalTimeLimit = this.localConfig.TOTAL_TIME_LIMIT;
    this.questionTimeInterval = this.localConfig.QUESTION_TIME_INTERVAL;
    this.timeElapsed = 0;
    this.timeSinceLastQuestion = 0;
    
    // Estado del juego
    this.gameOver = false;
    this.wallTouched = false;
    this.questionActive = false;
    this.invulnerable = false; // Estado de invulnerabilidad
    this.isPaused = false; // Estado de pausa
    
    // Sistema de puntos basado en progreso
    this.visitedCells = new Set(); // Celdas visitadas para no contar dos veces

    // Backend Data
    this.gameConfig = null; // Se cargará desde /api/config (para complementar)
    this.questionsBank = []; // Se cargará desde /api/questions
    this.questionIndex = 0; // Para rotar las preguntas
    
    // Controlador Bluetooth
    this.bluetoothController = data.bluetoothController || window.bluetoothController;
    
    // Gestor de entrada unificado
    this.inputManager = new InputManager(this);
    this.bestDistance = Infinity; // Mejor distancia a la meta

    this.isGameReady = false;
  }

  // ============== LÓGICA DE CARGA DE DATOS ==============

  create() {
    // Muestra la pantalla de carga
    this.createLoadingScreen();

    // Inicia la carga de datos (asíncrona)
    this.preloadData()
      .then(() => {
          // Una vez cargados los datos, se inicia la escena real
          this.destroyLoadingScreen();
          this.setupGame();
      })
      .catch(() => {
          // El error se maneja en preloadData
      });
  }
  
  createLoadingScreen() {
    const width = this.scale.width;
    const height = this.scale.height;
    
    this.loadingContainer = this.add.container(0, 0);
    this.loadingContainer.setDepth(1000);
    
    const overlay = this.add.rectangle(0, 0, width * 2, height * 2, 0x1a1a2e, 1);
    overlay.setOrigin(0, 0);
    
    this.loadingText = this.add.text(width / 2, height / 2, 'Cargando datos del servidor...', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#3498db'
    });
    this.loadingText.setOrigin(0.5);
    
    this.loadingContainer.add([overlay, this.loadingText]);
    this.loadingContainer.setScrollFactor(0);
  }

  destroyLoadingScreen() {
    if (this.loadingContainer) {
        this.loadingContainer.destroy();
    }
  }

  showErrorAndExit(message) {
    this.destroyLoadingScreen();
    // Mostrar un mensaje de error grande en el centro de la pantalla
    const errorText = this.add.text(this.scale.width / 2, this.scale.height / 2, message, {
        fontSize: '32px',
        fontFamily: 'Arial Black',
        color: '#e74c3c',
        align: 'center'
    });
    errorText.setOrigin(0.5);
    errorText.setScrollFactor(0);
    
    this.time.delayedCall(1000, () => {
        this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'Presiona cualquier tecla para volver al menú', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#95a5a6'
        }).setOrigin(0.5).setScrollFactor(0);
        
        this.input.keyboard.once('keydown', () => {
            this.scene.start('MenuScene', { bluetoothController: this.bluetoothController });
        });
    });
  }

  async preloadData() {
    try {
        // Carga la configuración
        const configResponse = await fetch(`${API_BASE_URL}/config`);
        if (!configResponse.ok) throw new Error('Error al cargar la configuración del juego');
        this.gameConfig = await configResponse.json();
        
        // Carga el banco de preguntas
        const questionsResponse = await fetch(`${API_BASE_URL}/questions`);
        if (!questionsResponse.ok) throw new Error('Error al cargar el banco de preguntas');
        
        let rawQuestions = await questionsResponse.json();
        
        // Transforma la cadena JSON de opciones a un array de JS
        this.questionsBank = rawQuestions.map(question => ({
            ...question,
            // Sobrescribe la propiedad 'options' con el array parseado
            options: JSON.parse(question.options) 
        }));
        
        // Usa la configuración de tiempo del servidor
        this.questionTimeInterval = (this.gameConfig && this.gameConfig.QUESTION_TIME_INTERVAL) || 20;

        console.log('✅ Datos del servidor cargados: Config y Preguntas');
    } catch (error) {
        console.error('❌ Error al conectar con el backend:', error);
        this.showErrorAndExit('Error de red. Asegúrate de que el backend esté corriendo en puerto 3000.');
        throw error;
    }
  }

// ============== LÓGICA DE JUEGO  ==============

  setupGame() {
    this.calculateDimensions();
    
    // Generar el laberinto
    this.generateMaze();

    // Crear el jugador
    this.createPlayer();

    // Crear UI
    this.createUI();

    // Configurar controles de teclado
    this.cursors = this.input.keyboard.createCursorKeys();
    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.pauseKeyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Configurar callbacks del controlador Bluetooth
    if (this.bluetoothController) {
      this.bluetoothController.on('data', (events) => {
        if (!this.gameOver && !this.questionActive) {
          this.inputManager.updateFromBluetooth(events);
        }
      });

      this.bluetoothController.on('disconnect', () => {
        console.log('Controlador Bluetooth desconectado durante el juego');
      });
    }

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

    this.isGameReady = true;
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

        // Dibujar el suelo de la celda con borde invisible
        const floorColor = cell.isQuestionZone ? 0x3498db : 0x34495e;
        const floor = this.add.rectangle(
          x + this.cellSize / 2,
          y + this.cellSize / 2,
          this.cellSize,
          this.cellSize,
          floorColor
        );
        // Borde del mismo color que el relleno para que sea invisible
        floor.setStrokeStyle(2, floorColor);

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
        const wallThickness = 4; // Hitbox delgada para margen de error
        const wallVisualThickness = 6; // Visual más grueso para mejor visibilidad
        const wallColor = 0x6c5ce7; // Color morado vibrante
        
        if (cell.walls.top) {
          // Crear visual de pared (más gruesa)
          const wallVisual = this.add.rectangle(
            x + this.cellSize / 2,
            y,
            this.cellSize,
            wallVisualThickness,
            wallColor
          );
          
          // Crear hitbox de pared (más delgada para dar margen)
          const wall = this.add.rectangle(
            x + this.cellSize / 2,
            y,
            this.cellSize,
            wallThickness,
            wallColor,
            0 // Invisible, solo para colisión
          );
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
        }
        
        if (cell.walls.right) {
          // Crear visual de pared (más gruesa)
          const wallVisual = this.add.rectangle(
            x + this.cellSize,
            y + this.cellSize / 2,
            wallVisualThickness,
            this.cellSize,
            wallColor
          );
          
          // Crear hitbox de pared (más delgada para dar margen)
          const wall = this.add.rectangle(
            x + this.cellSize,
            y + this.cellSize / 2,
            wallThickness,
            this.cellSize,
            wallColor,
            0 // Invisible, solo para colisión
          );
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
        }
        
        if (cell.walls.bottom) {
          // Crear visual de pared (más gruesa)
          const wallVisual = this.add.rectangle(
            x + this.cellSize / 2,
            y + this.cellSize,
            this.cellSize,
            wallVisualThickness,
            wallColor
          );
          
          // Crear hitbox de pared (más delgada para dar margen)
          const wall = this.add.rectangle(
            x + this.cellSize / 2,
            y + this.cellSize,
            this.cellSize,
            wallThickness,
            wallColor,
            0 // Invisible, solo para colisión
          );
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
        }
        
        if (cell.walls.left) {
          // Crear visual de pared (más gruesa)
          const wallVisual = this.add.rectangle(
            x,
            y + this.cellSize / 2,
            wallVisualThickness,
            this.cellSize,
            wallColor
          );
          
          // Crear hitbox de pared (más delgada para dar margen)
          const wall = this.add.rectangle(
            x,
            y + this.cellSize / 2,
            wallThickness,
            this.cellSize,
            wallColor,
            0 // Invisible, solo para colisión
          );
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
        }
      }
    }

    // Marcar el inicio (verde brillante)
    const startX = this.mazeOffsetX + this.cellSize / 2;
    const startY = this.mazeOffsetY + this.cellSize / 2;
    const start = this.add.rectangle(
      startX,
      startY,
      this.cellSize - 4,
      this.cellSize - 4,
      0x00b894
    );
    this.add.text(startX, startY, 'INICIO', {
      fontSize: Math.max(14, this.cellSize / 3.5) + 'px',
      fontFamily: 'Arial Black',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Marcar el final (dorado vibrante)
    const endX = this.mazeOffsetX + (this.mazeCols - 1) * this.cellSize + this.cellSize / 2;
    const endY = this.mazeOffsetY + (this.mazeRows - 1) * this.cellSize + this.cellSize / 2;
    this.goal = this.add.rectangle(
      endX,
      endY,
      this.cellSize - 4,
      this.cellSize - 4,
      0xfdcb6e
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
      0x2d3436,
      0.95
    );
    panel.setStrokeStyle(3, 0x6c5ce7);

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
      0xa29bfe
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

    // Indicador de Bluetooth
    this.bluetoothIndicator = this.add.text(panelX + 15, panelY + panelHeight - 35, '', {
      fontSize: tinyFontSize + 'px',
      fontFamily: 'Arial',
      color: '#3498db'
    });

    // Añadir todos los elementos al contenedor
    this.uiContainer.add([
      panel, panelTitle, divider, 
      this.livesText, this.timeText, 
      this.questionTimerText, this.scoreText, 
      this.invulnerableText, this.bluetoothIndicator
    ]);

    this.updateUI();
  }

  updateUI() {
    const maxLives = this.localConfig.LIVES;
    const heartIcons = '❤️'.repeat(this.lives) + '🖤'.repeat(Math.max(0, maxLives - this.lives));
    this.livesText.setText(`VIDAS\n${heartIcons}\n${this.lives}/${maxLives}`);
    
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

    // Actualizar indicador de Bluetooth
    if (this.bluetoothController && this.bluetoothController.isConnected()) {
      const deviceInfo = this.bluetoothController.getDeviceInfo();
      this.bluetoothIndicator.setText(`🎮 ${deviceInfo.name || 'BT'}`);
      this.bluetoothIndicator.setColor('#2ecc71');
    } else {
      this.bluetoothIndicator.setText('');
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
      // Usar valores de configuración local (tienen prioridad sobre backend)
      const completionBonus = this.localConfig.COMPLETION_BONUS;
      const pointsPerSecond = this.localConfig.POINTS_PER_SECOND_LEFT;
      const pointsPerLife = this.localConfig.POINTS_PER_LIFE_LEFT;
      
      // Bonificación por completar el laberinto
      this.score += completionBonus;
      
      // Bonificación por tiempo restante
      const timeLeft = Math.max(0, this.totalTimeLimit - this.timeElapsed);
      const timeBonus = Math.floor(timeLeft * pointsPerSecond);
      this.score += timeBonus;
      
      // Bonificación por vidas restantes
      const lifeBonus = this.lives * pointsPerLife;
      this.score += lifeBonus;
      
      // Mensaje con detalles de bonificaciones
      const bonusDetails = `\n\n🎯 Bonificaciones:\n` +
        `Completar: +${completionBonus} pts\n` +
        `Tiempo restante (${Math.floor(timeLeft)}s): +${timeBonus} pts\n` +
        `Vidas restantes (${this.lives}): +${lifeBonus} pts`;
      
      this.endGame(true, '¡Felicidades! ¡Completaste el laberinto!' + bonusDetails);
    }
  }

  launchQuestion(reason) {
    if (!this.questionsBank || this.questionsBank.length === 0) {
        this.showFeedback('No hay preguntas disponibles. Continúa.', 0x95a5a6);
        return;
    }
    
    this.questionActive = true;
    this.timeSinceLastQuestion = 0;

    // Seleccionar una pregunta de forma rotativa/aleatoria
    if (this.questionIndex >= this.questionsBank.length) {
        this.questionIndex = 0;
        Phaser.Utils.Array.Shuffle(this.questionsBank); // Mezclar al reiniciar
    }
    const questionData = this.questionsBank[this.questionIndex];
    this.questionIndex++;

    // Pausar el movimiento del jugador
    this.player.body.setVelocity(0);

    // Iniciar la escena de preguntas
    this.scene.pause();
    this.scene.launch('QuestionScene', {
      reason: reason,
      question: questionData, 
      config: this.gameConfig, 
      localConfig: this.localConfig, // PASAR CONFIG LOCAL CON VALORES DE DIFICULTAD
      sessionAnswers: this.sessionAnswers, // PASAMOS REFERENCIA AL ARRAY
      onAnswer: this.onQuestionAnswered.bind(this),
      bluetoothController: this.bluetoothController
    });
  }

  onQuestionAnswered(correct) {
    this.questionActive = false;
    this.scene.resume();

    // Si es correcta, solo mostrar feedback (sin puntos)
    if (correct) {
      this.showFeedback('¡Correcto!', 0x2ecc71);
    } else {
      this.lives--;
      this.showFeedback('¡Incorrecto! -1 vida', 0xe74c3c);
      
      if (this.lives <= 0) {
        this.endGame(false, '¡Se acabaron las vidas!');
      }
    }

    // Activar invulnerabilidad (duración desde configuración local)
    this.invulnerable = true;
    
    // Calcular número de parpadeos según la duración
    const invulnerabilityDuration = this.localConfig.INVULNERABILITY_DURATION;
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

  // ============== FUNCIÓN PARA ENVIAR SESIÓN ==============

  async submitGameSession(won) {
    // Asegurar que score sea un número válido
    const finalScore = isNaN(this.score) || this.score === null || this.score === undefined ? 0 : Math.floor(this.score);
    
    // Recolectar datos de la sesión
    const sessionData = {
      playerName: this.playerName, // Usar un valor por defecto o pedirlo al inicio
      score: finalScore,
      timeTaken: Math.floor(this.timeElapsed),
      result: won ? 'win' : 'loss',
      answers: this.sessionAnswers, // Si quieres guardar las respuestas, deberás recolectarlas durante el juego
    };

    try {
      const response = await fetch(`${API_BASE_URL}/game/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        console.log('✅ Historial de juego guardado exitosamente.');
      } else {
        console.error('❌ Error al guardar historial:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error de red al enviar historial:', error);
    }
  }

  async endGame(won, message) {
    this.gameOver = true;
    
    // Detener el jugador
    this.player.body.setVelocity(0);
    
    // Enviar resultados al backend y esperar
    await this.submitGameSession(won);

    // Mostrar mensaje final
    const controlText = this.bluetoothController && this.bluetoothController.isConnected() 
      ? 'Presiona ESPACIO o Botón Arcade' 
      : 'Presiona ESPACIO';
    
    const finalMessage = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      message + '\n' +
      `Puntuación final: ${this.score} pts\n` +
      `Tiempo usado: ${Math.floor(this.timeElapsed)}s\n\n` +
      controlText + ' para volver al menú',
      {
        fontSize: '24px',
        fontFamily: 'Arial Black',
        color: '#ffffff',
        backgroundColor: won ? '#27ae60' : '#c0392b',
        padding: { x: 20, y: 20 },
        align: 'center',
        lineSpacing: 8
      }
    );
    finalMessage.setOrigin(0.5);
    finalMessage.setScrollFactor(0);

    // Permitir volver al menú con SPACE (teclado) o botón Arcade (Bluetooth)
    this.waitingForReturn = true;
    this.input.keyboard.once('keydown-SPACE', () => {
      this.returnToMenu();
    });
  }

  returnToMenu() {
    if (!this.waitingForReturn) return;
    this.waitingForReturn = false;
    this.scene.stop('QuestionScene');
    this.scene.start('MenuScene', { bluetoothController: this.bluetoothController });
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
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setOrigin(0.5);
    
    // Panel del menú
    const panelWidth = Math.min(500, width * 0.8);
    const panelHeight = Math.min(450, height * 0.7);
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x2d3436);
    panel.setStrokeStyle(4, 0x6c5ce7);
    
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
    this.scene.restart({ 
      seed: Date.now(),
      bluetoothController: this.bluetoothController 
    });
  }

  exitToMenu() {
    this.hidePauseMenu();
    this.scene.stop('QuestionScene');
    this.scene.start('MenuScene', { bluetoothController: this.bluetoothController });
  }

  calculateManhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  getCurrentCell() {
    // Calcular en qué celda está el jugador
    const col = Math.floor((this.player.x - this.mazeOffsetX) / this.cellSize);
    const row = Math.floor((this.player.y - this.mazeOffsetY) / this.cellSize);
    return { row, col };
  }

  updateProgressScore() {
    if (this.gameOver) return;
    
    const currentCell = this.getCurrentCell();
    const cellKey = `${currentCell.row},${currentCell.col}`;
    
    // Verificar que la celda es válida
    if (currentCell.row < 0 || currentCell.row >= this.mazeRows || 
        currentCell.col < 0 || currentCell.col >= this.mazeCols) {
      return;
    }
    
    // Marcar celda como visitada
    this.visitedCells.add(cellKey);
    
    // Calcular distancia Manhattan a la meta (esquina inferior derecha)
    const goalRow = this.mazeRows - 1;
    const goalCol = this.mazeCols - 1;
    const currentDistance = this.calculateManhattanDistance(
      currentCell.row, currentCell.col, 
      goalRow, goalCol
    );
    
    // Si es la mejor distancia hasta ahora, actualizar puntos
    if (currentDistance < this.bestDistance) {
      // Calcular distancia máxima posible (desde inicio a meta)
      const maxDistance = this.calculateManhattanDistance(0, 0, goalRow, goalCol);
      
      // Calcular progreso (0 = inicio, 1 = meta)
      const progress = 1 - (currentDistance / maxDistance);
      
      // Calcular puntos basados en progreso (usar configuración local)
      const maxProgressPoints = this.localConfig.MAX_PROGRESS_POINTS;
      const newScore = Math.floor(progress * maxProgressPoints);
      
      // Solo actualizar si aumentó
      if (newScore > this.score) {
        this.score = newScore;
        this.bestDistance = currentDistance;
        this.updateUI();
      }
    }
  }

  update(time, delta) {
    // SI EL JUEGO NO ESTÁ LISTO, DETENERSE AQUÍ
    if (!this.isGameReady) return;

    // Actualizar estado de entrada desde teclado
    this.inputManager.updateFromKeyboard(this.cursors, this.spaceKey, this.pauseKey, this.pauseKeyP);
    
    // Si el juego terminó, esperar botón para volver al menú
    if (this.gameOver && this.waitingForReturn && this.inputManager.isSelectPressed()) {
      this.returnToMenu();
      return;
    }
    
    // Verificar tecla de pausa (funciona con teclado o Bluetooth)
    if (this.inputManager.isPausePressed()) {
      this.togglePause();
      return;
    }
    
    if (this.gameOver || this.questionActive || this.isPaused) {
      this.player.body.setVelocity(0);
      return;
    }
    
    // Actualizar puntos basados en progreso
    this.updateProgressScore();

    // Movimiento del jugador usando InputManager (velocidad desde config local)
    const speed = this.localConfig.PLAYER_SPEED;
    
    // Obtener velocidades desde el InputManager (funciona con teclado y Bluetooth)
    const velocityX = this.inputManager.getVelocityX(speed);
    const velocityY = this.inputManager.getVelocityY(speed);
    
    this.player.body.setVelocity(velocityX, velocityY);
  }

  resize(gameSize) {
    // Verificar que la escena está activa y la cámara existe
    if (!this.cameras || !this.cameras.main || this.gameOver) {
      return;
    }
    
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
