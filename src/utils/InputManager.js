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
  }

  /**
   * Actualiza el estado desde el teclado
   */
  updateFromKeyboard(cursors, spaceKey, escapeKey, pKey) {
    // Solo actualizar desde teclado si no hay input reciente de Bluetooth
    const now = Date.now();
    if (now - this.lastBluetoothUpdate > 500) {
      this.inputSource = 'keyboard';
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
      if (event.type === 'direction') {
        // Actualizar estado con el objeto completo de direcciones
        if (event.state) {
          this.state.up = event.state.up;
          this.state.down = event.state.down;
          this.state.left = event.state.left;
          this.state.right = event.state.right;
        } else {
          // Fallback para compatibilidad con formato antiguo
          this.state.up = false;
          this.state.down = false;
          this.state.left = false;
          this.state.right = false;
          
          switch(event.key) {
            case 'up':
              this.state.up = true;
              break;
            case 'down':
              this.state.down = true;
              break;
            case 'left':
              this.state.left = true;
              break;
            case 'right':
              this.state.right = true;
              break;
          }
        }
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
   * Obtiene la velocidad en X basada en las entradas
   */
  getVelocityX(speed) {
    if (this.state.left && !this.state.right) {
      return -speed;
    } else if (this.state.right && !this.state.left) {
      return speed;
    }
    return 0;
  }

  /**
   * Obtiene la velocidad en Y basada en las entradas
   */
  getVelocityY(speed) {
    if (this.state.up && !this.state.down) {
      return -speed;
    } else if (this.state.down && !this.state.up) {
      return speed;
    }
    return 0;
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
