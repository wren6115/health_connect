// ---------- SMOOTHING SETTINGS ----------
const int numReadings = 5;
int readIndex = 0;

float tempReadings[numReadings];
float tempTotal = 0.0;

int hrReadings[numReadings];
int hrTotal = 0;

int spo2Readings[numReadings];
int spo2Total = 0;

void setup() {
  Serial.begin(9600);
  
  // Initialize smoothing arrays to 0
  for (int i = 0; i < numReadings; i++) {
    tempReadings[i] = 0.0;
    hrReadings[i] = 0;
    spo2Readings[i] = 0;
  }
  
  // Initialize physical sensors here
  // pulseOx.begin();
  // mlxTemp.begin();
  
  delay(2000); // Allow hardware to warm up
}

// Simulated raw read functions (replace with actual sensor reads like pulseOx.getHeartRate())
int readRawHeartRate()   { return 75 + random(-5, 6); }
int readRawSpO2()        { return 98 + random(-2, 3); }
float readRawTemp()      { return 37.0 + (random(-5, 6) / 10.0); }

void loop() {
  // 1. Read Raw Sensors
  int rawHr = readRawHeartRate();
  int rawSpo2 = readRawSpO2();
  float rawTemp = readRawTemp();

  // 2. Hardware-level Sanity Filtering
  // Ignore ridiculous sensor spikes before they hit the smoothing array
  if (rawHr < 40 || rawHr > 200) rawHr = hrTotal / numReadings; // fallback to average
  if (rawSpo2 < 50 || rawSpo2 > 100) rawSpo2 = spo2Total / numReadings;
  if (rawTemp < 30.0 || rawTemp > 45.0) rawTemp = tempTotal / numReadings;

  // 3. Moving Average Calculation
  // Subtract the last reading
  tempTotal = tempTotal - tempReadings[readIndex];
  hrTotal = hrTotal - hrReadings[readIndex];
  spo2Total = spo2Total - spo2Readings[readIndex];

  // Insert new reading
  tempReadings[readIndex] = rawTemp;
  hrReadings[readIndex] = rawHr;
  spo2Readings[readIndex] = rawSpo2;

  // Add the reading to the total
  tempTotal = tempTotal + tempReadings[readIndex];
  hrTotal = hrTotal + hrReadings[readIndex];
  spo2Total = spo2Total + spo2Readings[readIndex];

  // Advance to the next position in the array
  readIndex = readIndex + 1;
  if (readIndex >= numReadings) readIndex = 0;

  // Calculate the averages
  float smoothedTemp = tempTotal / numReadings;
  int smoothedHr = hrTotal / numReadings;
  int smoothedSpo2 = spo2Total / numReadings;

  // Wait until array is fully populated before sending data to prevent 0 artifacts
  static bool warmedUp = false;
  if (!warmedUp && readIndex == 0) warmedUp = true;
  
  // 4. Send output via Serial for Node.js edge-bridge
  if (warmedUp) {
    Serial.print("{\"hr\": ");
    Serial.print(smoothedHr);
    Serial.print(", \"spo2\": ");
    Serial.print(smoothedSpo2);
    Serial.print(", \"temp\": ");
    Serial.print(smoothedTemp, 1);
    Serial.println("}");
  }

  // 5. Send data every 1 second
  delay(1000);
}