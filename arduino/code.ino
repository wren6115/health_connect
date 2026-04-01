#include <Wire.h>
#include <NimBLEDevice.h>
#include <MAX30100_PulseOximeter.h>
#include <Adafruit_MCP9808.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <HTTPClient.h>
// ---------------- PINS ----------------
#define SDA_PIN 5
#define SCL_PIN 6
#define BUZZER_PIN 7

// ---------------- CUSTOM BLE (MOBILE) ----------------
#define SERVICE_UUID_CUSTOM "12345678-1234-1234-1234-1234567890ab"
#define CHAR_UUID_CUSTOM    "abcdefab-1234-5678-1234-abcdefabcdef"

// ---------------- STANDARD BLE (PC) ----------------
#define SERVICE_UUID_STD "180D"
#define CHAR_UUID_STD    "2A39"

// ---------------- OLED ----------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ---------------- BLE ----------------
NimBLECharacteristic* charPc;      // 2A39 → Python
NimBLECharacteristic* charMobile;  // Custom → Flutter
bool deviceConnected = false;

// ---------------- Sensors ----------------
PulseOximeter pox;
Adafruit_MCP9808 mcp;

// ---------------- Values ----------------
float heartRate = 0, spo2 = 0, temperature = 0;

// ---------------- Smoothing (EMA) ----------------
float hrEma = 0, spo2Ema = 0;
const float EMA_ALPHA = 0.2;

// ---------------- Beat / buzzer ----------------
uint32_t lastBeat = 0;
const uint16_t BEEP_MS = 60;
const uint32_t FINGER_TIMEOUT = 2000;
bool fingerPresent = false;

// ---------------- UI ----------------
uint32_t bootTime = 0;
bool showWelcome = true;

// ---------------- BLE Callbacks ----------------
class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer*, NimBLEConnInfo&) {
    deviceConnected = true;
  }
  void onDisconnect(NimBLEServer*, NimBLEConnInfo&, int) {
    deviceConnected = false;
    NimBLEDevice::startAdvertising();
  }
};

// ---------------- Beat callback ----------------
void onBeatDetected() {
  lastBeat = millis();
}

// ---------------- EMA helper ----------------
float emaUpdate(float prev, float current) {
  if (prev == 0) return current;
  return EMA_ALPHA * current + (1.0 - EMA_ALPHA) * prev;
}

void setup() {
  Serial.begin(115200);

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);

  display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.display();

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  mcp.begin(0x18);
  mcp.setResolution(3);

  pox.begin();
  pox.setOnBeatDetectedCallback(onBeatDetected);

  // ---------------- BLE INIT ----------------
  NimBLEDevice::init("ESP-Fitness");
  NimBLEServer* server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  // ---- Standard HR Service (PC) ----
  NimBLEService* stdService = server->createService(SERVICE_UUID_STD);
  charPc = stdService->createCharacteristic(
    CHAR_UUID_STD,
    NIMBLE_PROPERTY::NOTIFY
  );
  stdService->start();

  // ---- Custom Service (Mobile) ----
  NimBLEService* customService = server->createService(SERVICE_UUID_CUSTOM);
  charMobile = customService->createCharacteristic(
    CHAR_UUID_CUSTOM,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  customService->start();

  // ---- Advertising ----
  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID_STD);      // PC
  adv->addServiceUUID(SERVICE_UUID_CUSTOM);   // Mobile

  NimBLEAdvertisementData scanResp;
  scanResp.setName("ESP-Fitness");
  adv->setScanResponseData(scanResp);
  adv->start();

  bootTime = millis();
}

void loop() {
  pox.update();

  bool beatRecent = (millis() - lastBeat < FINGER_TIMEOUT);

  static uint32_t lastUpdate = 0;
  if (millis() - lastUpdate >= 1000) {
    lastUpdate = millis();

    float hrRaw = pox.getHeartRate();
    float spo2Raw = pox.getSpO2();
    temperature = mcp.readTempC();

    if (beatRecent && hrRaw > 40 && hrRaw < 180)
      hrEma = emaUpdate(hrEma, hrRaw);

    if (beatRecent && spo2Raw > 85 && spo2Raw <= 100)
      spo2Ema = emaUpdate(spo2Ema, spo2Raw);

    if (beatRecent) {
      heartRate = hrEma;
      spo2 = spo2Ema;
      fingerPresent = true;
    } else {
      fingerPresent = false;
      heartRate = 0;
      spo2 = 0;
      hrEma = 0;
      spo2Ema = 0;
    }

    if (millis() - bootTime > 2500)
      showWelcome = false;

    // -------- OLED (UNCHANGED) --------
    display.clearDisplay();

    if (showWelcome) {
      display.drawRect(0, 0, 128, 64, SSD1306_WHITE);
      display.setCursor(42, 14);
      display.println("WELCOME");
      display.setCursor(50, 26);
      display.println("USER");
      display.drawLine(20, 40, 108, 40, SSD1306_WHITE);
      display.setCursor(18, 48);
      display.println("ESP HEALTH :)");
    } else {
      display.setCursor(28, 0);
      display.println("Your Vitals");
      display.drawLine(26, 10, 96, 10, SSD1306_WHITE);

      if (fingerPresent) {
        display.setCursor(20, 16);
        display.print("HR   : ");
        display.print(heartRate, 1);
        display.println(" BPM");

        display.setCursor(20, 30);
        display.print("SpO2 : ");
        display.print(spo2, 0);
        display.println(" %");
      } else {
        display.setCursor(25, 22);
        display.println("Place Finger !");
      }

      display.drawRect(22, 44, 86, 20, SSD1306_WHITE);
      display.setCursor(30, 50);
      display.print("Temp: ");
      display.print(temperature, 1);
      display.print((char)247);
      display.print("C");
    }

    display.display();

    // -------- JSON (WITH NEWLINE) --------
    char json[128];
    if (fingerPresent) {
      snprintf(json, sizeof(json),
        "{\"hr\":%.1f,\"spo2\":%.1f,\"temp\":%.2f}\n",
        heartRate, spo2, temperature
      );
    } else {
      // TEST MODE: Send dummy data even when finger not present
      snprintf(json, sizeof(json),
        "{\"hr\":72.5,\"spo2\":96.0,\"temp\":%.2f}\n",
        temperature
      );
    }

    // ALWAYS send to USB Serial (for serialBridge on COM3)
    Serial.println(json);

    // Send to BLE ONLY if connected (optional for mobile/PC BLE clients)
    if (deviceConnected) {
      // PC
      charPc->setValue((uint8_t*)json, strlen(json));
      charPc->notify();

      // Mobile
      charMobile->setValue((uint8_t*)json, strlen(json));
      charMobile->notify();
    }
  }

  // -------- BUZZER --------
  if (fingerPresent && (millis() - lastBeat <= BEEP_MS))
    digitalWrite(BUZZER_PIN, HIGH);
  else
    digitalWrite(BUZZER_PIN, LOW);
}
