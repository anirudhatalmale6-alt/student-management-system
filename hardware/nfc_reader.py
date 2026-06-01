#!/usr/bin/env python3
"""
NFC Card Reader - Raspberry Pi
Reads MFRC522 NFC/RFID cards and publishes to MQTT.
Configure TAP_POINT in config.py: bus, gate, classroom, or pos
"""
import time
import json
import signal
import sys
import paho.mqtt.client as mqtt

try:
    from mfrc522 import SimpleMFRC522
    HARDWARE_MODE = True
except ImportError:
    HARDWARE_MODE = False
    print("[WARN] MFRC522 not available - running in simulation mode")

from config import MQTT_BROKER, MQTT_PORT, TAP_POINT, DEVICE_ID

reader = SimpleMFRC522() if HARDWARE_MODE else None

client = mqtt.Client()
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_start()

topic = f"school/nfc/{TAP_POINT}/{DEVICE_ID}"

def cleanup(sig, frame):
    print("\nShutting down NFC reader...")
    client.loop_stop()
    client.disconnect()
    if HARDWARE_MODE:
        import RPi.GPIO as GPIO
        GPIO.cleanup()
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

print(f"NFC Reader started - Mode: {TAP_POINT}")
print(f"Publishing to: {topic}")
print("Waiting for NFC card...")

last_uid = None
last_time = 0

while True:
    try:
        if HARDWARE_MODE:
            uid, text = reader.read_no_block()
            if uid is None:
                time.sleep(0.5)
                continue
            uid_hex = format(uid, 'X')[:8]
        else:
            uid_hex = input("\nEnter NFC UID (or 'q' to quit): ").strip().upper()
            if uid_hex == 'Q':
                cleanup(None, None)

        now = time.time()
        if uid_hex == last_uid and (now - last_time) < 3:
            continue
        last_uid = uid_hex
        last_time = now

        payload = {
            "uid": uid_hex,
            "direction": "in",
            "ts": int(now)
        }

        if TAP_POINT == "pos":
            if not HARDWARE_MODE:
                try:
                    amount = float(input("Enter amount (OMR): "))
                    item = input("Enter item name: ").strip()
                    payload["amount"] = amount
                    payload["item"] = item
                except ValueError:
                    print("Invalid amount")
                    continue
            else:
                payload["amount"] = 0.500
                payload["item"] = "Canteen Purchase"

        result = client.publish(topic, json.dumps(payload), qos=1)
        print(f"[{time.strftime('%H:%M:%S')}] Card: {uid_hex} | Point: {TAP_POINT} | Direction: {payload['direction']}")

        if TAP_POINT == "pos":
            cmd_topic = f"school/cmd/pos/{DEVICE_ID}"
            def on_message(client, userdata, msg):
                data = json.loads(msg.payload)
                if data["action"] == "approve":
                    print(f"  APPROVED - {data.get('studentName', '')} | Balance: {data.get('balance', '')} OMR")
                else:
                    print(f"  DECLINED - Reason: {data.get('reason', 'unknown')}")

            client.subscribe(cmd_topic)
            client.on_message = on_message

        if HARDWARE_MODE:
            time.sleep(2)

    except Exception as e:
        print(f"Error: {e}")
        time.sleep(1)
