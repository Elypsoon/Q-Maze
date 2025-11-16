/**
 * Servicio de Controlador Bluetooth para ESP32
 * Maneja la conexión y comunicación con el mando Arduino vía Web Bluetooth API
 */

export default class BluetoothController {
  constructor() {
    console.log('🔧 BluetoothController: Inicializando con métodos de feedback...');
    
    this.device = null;
    this.characteristic = null;
    this.rxCharacteristic = null; // Para enviar comandos al ESP32
    this.connected = false;
    
    // Sistema de callbacks múltiples
    this.callbacks = {
      onConnect: [],
      onDisconnect: [],
      onData: [],
      onError: []
    };
    
    // Verificar que los métodos existen
    console.log('🔍 Verificación de métodos:');
    console.log('  - playCorrectFeedback:', typeof this.playCorrectFeedback === 'function');
    console.log('  - playIncorrectFeedback:', typeof this.playIncorrectFeedback === 'function');
    console.log('  - sendCommand:', typeof this.sendCommand === 'function');

    // Estado actual del controlador
    this.currentState = {
      direction: 'CENTRO',
      buttonSW: false,
      buttonArcade: false
    };

    // Para detectar cambios y no disparar repetidos
    this.lastState = {
      direction: 'CENTRO',
      buttonSW: false,
      buttonArcade: false
    };
  }

  /**
   * Verifica si el navegador soporta Web Bluetooth API
   */
  isBluetoothAvailable() {
    if (!navigator.bluetooth) {
      console.warn('Web Bluetooth API no está disponible en este navegador.');
      return false;
    }
    return true;
  }

