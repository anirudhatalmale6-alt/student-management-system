#!/usr/bin/env python3
"""
GPS Tracker - Runs on Raspberry Pi 3
Reads NEO-6M GPS module via serial and publishes to MQTT.
Connect: GPS TX -> Pi RX (GPIO15), GPS VCC -> 3.3V, GPS GND -> GND
"""
import json
import time
import serial
import paho.mqtt.client as mqtt

# Configuration
MQTT_BROKER = "localhost"  # Pi runs the MQTT broker locally
MQTT_PORT = 1883
BUS_ROUTE_ID = 1  # Change per bus: 1, 2, or 3
GPS_SERIAL_PORT = "/dev/serial0"  # Raspberry Pi UART
GPS_BAUD_RATE = 9600
PUBLISH_INTERVAL = 5  # seconds between GPS updates

def parse_nmea_gga(sentence):
    """Parse GPGGA/GNGGA sentence for lat/lon/speed."""
    parts = sentence.split(",")
    if len(parts) < 10:
        return None

    try:
        # Latitude
        raw_lat = float(parts[2])
        lat_deg = int(raw_lat / 100)
        lat_min = raw_lat - (lat_deg * 100)
        latitude = lat_deg + (lat_min / 60)
        if parts[3] == "S":
            latitude = -latitude

        # Longitude
        raw_lon = float(parts[4])
        lon_deg = int(raw_lon / 100)
        lon_min = raw_lon - (lon_deg * 100)
        longitude = lon_deg + (lon_min / 60)
        if parts[5] == "W":
            longitude = -longitude

        return {"latitude": latitude, "longitude": longitude}
    except (ValueError, IndexError):
        return None


def parse_nmea_rmc(sentence):
    """Parse GPRMC/GNRMC sentence for speed."""
    parts = sentence.split(",")
    if len(parts) < 8:
        return None
    try:
        speed_knots = float(parts[7]) if parts[7] else 0
        speed_kmh = speed_knots * 1.852
        return {"speed": round(speed_kmh, 1)}
    except (ValueError, IndexError):
        return None


def main():
    print(f"=== GPS Tracker for Bus Route {BUS_ROUTE_ID} ===")

    # Connect MQTT
    client = mqtt.Client(client_id=f"gps-pi-{BUS_ROUTE_ID}")
    client.connect(MQTT_BROKER, MQTT_PORT)
    client.loop_start()
    print("MQTT connected")

    # Open GPS serial
    try:
        gps_serial = serial.Serial(GPS_SERIAL_PORT, GPS_BAUD_RATE, timeout=1)
        print(f"GPS serial opened on {GPS_SERIAL_PORT}")
    except Exception as e:
        print(f"Could not open GPS serial: {e}")
        print("Running in simulation mode (Muscat coordinates)")
        gps_serial = None

    latitude = 23.5880
    longitude = 58.3829
    speed = 0
    last_publish = 0

    while True:
        try:
            if gps_serial and gps_serial.in_waiting:
                line = gps_serial.readline().decode("ascii", errors="ignore").strip()

                if line.startswith("$GPGGA") or line.startswith("$GNGGA"):
                    pos = parse_nmea_gga(line)
                    if pos:
                        latitude = pos["latitude"]
                        longitude = pos["longitude"]

                elif line.startswith("$GPRMC") or line.startswith("$GNRMC"):
                    spd = parse_nmea_rmc(line)
                    if spd:
                        speed = spd["speed"]

            elif not gps_serial:
                # Simulation: small random movement around Muscat
                import random
                latitude += random.uniform(-0.001, 0.001)
                longitude += random.uniform(-0.001, 0.001)
                speed = random.uniform(20, 60)

            now = time.time()
            if now - last_publish >= PUBLISH_INTERVAL:
                payload = json.dumps({
                    "bus_route_id": BUS_ROUTE_ID,
                    "latitude": round(latitude, 6),
                    "longitude": round(longitude, 6),
                    "speed": round(speed, 1),
                })
                client.publish("school/gps/location", payload)
                print(f"GPS: lat={latitude:.6f}, lon={longitude:.6f}, speed={speed:.1f} km/h")
                last_publish = now

            time.sleep(0.1)

        except KeyboardInterrupt:
            print("\nStopping GPS tracker...")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(1)

    client.loop_stop()
    client.disconnect()
    if gps_serial:
        gps_serial.close()


if __name__ == "__main__":
    main()
