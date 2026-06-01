#!/usr/bin/env python3
"""
GPS Tracker - Raspberry Pi
Reads NEO-6M GPS module via gpsd and publishes location to MQTT.
"""
import time
import json
import signal
import sys
import paho.mqtt.client as mqtt

try:
    import gpsd
    gpsd.connect()
    HARDWARE_MODE = True
except Exception:
    HARDWARE_MODE = False
    print("[WARN] GPSD not available - running in simulation mode")

from config import MQTT_BROKER, MQTT_PORT, GPS_BUS_ROUTE_ID, GPS_INTERVAL

client = mqtt.Client()
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_start()

topic = f"school/gps/{GPS_BUS_ROUTE_ID}"

def cleanup(sig, frame):
    print("\nShutting down GPS tracker...")
    client.loop_stop()
    client.disconnect()
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

print(f"GPS Tracker started - Bus Route: {GPS_BUS_ROUTE_ID}")
print(f"Publishing to: {topic} every {GPS_INTERVAL}s")

# Simulation: Muscat route coordinates
sim_route = [
    (23.5880, 58.3829), (23.5900, 58.3850), (23.5920, 58.3870),
    (23.5940, 58.3890), (23.5960, 58.3910), (23.5980, 58.3930),
    (23.6000, 58.3950), (23.5980, 58.3970), (23.5960, 58.3990),
    (23.5940, 58.4010), (23.5920, 58.3990), (23.5900, 58.3970),
]
sim_index = 0

while True:
    try:
        if HARDWARE_MODE:
            packet = gpsd.get_current()
            if packet.mode >= 2:
                lat = packet.lat
                lng = packet.lon
                speed = packet.hspeed * 3.6 if hasattr(packet, 'hspeed') else 0
            else:
                print("Waiting for GPS fix...")
                time.sleep(5)
                continue
        else:
            lat, lng = sim_route[sim_index % len(sim_route)]
            speed = 30 + (sim_index % 5) * 5
            sim_index += 1

        payload = {
            "lat": round(lat, 7),
            "lng": round(lng, 7),
            "speed": round(speed, 1),
            "ts": int(time.time())
        }

        client.publish(topic, json.dumps(payload), qos=0)
        print(f"[{time.strftime('%H:%M:%S')}] GPS: {payload['lat']}, {payload['lng']} | Speed: {payload['speed']} km/h")

        time.sleep(GPS_INTERVAL)

    except Exception as e:
        print(f"GPS Error: {e}")
        time.sleep(5)
