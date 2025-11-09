/**
 * Generador de laberintos usando el algoritmo Recursive Backtracking
 * con semilla para reproducibilidad
 */
export default class MazeGenerator {
  constructor(rows, cols, seed = Date.now()) {
    this.rows = rows;
    this.cols = cols;
    this.seed = seed;
    this.rng = this.seedRandom(seed);
    this.maze = [];
  }

  /**
   * Generador de números pseudo-aleatorios con semilla
   */
  seedRandom(seed) {
    let value = seed;
    return () => {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
  }

  /**
   * Genera el laberinto usando Recursive Backtracking
   */
  generate() {
    // Inicializar la matriz del laberinto
    // 0 = camino, 1 = pared
    for (let i = 0; i < this.rows; i++) {
      this.maze[i] = [];
      for (let j = 0; j < this.cols; j++) {
        this.maze[i][j] = {
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
          isQuestionZone: false,
          row: i,
          col: j
        };
      }
    }

    // Empezar desde la celda (0, 0)
    const stack = [];
    const startCell = this.maze[0][0];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length > 0) {
        // Elegir un vecino aleatorio
        const index = Math.floor(this.rng() * neighbors.length);
        const next = neighbors[index];

        // Remover la pared entre current y next
        this.removeWall(current, next);

        next.visited = true;
        stack.push(next);
      } else {
        stack.pop();
      }
    }

    // Añadir zonas de preguntas aleatorias (aproximadamente 10% de las celdas)
    this.addQuestionZones();

    return this.maze;
  }

  /**
   * Obtiene los vecinos no visitados de una celda
   */
  getUnvisitedNeighbors(cell) {
    const neighbors = [];
    const { row, col } = cell;

    // Top
    if (row > 0 && !this.maze[row - 1][col].visited) {
      neighbors.push(this.maze[row - 1][col]);
    }
    // Right
    if (col < this.cols - 1 && !this.maze[row][col + 1].visited) {
      neighbors.push(this.maze[row][col + 1]);
    }
    // Bottom
    if (row < this.rows - 1 && !this.maze[row + 1][col].visited) {
      neighbors.push(this.maze[row + 1][col]);
    }
    // Left
    if (col > 0 && !this.maze[row][col - 1].visited) {
      neighbors.push(this.maze[row][col - 1]);
    }

    return neighbors;
  }

  /**
   * Remueve la pared entre dos celdas adyacentes
   */
  removeWall(current, next) {
    const dx = next.col - current.col;
    const dy = next.row - current.row;

    if (dx === 1) {
      // Next está a la derecha
      current.walls.right = false;
      next.walls.left = false;
    } else if (dx === -1) {
      // Next está a la izquierda
      current.walls.left = false;
      next.walls.right = false;
    } else if (dy === 1) {
      // Next está abajo
      current.walls.bottom = false;
      next.walls.top = false;
    } else if (dy === -1) {
      // Next está arriba
      current.walls.top = false;
      next.walls.bottom = false;
    }
  }

  /**
   * Añade zonas de preguntas aleatorias en el laberinto
   */
  addQuestionZones() {
    const totalCells = this.rows * this.cols;
    const questionZoneCount = Math.floor(totalCells * 0.05); // 5% de las celdas

    for (let i = 0; i < questionZoneCount; i++) {
      const row = Math.floor(this.rng() * this.rows);
      const col = Math.floor(this.rng() * this.cols);
      
      // No poner zonas de pregunta en inicio (0,0) ni final (último)
      if ((row === 0 && col === 0) || 
          (row === this.rows - 1 && col === this.cols - 1)) {
        continue;
      }
      
      this.maze[row][col].isQuestionZone = true;
    }
  }

  /**
   * Obtiene el laberinto generado
   */
  getMaze() {
    return this.maze;
  }
}
