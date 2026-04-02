#include <Wire.h>
#include <NimBLEDevice.h>
#include <MAX30100_PulseOximeter.h>
#include <Adafruit_MCP9808.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SDA_PIN 5
#define SCL_PIN 6
#define BUZZER_PIN 7
#define OLED_ADDR 0x3C

PulseOximeter pox;
Adafruit_MCP9808 mcp;
Adafruit_SSD1306 display(128, 64, &Wire, -1);

float heartRate = 0, spo2 = 0, temperature = 0;
uint32_t lastBeat = 0;
bool fingerPresent = false;

void onBeatDetected() { lastBeat = millis(); }

void setup() {
  Serial.begin(115200); // Set to 115200 for high-speed real-time monitoring
  while (!Serial);
  Serial.println("--- SYSTEM BOOTING ---");

  // Force I2C pins and slow down clock for stability
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(10000); // 10kHz - very slow/stable for debugging

  if(!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) Serial.println("OLED ERROR");
  
  if(!mcp.begin(0x18)) Serial.println("MCP9808 ERROR");

  Serial.println("Initializing MAX30100...");
  if (!pox.begin()) {
    Serial.println("MAX30100 FAILED! Check pull-up resistors.");
    // Don't stop the code, let it continue so you can at least see Temp
  } else {
    Serial.println("MAX30100 SUCCESS!");
  }
  
  pox.setOnBeatDetectedCallback(onBeatDetected);
  pox.setIRLedCurrent(MAX30100_LED_CURR_7_6MA); // Standard setting
}

void loop() {
  // CRITICAL: pox.update() must run as fast as possible
  pox.update();

  static uint32_t lastReport = 0;
  if (millis() - lastReport >= 1000) {
    lastReport = millis();

    heartRate = pox.getHeartRate();
    spo2 = pox.getSpO2();
    temperature = mcp.readTempC();

    // Determine if finger is present based on valid HR
    fingerPresent = (heartRate > 30);

    // Prepare JSON manually to be 100% sure of formatting
    Serial.print("{\"hr\":");
    Serial.print(heartRate, 1);
    Serial.print(",\"spo2\":");
    Serial.print(spo2, 1);
    Serial.print(",\"temp\":");
    Serial.print(temperature, 2);
    Serial.println("}");
    Serial.flush(); // Force the data out of the serial buffer

    // Basic OLED update
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(0,0);
    display.println("HEALTH MONITOR");
    display.print("Temp: "); display.println(temperature);
    if(fingerPresent) {
      display.print("HR: "); display.println(heartRate);
    } else {
      display.println("Place Finger...");
    }
    display.display();
  }
}
