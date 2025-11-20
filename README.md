# Q-Maze - Videojuego Educativo

Q-Maze es un videojuego educativo que combina laberintos generados proceduralmente con preguntas de trivia. Los jugadores deben navegar por el laberinto mientras responden preguntas para mantener sus vidas y alcanzar la meta antes de que se acabe el tiempo.

## 🎮 Características

- **Tres Niveles de Dificultad**: Fácil, Medio y Difícil con diferentes configuraciones
- **Laberintos Procedurales**: Generados aleatoriamente con algoritmo de semilla para reproducibilidad
- **Sistema de Preguntas Dinámico**: Tres formas de activar preguntas:
  1. Tocar una pared o obstáculo
  2. Temporizador (configurable según dificultad)
  3. Zonas especiales de preguntas en el mapa
- **Sistema de Vidas Variable**: 2-4 vidas según dificultad, se pierde una por respuesta incorrecta o tiempo agotado
- **Temporizador por Dificultad**: 4-5 minutos para completar el laberinto según nivel
- **Sistema de Puntuación Avanzado**: 
  - Puntos por respuestas correctas (multiplicador según dificultad)
  - Bonificación por completar el laberinto
  - Bonificación por tiempo restante
  - Bonificación por vidas restantes
  - Puntos por progreso en el laberinto
- **Control Bluetooth**: Soporte para mandos Bluetooth
- **Invulnerabilidad**: 1 segundo de protección después de responder preguntas
- **Diseño Responsive**: Se adapta a cualquier tamaño de pantalla manteniendo la proporción
- **UI Moderna**: Interfaz con gradientes, animaciones y efectos visuales
- **Backend Integrado**: Preguntas y configuración desde base de datos MySQL
- **Animaciones Fluidas**: Efectos visuales para las acciones (colisiones, victoria, pérdida de vida)
- **Feedback Visual**: Indicadores claros de estado del juego

## 🚀 Instalación

### Frontend (Cliente del Juego)

```bash
# Navegar a la carpeta del juego
cd QMaze

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build

# Vista previa de producción
npm run preview
```

### Backend (Servidor de Datos)

```bash
# Navegar a la carpeta del backend
cd Q-Maze-Backend

# Instalar dependencias
npm install

# Configurar variables de entorno
# Crear archivo .env con:
# DB_HOST=localhost
# DB_USER=tu_usuario
# DB_PASSWORD=tu_contraseña
# DB_NAME=qmaze_db
# PORT=3000

# Crear la base de datos
# Ejecutar el script qmaze_schema.sql en MySQL

# Iniciar servidor en modo desarrollo
npm run dev

# Iniciar servidor en producción
npm start
```

## 🎯 Cómo Jugar

1. **Menú Principal**: 
   - Ingresa tu nombre
   - Selecciona dificultad (Fácil, Medio o Difícil)
   - Opcionalmente configura un mando Bluetooth
   - Presiona "JUGAR"

2. **Movimiento**: 
   - **Teclado**: Usa las flechas (↑ ↓ ← →)
   - **Mando Bluetooth**: Usa el joystick

3. **Objetivo**: Llega desde el punto verde (INICIO) hasta el punto amarillo (META)

4. **Zonas de Preguntas**: 
   - Las casillas azules con "?" lanzan preguntas
   - Solo se activan una vez por casilla
   - Cambian a gris con "✓" después de usarse

5. **Preguntas**: 
   - Tiempo límite variable según servidor y dificultad
   - Usa las teclas numéricas (1-4) o el mando para responder
   - Verde = Correcta, Rojo = Incorrecta

6. **Invulnerabilidad**: Después de responder, tienes 1 segundo donde no se activarán preguntas por tocar paredes

7. **Victoria**: Completa el laberinto antes de que se acaben las vidas o el tiempo

## 💎 Niveles de Dificultad

### 🟢 Fácil
- **Vidas**: 4
- **Tiempo Total**: 5 minutos (300 segundos)
- **Intervalo de Preguntas**: Cada 20 segundos
- **Tamaño del Laberinto**: 15x15 celdas
- **Modificador de Tiempo**: +2 segundos por pregunta
- **Multiplicador de Puntos**: 0.5x (50%)
- **Bonificaciones**:
  - Completar: 150 puntos
  - Por segundo restante: 1 punto
  - Por vida restante: 100 puntos

### 🟠 Medio
- **Vidas**: 3
- **Tiempo Total**: 4.5 minutos (270 segundos)
- **Intervalo de Preguntas**: Cada 18 segundos
- **Tamaño del Laberinto**: 20x20 celdas
- **Modificador de Tiempo**: Sin modificación
- **Multiplicador de Puntos**: 1.0x (100%)
- **Bonificaciones**:
  - Completar: 200 puntos
  - Por segundo restante: 2 puntos
  - Por vida restante: 150 puntos

