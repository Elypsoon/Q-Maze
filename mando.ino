// --- Librerías para Bluetooth BLE ---
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// --- Pines de Hardware ---
// Joystick Ejes y Botón
const int PIN_VRX = 34; 
const int PIN_VRY = 35; 
const int PIN_SW = 16;  
// Botón Arcade
const int PIN_BOTON_ARCADE = 4; 

// Buzzer Pasivo
const int PIN_BUZZER = 17; 

// LEDs Indicadores
const int PIN_LED_VERDE = 12;  // LED Verde para Acierto
const int PIN_LED_ROJO = 13;   // LED Rojo para Error

// --- Configuración Bluetooth BLE (Nordic UART Service) ---
#define SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e" // Nordic UART Service
#define CHARACTERISTIC_UUID_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e" // RX (ESP32 recibe)
#define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e" // TX (ESP32 envía)

// Variables globales BLE
BLEServer *pServer = NULL;
BLECharacteristic *pTxCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Nombre del dispositivo Bluetooth (aparecerá en el navegador)
const char* DEVICE_NAME = "Q-MAZE-Controller";

// --- Frecuencias de Notas (en Hz) para Sonidos de Juego ---
#define NOTE_G6_CHIME  1568  
#define NOTE_C7_CHIME  2093  
#define NOTE_G7_CHIME  3136  

#define NOTE_C4_ERROR  262  
#define NOTE_C3_ERROR  131  

// --- Umbrales de Control y Tiempos ---
const int VALOR_CENTRO = 2047; 
const int UMBRAL_MOVIMIENTO = 900; // Aumentado de 500 a 900 para reducir sensibilidad
const long TIEMPO_ESPERA_INICIAL_MS = 1000; 
const long INTERVALO_REPETICION_MS = 200;  
const long DEBOUNCE_DELAY_MS = 50; 
const int ESTADO_PRESIONADO = LOW;

// --- Variables de Estado y Repetición de Movimiento ---
String ultimaDireccionReportada = "CENTRO"; 
String direccionActual = "CENTRO"; 
unsigned long tiempoUltimoReporte = 0;
unsigned long tiempoInicioPulsacion = 0;
bool repeticionIniciada = false;

// Variables de Anti-Rebote (SW y Arcade)
int estadoLecturaAnterior_SW = HIGH; 
unsigned long ultimoTiempoRebote_SW = 0; 
bool yaReportado_SW = false; 

int estadoLecturaAnterior_Arcade = HIGH; 
unsigned long ultimoTiempoRebote_Arcade = 0; 
bool yaReportado_Arcade = false; 

// ----------------------------------------------------------------------
// CALLBACKS DE BLUETOOTH
// ----------------------------------------------------------------------

// Callback para conexión/desconexión del servidor BLE
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("*** DISPOSITIVO CONECTADO VIA BLUETOOTH ***");
      // Parpadeo del LED verde para indicar conexión
      for(int i = 0; i < 3; i++) {
        digitalWrite(PIN_LED_VERDE, HIGH);
        delay(100);
        digitalWrite(PIN_LED_VERDE, LOW);
        delay(100);
      }
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("*** DISPOSITIVO DESCONECTADO ***");
      // Parpadeo del LED rojo para indicar desconexión
      digitalWrite(PIN_LED_ROJO, HIGH);
      delay(500);
      digitalWrite(PIN_LED_ROJO, LOW);
    }
};

// Callback para recibir comandos del juego (navegador → ESP32)
class MyCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) override {
    String rxValue = pCharacteristic->getValue(); // usa Arduino String
    if (rxValue.length() > 0) {
      Serial.print("Comando recibido: ");
      Serial.println(rxValue);
      
      // Procesar comandos
      if (rxValue == "CORRECT") {
        sonarCorrecto();
      } else if (rxValue == "INCORRECT") {
        sonarIncorrecto();
      }
    }
  }
};




// ----------------------------------------------------------------------
// FUNCIONES DE BLUETOOTH
// ----------------------------------------------------------------------

