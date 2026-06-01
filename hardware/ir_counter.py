#!/usr/bin/env python3
"""
IR Sensor Counter - Raspberry Pi
Counts beam breaks at bus doors or school gates.
Uses two IR sensors: one for IN direction, one for OUT direction.
"""
import time
import json
import signal
import sys
import paho.mqtt.client as mqtt

try:
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)
    HARDWARE_MODE = True
except ImportError:
    HARDWARE_MODE = False
    print("[WARN] RPi.GPIO not available - running in simulation mode")

from config import (MQTT_BROKER, MQTT_PORT, IR_SENSOR_IN_PIN,
                    IR_SENSOR_OUT_PIN, IR_LOCATION)

client = mqtt.Client()
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_start()

topic = f"school/ir/{IR_LOCATION}"

def cleanup(sig, frame):
    print("\nShutting down IR counter...")
    client.loop_stop()
    client.disconnect()
    if HARDWARE_MODE:
        GPIO.cleanup()
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

count_in = 0
count_out = 0

if HARDWARE_MODE:
    GPIO.setup(IR_SENSOR_IN_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    GPIO.setup(IR_SENSOR_OUT_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)

    def on_beam_break_in(channel):
        global count_in
        count_in += 1
        payload = {"direction": "in", "ts": int(time.time())}
        client.publish(topic, json.dumps(payload), qos=1)
        print(f"[{time.strftime('%H:%M:%S')}] IN detected at {IR_LOCATION} (Total IN: {count_in})")

    def on_beam_break_out(channel):
        global count_out
        count_out += 1
        payload = {"direction": "out", "ts": int(time.time())}
        client.publish(topic, json.dumps(payload), qos=1)
        print(f"[{time.strftime('%H:%M:%S')}] OUT detected at {IR_LOCATION} (Total OUT: {count_out})")

    GPIO.add_event_detect(IR_SENSOR_IN_PIN, GPIO.FALLING,
                         callback=on_beam_break_in, bouncetime=500)
    GPIO.add_event_detect(IR_SENSOR_OUT_PIN, GPIO.FALLING,
                         callback=on_beam_break_out, bouncetime=500)

    print(f"IR Counter started - Location: {IR_LOCATION}")
    print(f"IN sensor: GPIO {IR_SENSOR_IN_PIN} | OUT sensor: GPIO {IR_SENSOR_OUT_PIN}")
    print("Waiting for beam breaks...")

    while True:
        time.sleep(1)
else:
    print(f"IR Counter (simulation) - Location: {IR_LOCATION}")
    print("Commands: 'i' = IN, 'o' = OUT, 'q' = quit")

    while True:
        cmd = input("> ").strip().lower()
        if cmd == 'q':
            cleanup(None, None)
        elif cmd == 'i':
            count_in += 1
            payload = {"direction": "in", "ts": int(time.time())}
            client.publish(topic, json.dumps(payload), qos=1)
            print(f"IN: {count_in} | OUT: {count_out}")
        elif cmd == 'o':
            count_out += 1
            payload = {"direction": "out", "ts": int(time.time())}
            client.publish(topic, json.dumps(payload), qos=1)
            print(f"IN: {count_in} | OUT: {count_out}")
