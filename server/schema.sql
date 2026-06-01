CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('parent', 'admin', 'vendor', 'driver')),
    full_name     TEXT NOT NULL,
    phone         TEXT,
    pos_number    TEXT,
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bus_routes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    route_name  TEXT NOT NULL,
    driver_id   INTEGER REFERENCES users(id),
    bus_plate   TEXT,
    capacity    INTEGER DEFAULT 40,
    is_active   INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS students (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id_code TEXT UNIQUE NOT NULL,
    full_name       TEXT NOT NULL,
    class_name      TEXT NOT NULL,
    nfc_card_uid    TEXT UNIQUE,
    card_balance    REAL DEFAULT 0.000,
    card_blocked    INTEGER DEFAULT 0,
    spending_limit  REAL DEFAULT 5.000,
    parent_id       INTEGER REFERENCES users(id),
    bus_route_id    INTEGER REFERENCES bus_routes(id),
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nfc_taps (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id  INTEGER NOT NULL REFERENCES students(id),
    tap_point   TEXT NOT NULL CHECK (tap_point IN ('bus', 'gate', 'classroom', 'pos')),
    tap_type    TEXT NOT NULL CHECK (tap_type IN ('in', 'out')),
    device_id   TEXT,
    tapped_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_nfc_taps_student_date ON nfc_taps (student_id, tapped_at);
CREATE INDEX IF NOT EXISTS idx_nfc_taps_point_date ON nfc_taps (tap_point, tapped_at);

CREATE TABLE IF NOT EXISTS attendance (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id  INTEGER NOT NULL REFERENCES students(id),
    date        TEXT NOT NULL DEFAULT (date('now')),
    gate_in     TEXT,
    gate_out    TEXT,
    bus_in      TEXT,
    bus_out     TEXT,
    class_in    TEXT,
    status      TEXT DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late')),
    UNIQUE(student_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date);

CREATE TABLE IF NOT EXISTS transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      INTEGER NOT NULL REFERENCES students(id),
    vendor_id       INTEGER NOT NULL REFERENCES users(id),
    amount          REAL NOT NULL,
    item_name       TEXT,
    status          TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'declined', 'refunded')),
    declined_reason TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transactions_student ON transactions (student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_vendor ON transactions (vendor_id, created_at);

CREATE TABLE IF NOT EXISTS menu_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id   INTEGER NOT NULL REFERENCES users(id),
    item_name   TEXT NOT NULL,
    price       REAL NOT NULL,
    category    TEXT,
    available   INTEGER DEFAULT 1,
    is_healthy  INTEGER DEFAULT 0,
    date        TEXT DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS gps_locations (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id   INTEGER REFERENCES students(id),
    bus_route_id INTEGER REFERENCES bus_routes(id),
    latitude     REAL NOT NULL,
    longitude    REAL NOT NULL,
    speed        REAL,
    recorded_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gps_latest ON gps_locations (student_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_bus ON gps_locations (bus_route_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS sensor_counts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    location    TEXT NOT NULL,
    count_in    INTEGER DEFAULT 0,
    count_out   INTEGER DEFAULT 0,
    reset_date  TEXT DEFAULT (date('now')),
    recorded_at TEXT DEFAULT (datetime('now')),
    UNIQUE(location, reset_date)
);

CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    is_read     INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read);
