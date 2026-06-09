# Hardware Setup Guide - Student Management System
## ESP8266 + Raspberry Pi 3 Architecture

## Overview
```
[ESP8266 #1: Bus]──WiFi──┐
[ESP8266 #2: Gate]──WiFi──┤
[ESP8266 #3: Class]─WiFi──┼──[Raspberry Pi 3]──[Web Platform]
[ESP8266 #4: Canteen]WiFi─┘        │
                              [NEO-6M GPS]
                              [MQTT Broker]
```

---

## PART 1: Raspberry Pi 3 Setup

### 1.1 Install Raspberry Pi OS
1. Download Raspberry Pi Imager: https://www.raspberrypi.com/software/
2. Flash "Raspberry Pi OS Lite (64-bit)" to SD card
3. During setup: enable SSH, set WiFi, set username/password

### 1.2 Install Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Mosquitto MQTT broker
sudo apt install -y mosquitto mosquitto-clients
sudo systemctl enable mosquitto
sudo systemctl start mosquitto

# Install Python dependencies (for GPS tracker)
sudo apt install -y python3-pip python3-serial
pip3 install paho-mqtt pyserial

# Install Git
sudo apt install -y git
```

### 1.3 Clone and Run the Web Platform
```bash
cd ~
git clone https://github.com/anirudhatalmale6-alt/student-management-system.git
cd student-management-system/server

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
PORT=5000
JWT_SECRET=student-mgmt-secret-key-2026
MQTT_BROKER_URL=mqtt://localhost:1883
EOF

# Initialize database with sample data
node seed.js

# Start the server
node server.js
```

### 1.4 Access the Web Platform
Open browser on any device connected to same WiFi:
```
http://<raspberry-pi-ip>:5000
```
Find Pi IP: `hostname -I`

### 1.5 NEO-6M GPS Wiring to Raspberry Pi
```
NEO-6M    →  Raspberry Pi 3
───────────────────────────
VCC       →  Pin 1  (3.3V)
GND       →  Pin 6  (GND)
TX        →  Pin 10 (GPIO15 / RXD)
RX        →  Pin 8  (GPIO14 / TXD)  [optional]
```

Enable UART on Raspberry Pi:
```bash
sudo raspi-config
# Interface Options → Serial Port
# Login shell over serial: NO
# Hardware serial: YES
# Reboot
```

Run GPS tracker:
```bash
cd ~/student-management-system/hardware/esp8266/gps_tracker_pi/
python3 gps_tracker_pi.py
```

### 1.6 Auto-start on Boot (optional)
```bash
# Create systemd service for web server
sudo tee /etc/systemd/system/sms-server.service << 'EOF'
[Unit]
Description=Student Management System
After=network.target mosquitto.service

[Service]
WorkingDirectory=/home/pi/student-management-system/server
ExecStart=/usr/bin/node server.js
Restart=always
User=pi
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable sms-server
sudo systemctl start sms-server

# Create service for GPS tracker
sudo tee /etc/systemd/system/sms-gps.service << 'EOF'
[Unit]
Description=SMS GPS Tracker
After=network.target mosquitto.service

[Service]
WorkingDirectory=/home/pi/student-management-system/hardware/esp8266/gps_tracker_pi
ExecStart=/usr/bin/python3 gps_tracker_pi.py
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable sms-gps
sudo systemctl start sms-gps
```

---

## PART 2: ESP8266 Setup (Arduino IDE)

### 2.1 Install Arduino IDE
1. Download from: https://www.arduino.cc/en/software
2. Open Arduino IDE

### 2.2 Add ESP8266 Board Support
1. Go to File → Preferences
2. In "Additional Board Manager URLs", add:
   `https://arduino.esp8266.com/stable/package_esp8266com_index.json`
3. Go to Tools → Board → Board Manager
4. Search "ESP8266" and install "ESP8266 by ESP8266 Community"

### 2.3 Install Required Libraries
Go to Sketch → Include Library → Manage Libraries, install:
- **MFRC522** by GithubCommunity (v1.4.10+)
- **PubSubClient** by Nick O'Leary (v2.8+)
- **ArduinoJson** by Benoit Blanchon (v6.x)
- **LiquidCrystal I2C** by Frank de Brabander (v1.1.2+)

### 2.4 Board Settings
- Board: "NodeMCU 1.0 (ESP-12E Module)" or "Generic ESP8266 Module"
- Upload Speed: 115200
- Flash Size: 4MB
- CPU Frequency: 80 MHz

---

## PART 3: Wiring Diagrams

