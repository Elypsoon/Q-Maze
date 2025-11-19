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
  COMPLETION_BONUS: 200,          // Bonificación por llegar a la meta
  POINTS_PER_SECOND_LEFT: 2,      // Puntos por cada segundo restante
  POINTS_PER_LIFE_LEFT: 150,      // Puntos por cada vida restante
  
  // Configuración de preguntas
  INVULNERABILITY_DURATION: 1000, // Duración de invulnerabilidad en ms después de responder
};

// Configuraciones específicas por nivel de dificultad
export const GAME_CONFIG = {
  [DIFFICULTY_LEVELS.EASY]: {
    ...BASE_CONFIG,
    
    // Parámetros del juego
    LIVES: 4,                      // Vidas iniciales
    TOTAL_TIME_LIMIT: 420,         // Tiempo total del laberinto en segundos
    QUESTION_TIME_INTERVAL: 20,    // Intervalo de preguntas en segundos
    QUESTION_TIME_MODIFIER: 2,     // +2 segundos al tiempo del backend
    
    // Tamaño del laberinto
    MAZE_ROWS: 15,                 // Filas del laberinto
    MAZE_COLS: 15,                 // Columnas del laberinto
    CELL_SIZE: 40,                 // Tamaño de cada celda en píxeles
    
    // Velocidad del jugador
    PLAYER_SPEED: 150,             // Velocidad de movimiento
    
    // Interfaz
    DIFFICULTY_NAME: 'Fácil',
    DIFFICULTY_COLOR: '#27ae60',   // Verde
    DIFFICULTY_DESCRIPTION: 'Ideal para principiantes. Más tiempo, más vidas, laberinto pequeño.'
  },
  
  [DIFFICULTY_LEVELS.MEDIUM]: {
    ...BASE_CONFIG,
    
    // Parámetros del juego
    LIVES: 3,                      // Vidas iniciales
    TOTAL_TIME_LIMIT: 300,         // Tiempo total del laberinto en segundos
    QUESTION_TIME_INTERVAL: 20,    // Intervalo de preguntas en segundos
    QUESTION_TIME_MODIFIER: 0,     // Sin modificación al tiempo del backend
    
    // Tamaño del laberinto
    MAZE_ROWS: 20,                 // Filas del laberinto
    MAZE_COLS: 20,                 // Columnas del laberinto
    CELL_SIZE: 40,                 // Tamaño de cada celda en píxeles
    
    // Velocidad del jugador
    PLAYER_SPEED: 150,             // Velocidad de movimiento
    
    // Interfaz
    DIFFICULTY_NAME: 'Medio',
    DIFFICULTY_COLOR: '#f39c12',   // Naranja
    DIFFICULTY_DESCRIPTION: 'Equilibrio perfecto entre desafío y diversión.'
  },
  
  [DIFFICULTY_LEVELS.HARD]: {
    ...BASE_CONFIG,
    
    // Parámetros del juego
    LIVES: 2,                      // Vidas iniciales
    TOTAL_TIME_LIMIT: 240,         // Tiempo total del laberinto en segundos
    QUESTION_TIME_INTERVAL: 15,    // Intervalo de preguntas en segundos
    QUESTION_TIME_MODIFIER: -2,    // -2 segundos al tiempo del backend
    
    // Tamaño del laberinto
    MAZE_ROWS: 25,                 // Filas del laberinto
    MAZE_COLS: 25,                 // Columnas del laberinto
    CELL_SIZE: 40,                 // Tamaño de cada celda en píxeles
    
    // Velocidad del jugador
    PLAYER_SPEED: 150,
    
    // Interfaz
    DIFFICULTY_NAME: 'Difícil',
    DIFFICULTY_COLOR: '#c0392b',   // Rojo
    DIFFICULTY_DESCRIPTION: 'Solo para expertos. Menos tiempo, menos vidas, laberinto grande.'
  }
};

// Función helper para obtener la configuración de un nivel
export function getConfigForDifficulty(difficulty = DIFFICULTY_LEVELS.MEDIUM) {
  return GAME_CONFIG[difficulty] || GAME_CONFIG[DIFFICULTY_LEVELS.MEDIUM];
}

// Exportar configuración por defecto (nivel medio)
export default getConfigForDifficulty(DIFFICULTY_LEVELS.MEDIUM);
