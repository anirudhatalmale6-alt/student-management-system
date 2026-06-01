const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('parent'));

router.get('/children', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT s.*, b.route_name,
        (SELECT status FROM attendance WHERE student_id = s.id AND date = date('now') LIMIT 1) as today_status,
        (SELECT gate_in FROM attendance WHERE student_id = s.id AND date = date('now') LIMIT 1) as today_gate_in
      FROM students s
      LEFT JOIN bus_routes b ON s.bus_route_id = b.id
      WHERE s.parent_id = ?
      ORDER BY s.full_name
    `).all(req.user.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/children/:id/location', (req, res) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND parent_id = ?').get(req.params.id, req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const gps = db.prepare(`
      SELECT g.*, b.route_name FROM gps_locations g
      LEFT JOIN bus_routes b ON g.bus_route_id = b.id
      WHERE g.bus_route_id = ?
      ORDER BY g.recorded_at DESC LIMIT 1
    `).get(student.bus_route_id);
    res.json(gps || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/children/:id/attendance', (req, res) => {
  try {
    const student = db.prepare('SELECT id FROM students WHERE id = ? AND parent_id = ?').get(req.params.id, req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { from, to } = req.query;
    let query = 'SELECT * FROM attendance WHERE student_id = ?';
    const params = [req.params.id];
    if (from) {
      query += ' AND date >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND date <= ?';
      params.push(to);
    }
    query += ' ORDER BY date DESC LIMIT 30';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/children/:id/spending', (req, res) => {
  try {
    const student = db.prepare('SELECT id FROM students WHERE id = ? AND parent_id = ?').get(req.params.id, req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { from, to } = req.query;
    let query = "SELECT * FROM transactions WHERE student_id = ? AND status = 'completed'";
    const params = [req.params.id];
    if (from) {
      query += ' AND created_at >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND created_at <= ?';
      params.push(to);
    }
    query += ' ORDER BY created_at DESC LIMIT 50';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/children/:id/spending/summary', (req, res) => {
  try {
    const student = db.prepare('SELECT id FROM students WHERE id = ? AND parent_id = ?').get(req.params.id, req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const row = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN date(created_at) = date('now') THEN amount END), 0) as today,
        COALESCE(SUM(CASE WHEN created_at >= date('now', '-7 days') THEN amount END), 0) as this_week,
        COALESCE(SUM(CASE WHEN created_at >= date('now', 'start of month') THEN amount END), 0) as this_month
      FROM transactions
      WHERE student_id = ? AND status = 'completed'
    `).get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/children/:id/card', (req, res) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND parent_id = ?').get(req.params.id, req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (req.body.card_blocked !== undefined) {
      db.prepare('UPDATE students SET card_blocked = ? WHERE id = ?').run(req.body.card_blocked ? 1 : 0, req.params.id);
      const action = req.body.card_blocked ? 'blocked' : 'unblocked';
      db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
        req.user.id, `Card ${action}`, `You have ${action} ${student.full_name}'s card`
      );
    }
    if (req.body.spending_limit !== undefined) {
      db.prepare('UPDATE students SET spending_limit = ? WHERE id = ?').run(req.body.spending_limit, req.params.id);
    }

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/children/:id/topup', (req, res) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND parent_id = ?').get(req.params.id, req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    db.prepare('UPDATE students SET card_balance = card_balance + ? WHERE id = ?').run(amount, req.params.id);
    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);

    db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
      req.user.id, 'Top-up successful', `Added ${amount} OMR to ${student.full_name}'s card. New balance: ${updated.card_balance} OMR`
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