### 🔴 Difícil
- **Vidas**: 2
- **Tiempo Total**: 4 minutos (240 segundos)
- **Intervalo de Preguntas**: Cada 15 segundos
- **Tamaño del Laberinto**: 25x25 celdas
- **Modificador de Tiempo**: -2 segundos por pregunta
- **Multiplicador de Puntos**: 1.5x (150%)
- **Bonificaciones**:
  - Completar: 300 puntos
  - Por segundo restante: 3 puntos
  - Por vida restante: 250 puntos

## 🏗️ Estructura del Proyecto

```
QMaze/                              # Frontend (Cliente)
├── src/
│   ├── scenes/
│   │   ├── MenuScene.js            # Menú principal con selección de dificultad
│   │   ├── GameScene.js            # Escena del juego principal
│   │   ├── QuestionScene.js        # Escena de preguntas (overlay)
│   │   └── BluetoothSetupScene.js  # Configuración de mandos Bluetooth
│   ├── utils/
│   │   ├── MazeGenerator.js        # Generador de laberintos (Recursive Backtracking)
│   │   └── InputManager.js         # Gestor de inputs (teclado + Bluetooth)
│   ├── services/
│   │   └── BluetoothController.js  # Controlador de mandos Bluetooth
│   ├── config/
│   │   └── gameConfig.js           # Configuración de dificultades
│   ├── main.js                     # Configuración de Phaser
│   └── style.css                   # Estilos globales
├── index.html
└── package.json

Q-Maze-Backend/                     # Backend (Servidor)
├── src/
│   ├── controllers/
│   │   └── gameController.js       # Lógica de preguntas y configuración
│   ├── routes/
│   │   └── api.js                  # Rutas de la API REST
│   ├── config/
│   │   └── db.js                   # Configuración de MySQL
│   └── server.js                   # Servidor Express
├── qmaze_schema.sql                # Schema de la base de datos
├── .env                            # Variables de entorno (no incluido)
└── package.json
```

## 🛠️ Tecnologías

### Frontend
- **Phaser 3.90.0**: Framework de juegos HTML5
- **Vite 7.1.7**: Build tool y servidor de desarrollo rápido
- **JavaScript ES6+**: Módulos, async/await, clases
- **Web Bluetooth API**: Soporte para mandos Bluetooth

### Backend
- **Node.js + Express 5.1.0**: Servidor web y API REST
- **MySQL2 3.15.3**: Base de datos relacional
- **CORS 2.8.5**: Soporte para peticiones cross-origin
- **dotenv 17.2.3**: Gestión de variables de entorno
- **Nodemon 3.1.11**: Auto-reload en desarrollo

## 🎨 Mecánicas del Juego

### Generación del Laberinto
- Algoritmo **Recursive Backtracking** para generación procedural
- Tamaño variable: 15x15 (Fácil), 20x20 (Medio), 25x25 (Difícil)
- Generación con semilla para reproducibilidad
- Aproximadamente 10% de las celdas son zonas de preguntas
- Tamaño de celdas adaptativo según el tamaño de pantalla
- Área de inicio (verde) y meta (amarilla) claramente marcadas

### Sistema de Puntuación
- **Puntos por respuesta correcta**: Variable según backend × multiplicador de dificultad
- **Puntos por progreso**: Hasta 800 puntos por avanzar hacia la meta
- **Bonificación de completado**: 150-300 puntos según dificultad
- **Bonificación de tiempo**: 1-3 puntos por segundo restante
- **Bonificación de vidas**: 100-250 puntos por vida restante
- **Multiplicador de dificultad**: 0.5x (Fácil), 1.0x (Medio), 1.5x (Difícil)

### Sistema de Vidas
- **Inicial**: 2-4 vidas según dificultad
- **Pérdida**: -1 vida por respuesta incorrecta o tiempo agotado en pregunta
- **Feedback visual**: Animación de partículas rojas al perder vida

### Sistema de Invulnerabilidad
- **Duración**: 1 segundo después de responder cualquier pregunta
- **Efecto**: Evita que se lancen nuevas preguntas al tocar paredes
- **Propósito**: Dar tiempo al jugador para reposicionarse

### Sistema de Preguntas
- **Fuentes**: Backend con base de datos MySQL
- **Tiempo límite base**: Configurable por pregunta desde backend
- **Modificador por dificultad**: +2s (Fácil), 0s (Medio), -2s (Difícil)
- **Intervalo automático**: 20s (Fácil), 18s (Medio), 15s (Difícil)
- **Categorías**: Soporte para múltiples categorías
- **Formato**: 4 opciones de respuesta, selección por teclado (1-4) o mando

