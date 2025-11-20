/**
 * InputManager - Gestor de entrada unificado
 * Maneja entradas tanto del teclado como del controlador Bluetooth
 */

export default class InputManager {
  constructor(scene) {
    this.scene = scene;
    
    // Estado de las teclas/direcciones
    this.state = {
      up: false,
      down: false,
      left: false,
      right: false,
      space: false,
      escape: false,
      pause: false
    };

    // Fuente de entrada actual
    this.inputSource = 'keyboard'; // 'keyboard' o 'bluetooth'
    
    // Timestamp del último input de Bluetooth
    this.lastBluetoothUpdate = 0;
    
    // Sistema de aceleración gradual para movimiento fino
    this.directionStartTime = {
      up: 0,
      down: 0,
      left: 0,
      right: 0
    };
    
    // Timestamps de última actualización por dirección (para auto-reset)
    this.directionLastUpdate = {
      up: 0,
      down: 0,
      left: 0,
      right: 0
    };
    
    // Configuración de aceleración
    this.minSpeed = 50;
    this.maxSpeed = 100;
    this.accelerationTime = 100; // Tiempo en ms para llegar a velocidad máxima
    
    // Timeout para auto-reset de direcciones (si no hay actualización en este tiempo, resetear)
    this.directionTimeout = 80;
  }

  /**
   * Actualiza el estado desde el teclado
   */
  updateFromKeyboard(cursors, spaceKey, escapeKey, pKey) {
    // Solo actualizar desde teclado si no hay input reciente de Bluetooth
    const now = Date.now();
    if (now - this.lastBluetoothUpdate > 500) {
      this.inputSource = 'keyboard';
      
      // Trackear tiempo de inicio de cada dirección para aceleración
      ['up', 'down', 'left', 'right'].forEach(dir => {
        const isDown = cursors[dir].isDown;
        if (isDown && !this.state[dir]) {
          // Dirección recién activada
          this.directionStartTime[dir] = now;
        } else if (!isDown && this.state[dir]) {
          // Dirección recién desactivada
          this.directionStartTime[dir] = 0;
        }
      });
      
      this.state.up = cursors.up.isDown;
      this.state.down = cursors.down.isDown;
      this.state.left = cursors.left.isDown;
      this.state.right = cursors.right.isDown;
      this.state.space = spaceKey ? spaceKey.isDown : false;
      this.state.escape = escapeKey ? Phaser.Input.Keyboard.JustDown(escapeKey) : false;
      this.state.pause = pKey ? Phaser.Input.Keyboard.JustDown(pKey) : false;
    }
  }

  /**
   * Actualiza el estado desde el controlador Bluetooth
   */
  updateFromBluetooth(events) {
    if (!events) return;

    this.inputSource = 'bluetooth';
    this.lastBluetoothUpdate = Date.now();

    events.forEach(event => {
      if (event.type === 'direction' && event.state) {
        // Actualizar estado con el objeto completo de direcciones
        const now = Date.now();
        
        // Trackear tiempo de inicio de cada dirección para aceleración
        ['up', 'down', 'left', 'right'].forEach(dir => {
          if (event.state[dir] && !this.state[dir]) {
            // Dirección recién activada
            this.directionStartTime[dir] = now;
          } else if (!event.state[dir] && this.state[dir]) {
            // Dirección recién desactivada
            this.directionStartTime[dir] = 0;
          }
          
          // Actualizar timestamp de última actualización si está activa
          if (event.state[dir]) {
            this.directionLastUpdate[dir] = now;
          }
        });
        
        this.state.up = event.state.up;
        this.state.down = event.state.down;
        this.state.left = event.state.left;
        this.state.right = event.state.right;
        
      } else if (event.type === 'button') {
        switch(event.key) {
          case 'select':
            this.state.space = true;
            // Auto-reset después de un frame
            setTimeout(() => { this.state.space = false; }, 50);
            break;
          case 'pause':
            this.state.pause = true;
            this.state.escape = true;
            // Auto-reset después de un frame
            setTimeout(() => { 
              this.state.pause = false; 
              this.state.escape = false; 
            }, 50);
            break;
        }
      }
    });
  }

  /**
   * Obtiene el estado actual
   */
  getState() {
    return this.state;
  }

  /**
   * Verifica si se presionó pausa
   */
  isPausePressed() {
    return this.state.pause || this.state.escape;
  }

  /**
   * Verifica si se presionó seleccionar/confirmar
   */
  isSelectPressed() {
    return this.state.space;
  }

  /**
   * Obtiene la velocidad en X basada en las entradas con aceleración gradual
   */
  getVelocityX(baseSpeed) {
    const now = Date.now();
    
    // Auto-reset de direcciones si no hay actualización reciente (solo para Bluetooth)
    if (this.inputSource === 'bluetooth') {
      this.checkDirectionTimeout(now);
    }
    
    if (this.state.left && !this.state.right) {
      const speed = this.calculateAcceleratedSpeed('left', now, baseSpeed);
      return -speed;
    } else if (this.state.right && !this.state.left) {
      const speed = this.calculateAcceleratedSpeed('right', now, baseSpeed);
      return speed;
    }
    return 0;
  }

  /**
   * Obtiene la velocidad en Y basada en las entradas con aceleración gradual
   */
  getVelocityY(baseSpeed) {
    const now = Date.now();
    
    // Auto-reset de direcciones si no hay actualización reciente (solo para Bluetooth)
    if (this.inputSource === 'bluetooth') {
      this.checkDirectionTimeout(now);
    }
    
    if (this.state.up && !this.state.down) {
      const speed = this.calculateAcceleratedSpeed('up', now, baseSpeed);
      return -speed;
    } else if (this.state.down && !this.state.up) {
      const speed = this.calculateAcceleratedSpeed('down', now, baseSpeed);
      return speed;
    }
    return 0;
  }
  
  /**
   * Calcula la velocidad con aceleración gradual
   */
  calculateAcceleratedSpeed(direction, now, maxSpeed) {
    const startTime = this.directionStartTime[direction];
    if (startTime === 0) return this.minSpeed;
    
    const elapsed = now - startTime;
    
    // Si aún no ha pasado el tiempo de aceleración
    if (elapsed < this.accelerationTime) {
      // Interpolación lineal de minSpeed a maxSpeed
      const progress = elapsed / this.accelerationTime;
      return this.minSpeed + (maxSpeed - this.minSpeed) * progress;
    }
    
    // Ya alcanzó la velocidad máxima
    return maxSpeed;
  }
  
  /**
   * Verifica y resetea direcciones que no han recibido actualización reciente
   * Esto evita que un toque rápido se convierta en movimiento prolongado
   */
  checkDirectionTimeout(now) {
    ['up', 'down', 'left', 'right'].forEach(dir => {
      if (this.state[dir]) {
        const timeSinceUpdate = now - this.directionLastUpdate[dir];
        if (timeSinceUpdate > this.directionTimeout) {
          // No hay actualización reciente, resetear esta dirección
          this.state[dir] = false;
          this.directionStartTime[dir] = 0;
          this.directionLastUpdate[dir] = 0;
        }
      }
    });
  }

  /**
   * Resetea el estado
   */
  reset() {
    this.state = {
      up: false,
      down: false,
      left: false,
      right: false,
      space: false,
      escape: false,
      pause: false
    };
  }

  /**
   * Obtiene la fuente de entrada actual
   */
  getInputSource() {
    return this.inputSource;
  }
}
