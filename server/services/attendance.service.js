const db = require('../db');

function processNfcTap(studentId, tapPoint, direction, deviceId) {
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  db.prepare(
    'INSERT INTO nfc_taps (student_id, tap_point, tap_type, device_id, tapped_at) VALUES (?, ?, ?, ?, ?)'
  ).run(studentId, tapPoint, direction, deviceId, now);

  db.prepare(
    "INSERT OR IGNORE INTO attendance (student_id, date, status) VALUES (?, ?, 'absent')"
  ).run(studentId, today);

  const timeField = getTimeField(tapPoint, direction);
  if (timeField) {
    db.prepare(`UPDATE attendance SET ${timeField} = ? WHERE student_id = ? AND date = ?`).run(now, studentId, today);
  }

  if ((tapPoint === 'gate' || tapPoint === 'classroom') && direction === 'in') {
    const d = new Date(now);
    const schoolStart = new Date(d);
    schoolStart.setHours(7, 30, 0, 0);
    const status = d <= schoolStart ? 'present' : 'late';
    db.prepare(
      "UPDATE attendance SET status = ? WHERE student_id = ? AND date = ? AND status = 'absent'"
    ).run(status, studentId, today);
  }

  return { studentId, tapPoint, direction, timestamp: now };
}

function getTimeField(tapPoint, direction) {
  const map = {
    'gate_in': 'gate_in',
    'gate_out': 'gate_out',
    'bus_in': 'bus_in',
    'bus_out': 'bus_out',
    'classroom_in': 'class_in',
  };
  return map[`${tapPoint}_${direction}`] || null;
}

function getStudentByNfc(uid) {
  return db.prepare('SELECT * FROM students WHERE nfc_card_uid = ?').get(uid) || null;
}

module.exports = { processNfcTap, getStudentByNfc };
