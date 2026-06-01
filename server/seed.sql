-- Password for all demo users: password123 (bcrypt hash)
-- $2b$10$8KzQz7QGq5Nh0v5Q5y5z5OJ5Q5y5z5OJ5Q5y5z5OJ5Q5y5z5OJ5Q
-- We'll insert hashed passwords from the app instead

-- Users will be seeded from seed.js (needs bcrypt)
-- This file contains non-user seed data

-- Bus Routes
INSERT INTO bus_routes (route_name, bus_plate, capacity) VALUES
('Route A - Al Khuwair', 'OM-1234', 40),
('Route B - Ruwi', 'OM-5678', 35),
('Route C - Seeb', 'OM-9012', 40);

-- Menu Items (will be linked to vendor after user seed)
-- Inserted from seed.js
