const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin'));

router.get('/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const total_students = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
    const present_today = db.prepare("SELECT COUNT(*) as c FROM attendance WHERE date = ? AND status = 'present'").get(today).c;
    const late_today = db.prepare("SELECT COUNT(*) as c FROM attendance WHERE date = ? AND status = 'late'").get(today).c;
    const absent_today = total_students - present_today - late_today;
    const active_buses = db.prepare('SELECT COUNT(*) as c FROM bus_routes WHERE is_active = 1').get().c;
    res.json({ total_students, present_today, late_today, absent_today, active_buses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/students', (req, res) => {
  try {
    const { class_name, search } = req.query;
    let query = `
      SELECT s.*, u.full_name as parent_name, b.route_name
      FROM students s
      LEFT JOIN users u ON s.parent_id = u.id
      LEFT JOIN bus_routes b ON s.bus_route_id = b.id
      WHERE 1=1
    `;
    const params = [];
    if (class_name) {
      query += ' AND s.class_name = ?';
      params.push(class_name);
    }
    if (search) {
      query += ' AND (s.full_name LIKE ? OR s.student_id_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY s.class_name, s.full_name';
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/students/:id', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT s.*, u.full_name as parent_name, b.route_name
      FROM students s
      LEFT JOIN users u ON s.parent_id = u.id
      LEFT JOIN bus_routes b ON s.bus_route_id = b.id
      WHERE s.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/students', (req, res) => {
  try {
    const { student_id_code, full_name, class_name, nfc_card_uid, parent_id, bus_route_id } = req.body;
    const result = db.prepare(
      'INSERT INTO students (student_id_code, full_name, class_name, nfc_card_uid, parent_id, bus_route_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(student_id_code, full_name, class_name, nfc_card_uid || null, parent_id || null, bus_route_id || null);
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/students/:id', (req, res) => {
  try {
    const { full_name, class_name, nfc_card_uid, parent_id, bus_route_id } = req.body;
    db.prepare(
      'UPDATE students SET full_name=?, class_name=?, nfc_card_uid=?, parent_id=?, bus_route_id=? WHERE id=?'
    ).run(full_name, class_name, nfc_card_uid, parent_id, bus_route_id, req.params.id);
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attendance', (req, res) => {
  try {
    const { date, class_name } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    let query = `
      SELECT a.*, s.full_name, s.student_id_code, s.class_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.date = ?
    `;
    const params = [targetDate];
    if (class_name) {
      query += ' AND s.class_name = ?';
      params.push(class_name);
    }
    query += ' ORDER BY s.class_name, s.full_name';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attendance/summary', (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const rows = db.prepare(`
      SELECT s.class_name,
        COUNT(*) as total,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'absent' OR a.id IS NULL THEN 1 ELSE 0 END) as absent
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
      GROUP BY s.class_name
      ORDER BY s.class_name
    `).all(targetDate);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attendance/export', (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const rows = db.prepare(`
      SELECT s.student_id_code, s.full_name, s.class_name,
        COALESCE(a.status, 'absent') as status,
        a.gate_in, a.gate_out, a.bus_in, a.class_in
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
      ORDER BY s.class_name, s.full_name
    `).all(targetDate);

    let csv = 'Student ID,Name,Class,Status,Gate In,Gate Out,Bus In,Class In\n';
    rows.forEach(r => {
      csv += `${r.student_id_code},${r.full_name},${r.class_name},${r.status},${r.gate_in || ''},${r.gate_out || ''},${r.bus_in || ''},${r.class_in || ''}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${targetDate}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/buses', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT b.*, u.full_name as driver_name,
        (SELECT COUNT(*) FROM students WHERE bus_route_id = b.id) as student_count
      FROM bus_routes b
      LEFT JOIN users u ON b.driver_id = u.id
      WHERE b.is_active = 1
      ORDER BY b.route_name
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/gps/live', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT g.*, b.route_name, b.bus_plate
      FROM gps_locations g
      JOIN bus_routes b ON g.bus_route_id = b.id
      WHERE g.recorded_at > datetime('now', '-1 hour')
      AND g.id IN (
        SELECT MAX(id) FROM gps_locations
        WHERE bus_route_id IS NOT NULL
        GROUP BY bus_route_id
      )
    `).all();
    rows.forEach(r => {
      r.students = db.prepare(
        'SELECT id, full_name, student_id_code, class_name FROM students WHERE bus_route_id = ?'
      ).all(r.bus_route_id);
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sensor-counts', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    res.json(db.prepare('SELECT * FROM sensor_counts WHERE reset_date = ? ORDER BY location').all(today));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/classes', (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT class_name FROM students ORDER BY class_name').all();
    res.json(rows.map(r => r.class_name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