  /**
   * Conecta con el dispositivo ESP32
   */
  async connect() {
    if (!this.isBluetoothAvailable()) {
      throw new Error('Bluetooth no disponible');
    }

    try {
      console.log('Solicitando dispositivo Bluetooth...');
      
      // Solicitar dispositivo con servicio UART
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e'] } // Nordic UART Service UUID
        ],
        optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
      });

      console.log('Dispositivo encontrado:', this.device.name);

      // Conectar al servidor GATT
      const server = await this.device.gatt.connect();
      console.log('Conectado al servidor GATT');

      // Obtener el servicio UART
      const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
      console.log('Servicio UART obtenido');

      // Obtener la característica TX (ESP32 envía datos)
      this.characteristic = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
      console.log('Característica TX obtenida');

      // Obtener la característica RX (navegador envía comandos al ESP32)
      this.rxCharacteristic = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');
      console.log('Característica RX obtenida');

      // Escuchar notificaciones
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', 
        this.handleData.bind(this));

      // Escuchar desconexión
      this.device.addEventListener('gattserverdisconnected', 
        this.handleDisconnect.bind(this));

      this.connected = true;
      console.log('¡Conexión Bluetooth establecida!');

      // Llamar a todos los callbacks de conexión
      this.callbacks.onConnect.forEach(callback => {
        if (callback) callback(this.device.name);
      });

      return true;
    } catch (error) {
      console.error('Error al conectar:', error);
      // Llamar a todos los callbacks de error
      this.callbacks.onError.forEach(callback => {
        if (callback) callback(error);
      });
      throw error;
    }
  }

  /**
   * Desconecta del dispositivo
   */
  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
      console.log('Desconectado del dispositivo');
    }
  }

  /**
   * Maneja los datos recibidos desde el ESP32
   */
  handleData(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const data = decoder.decode(value).trim();

    console.log('📡 Datos BLE recibidos:', data);

    // Parsear el formato del Arduino: "Direccion | SW | ARCADE"
    this.parseSerialData(data);
  }

  /**
   * Parsea los datos del formato Serial del Arduino
   * Formato: "DIRECCION | SW | ARCADE"
   * Ejemplos:
   * - "ARRIBA | - | -"
   * - "DERECHA | SW PRESIONADO | -"
   * - "CENTRO | - | ARCADE PRESIONADO"
   */
  parseSerialData(data) {
    // Ignorar líneas de debug y encabezados
    if (data.includes('---') || data.includes('Direccion') || 
        data.includes('SECUENCIA') || data.includes('SONIDO') ||
        data.includes('[') || 
        data.includes('detectado') || data.includes('ACTIVADO') ||
        data.includes('Sistema') || data.includes('===') ||
        data.includes('Formato:') || data.includes('Inicializando') ||
        data.includes('Esperando') || data.includes('Nombre del dispositivo') ||
        data.includes('DISPOSITIVO')) {
      return;
    }

    // Limpiar el mensaje de sufijos como "(1er toque)" o "(Repeticion)"
    let cleanData = data;
    if (data.includes('(')) {
      cleanData = data.substring(0, data.indexOf('(')).trim();
    }

    const parts = cleanData.split('|').map(part => part.trim());
    
    if (parts.length >= 3) {
      const direction = parts[0];
      const swButton = parts[1].includes('SW PRESIONADO');
      const arcadeButton = parts[2].includes('ARCADE PRESIONADO');

      console.log('🎮 Estado parseado:', { direction, swButton, arcadeButton });

      // Actualizar estado actual
      this.currentState.direction = direction;
      this.currentState.buttonSW = swButton;
      this.currentState.buttonArcade = arcadeButton;

      // Verificar cambios y notificar
      this.notifyChanges();
    }
  }

  /**
   * Notifica cambios en el estado del controlador
   */
  notifyChanges() {
    // Mapear direcciones del ESP32 a teclas del juego
    const mappedInput = this.mapInputToKeys();
    
    if (mappedInput && mappedInput.length > 0) {
      // Solo logear si hay cambios significativos (dirección o botones)
      const directionChanged = this.currentState.direction !== this.lastState.direction;
      const buttonChanged = this.currentState.buttonSW !== this.lastState.buttonSW || 
                           this.currentState.buttonArcade !== this.lastState.buttonArcade;
      
      if (directionChanged || buttonChanged) {
        console.log('🎯 Enviando eventos al juego:', mappedInput);
      }
      
      // Llamar a todos los callbacks de datos
      this.callbacks.onData.forEach(callback => {
        if (callback) callback(mappedInput);
      });
    }

    // Actualizar último estado
    this.lastState = { ...this.currentState };
  }

  /**
   * Mapea las entradas del ESP32 a teclas del juego
   */
  mapInputToKeys() {
    const events = [];

    // SIEMPRE enviar el estado actual de dirección para movimiento continuo
    const direction = this.currentState.direction;
    
    // Enviar el estado de todas las direcciones
    const directionState = {
      up: direction.includes('ARRIBA'),
      down: direction.includes('ABAJO'),
      left: direction.includes('IZQUIERDA'),
      right: direction.includes('DERECHA')
    };
    
    // Enviar evento de dirección con el estado completo
    events.push({ 
      type: 'direction', 
      state: directionState,
      pressed: direction !== 'CENTRO'
    });

    // Mapear botones (solo cuando cambian de estado)
    if (this.currentState.buttonArcade && !this.lastState.buttonArcade) {
      // Botón Arcade = Seleccionar/Confirmar (SPACE o ENTER)
      events.push({ type: 'button', key: 'select', pressed: true });
    }

    if (this.currentState.buttonSW && !this.lastState.buttonSW) {
      // Botón SW = Pausa/Cancelar (ESC)
      events.push({ type: 'button', key: 'pause', pressed: true });
    }

    return events.length > 0 ? events : null;
  }

  /**
   * Maneja la desconexión del dispositivo
   */
  handleDisconnect() {
    console.log('Dispositivo Bluetooth desconectado');
    this.connected = false;
    this.device = null;
    this.characteristic = null;

    // Llamar a todos los callbacks de desconexión
    this.callbacks.onDisconnect.forEach(callback => {
      if (callback) callback();
    });
  }

  /**
   * Registra un callback para un evento específico
   */
  on(event, callback) {
    const eventName = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
    console.log(`🔧 BluetoothController.on('${event}') - callbacks ${eventName} antes:`, this.callbacks[eventName].length);
    if (this.callbacks.hasOwnProperty(eventName)) {
      if (!this.callbacks[eventName].includes(callback)) {
        this.callbacks[eventName].push(callback);
        console.log(`✅ Callback ${eventName} registrado. Total callbacks:`, this.callbacks[eventName].length);
      } else {
        console.warn(`⚠️ Callback ${eventName} ya existe, no se duplica`);
      }
    }
  }

  /**
   * Elimina un callback específico o todos los callbacks de un evento
   */
  off(event, callback = null) {
    const eventName = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
    console.log(`🔧 BluetoothController.off('${event}') - callbacks ${eventName} antes:`, this.callbacks[eventName].length);
    if (this.callbacks.hasOwnProperty(eventName)) {
      if (callback) {
        // Eliminar callback específico
        const index = this.callbacks[eventName].indexOf(callback);
        if (index > -1) {
          this.callbacks[eventName].splice(index, 1);
          console.log(`✅ Callback ${eventName} eliminado. Callbacks restantes:`, this.callbacks[eventName].length);
        } else {
          console.warn(`⚠️ Callback ${eventName} no encontrado en el array`);
        }
      } else {
        // Eliminar todos los callbacks
        this.callbacks[eventName] = [];
        console.log(`🗑️ Todos los callbacks ${eventName} eliminados`);
      }
    }
    console.log(`🔧 BluetoothController.off('${event}') - callbacks ${eventName} después:`, this.callbacks[eventName].length);
  }

  /**
   * Obtiene el estado de conexión
   */
  isConnected() {
    // Verificar múltiples condiciones para asegurar conexión real
    if (!this.device) {
      return false;
    }
    
    // Verificar si el dispositivo GATT está realmente conectado
    if (!this.device.gatt || !this.device.gatt.connected) {
      this.connected = false;
      return false;
    }
    
    return this.connected;
  }

  /**
   * Obtiene información del dispositivo conectado
   */
  getDeviceInfo() {
    if (this.device) {
      return {
        name: this.device.name,
        id: this.device.id,
        connected: this.connected
      };
    }
    return null;
  }

  /**
   * Envía un comando al ESP32
   */
  async sendCommand(command) {
    console.log('📤 Intentando enviar comando:', command);
    console.log('  - isConnected:', this.isConnected());
    console.log('  - rxCharacteristic existe:', !!this.rxCharacteristic);

    if (!this.isConnected() || !this.rxCharacteristic) {
      console.warn('⚠️ No se puede enviar comando: dispositivo no conectado o rxCharacteristic no disponible');
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(command);
      console.log('📤 Enviando datos:', data);
      await this.rxCharacteristic.writeValue(data);
      console.log('✅ Comando enviado exitosamente al ESP32:', command);
      return true;
    } catch (error) {
      console.error('❌ Error al enviar comando:', error);
      return false;
    }
  }

  /**
   * Activa el feedback de respuesta correcta en el ESP32
   */
  async playCorrectFeedback() {
    return await this.sendCommand('CORRECT');
  }

  /**
   * Activa el feedback de respuesta incorrecta en el ESP32
   */
  async playIncorrectFeedback() {
    return await this.sendCommand('INCORRECT');
  }
}
