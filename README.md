# Q-Maze - Videojuego Educativo

Q-Maze es un videojuego educativo que combina laberintos generados proceduralmente con preguntas de trivia. Los jugadores deben navegar por el laberinto mientras responden preguntas para mantener sus vidas y alcanzar la meta antes de que se acabe el tiempo.

## 🎮 Características

- **Laberintos Procedurales**: Generados aleatoriamente con algoritmo de semilla para reproducibilidad
- **Sistema de Preguntas**: Tres formas de activar preguntas:
  1. Tocar una pared o obstáculo
  2. Temporizador automático (cada 25 segundos)
  3. Zonas especiales de preguntas en el mapa (un solo uso por zona)
- **Sistema de Vidas**: 3 vidas iniciales, se pierde una por respuesta incorrecta
- **Temporizador**: 7 minutos para completar el laberinto
- **Puntuación**: Gana puntos por respuestas correctas y completar el laberinto
- **Invulnerabilidad**: 2 segundos de protección después de responder preguntas (evita preguntas consecutivas pero mantiene colisiones físicas)
- **Diseño Responsive**: Se adapta a cualquier tamaño de pantalla manteniendo la proporción
- **UI No Intrusiva**: Panel de estadísticas fijo que no tapa el área de juego
- **Laberinto Grande**: Malla de 20x20 celdas para más desafío

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

## 🎯 Cómo Jugar

1. **Inicio**: Presiona el botón "JUGAR" en el menú principal
2. **Movimiento**: Usa las flechas del teclado (↑ ↓ ← →) para mover tu personaje
3. **Objetivo**: Llega desde el punto verde (INICIO) hasta el punto amarillo (META)
4. **Zonas de Preguntas**: Las casillas azules con "?" lanzan preguntas (solo una vez por casilla)
5. **Preguntas**: Tienes 10 segundos para responder cada pregunta correctamente
6. **Invulnerabilidad**: Después de responder, tienes 1 segundo donde no se activarán preguntas por tocar paredes
7. **Victoria**: Completa el laberinto antes de que se acaben las vidas o el tiempo

## 🏗️ Estructura del Proyecto

```
QMaze/
├── src/
│   ├── scenes/
│   │   ├── MenuScene.js      # Menú principal
│   │   ├── GameScene.js      # Escena del juego principal
│   │   └── QuestionScene.js  # Escena de preguntas
│   ├── utils/
│   │   └── MazeGenerator.js  # Generador de laberintos
│   ├── main.js               # Configuración de Phaser
│   └── style.css             # Estilos
├── index.html
└── package.json
```

## 🛠️ Tecnologías

- **Phaser 3**: Framework de juegos HTML5
- **Vite**: Build tool y servidor de desarrollo
- **JavaScript ES6+**: Lenguaje de programación

## 🎨 Mecánicas del Juego

### Generación del Laberinto
- Utiliza el algoritmo **Recursive Backtracking**
- Laberinto de 20x20 celdas (aumentado para más desafío)
- Generación con semilla para reproducibilidad
- Aproximadamente 10% de las celdas son zonas de preguntas
- Tamaño de celdas adaptativo según el tamaño de pantalla

### Sistema de Puntuación
- **+50 puntos** por respuesta correcta
- **+500 puntos** por completar el laberinto
- **-1 vida** por respuesta incorrecta

### Sistema de Invulnerabilidad
- **Duración**: 1 segundo después de responder cualquier pregunta (configurable desde servidor)
- **Efecto**: Evita que se lancen nuevas preguntas al tocar paredes
- **Feedback visual**: El jugador parpadea y aparece el indicador "🛡️ INVULNERABLE"
- **Nota importante**: La invulnerabilidad NO permite atravesar paredes, solo previene preguntas consecutivas

### Sistema de Preguntas
- **Tiempo límite**: 10 segundos por pregunta (configurable desde servidor)
- **Penalización**: -1 vida por respuesta incorrecta o tiempo agotado
- **Recompensa**: Puntos variables según configuración del servidor

### Zonas de Preguntas
- **Color**: Azul con símbolo "?"
- **Un solo uso**: Cada zona solo lanza una pregunta
- **Feedback visual**: Después de usarse, cambian a gris con símbolo "✓"

### Condiciones de Fin de Juego
- ✅ **Victoria**: Llegar a la meta con al menos 1 vida
- ❌ **Derrota**: Perder todas las vidas o que se acabe el tiempo total (7 minutos)

## 📋 Próximas Características

- [ ] Backend para gestión de preguntas
- [ ] Base de datos de puntuaciones
- [ ] API REST para configuración dinámica (tiempo, puntos, recompensas)
- [ ] Diferentes niveles de dificultad
- [ ] Más categorías de preguntas
- [ ] Sistema de logros
- [ ] Tabla de clasificación
- [ ] Modo multijugador

## 🔧 Configuración del Juego

El juego está preparado para recibir configuración desde un servidor backend. Actualmente, las siguientes variables están centralizadas en `GAME_CONFIG` y pueden ser modificadas fácilmente:

```javascript
GAME_CONFIG = {
  QUESTION_TIME_LIMIT: 10,        // Segundos para responder
  POINTS_CORRECT_ANSWER: 50,      // Puntos por respuesta correcta
  POINTS_COMPLETE_MAZE: 500,      // Puntos por completar el laberinto
  INVULNERABILITY_DURATION: 1000  // Duración de invulnerabilidad (ms)
}
```

**Preparado para backend:**
- ✅ Configuración centralizada
- ✅ Fácil integración con API REST
- ✅ Variables exportables
- ✅ Estructura lista para recibir datos del servidor

## 🎓 Propósito Educativo

Q-Maze está diseñado para:
- Reforzar conocimientos mediante preguntas de trivia
- Desarrollar habilidades de navegación espacial
- Combinar aprendizaje con entretenimiento
- Facilitar la actualización del banco de preguntas

## 📝 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👨‍💻 Desarrollo

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

Desarrollado con ❤️ para hacer el aprendizaje más divertido
