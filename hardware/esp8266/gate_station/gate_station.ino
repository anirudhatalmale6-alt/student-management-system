// ============================================
// Student Management System - SCHOOL GATE
// ESP8266 + RFID-RC522 + LCD 16x2
// ============================================
// Student taps NFC card at school gate entry/exit.
// Publishes to MQTT topic: school/nfc/gate
// LCD shows student name and arrival time.

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
const char* MQTT_SERVER   = "192.168.1.100";
const int   MQTT_PORT     = 1883;
const char* DEVICE_ID     = "gate-esp-01";
const char* TAP_POINT     = "gate_in";  // Change to "gate_out" for exit gate

#define SS_PIN   15
#define RST_PIN  5

MFRC522 rfid(SS_PIN, RST_PIN);
WiFiClient espClient;
PubSubClient mqtt(espClient);
LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long lastTapTime = 0;
const unsigned long TAP_COOLDOWN = 3000;
int tapCount = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== School Gate Station Starting ===");

  Wire.begin(4, 0);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("School Gate");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");

  SPI.begin();
  rfid.PCD_Init();

  connectWiFi();

  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  connectMQTT();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("School Gate");
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

  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  tapCount++;
  Serial.print("Gate tap #");
  Serial.print(tapCount);
  Serial.print(": ");
  Serial.println(uid);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Card: " + uid);
  lcd.setCursor(0, 1);
  lcd.print("Checking...");

  StaticJsonDocument<200> doc;
  doc["uid"] = uid;
  doc["device_id"] = DEVICE_ID;
  doc["tap_point"] = TAP_POINT;

  char payload[200];
  serializeJson(doc, payload);
  mqtt.publish("school/nfc/gate", payload);

  // Also publish sensor count update
  StaticJsonDocument<100> countDoc;
  countDoc["location"] = "main_gate";
  countDoc["in_count"] = tapCount;
  countDoc["out_count"] = 0;

  char countPayload[100];
  serializeJson(countDoc, countPayload);
  mqtt.publish("school/ir/gate", countPayload);

  delay(2000);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Gate  Count:" + String(tapCount));
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
  }
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqtt.connect(DEVICE_ID)) {
      Serial.println("connected!");
      mqtt.subscribe("school/response/gate");
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

  StaticJsonDocument<200> doc;
  if (deserializeJson(doc, message) == DeserializationError::Ok) {
    const char* name = doc["student_name"] | "Unknown";
    const char* status = doc["status"] | "Recorded";

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(String(name).substring(0, 16));
    lcd.setCursor(0, 1);
    lcd.print(String(status).substring(0, 16));
    delay(2000);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Gate  Count:" + String(tapCount));
    lcd.setCursor(0, 1);
    lcd.print("Tap your card");
  }
}