// Inicializar Bluetooth BLE
void inicializarBluetooth() {
  Serial.println("Inicializando Bluetooth BLE...");
  
  // Crear el dispositivo BLE
  BLEDevice::init(DEVICE_NAME);
  
  // Crear el servidor BLE
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Crear el servicio BLE (Nordic UART Service)
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Crear una característica BLE para TX (enviar datos al navegador)
  pTxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_TX,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pTxCharacteristic->addDescriptor(new BLE2902());

  // Crear una característica BLE para RX (recibir datos del navegador - opcional)
  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_RX,
    BLECharacteristic::PROPERTY_WRITE
  );
  pRxCharacteristic->setCallbacks(new MyCallbacks());

  // Iniciar el servicio
  pService->start();

  // Iniciar el advertising (para que el dispositivo sea visible)
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // ayuda con problemas de conexión en iOS
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  
  Serial.println("Esperando conexión del cliente BLE...");
  Serial.print("Nombre del dispositivo: ");
  Serial.println(DEVICE_NAME);
}

// Enviar datos via Bluetooth
void enviarBluetooth(String mensaje) {
  if (deviceConnected) {
    pTxCharacteristic->setValue(mensaje.c_str());
    pTxCharacteristic->notify();
    delay(10); // Pequeño delay para que el BLE procese
  }
}

// ----------------------------------------------------------------------
// FUNCIONES DE SONIDO Y FEEDBACK
// ----------------------------------------------------------------------

// Sonido de "Correcto" (Respuesta Correcta)
void sonarCorrecto() {
  digitalWrite(PIN_LED_VERDE, HIGH); 
  // Tono 1: G6
  tone(PIN_BUZZER, NOTE_G6_CHIME, 80); 
  delay(100);
  // Tono 2: C7
  tone(PIN_BUZZER, NOTE_C7_CHIME, 80);
  delay(100);
  // Tono 3: G7
  tone(PIN_BUZZER, NOTE_G7_CHIME, 150);
  delay(200);
  noTone(PIN_BUZZER);
  digitalWrite(PIN_LED_VERDE, LOW);
}

// Sonido de "Incorrecto" (Respuesta Incorrecta)
void sonarIncorrecto() {
  digitalWrite(PIN_LED_ROJO, HIGH); 
  // Pitido inicial (C4)
  tone(PIN_BUZZER, NOTE_C4_ERROR, 200); 
  delay(200);
  // Tono grave sostenido (C3)
  tone(PIN_BUZZER, NOTE_C3_ERROR, 600); 
  delay(650);
  noTone(PIN_BUZZER);
  digitalWrite(PIN_LED_ROJO, LOW);
}

// ----------------------------------------------------------------------

void setup() {
  Serial.begin(115200);
  
  Serial.println("===========================================");
  Serial.println("   Q-MAZE CONTROLLER - ESP32 BLE");
  Serial.println("===========================================");
  
  // Configuración de Pines de Salida para LEDs
  pinMode(PIN_LED_VERDE, OUTPUT);
  digitalWrite(PIN_LED_VERDE, LOW); 
  
  pinMode(PIN_LED_ROJO, OUTPUT);
  digitalWrite(PIN_LED_ROJO, LOW); 

  // Configuración de Entradas y Buzzer
  pinMode(PIN_SW, INPUT_PULLUP); 
  pinMode(PIN_BOTON_ARCADE, INPUT_PULLUP); 
  pinMode(PIN_BUZZER, OUTPUT);

  // Inicializar Bluetooth BLE
  inicializarBluetooth();

  Serial.println("--- Sistema Listo ---");
  Serial.println("Formato: Direccion | SW | ARCADE");
  Serial.println("===========================================");
}