### 3.1 ESP8266 + RFID-RC522 (All 4 stations)
```
RFID-RC522    →  ESP8266 (NodeMCU)
──────────────────────────────────
SDA (SS)      →  D8  (GPIO15)
SCK           →  D5  (GPIO14)
MOSI          →  D7  (GPIO13)
MISO          →  D6  (GPIO12)
IRQ           →  Not connected
GND           →  GND
RST           →  D1  (GPIO5)
3.3V          →  3.3V
```
⚠️ IMPORTANT: RC522 runs on 3.3V only! Do NOT connect to 5V.

### 3.2 ESP8266 + LCD 16x2 I2C (Bus & Gate stations only)
```
LCD I2C       →  ESP8266 (NodeMCU)
──────────────────────────────────
VCC           →  VIN (5V from USB)
GND           →  GND
SDA           →  D2  (GPIO4)
SCL           →  D3  (GPIO0)
```
Note: LCD needs 5V but I2C signals work at 3.3V.

### 3.3 Complete Wiring - Bus Station (ESP8266 + RC522 + LCD)
```
          ┌─────────────────┐
          │   ESP8266        │
          │   (NodeMCU)      │
          │                  │
  RC522 ──┤ D8(SS)     3.3V ├── RC522 VCC
  RC522 ──┤ D5(SCK)    GND  ├── RC522 GND, LCD GND
  RC522 ──┤ D7(MOSI)   VIN  ├── LCD VCC (5V)
  RC522 ──┤ D6(MISO)        │
  RC522 ──┤ D1(RST)    D2   ├── LCD SDA
          │             D3   ├── LCD SCL
          │                  │
          │    [USB Power]   │
          └─────────────────┘
```

### 3.4 Complete Wiring - Classroom Station (ESP8266 + RC522 only)
```
          ┌─────────────────┐
          │   ESP8266        │
          │   (NodeMCU)      │
          │                  │
  RC522 ──┤ D8(SS)     3.3V ├── RC522 VCC
  RC522 ──┤ D5(SCK)    GND  ├── RC522 GND
  RC522 ──┤ D7(MOSI)        │
  RC522 ──┤ D6(MISO)        │
  RC522 ──┤ D1(RST)         │
          │                  │
          │    [USB Power]   │
          └─────────────────┘
```

---

## PART 4: Programming Each ESP8266

### 4.1 Before Uploading - Edit Configuration
In each .ino file, update these values:
```cpp
const char* WIFI_SSID     = "YourActualWiFiName";
const char* WIFI_PASSWORD = "YourActualWiFiPassword";
const char* MQTT_SERVER   = "192.168.x.x";  // Your Raspberry Pi's IP
```

### 4.2 Upload Steps
1. Connect ESP8266 to computer via USB
2. Select correct COM port in Tools → Port
3. Open the .ino file for that station
4. Click Upload (→ button)
5. Open Serial Monitor (115200 baud) to verify

### 4.3 Upload Order
1. First: Set up Raspberry Pi and verify web platform works
2. Then program ESP8266 modules one by one:
   - bus_station.ino → ESP8266 for bus
   - gate_station.ino → ESP8266 for school gate
   - class_station.ino → ESP8266 for classroom
   - canteen_station.ino → ESP8266 for canteen

---

## PART 5: Register NFC Cards

After all hardware is connected and running:

1. Login to web platform as admin (admin@school.om / password123)
2. Go to Students page
3. Edit each student and enter their NFC card UID
4. To find a card's UID: tap it on any RFID reader and check the Serial Monitor

The UID format is like: "A3B2C1D0" (8 hex characters for standard MIFARE cards)

---

## PART 6: Testing Flow

1. Start Raspberry Pi (server + MQTT + GPS auto-start)
2. Power on all ESP8266 modules
3. Test each station:
   - Tap card at Bus station → Check admin dashboard for bus attendance
   - Tap card at Gate → Check attendance shows "present" or "late"
   - Tap card at Classroom → Check class_in timestamp
   - Tap card at Canteen → Check vendor sales and student balance
4. Check parent dashboard → Location shows bus GPS
5. Check admin dashboard → All students, attendance summary, bus tracking

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| ESP8266 can't connect to WiFi | Check SSID/password, ensure 2.4GHz (not 5GHz) |
| MQTT connection failed | Check Pi IP address, ensure Mosquitto is running: `sudo systemctl status mosquitto` |
| RFID not reading cards | Check wiring, ensure 3.3V (not 5V), check SPI connections |
| LCD blank/no backlight | Check I2C address: try 0x27 or 0x3F. Run: `sudo i2cdetect -y 1` |
| GPS no data | Wait 1-2 minutes for satellite fix (needs outdoor/window view) |
| Web platform not accessible | Check Pi IP with `hostname -I`, ensure port 5000 is not blocked |
