// ============================================
// Student Management System - CANTEEN (VENDOR)
// ESP8266 + RFID-RC522
// ============================================
// Student taps NFC card to pay at canteen.
// Publishes to MQTT topic: school/nfc/pos
// Subscribes to response for payment confirmation.

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
const char* DEVICE_ID     = "canteen-esp-01";
const char* TAP_POINT     = "pos";
const int   VENDOR_ID     = 6;  // Vendor user ID from database
const float PAYMENT_AMOUNT = 0.500;  // Default payment amount in OMR

#define SS_PIN   15
#define RST_PIN  5
#define LED_PIN  2
#define BUZZER_PIN 16  // D0 (GPIO16) - optional buzzer

MFRC522 rfid(SS_PIN, RST_PIN);
WiFiClient espClient;
PubSubClient mqtt(espClient);

unsigned long lastTapTime = 0;
const unsigned long TAP_COOLDOWN = 5000;  // 5 seconds for payment

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Canteen Station Starting ===");

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);
  digitalWrite(BUZZER_PIN, LOW);

  SPI.begin();
  rfid.PCD_Init();
  Serial.println("RFID reader initialized");

  connectWiFi();

  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  connectMQTT();

  // Ready beep
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println("Canteen station ready!");
  Serial.print("Payment amount: ");
  Serial.print(PAYMENT_AMOUNT, 3);
  Serial.println(" OMR");
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

  Serial.print("Payment tap: ");
  Serial.println(uid);

  // LED on
  digitalWrite(LED_PIN, LOW);

  StaticJsonDocument<256> doc;
  doc["uid"] = uid;
  doc["device_id"] = DEVICE_ID;
  doc["tap_point"] = TAP_POINT;
  doc["vendor_id"] = VENDOR_ID;
  doc["amount"] = PAYMENT_AMOUNT;
  doc["item_name"] = "Canteen Purchase";

  char payload[256];
  serializeJson(doc, payload);
  mqtt.publish("school/nfc/pos", payload);

  Serial.print("Payment request sent: ");
  Serial.println(payload);

  delay(500);
  digitalWrite(LED_PIN, HIGH);

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
    Serial.println("\nWiFi FAILED! Restarting...");
    delay(5000);
    ESP.restart();
  }
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqtt.connect(DEVICE_ID)) {
      Serial.println("connected!");
      mqtt.subscribe("school/response/pos");
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

  Serial.print("Payment response: ");
  Serial.println(message);

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, message) == DeserializationError::Ok) {
    const char* status = doc["status"] | "unknown";
    const char* studentName = doc["student_name"] | "";
    float balance = doc["balance"] | 0.0;

    if (String(status) == "success") {
      // Success beep
      digitalWrite(BUZZER_PIN, HIGH);
      delay(200);
      digitalWrite(BUZZER_PIN, LOW);
      Serial.print("Payment OK! ");
      Serial.print(studentName);
      Serial.print(" Balance: ");
      Serial.println(balance, 3);
    } else {
      // Error beeps
      for (int i = 0; i < 3; i++) {
        digitalWrite(BUZZER_PIN, HIGH);
        delay(100);
        digitalWrite(BUZZER_PIN, LOW);
        delay(100);
      }
      const char* error = doc["error"] | "Payment failed";
      Serial.print("Payment FAILED: ");
      Serial.println(error);
    }
  }
}
