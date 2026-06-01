const mqtt = require('mqtt');
const { getStudentByNfc, processNfcTap } = require('./attendance.service');
const { processPosTap } = require('./transaction.service');
const db = require('../db');

let io = null;
let client = null;

function init(socketIo) {
  io = socketIo;

  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  client = mqtt.connect(brokerUrl, { reconnectPeriod: 5000 });

  client.on('connect', () => {
    console.log('MQTT connected to', brokerUrl);
    client.subscribe('school/nfc/#');
    client.subscribe('school/gps/#');
    client.subscribe('school/ir/#');
  });

  client.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      const parts = topic.split('/');

      if (parts[1] === 'nfc') {
        handleNfc(parts[2], parts[3], data);
      } else if (parts[1] === 'gps') {
        handleGps(parts[2], data);
      } else if (parts[1] === 'ir') {
        handleIr(parts[2], data);
      }
    } catch (err) {
      console.error('MQTT message error:', err.message);
    }
  });

  client.on('error', (err) => {
    console.error('MQTT connection error:', err.message);
  });
}

function handleNfc(tapPoint, deviceId, data) {
  const student = getStudentByNfc(data.uid);
  if (!student) {
    console.log('Unknown NFC card:', data.uid);
    return;
  }

  if (tapPoint === 'pos') {
    const vendor = db.prepare("SELECT id FROM users WHERE role = 'vendor' LIMIT 1").get();
    if (!vendor) return;

    const result = processPosTap(student, vendor.id, data.amount || 0, data.item || null);

    io.to(`vendor_${vendor.id}`).emit('pos:transaction', {
      ...result,
      student_name: student.full_name,
      student_id_code: student.student_id_code,
    });

    if (student.parent_id) {
      io.to(`user_${student.parent_id}`).emit('spending:update', {
        student_id: student.id,
        ...result,
      });
    }

    if (client) {
      client.publish(`school/cmd/pos/${deviceId}`, JSON.stringify({
        action: result.success ? 'approve' : 'decline',
        reason: result.reason || '',
        studentName: student.full_name,
        balance: result.new_balance,
      }));
    }
  } else {
    const direction = data.direction || 'in';
    const result = processNfcTap(student.id, tapPoint, direction, deviceId);

    io.to('admin').emit('attendance:update', {
      ...result,
      student_name: student.full_name,
      student_id_code: student.student_id_code,
      class_name: student.class_name,
    });

    if (student.parent_id) {
      io.to(`user_${student.parent_id}`).emit('attendance:update', {
        student_id: student.id,
        student_name: student.full_name,
        tap_point: tapPoint,
        direction,
        timestamp: result.timestamp,
      });
    }
  }
}

function handleGps(busRouteId, data) {
  db.prepare(
    'INSERT INTO gps_locations (bus_route_id, latitude, longitude, speed) VALUES (?, ?, ?, ?)'
  ).run(busRouteId, data.lat, data.lng, data.speed || 0);

  const routeInfo = db.prepare('SELECT route_name, bus_plate FROM bus_routes WHERE id = ?').get(busRouteId);

  io.to('admin').emit('gps:update', {
    bus_route_id: parseInt(busRouteId),
    latitude: data.lat,
    longitude: data.lng,
    speed: data.speed || 0,
    route_name: routeInfo?.route_name,
    bus_plate: routeInfo?.bus_plate,
  });

  const students = db.prepare('SELECT parent_id FROM students WHERE bus_route_id = ? AND parent_id IS NOT NULL').all(busRouteId);
  students.forEach(s => {
    io.to(`user_${s.parent_id}`).emit('gps:update', {
      bus_route_id: parseInt(busRouteId),
      latitude: data.lat,
      longitude: data.lng,
      speed: data.speed || 0,
    });
  });
}

function handleIr(location, data) {
  const today = new Date().toISOString().split('T')[0];
  const direction = data.direction || 'in';
  const field = direction === 'in' ? 'count_in' : 'count_out';

  const existing = db.prepare('SELECT * FROM sensor_counts WHERE location = ? AND reset_date = ?').get(location, today);
  if (!existing) {
    db.prepare(`INSERT INTO sensor_counts (location, ${field}, reset_date) VALUES (?, 1, ?)`).run(location, today);
  } else {
    db.prepare(`UPDATE sensor_counts SET ${field} = ${field} + 1 WHERE location = ? AND reset_date = ?`).run(location, today);
  }

  const updated = db.prepare('SELECT * FROM sensor_counts WHERE location = ? AND reset_date = ?').get(location, today);
  io.to('admin').emit('sensor:update', updated);
}

function getClient() {
  return client;
}

module.exports = { init, getClient };
