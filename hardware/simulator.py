#!/usr/bin/env python3
"""
Full System Simulator
Simulates a complete school day without any hardware.
Run this for demo/presentation purposes.

Usage: python3 simulator.py [--fast]
  --fast: Run simulation at 10x speed (3-second intervals)
"""
import time
import json
import sys
import random
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
FAST_MODE = "--fast" in sys.argv
INTERVAL = 1 if FAST_MODE else 5

# Student NFC UIDs (must match database seed data)
STUDENTS = [
    {"uid": "A1B2C3D4", "name": "Aiman Al-Raiisi", "bus": 1},
    {"uid": "E5F6G7H8", "name": "Sara Al-Raiisi", "bus": 1},
    {"uid": "I9J0K1L2", "name": "Omar Al-Balushi", "bus": 2},
    {"uid": "M3N4O5P6", "name": "Maryam Al-Balushi", "bus": 2},
    {"uid": "Q7R8S9T0", "name": "Yusuf Al-Hinai", "bus": 1},
    {"uid": "U1V2W3X4", "name": "Layla Al-Hinai", "bus": 1},
    {"uid": "Y5Z6A7B8", "name": "Hassan Al-Lawati", "bus": 3},
    {"uid": "C9D0E1F2", "name": "Noura Al-Lawati", "bus": 3},
    {"uid": "G3H4I5J6", "name": "Ali Al-Wahaibi", "bus": 2},
    {"uid": "K7L8M9N0", "name": "Zainab Al-Siyabi", "bus": 3},
]

# Muscat bus routes (lat, lng pairs)
BUS_ROUTES = {
    1: [(23.5880, 58.3829), (23.5900, 58.3850), (23.5920, 58.3870), (23.5940, 58.3890), (23.5960, 58.3910)],
    2: [(23.5800, 58.3900), (23.5820, 58.3920), (23.5840, 58.3940), (23.5860, 58.3960), (23.5880, 58.3980)],
    3: [(23.5700, 58.3700), (23.5720, 58.3720), (23.5740, 58.3740), (23.5760, 58.3760), (23.5780, 58.3780)],
}

MENU_ITEMS = [
    ("Chicken Sandwich", 0.500),
    ("Cheese Sandwich", 0.300),
    ("Samosa (3 pcs)", 0.200),
    ("Chips", 0.150),
    ("Juice Box", 0.200),
    ("Water Bottle", 0.100),
]

client = mqtt.Client()
client.connect(BROKER, PORT, 60)
client.loop_start()

def publish(topic, data):
    payload = json.dumps(data)
    client.publish(topic, payload, qos=1)
    print(f"  [{topic}] {json.dumps(data, indent=None)}")

def sim_bus_pickup():
    print("\n=== PHASE 1: Bus Pickup ===")
    for route_id, stops in BUS_ROUTES.items():
        route_students = [s for s in STUDENTS if s["bus"] == route_id]
        for i, stop in enumerate(stops):
            # GPS update
            publish(f"school/gps/{route_id}", {
                "lat": stop[0], "lng": stop[1],
                "speed": 30 + random.randint(0, 20),
                "ts": int(time.time())
            })
            time.sleep(INTERVAL)

            # Students boarding at this stop
            if i < len(route_students):
                student = route_students[i]
                publish(f"school/nfc/bus/reader_bus_{route_id}", {
                    "uid": student["uid"],
                    "direction": "in",
                    "ts": int(time.time())
                })
                publish(f"school/ir/bus_door_route_{chr(96+route_id)}", {
                    "direction": "in",
                    "ts": int(time.time())
                })
                time.sleep(INTERVAL)

def sim_gate_entry():
    print("\n=== PHASE 2: School Gate Entry ===")
    for student in STUDENTS:
        publish("school/nfc/gate/reader_gate_01", {
            "uid": student["uid"],
            "direction": "in",
            "ts": int(time.time())
        })
        publish("school/ir/main_gate", {
            "direction": "in",
            "ts": int(time.time())
        })
        time.sleep(INTERVAL)

def sim_classroom_entry():
    print("\n=== PHASE 3: Classroom Entry ===")
    for student in STUDENTS:
        publish("school/nfc/classroom/reader_class_01", {
            "uid": student["uid"],
            "direction": "in",
            "ts": int(time.time())
        })
        time.sleep(INTERVAL)

def sim_canteen():
    print("\n=== PHASE 4: Canteen Break ===")
    canteen_students = random.sample(STUDENTS, min(6, len(STUDENTS)))
    for student in canteen_students:
        item, price = random.choice(MENU_ITEMS)
        publish("school/nfc/pos/reader_pos_01", {
            "uid": student["uid"],
            "amount": price,
            "item": item,
            "ts": int(time.time())
        })
        time.sleep(INTERVAL * 2)

def sim_gps_tracking():
    print("\n=== PHASE 5: Continuous GPS Updates ===")
    for _ in range(5):
        for route_id, stops in BUS_ROUTES.items():
            stop = random.choice(stops)
            lat = stop[0] + random.uniform(-0.005, 0.005)
            lng = stop[1] + random.uniform(-0.005, 0.005)
            publish(f"school/gps/{route_id}", {
                "lat": round(lat, 7),
                "lng": round(lng, 7),
                "speed": random.randint(0, 50),
                "ts": int(time.time())
            })
        time.sleep(INTERVAL * 2)

def sim_gate_exit():
    print("\n=== PHASE 6: School Gate Exit ===")
    for student in STUDENTS:
        publish("school/nfc/gate/reader_gate_01", {
            "uid": student["uid"],
            "direction": "out",
            "ts": int(time.time())
        })
        publish("school/ir/main_gate", {
            "direction": "out",
            "ts": int(time.time())
        })
        time.sleep(INTERVAL)

print("=" * 60)
print("  STUDENT MANAGEMENT SYSTEM - FULL DAY SIMULATOR")
print(f"  Mode: {'FAST (1s intervals)' if FAST_MODE else 'NORMAL (5s intervals)'}")
print(f"  Students: {len(STUDENTS)}")
print(f"  Bus Routes: {len(BUS_ROUTES)}")
print("=" * 60)
print("\nStarting simulation in 3 seconds...")
time.sleep(3)

try:
    sim_bus_pickup()
    sim_gate_entry()
    sim_classroom_entry()
    print(f"\n--- Break time (waiting {INTERVAL * 3}s) ---")
    time.sleep(INTERVAL * 3)
    sim_canteen()
    sim_gps_tracking()
    sim_gate_exit()
    print("\n" + "=" * 60)
    print("  SIMULATION COMPLETE!")
    print("  Check the web dashboard to see all updates.")
    print("=" * 60)
except KeyboardInterrupt:
    print("\nSimulation stopped by user.")
finally:
    client.loop_stop()
    client.disconnect()
