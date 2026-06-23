// ============================================
// Student Management System - CLASSROOM
// ESP8266 + RFID-RC522 (no LCD)
// ============================================
// Student taps NFC card when entering classroom.
// Publishes to MQTT topic: school/nfc/class
// Uses built-in LED for feedback (no LCD needed).

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// ---- CONFIGURATION ----
const char* WIFI_SSID     = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";
const char* MQTT_SERVER   = "192.168.1.100";
const int   MQTT_PORT     = 1883;
const char* DEVICE_ID     = "class-esp-01";
const char* TAP_POINT     = "class_in";

#define SS_PIN   15
#define RST_PIN  5
#define LED_PIN  2

MFRC522 rfid(SS_PIN, RST_PIN);
WiFiClient espClient;
PubSubClient mqtt(espClient);

unsigned long lastTapTime = 0;
const unsigned long TAP_COOLDOWN = 3000;

bool initRFID() {
  digitalWrite(RST_PIN, LOW);
  delay(50);
  digitalWrite(RST_PIN, HIGH);
  delay(50);

  rfid.PCD_Init();
  delay(100);
  rfid.PCD_AntennaOn();
  delay(50);

  byte v = rfid.PCD_ReadRegister(rfid.VersionReg);
  Serial.print("RFID firmware version: 0x");
  Serial.println(v, HEX);

  if (v == 0x00 || v == 0xFF) {
    Serial.println("ERROR: Cannot communicate with RC522!");
    Serial.println("Check wiring: SDA->D8, SCK->D5, MOSI->D7, MISO->D6, RST->D1, 3.3V, GND");
    return false;
  }

  rfid.PCD_WriteRegister(rfid.RFCfgReg, (rfid.PCD_ReadRegister(rfid.RFCfgReg) & ~0x70) | 0x70);
  rfid.PCD_SetAntennaGain(rfid.RxGain_max);
  Serial.println("Antenna gain set to MAX");
  return true;
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Classroom Station Starting ===");

  pinMode(LED_PIN, OUTPUT);
  pinMode(RST_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);
  digitalWrite(RST_PIN, LOW);

  SPI.begin();
  delay(200);

  bool rfidOk = false;
  for (int attempt = 1; attempt <= 3; attempt++) {
    Serial.print("RFID init attempt ");
    Serial.println(attempt);
    if (initRFID()) {
      rfidOk = true;
      break;
    }
    delay(500);
  }

  if (!rfidOk) {
    Serial.println("RFID FAILED after 3 attempts! Check wiring!");
  } else {
    Serial.println("RFID reader initialized OK");
  }

  connectWiFi();

  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  connectMQTT();

  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(200);
    digitalWrite(LED_PIN, HIGH);
    delay(200);
  }
  Serial.println("Classroom station ready!");
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

  Serial.print("Classroom tap: ");
  Serial.println(uid);

  // LED on to indicate tap
  digitalWrite(LED_PIN, LOW);

  StaticJsonDocument<200> doc;
  doc["uid"] = uid;
  doc["device_id"] = DEVICE_ID;
  doc["tap_point"] = TAP_POINT;

  char payload[200];
  serializeJson(doc, payload);
  mqtt.publish("school/nfc/class", payload);

  Serial.print("Published: ");
  Serial.println(payload);

  delay(1000);
  digitalWrite(LED_PIN, HIGH);  // LED off

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
  } else {
    Serial.println("\nWiFi FAILED! Restarting in 5 seconds...");
    delay(5000);
    ESP.restart();
  }
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqtt.connect(DEVICE_ID)) {
      Serial.println("connected!");
    } else {
      Serial.print("failed, rc=");
      Serial.println(mqtt.state());
      delay(2000);
    }
  }
}
