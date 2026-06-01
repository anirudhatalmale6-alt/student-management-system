MQTT_BROKER = "localhost"
MQTT_PORT = 1883

# Change this for each reader device
# Options: "bus", "gate", "classroom", "pos"
TAP_POINT = "gate"

# Unique device ID for this reader
DEVICE_ID = "reader_gate_01"

# For POS mode, the vendor user ID
VENDOR_ID = 1

# GPS settings
GPS_BUS_ROUTE_ID = 1
GPS_INTERVAL = 10  # seconds between GPS updates

# IR sensor GPIO pins
IR_SENSOR_IN_PIN = 17
IR_SENSOR_OUT_PIN = 27
IR_LOCATION = "main_gate"

# School start time (for late detection)
SCHOOL_START_HOUR = 7
SCHOOL_START_MINUTE = 30
