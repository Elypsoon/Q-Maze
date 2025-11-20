// Configuración global del juego Q-Maze
// Este archivo define los parámetros del juego para diferentes niveles de dificultad

// Niveles de dificultad disponibles
export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

// Configuración base compartida por todos los niveles
const BASE_CONFIG = {
  // Sistema de puntuación
  MAX_PROGRESS_POINTS: 800,      // Puntos máximos por avanzar en el laberinto
  
  // Configuración de preguntas
  INVULNERABILITY_DURATION: 1000, // Duración de invulnerabilidad en ms después de responder
};

// Configuraciones específicas por nivel de dificultad
export const GAME_CONFIG = {
  [DIFFICULTY_LEVELS.EASY]: {
    ...BASE_CONFIG,
    
    // Multiplicador de puntuación
    SCORE_MULTIPLIER: 0.5,         // Multiplicador de puntos (50%)
    
    // Bonificaciones ajustadas para dificultad fácil
    COMPLETION_BONUS: 150,          // Bonificación por llegar a la meta
    POINTS_PER_SECOND_LEFT: 1,      // Puntos por cada segundo restante
    POINTS_PER_LIFE_LEFT: 100,      // Puntos por cada vida restante
    
    // Parámetros del juego
    LIVES: 4,                      // Vidas iniciales
    TOTAL_TIME_LIMIT: 300,         // Tiempo total del laberinto en segundos
    QUESTION_TIME_INTERVAL: 20,    // Intervalo de preguntas en segundos
    QUESTION_TIME_MODIFIER: 2,     // +2 segundos al tiempo del backend
    
    // Tamaño del laberinto
    MAZE_ROWS: 15,                 // Filas del laberinto
    MAZE_COLS: 15,                 // Columnas del laberinto
    CELL_SIZE: 50,                 // Tamaño de cada celda en píxeles
    
    // Velocidad del jugador
    PLAYER_SPEED: 100,             // Velocidad de movimiento
    
    // Interfaz
    DIFFICULTY_NAME: 'Fácil',
    DIFFICULTY_COLOR: '#27ae60',   // Verde
    DIFFICULTY_DESCRIPTION: 'Más tiempo, más vidas, laberinto más pequeño.'
  },
  
  [DIFFICULTY_LEVELS.MEDIUM]: {
    ...BASE_CONFIG,
    
    // Multiplicador de puntuación
    SCORE_MULTIPLIER: 1.0,         // Multiplicador de puntos (100%)
    
    // Bonificaciones estándar para dificultad media
    COMPLETION_BONUS: 200,          // Bonificación por llegar a la meta
    POINTS_PER_SECOND_LEFT: 2,      // Puntos por cada segundo restante
    POINTS_PER_LIFE_LEFT: 150,      // Puntos por cada vida restante
    
    // Parámetros del juego
    LIVES: 3,                      // Vidas iniciales
    TOTAL_TIME_LIMIT: 270,         // Tiempo total del laberinto en segundos
    QUESTION_TIME_INTERVAL: 18,    // Intervalo de preguntas en segundos
    QUESTION_TIME_MODIFIER: 0,     // Sin modificación al tiempo del backend
    
    // Tamaño del laberinto
    MAZE_ROWS: 20,                 // Filas del laberinto
    MAZE_COLS: 20,                 // Columnas del laberinto
    CELL_SIZE: 50,                 // Tamaño de cada celda en píxeles
    
    // Velocidad del jugador
    PLAYER_SPEED: 100,             // Velocidad de movimiento
    
    // Interfaz
    DIFFICULTY_NAME: 'Medio',
    DIFFICULTY_COLOR: '#f39c12',   // Naranja
    DIFFICULTY_DESCRIPTION: 'Equilibrio perfecto entre desafío y diversión.'
  },
  
  [DIFFICULTY_LEVELS.HARD]: {
    ...BASE_CONFIG,
    
    // Multiplicador de puntuación
    SCORE_MULTIPLIER: 1.5,         // Multiplicador de puntos (150%)
    
    // Bonificaciones aumentadas para dificultad difícil
    COMPLETION_BONUS: 300,          // Bonificación por llegar a la meta
    POINTS_PER_SECOND_LEFT: 3,      // Puntos por cada segundo restante
    POINTS_PER_LIFE_LEFT: 250,      // Puntos por cada vida restante
    
    // Parámetros del juego
    LIVES: 2,                      // Vidas iniciales
    TOTAL_TIME_LIMIT: 240,         // Tiempo total del laberinto en segundos
    QUESTION_TIME_INTERVAL: 15,    // Intervalo de preguntas en segundos
    QUESTION_TIME_MODIFIER: -2,    // -2 segundos al tiempo del backend
    
    // Tamaño del laberinto
    MAZE_ROWS: 25,                 // Filas del laberinto
    MAZE_COLS: 25,                 // Columnas del laberinto
    CELL_SIZE: 50,                 // Tamaño de cada celda en píxeles
    
    // Velocidad del jugador
    PLAYER_SPEED: 100,
    
    // Interfaz
    DIFFICULTY_NAME: 'Difícil',
    DIFFICULTY_COLOR: '#c0392b',   // Rojo
    DIFFICULTY_DESCRIPTION: 'Menos tiempo, menos vidas, laberinto más grande.'
  }
};

// Función helper para obtener la configuración de un nivel
export function getConfigForDifficulty(difficulty = DIFFICULTY_LEVELS.MEDIUM) {
  return GAME_CONFIG[difficulty] || GAME_CONFIG[DIFFICULTY_LEVELS.MEDIUM];
}

// Exportar configuración por defecto (nivel medio)
export default getConfigForDifficulty(DIFFICULTY_LEVELS.MEDIUM);
