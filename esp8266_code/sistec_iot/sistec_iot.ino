/*
 * SISTec IoT Application 2026
 * ESP8266 Arduino Code
 * 
 * Hardware:
 *   - DHT11 Sensor  → D5
 *   - LCD 16x2 I2C  → D1 (SCL), D2 (SDA), Address: 0x27
 * 
 * Libraries Required (Install from Arduino Library Manager):
 *   1. DHT sensor library by Adafruit
 *   2. Adafruit Unified Sensor
 *   3. LiquidCrystal I2C by Frank de Brabander
 *   4. ESP8266WiFi (built-in with ESP8266 board package)
 *   5. ESP8266HTTPClient (built-in with ESP8266 board package)
 *   6. WiFiClientSecureBearSSL (built-in with ESP8266 board package)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ---- WiFi Credentials ----
const char* ssid     = "YOUR_WIFI_NAME";      // <-- Change this
const char* password = "YOUR_WIFI_PASSWORD";   // <-- Change this

// ---- Server URL (Your Render App URL) ----
// Example: https://sistec-iot.onrender.com
const char* serverURL = "https://YOUR-APP-NAME.onrender.com";  // <-- Change this

// ---- DHT11 Setup ----
#define DHTPIN D5
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ---- LCD Setup ----
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);
  delay(200);

  // Init DHT
  dht.begin();

  // Init LCD
  lcd.init();
  lcd.backlight();

  // --- Connect to WiFi ---
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CONNECTING TO");
  lcd.setCursor(0, 1);
  lcd.print("WiFi");

  WiFi.begin(ssid, password);

  int dots = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    lcd.setCursor(dots % 16, 1);
    lcd.print(".");
    dots++;
  }

  Serial.println("\nConnected to WiFi!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Show connected message
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CONNECTED TO");
  lcd.setCursor(0, 1);
  lcd.print("WiFi");
  delay(1500);

  // Welcome Screen
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("-- WELCOME --");
  lcd.setCursor(0, 1);
  lcd.print("SISTec IoT 2026");
  delay(2000);
}

void loop() {
  // Read DHT11
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();

  // Check if reading failed
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT11 Read Failed!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SENSOR ERROR!");
    delay(2000);
    return;
  }

  Serial.print("Temp: "); Serial.print(temperature); Serial.println(" C");
  Serial.print("Humi: "); Serial.print(humidity);    Serial.println(" %");

  // ---- Show Temperature on LCD ----
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("TEMPERATURE");
  lcd.setCursor(0, 1);
  lcd.print(temperature, 1);
  lcd.print(" 'C");
  delay(2000);

  // ---- Show Humidity on LCD ----
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("HUMIDITY");
  lcd.setCursor(0, 1);
  lcd.print(humidity, 1);
  lcd.print(" %");
  delay(2000);

  // ---- Fetch LCD Text from Server (API 2) ----
  String lcdText = fetchLCDText();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SISTec DISPLAY");
  lcd.setCursor(0, 1);
  // Pad or trim to 16 chars
  if (lcdText.length() > 16) lcdText = lcdText.substring(0, 16);
  lcd.print(lcdText);
  delay(3000);

  // ---- Send Data to Server (API 1) ----
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SENDING DATA TO");
  lcd.setCursor(0, 1);
  lcd.print("WEB SERVER....");
  delay(1000);

  bool sent = sendSensorData(temperature, humidity);

  lcd.clear();
  if (sent) {
    lcd.setCursor(0, 0);
    lcd.print("DATA SENT...!!");
    Serial.println("Data sent successfully!");
  } else {
    lcd.setCursor(0, 0);
    lcd.print("SEND FAILED!");
    Serial.println("Failed to send data.");
  }
  delay(1000);

  // Wait before next reading
  delay(10000); // 10 seconds between readings
}

// ============================================
// API 1: Send Temperature & Humidity to server
// ============================================
bool sendSensorData(float temp, float humi) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL certificate verification (needed for Render free tier)

  HTTPClient http;

  // Build URL: /api/sensor?temp=25.5&humidity=60
  String url = String(serverURL) + "/api/sensor?temp=" + String(temp, 1) + "&humidity=" + String(humi, 1);

  Serial.print("Sending to: "); Serial.println(url);

  http.begin(client, url);
  http.setTimeout(10000);

  int httpCode = http.GET();
  String payload = http.getString();

  Serial.print("HTTP Code: "); Serial.println(httpCode);
  Serial.print("Response: ");  Serial.println(payload);

  http.end();

  return (httpCode == 200);
}

// ============================================
// API 2: Fetch text from server for LCD
// ============================================
String fetchLCDText() {
  if (WiFi.status() != WL_CONNECTED) {
    return "No WiFi";
  }

  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL certificate verification

  HTTPClient http;

  String url = String(serverURL) + "/api/lcd";

  Serial.print("Fetching LCD text from: "); Serial.println(url);

  http.begin(client, url);
  http.setTimeout(10000);

  int httpCode = http.GET();
  String text = "";

  if (httpCode == 200) {
    text = http.getString();
    text.trim();
    Serial.print("LCD Text: "); Serial.println(text);
  } else {
    Serial.print("LCD fetch failed. Code: "); Serial.println(httpCode);
    text = "SISTec IoT";
  }

  http.end();
  return text;
}
