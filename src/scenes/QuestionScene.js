import Phaser from 'phaser';

// Configuración del juego (TODO: mover al backend en el futuro)
export const GAME_CONFIG = {
  QUESTION_TIME_LIMIT: 10, // Segundos para responder cada pregunta
  INVULNERABILITY_DURATION: 1000, // Duración de invulnerabilidad en ms (1 segundo)
  
  // Sistema de puntos basado en progreso
  MAX_PROGRESS_POINTS: 800, // Puntos máximos por avanzar en el laberinto
  COMPLETION_BONUS: 200, // Bonificación por llegar a la meta
  POINTS_PER_SECOND_LEFT: 2, // Puntos por cada segundo restante
  POINTS_PER_LIFE_LEFT: 150 // Puntos por cada vida restante
};

// Banco de preguntas temporal (esto luego vendrá del backend)
const QUESTION_BANK = [
  {
    id: 1,
    question: '¿Cuál es la capital de Francia?',
    options: ['Londres', 'París', 'Madrid', 'Roma'],
    correctAnswer: 1
  },
  {
    id: 2,
    question: '¿Cuántos continentes hay en el mundo?',
    options: ['5', '6', '7', '8'],
    correctAnswer: 2
  },
  {
    id: 3,
    question: '¿Quién escribió "Don Quijote de la Mancha"?',
    options: ['Shakespeare', 'Cervantes', 'García Márquez', 'Borges'],
    correctAnswer: 1
  },
  {
    id: 4,
    question: '¿Cuál es el planeta más grande del sistema solar?',
    options: ['Marte', 'Saturno', 'Júpiter', 'Neptuno'],
    correctAnswer: 2
  },
  {
    id: 5,
    question: '¿En qué año comenzó la Segunda Guerra Mundial?',
    options: ['1935', '1939', '1941', '1945'],
    correctAnswer: 1
  },
  {
    id: 6,
    question: '¿Cuántos lados tiene un hexágono?',
    options: ['4', '5', '6', '8'],
    correctAnswer: 2
  },
  {
    id: 7,
    question: '¿Cuál es el océano más grande del mundo?',
    options: ['Atlántico', 'Índico', 'Ártico', 'Pacífico'],
    correctAnswer: 3
  },
  {
    id: 8,
    question: '¿Qué gas necesitan las plantas para realizar la fotosíntesis?',
    options: ['Oxígeno', 'Nitrógeno', 'Dióxido de carbono', 'Hidrógeno'],
    correctAnswer: 2
  },
  {
    id: 9,
    question: '¿Cuál es el río más largo del mundo?',
    options: ['Nilo', 'Amazonas', 'Yangtsé', 'Misisipi'],
    correctAnswer: 1
  },
  {
    id: 10,
    question: '¿Cuántos huesos tiene el cuerpo humano adulto?',
    options: ['186', '206', '226', '246'],
    correctAnswer: 1
  }
];

