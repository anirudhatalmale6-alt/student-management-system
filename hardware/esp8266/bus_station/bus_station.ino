// ============================================
// Student Management System - BUS STATION
// ESP8266 + RFID-RC522 + LCD 16x2
// ============================================
// Student taps NFC card when boarding the bus.
// Publishes NFC UID to MQTT topic: school/nfc/bus
// LCD shows student name after tap.

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// ---- CONFIGURATION ----
const char* WIFI_SSID     = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";
const char* MQTT_SERVER   = "192.168.1.100";  // Raspberry Pi IP
const int   MQTT_PORT     = 1883;
const char* DEVICE_ID     = "bus-esp-01";
const char* TAP_POINT     = "bus_in";
const int   BUS_ROUTE_ID  = 1;  // Change per bus: 1, 2, or 3

// RFID pins
#define SS_PIN   15  // D8
#define RST_PIN  5   // D1

// Objects
MFRC522 rfid(SS_PIN, RST_PIN);
WiFiClient espClient;
PubSubClient mqtt(espClient);
LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long lastTapTime = 0;
const unsigned long TAP_COOLDOWN = 3000;  // 3 second cooldown between taps

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Bus Station Starting ===");

  // Init LCD
  Wire.begin(4, 0);  // SDA=D2(GPIO4), SCL=D3(GPIO0)
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Bus Station");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");

  // Init SPI and RFID
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("RFID reader initialized");

  // Connect WiFi
  connectWiFi();

  // Connect MQTT
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  connectMQTT();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Bus Station");
  lcd.setCursor(0, 1);
  lcd.print("Tap your card");
}

void loop() {
  if (!mqtt.connected()) {
    connectMQTT();
  }
  mqtt.loop();

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  unsigned long now = millis();
  if (now - lastTapTime < TAP_COOLDOWN) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }
  lastTapTime = now;

  // Read UID
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  Serial.print("Card detected: ");
  Serial.println(uid);

  // Show on LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Card: " + uid);
  lcd.setCursor(0, 1);
  lcd.print("Processing...");

  // Publish to MQTT
  StaticJsonDocument<200> doc;
  doc["uid"] = uid;
  doc["device_id"] = DEVICE_ID;
  doc["tap_point"] = TAP_POINT;
  doc["bus_route_id"] = BUS_ROUTE_ID;

  char payload[200];
  serializeJson(doc, payload);
  mqtt.publish("school/nfc/bus", payload);

  Serial.print("Published: ");
  Serial.println(payload);

  // Wait then reset display
  delay(2000);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Bus Station");
  lcd.setCursor(0, 1);
  lcd.print("Tap your card");

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP().toString());
    delay(1500);
  } else {
    Serial.println("\nWiFi FAILED!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi FAILED!");
    lcd.setCursor(0, 1);
    lcd.print("Check settings");
  }
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqtt.connect(DEVICE_ID)) {
      Serial.println("connected!");
      mqtt.subscribe("school/response/bus");
    } else {
      Serial.print("failed, rc=");
      Serial.println(mqtt.state());
      delay(2000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("MQTT received: ");
  Serial.println(message);

  // Parse response to show student name on LCD
  StaticJsonDocument<200> doc;
  if (deserializeJson(doc, message) == DeserializationError::Ok) {
    const char* name = doc["student_name"] | "Unknown";
    const char* status = doc["status"] | "";

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(String(name).substring(0, 16));
    lcd.setCursor(0, 1);
    lcd.print(String(status).substring(0, 16));
    delay(2000);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Bus Station");
    lcd.setCursor(0, 1);
    lcd.print("Tap your card");
  }
}
