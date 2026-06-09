// ============================================
// Student Management System - ESP8266 Config
// ============================================
// Update these values for your network setup

#ifndef CONFIG_H
#define CONFIG_H

// WiFi credentials
#define WIFI_SSID     "YourWiFiName"
#define WIFI_PASSWORD "YourWiFiPassword"

// MQTT broker (Raspberry Pi IP address)
#define MQTT_SERVER   "192.168.1.100"
#define MQTT_PORT     1883

// RFID-RC522 pin connections (same for all ESP8266 modules)
// RC522    -> ESP8266
// SDA/SS   -> D8 (GPIO15)
// SCK      -> D5 (GPIO14)
// MOSI     -> D7 (GPIO13)
// MISO     -> D6 (GPIO12)
// RST      -> D1 (GPIO5)
// 3.3V     -> 3.3V
// GND      -> GND

#define SS_PIN   15  // D8
#define RST_PIN  5   // D1

// LCD I2C pins (if LCD is connected)
// SDA -> D2 (GPIO4)
// SCL -> D3 (GPIO0) - NOTE: use D3 carefully, it's a boot pin
// Better: SDA -> D2 (GPIO4), SCL -> D1 (GPIO5) but D1 is used by RST
// So we use: SDA -> D2 (GPIO4), SCL -> D3 (GPIO0)
#define LCD_ADDRESS 0x27  // Common I2C address, try 0x3F if not working
#define LCD_COLS    16
#define LCD_ROWS    2

#endif
