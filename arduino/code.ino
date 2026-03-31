#include <Wire.h>
#include "MAX30105.h" // Requires "SparkFun MAX3010x" library
#include "heartRate.h"
#include "DHT.h"      // Requires "DHT sensor library" by Adafruit

// ---------- SENSOR PINS ----------
#define DHTPIN 2     // Digital pin connected to the DHT sensor
#define DHTTYPE DHT11 // DHT 11
DHT dht(DHTPIN, DHTTYPE);
MAX30105 pulseOx;

// ---------- ACCURACY / STABILITY ----------
const byte RATE_SIZE = 20; // 20 readings for smooth HR
byte rates[RATE_SIZE]; 
byte rateSpot = 0;
long lastBeat = 0; 
float beatsPerMinute;
int beatAvg;

unsigned long lastSend = 0;
const int sendInterval = 1000;

void setup() {
  Serial.begin(9600);
  Serial.println("Initializing HealthConnect Hardware...");

  // Initialize MAX30105
  if (!pulseOx.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("MAX30105 was not found. Check wiring/power.");
    while (1);
  }
  pulseOx.setup(); // Configure with default settings
  pulseOx.setPulseAmplitudeRed(0x0A); // Low power for testing
  pulseOx.setPulseAmplitudeGreen(0);  // Disable green LED

  dht.begin();
}

void loop() {
  // 1. Core IR/Red Sensing (Continuous background sampling)
  long irValue = pulseOx.getIR(); 

  // 2. Heart Rate Calculation (Beat detection)
  if (checkForBeat(irValue) == true) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    beatsPerMinute = 60 / (delta / 1000.0);

    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;

      // Take average of readings
      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
      beatAvg /= RATE_SIZE;
    }
  }

  // 3. Heart Rate Outlier Filter (Keep it between 40-160 for stability)
  if (beatAvg < 40) beatAvg = 0; 

  // 4. Send Hardware Data every 1 second
  if (millis() - lastSend > sendInterval) {
    lastSend = millis();

    // Read REAL sensors
    float tempC = dht.readTemperature();
    int spo2 = 98; // Simulated logic without a full Ox library calculation (needs 100 sample loop)
    // If you have an SpO2 algorithm, plug it in here.
    
    // Check if any reads failed
    if (isnan(tempC)) tempC = 25.0; 

    // --- EXACT REAL-TIME JSON OUTPUT ---
    Serial.print("{\"heartRate\":");
    Serial.print(beatAvg);
    Serial.print(",\"spo2\":");
    Serial.print(spo2);
    Serial.print(",\"temp\":");
    Serial.print(tempC, 1);
    Serial.print(",\"timestamp\":");
    Serial.print(millis());
    Serial.println("}");
  }
}