export default class QuestionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'QuestionScene' });
  }

  init(data) {
    this.reason = data.reason || 'general';
    this.onAnswerCallback = data.onAnswer;
    this.selectedOption = -1;
    this.answered = false;
    
    // Configuración de tiempo desde el config (futuro: desde el servidor)
    this.timeLimit = GAME_CONFIG.QUESTION_TIME_LIMIT;
    this.timeLeft = this.timeLimit;

    // Seleccionar pregunta aleatoria
    this.currentQuestion = QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)];
  }

  create() {
    this.createQuestionUI();
    
    // Escuchar cambios de tamaño
    this.scale.on('resize', this.resize, this);
  }

  createQuestionUI() {
    // Limpiar UI anterior si existe
    if (this.questionContainer) {
      this.questionContainer.destroy();
    }

    const width = this.scale.width;
    const height = this.scale.height;

    // Contenedor para todos los elementos
    this.questionContainer = this.add.container(0, 0);
    this.questionContainer.setDepth(2000);

    // Fondo semi-transparente
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    overlay.setOrigin(0);

    // Panel de pregunta - adaptativo
    const panelWidth = Math.min(700, width * 0.85);
    const panelHeight = Math.min(500, height * 0.75);
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x2c3e50);
    panel.setStrokeStyle(4, 0xe74c3c);

    // Título según la razón
    const reasons = {
      'pared': '⚠️ ¡Tocaste una pared!',
      'tiempo': '⏰ ¡Se acabó el tiempo!',
      'zona': '❓ ¡Zona de pregunta!'
    };
    
    const titleSize = Math.min(40, width / 22);
    const title = this.add.text(width / 2, height * 0.2, reasons[this.reason] || '❓ Pregunta', {
      fontSize: titleSize + 'px',
      fontFamily: 'Arial Black',
      color: '#e74c3c'
    });
    title.setOrigin(0.5);

    // Pregunta
    const questionSize = Math.min(26, width / 35);
    const questionText = this.add.text(width / 2, height * 0.3, this.currentQuestion.question, {
      fontSize: questionSize + 'px',
      fontFamily: 'Arial',
      color: '#ecf0f1',
      align: 'center',
      wordWrap: { width: panelWidth - 50 }
    });
    questionText.setOrigin(0.5);

    // Opciones
    this.optionButtons = [];
    const startY = height * 0.42;
    const optionHeight = Math.min(50, height * 0.08);
    const spacing = optionHeight + 10;
    const optionWidth = Math.min(600, panelWidth - 100);

    this.currentQuestion.options.forEach((option, index) => {
      const button = this.createOptionButton(
        width / 2,
        startY + index * spacing,
        option,
        index,
        optionWidth,
        optionHeight
      );
      this.optionButtons.push(button);
    });

    // Temporizador de respuesta (tiempo desde configuración)
    const timerSize = Math.min(24, width / 40);
    this.timerText = this.add.text(width / 2, height * 0.85, `Tiempo: ${this.timeLeft}s`, {
      fontSize: timerSize + 'px',
      fontFamily: 'Arial Black',
      color: '#f39c12'
    });
    this.timerText.setOrigin(0.5);

    // Añadir elementos al contenedor
    this.questionContainer.add([overlay, panel, title, questionText, this.timerText]);
    this.optionButtons.forEach(btn => {
      this.questionContainer.add(btn.container);
    });

    // Iniciar temporizador solo si no se está recreando después de responder
    if (!this.answered) {
      this.startTimer();
    }
  }

  startTimer() {
    if (this.timerEvent) {
      this.timerEvent.remove();
    }

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`Tiempo: ${this.timeLeft}s`);
        
        if (this.timeLeft <= 0 && !this.answered) {
          this.selectAnswer(-1); // Respuesta incorrecta por tiempo
        }
      },
      loop: true
    });
  }

  createOptionButton(x, y, text, index, width, height) {
    const container = this.add.container(x, y);

    // Fondo del botón
    const bg = this.add.rectangle(0, 0, width, height, 0x34495e);
    bg.setStrokeStyle(2, 0x7f8c8d);

    // Letra de la opción
    const letters = ['A', 'B', 'C', 'D'];
    const letterSize = Math.min(28, height / 1.8);
    const letter = this.add.text(-width / 2 + 30, 0, letters[index], {
      fontSize: letterSize + 'px',
      fontFamily: 'Arial Black',
      color: '#3498db'
    });
    letter.setOrigin(0.5);

    // Texto de la opción
    const textSize = Math.min(22, height / 2.5);
    const optionText = this.add.text(-width / 2 + 60, 0, text, {
      fontSize: textSize + 'px',
      fontFamily: 'Arial',
      color: '#ecf0f1',
      wordWrap: { width: width - 80 }
    });
    optionText.setOrigin(0, 0.5);

    container.add([bg, letter, optionText]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    // Efectos hover
    container.on('pointerover', () => {
      if (!this.answered) {
        bg.setFillStyle(0x4a5f7f);
      }
    });

    container.on('pointerout', () => {
      if (!this.answered && this.selectedOption !== index) {
        bg.setFillStyle(0x34495e);
      }
    });

    container.on('pointerdown', () => {
      if (!this.answered) {
        this.selectAnswer(index, bg);
      }
    });

    return { container, bg, index };
  }

  selectAnswer(index, clickedBg) {
    if (this.answered) return;

    this.answered = true;
    this.selectedOption = index;
    
    if (this.timerEvent) {
      this.timerEvent.remove();
    }

    const correct = index === this.currentQuestion.correctAnswer;

    // Colorear las opciones
    this.optionButtons.forEach((btnObj) => {
      const bg = btnObj.bg;
      const i = btnObj.index;
      
      if (i === this.currentQuestion.correctAnswer) {
        // Opción correcta en verde
        bg.setFillStyle(0x27ae60);
        bg.setStrokeStyle(3, 0x2ecc71);
      } else if (i === index && !correct) {
        // Opción seleccionada incorrecta en rojo
        bg.setFillStyle(0xc0392b);
        bg.setStrokeStyle(3, 0xe74c3c);
      } else {
        bg.setFillStyle(0x7f8c8d);
      }

      btnObj.container.disableInteractive();
    });

    // Mostrar resultado
    const resultSize = Math.min(34, this.scale.width / 28);
    const resultText = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.75,
      correct ? '✓ ¡Correcto!' : '✗ Incorrecto',
      {
        fontSize: resultSize + 'px',
        fontFamily: 'Arial Black',
        color: correct ? '#2ecc71' : '#e74c3c'
      }
    );
    resultText.setOrigin(0.5);
    resultText.setAlpha(0);
    resultText.setDepth(3000);
    
    this.questionContainer.add(resultText);

    this.tweens.add({
      targets: resultText,
      alpha: 1,
      duration: 300
    });

    // Esperar 2 segundos y volver al juego
    this.time.delayedCall(2000, () => {
      this.onAnswerCallback(correct);
      this.scene.stop();
    });
  }

  resize(gameSize) {
    if (this.answered) {
      return;
    }
    // Solo recrear si aún no se ha respondido
    this.createQuestionUI();
  }

  shutdown() {
    if (this.timerEvent) {
      this.timerEvent.remove();
    }
    this.scale.off('resize', this.resize, this);
  }
}