### Zonas de Preguntas
- **Color**: Azul (#3498db) con símbolo "?"
- **Animación**: Pulso continuo para visibilidad
- **Un solo uso**: Cada zona solo lanza una pregunta
- **Feedback visual**: Después de usarse, cambian a gris con símbolo "✓"
- **Distribución**: ~10% de las celdas del laberinto

### Sistema de Control
- **Teclado**: Flechas para movimiento, 1-4 para responder
- **Mando Bluetooth**: 
  - Joystick para movimiento
  - Botones para responder preguntas
  - Configuración guiada paso a paso
  - Soporte para múltiples tipos de mandos

### Efectos Visuales
- **Colisión con pared**: Shake del jugador + flash rojo
- **Victoria**: Animación de crecimiento + partículas de celebración
- **Pérdida de vida**: Partículas rojas explosivas
- **Zona de inicio**: Pulso verde continuo
- **Zonas de pregunta**: Pulso azul continuo
- **Animaciones de UI**: Entrada suave de elementos de menú

### Condiciones de Fin de Juego
- ✅ **Victoria**: Llegar a la meta con al menos 1 vida
- ❌ **Derrota**: Perder todas las vidas
- ❌ **Tiempo agotado**: Se acaba el tiempo total del laberinto

## 🔧 Configuración del Juego

La configuración del juego está centralizada en `src/config/gameConfig.js` y varía según la dificultad seleccionada.

### Configuración por Dificultad

Cada nivel de dificultad tiene su propia configuración completa:

```javascript
// Ejemplo: Configuración de dificultad MEDIA
{
  // Sistema de puntuación
  SCORE_MULTIPLIER: 1.0,           // Multiplicador de puntos
  MAX_PROGRESS_POINTS: 800,        // Puntos máximos por progreso
  COMPLETION_BONUS: 200,           // Bonificación por completar
  POINTS_PER_SECOND_LEFT: 2,       // Puntos por segundo restante
  POINTS_PER_LIFE_LEFT: 150,       // Puntos por vida restante
  
  // Parámetros de juego
  LIVES: 3,                        // Vidas iniciales
  TOTAL_TIME_LIMIT: 270,           // Tiempo total (segundos)
  QUESTION_TIME_INTERVAL: 18,      // Intervalo de preguntas (segundos)
  QUESTION_TIME_MODIFIER: 0,       // Modificador de tiempo de pregunta
  INVULNERABILITY_DURATION: 1000,  // Invulnerabilidad (ms)
  
  // Tamaño del laberinto
  MAZE_ROWS: 20,                   // Filas del laberinto
  MAZE_COLS: 20,                   // Columnas del laberinto
  CELL_SIZE: 50,                   // Tamaño de celda (píxeles)
  
  // Velocidad
  PLAYER_SPEED: 100,               // Velocidad de movimiento
  
  // Interfaz
  DIFFICULTY_NAME: 'Medio',
  DIFFICULTY_COLOR: '#f39c12',
  DIFFICULTY_DESCRIPTION: 'Equilibrio perfecto entre desafío y diversión.'
}
```

### Integración con Backend

El juego se comunica con el backend para obtener:

1. **Configuración Global** (`/api/config`):
   - Tiempo límite base de preguntas
   - Puntos por respuesta correcta

2. **Banco de Preguntas** (`/api/questions?difficulty={level}`):
   - Preguntas filtradas por dificultad
   - Categorías variadas
   - Tiempo y puntos personalizados por pregunta

3. **Registro de Sesiones** (`/api/game-session`):
   - Estadísticas de partida
   - Respuestas del jugador
   - Puntuación final

### Variables de Entorno (Backend)

Crear archivo `.env` en `Q-Maze-Backend/`:

```env
# Base de datos MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=qmaze_db

# Puerto del servidor
PORT=3000
```

## 🎓 Propósito Educativo

Q-Maze está diseñado para:
- **Reforzar conocimientos**: Mediante preguntas de trivia en múltiples categorías
- **Desarrollar habilidades espaciales**: Navegación y orientación en laberintos
- **Mejorar toma de decisiones**: Elección estratégica de rutas y respuestas bajo presión
- **Aprendizaje adaptativo**: Tres niveles de dificultad para diferentes edades/niveles
- **Combinar entretenimiento y educación**: Mecánicas de juego que motivan el aprendizaje
- **Accesibilidad**: Soporte para múltiples métodos de control (teclado y mandos)

**Desarrollado con ❤️ para hacer el aprendizaje más divertido**

*Q-Maze - Donde el conocimiento encuentra la aventura*
