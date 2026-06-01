require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');
const fs = require('fs');
const path = require('path');

async function seed() {
  console.log('Running database schema...');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  console.log('Seeding users...');
  const hash = await bcrypt.hash('password123', 10);
  const insertUser = db.prepare('INSERT INTO users (email, password_hash, role, full_name, phone, pos_number) VALUES (?, ?, ?, ?, ?, ?)');

  const adminId = insertUser.run('admin@school.om', hash, 'admin', 'School Administrator', '+968-9900-1100', null).lastInsertRowid;
  const parent1Id = insertUser.run('ahmed@parent.om', hash, 'parent', 'Ahmed Al-Raiisi', '+968-9900-2200', null).lastInsertRowid;
  const parent2Id = insertUser.run('fatima@parent.om', hash, 'parent', 'Fatima Al-Balushi', '+968-9900-3300', null).lastInsertRowid;
  const parent3Id = insertUser.run('mohammed@parent.om', hash, 'parent', 'Mohammed Al-Hinai', '+968-9900-4400', null).lastInsertRowid;
  const parent4Id = insertUser.run('aisha@parent.om', hash, 'parent', 'Aisha Al-Lawati', '+968-9900-5500', null).lastInsertRowid;
  const vendorId = insertUser.run('vendor@school.om', hash, 'vendor', 'Canteen Manager', '+968-9900-6600', 'POS-001').lastInsertRowid;
  const driver1Id = insertUser.run('driver1@school.om', hash, 'driver', 'Salem Al-Jabri', '+968-9900-7700', null).lastInsertRowid;
  const driver2Id = insertUser.run('driver2@school.om', hash, 'driver', 'Khalid Al-Amri', '+968-9900-8800', null).lastInsertRowid;
  const driver3Id = insertUser.run('driver3@school.om', hash, 'driver', 'Rashid Al-Kindi', '+968-9900-9900', null).lastInsertRowid;

  console.log('Seeding bus routes...');
  const insertRoute = db.prepare('INSERT INTO bus_routes (route_name, driver_id, bus_plate, capacity) VALUES (?, ?, ?, ?)');
  const route1Id = insertRoute.run('Route A - Al Khuwair', driver1Id, 'OM-1234', 40).lastInsertRowid;
  const route2Id = insertRoute.run('Route B - Ruwi', driver2Id, 'OM-5678', 35).lastInsertRowid;
  const route3Id = insertRoute.run('Route C - Seeb', driver3Id, 'OM-9012', 40).lastInsertRowid;

  console.log('Seeding students...');
  const insertStudent = db.prepare(
    'INSERT INTO students (student_id_code, full_name, class_name, nfc_card_uid, card_balance, parent_id, bus_route_id, spending_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const students = [
    ['STU-001', 'Aiman Al-Raiisi', 'Grade 10A', 'A1B2C3D4', 15.000, parent1Id, route1Id],
    ['STU-002', 'Sara Al-Raiisi', 'Grade 8B', 'E5F6G7H8', 10.000, parent1Id, route1Id],
    ['STU-003', 'Omar Al-Balushi', 'Grade 10A', 'I9J0K1L2', 12.000, parent2Id, route2Id],
    ['STU-004', 'Maryam Al-Balushi', 'Grade 9A', 'M3N4O5P6', 8.000, parent2Id, route2Id],
    ['STU-005', 'Yusuf Al-Hinai', 'Grade 10A', 'Q7R8S9T0', 20.000, parent3Id, route1Id],
    ['STU-006', 'Layla Al-Hinai', 'Grade 7A', 'U1V2W3X4', 5.000, parent3Id, route1Id],
    ['STU-007', 'Hassan Al-Lawati', 'Grade 10A', 'Y5Z6A7B8', 18.000, parent4Id, route3Id],
    ['STU-008', 'Noura Al-Lawati', 'Grade 9A', 'C9D0E1F2', 11.000, parent4Id, route3Id],
    ['STU-009', 'Ali Al-Wahaibi', 'Grade 8B', 'G3H4I5J6', 7.500, parent1Id, route2Id],
    ['STU-010', 'Zainab Al-Siyabi', 'Grade 10A', 'K7L8M9N0', 14.000, parent2Id, route3Id],
    ['STU-011', 'Hamad Al-Busaidi', 'Grade 7A', 'O1P2Q3R4', 9.000, parent3Id, route1Id],
    ['STU-012', 'Ruqaya Al-Harthi', 'Grade 9A', 'S5T6U7V8', 16.000, parent4Id, route2Id],
    ['STU-013', 'Salim Al-Maskari', 'Grade 8B', 'W9X0Y1Z2', 6.000, parent1Id, route3Id],
    ['STU-014', 'Huda Al-Rawahi', 'Grade 10A', 'A3B4C5D6', 13.000, parent2Id, route1Id],
    ['STU-015', 'Tariq Al-Farsi', 'Grade 7A', 'E7F8G9H0', 10.500, parent3Id, route2Id],
    ['STU-016', 'Amina Al-Shukaili', 'Grade 9A', 'I1J2K3L4', 8.500, parent4Id, route3Id],
    ['STU-017', 'Ibrahim Al-Habsi', 'Grade 8B', 'M5N6O7P8', 19.000, parent1Id, route1Id],
    ['STU-018', 'Samira Al-Kharusi', 'Grade 10A', 'Q9R0S1T2', 4.500, parent2Id, route2Id],
    ['STU-019', 'Nasser Al-Ghafri', 'Grade 7A', 'U3V4W5X6', 11.500, parent3Id, route3Id],
    ['STU-020', 'Reem Al-Zadjali', 'Grade 9A', 'Y7Z8A9B0', 17.000, parent4Id, route1Id],
  ];

  const studentIds = [];
  for (const s of students) {
    const result = insertStudent.run(s[0], s[1], s[2], s[3], s[4], s[5], s[6], 5.000);
    studentIds.push(result.lastInsertRowid);
  }

  console.log('Seeding menu items...');
  const insertMenu = db.prepare('INSERT INTO menu_items (vendor_id, item_name, price, category) VALUES (?, ?, ?, ?)');
  const menuItems = [
    ['Chicken Sandwich', 0.500, 'meal'],
    ['Cheese Sandwich', 0.300, 'meal'],
    ['Rice with Chicken', 1.000, 'meal'],
    ['Samosa (3 pcs)', 0.200, 'snack'],
    ['Chips', 0.150, 'snack'],
    ['Chocolate Bar', 0.250, 'snack'],
    ['Water Bottle', 0.100, 'drink'],
    ['Juice Box', 0.200, 'drink'],
    ['Milk', 0.150, 'drink'],
    ['Fresh Fruit Cup', 0.350, 'snack'],
  ];
  for (const m of menuItems) {
    insertMenu.run(vendorId, m[0], m[1], m[2]);
  }

  console.log('Seeding attendance and transactions (7 days)...');
  const insertAttendance = db.prepare(
    "INSERT OR IGNORE INTO attendance (student_id, date, gate_in, status) VALUES (?, ?, ?, ?)"
  );
  const insertTransaction = db.prepare(
    "INSERT INTO transactions (student_id, vendor_id, amount, item_name, status, created_at) VALUES (?, ?, ?, ?, 'completed', ?)"
  );

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    for (const sid of studentIds) {
      const isPresent = Math.random() > 0.15;
      const isLate = isPresent && Math.random() > 0.8;

      if (isPresent) {
        const gateIn = new Date(date);
        gateIn.setHours(isLate ? 8 : 7, Math.floor(Math.random() * 30), 0);
        insertAttendance.run(sid, dateStr, gateIn.toISOString(), isLate ? 'late' : 'present');

        if (Math.random() > 0.3) {
          const amount = [0.150, 0.200, 0.250, 0.300, 0.500, 1.000][Math.floor(Math.random() * 6)];
          const txTime = new Date(date);
          txTime.setHours(10, Math.floor(Math.random() * 60), 0);
          const item = menuItems[Math.floor(Math.random() * menuItems.length)];
          insertTransaction.run(sid, vendorId, amount, item[0], txTime.toISOString());
        }
      }
    }
  }

  console.log('Seeding sensor counts...');
  const today = new Date().toISOString().split('T')[0];
  const insertSensor = db.prepare('INSERT INTO sensor_counts (location, count_in, count_out, reset_date) VALUES (?, ?, ?, ?)');
  insertSensor.run('main_gate', 18, 0, today);
  insertSensor.run('bus_door_route_a', 8, 0, today);
  insertSensor.run('bus_door_route_b', 6, 0, today);
  insertSensor.run('bus_door_route_c', 6, 0, today);

  console.log('\nSeed complete!');
  console.log('\nDemo Login Credentials:');
  console.log('Admin:   admin@school.om / password123');
  console.log('Parent:  ahmed@parent.om / password123');
  console.log('Vendor:  vendor@school.om / password123');
  console.log('Driver:  driver1@school.om / password123');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