void loop() {
  unsigned long tiempoActual = millis();

  // Manejar reconexión de Bluetooth
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // Dar tiempo al stack de Bluetooth para prepararse
    pServer->startAdvertising(); // Reiniciar advertising
    Serial.println("Reiniciando advertising BLE...");
    oldDeviceConnected = deviceConnected;
  }
  // Al conectarse
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  // 1. Lectura de las entradas y Detección de Dirección
  int valorX = analogRead(PIN_VRX); 
  int valorY = analogRead(PIN_VRY); 
  int lecturaBotonSW = digitalRead(PIN_SW);
  int lecturaBotonArcade = digitalRead(PIN_BOTON_ARCADE); 

  String direccionX = "";
  String direccionY = "";
  direccionActual = "CENTRO";

  if (valorX < (VALOR_CENTRO - UMBRAL_MOVIMIENTO)) { 
    direccionX = "DERECHA"; 
  } else if (valorX > (VALOR_CENTRO + UMBRAL_MOVIMIENTO)) {
    direccionX = "IZQUIERDA"; 
  }
  if (valorY > (VALOR_CENTRO + UMBRAL_MOVIMIENTO)) {
    direccionY = "ARRIBA"; 
  } else if (valorY < (VALOR_CENTRO - UMBRAL_MOVIMIENTO)) {
    direccionY = "ABAJO"; 
  }
  if (direccionX != "" || direccionY != "") {
      direccionActual = direccionY + (direccionY != "" && direccionX != "" ? " " : "") + direccionX;
      direccionActual.trim(); 
  }

  // 2. Lógica de Flanco, Retardo y Repetición (Movimiento normal)
  // ... (Esta sección permanece igual, maneja el reporte continuo) ...
  if (direccionActual != ultimaDireccionReportada) {
    if (direccionActual != "CENTRO") {
      String mensaje = direccionActual + " | - | -";
      Serial.println(mensaje + " (1er toque)");
      enviarBluetooth(mensaje); // Enviar por Bluetooth sin el sufijo
      tiempoInicioPulsacion = tiempoActual;
      repeticionIniciada = false;
    } else {
      tiempoInicioPulsacion = 0;
      repeticionIniciada = false;
    }
    ultimaDireccionReportada = direccionActual;
    tiempoUltimoReporte = tiempoActual;
  } 
  else if (direccionActual != "CENTRO") {
    if (!repeticionIniciada && (tiempoActual - tiempoInicioPulsacion) >= TIEMPO_ESPERA_INICIAL_MS) {
        repeticionIniciada = true;
        tiempoUltimoReporte = tiempoActual;
    }
    if (repeticionIniciada && (tiempoActual - tiempoUltimoReporte) >= INTERVALO_REPETICION_MS) {
        String mensaje = direccionActual + " | - | -";
        Serial.println(mensaje + " (Repeticion)");
        enviarBluetooth(mensaje); // Enviar por Bluetooth sin el sufijo
        tiempoUltimoReporte = tiempoActual;
    }
  }


  // 3. Detección de PULSACIÓN de Botones (SW y Arcade)
  
  // Botón SW (Pausa/ESC)
  if (lecturaBotonSW != estadoLecturaAnterior_SW) {
    ultimoTiempoRebote_SW = tiempoActual;
  }
  if ((tiempoActual - ultimoTiempoRebote_SW) > DEBOUNCE_DELAY_MS) {
    if (lecturaBotonSW == ESTADO_PRESIONADO && !yaReportado_SW) {
      String mensaje = direccionActual + " | SW PRESIONADO | -";
      Serial.println(mensaje);
      enviarBluetooth(mensaje);
      yaReportado_SW = true; 
    } else if (lecturaBotonSW != ESTADO_PRESIONADO) {
      yaReportado_SW = false; 
    }
  }
  estadoLecturaAnterior_SW = lecturaBotonSW;

  // Botón Arcade (Seleccionar/SPACE)
  if (lecturaBotonArcade != estadoLecturaAnterior_Arcade) {
    ultimoTiempoRebote_Arcade = tiempoActual;
  }
  if ((tiempoActual - ultimoTiempoRebote_Arcade) > DEBOUNCE_DELAY_MS) {
    if (lecturaBotonArcade == ESTADO_PRESIONADO && !yaReportado_Arcade) {
      String mensaje = direccionActual + " | - | ARCADE PRESIONADO";
      Serial.println(mensaje);
      enviarBluetooth(mensaje);
      yaReportado_Arcade = true; 
    } else if (lecturaBotonArcade != ESTADO_PRESIONADO) {
      yaReportado_Arcade = false; 
    }
  }
  estadoLecturaAnterior_Arcade = lecturaBotonArcade;
  
  delay(50); 
}