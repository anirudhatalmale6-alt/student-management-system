# Student Management System

Final Year Project - Middle East College, Department of Computing & Electronics Engineering

Track attendance, expenses, and location using NFC cards, GPS, and IoT sensors.

## Features

- **4 User Dashboards**: Admin, Parent, Vendor, Bus Driver
- **NFC Card System**: Student cards for attendance and payments
- **GPS Tracking**: Real-time bus location on map
- **IR Sensors**: Automatic counting at gates and bus doors
- **Real-time Sync**: MQTT + WebSocket for live updates
- **Expense Control**: Parents set daily limits, top up balance, block/unblock cards

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO, SQLite
- **Frontend**: React, Tailwind CSS, Leaflet Maps, Recharts
- **IoT**: MQTT (Mosquitto), Raspberry Pi, Python
- **Hardware**: MFRC522 NFC Reader, NEO-6M GPS, IR Sensors

## Quick Start

### 1. Install Dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Set Up Database

```bash
cd server
node seed.js
```

### 3. Build Frontend

```bash
cd client
npx vite build
```

### 4. Start Server

```bash
cd server
node server.js
```

Open http://localhost:5000 in your browser.

### 5. Install MQTT Broker (for hardware integration)

```bash
# On Raspberry Pi or server:
sudo apt install mosquitto mosquitto-clients
```

## Demo Login Credentials

| Role   | Email             | Password    |
|--------|-------------------|-------------|
| Admin  | admin@school.om   | password123 |
| Parent | ahmed@parent.om   | password123 |
| Vendor | vendor@school.om  | password123 |
| Driver | driver1@school.om | password123 |

## Hardware Setup (Raspberry Pi)

### Components Needed

1. Raspberry Pi 4 (4GB RAM)
2. MFRC522 NFC Reader x4
3. NFC Cards/Tags x10+
4. NEO-6M GPS Module
5. IR Sensors x4
6. 16x2 LCD Displays x2
7. Jumper wires, breadboards

### Wiring (MFRC522 to Raspberry Pi)

| MFRC522 | Raspberry Pi |
|---------|-------------|
| SDA     | GPIO 8 (CE0) |
| SCK     | GPIO 11 (SCLK) |
| MOSI    | GPIO 10 (MOSI) |
| MISO    | GPIO 9 (MISO) |
| GND     | GND |
| RST     | GPIO 25 |
| 3.3V    | 3.3V |

### Running Hardware Scripts

```bash
cd hardware
pip3 install -r requirements.txt

# NFC Reader (change TAP_POINT in config.py)
python3 nfc_reader.py

# GPS Tracker
python3 gps_tracker.py

# IR Counter
python3 ir_counter.py

# Full simulation (no hardware needed)
python3 simulator.py --fast
```

## MQTT Topics

| Topic | Description |
|-------|------------|
| school/nfc/bus/{deviceId} | Bus NFC tap events |
| school/nfc/gate/{deviceId} | Gate NFC tap events |
| school/nfc/classroom/{deviceId} | Classroom NFC tap events |
| school/nfc/pos/{deviceId} | POS payment events |
| school/gps/{busRouteId} | Bus GPS location updates |
| school/ir/{location} | IR sensor beam breaks |
| school/cmd/pos/{deviceId} | Server response to POS |

## Project Structure

```
student-management-system/
├── server/           # Node.js backend
│   ├── routes/       # API endpoints
│   ├── services/     # MQTT, attendance, transaction logic
│   ├── middleware/    # JWT authentication
│   ├── schema.sql    # Database schema
│   ├── seed.js       # Demo data
│   └── server.js     # Entry point
├── client/           # React frontend
│   └── src/
│       ├── pages/    # Dashboard pages
│       ├── components/  # Shared UI components
│       └── context/  # Auth context
├── hardware/         # Raspberry Pi scripts
│   ├── nfc_reader.py
│   ├── gps_tracker.py
│   ├── ir_counter.py
│   └── simulator.py
└── docker-compose.yml
```
