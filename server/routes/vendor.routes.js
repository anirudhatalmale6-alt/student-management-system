const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('vendor'));

router.get('/sales', (req, res) => {
  try {
    const { from, to } = req.query;
    let query = `
      SELECT t.*, s.full_name as student_name, s.student_id_code
      FROM transactions t
      JOIN students s ON t.student_id = s.id
      WHERE t.vendor_id = ?
    `;
    const params = [req.user.id];
    if (from) {
      query += ' AND t.created_at >= ?';
      params.push(from);
    } else {
      query += " AND date(t.created_at) = date('now')";
    }
    if (to) {
      query += ' AND t.created_at <= ?';
      params.push(to);
    }
    query += ' ORDER BY t.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sales/summary', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN date(created_at) = date('now') AND status = 'completed' THEN amount END), 0) as today_total,
        COUNT(CASE WHEN date(created_at) = date('now') AND status = 'completed' THEN 1 END) as today_count,
        COALESCE(SUM(CASE WHEN created_at >= date('now', '-7 days') AND status = 'completed' THEN amount END), 0) as week_total,
        COALESCE(SUM(CASE WHEN created_at >= date('now', 'start of month') AND status = 'completed' THEN amount END), 0) as month_total
      FROM transactions WHERE vendor_id = ?
    `).get(req.user.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sales/daily', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT date(created_at) as date, SUM(amount) as total, COUNT(*) as count
      FROM transactions
      WHERE vendor_id = ? AND status = 'completed' AND created_at >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date
    `).all(req.user.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/balance', (req, res) => {
  try {
    const row = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as balance FROM transactions WHERE vendor_id = ? AND status = 'completed'"
    ).get(req.user.id);
    res.json({ balance: row.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/menu', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM menu_items WHERE vendor_id = ? ORDER BY category, item_name').all(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/menu', (req, res) => {
  try {
    const { item_name, price, category } = req.body;
    const result = db.prepare(
      'INSERT INTO menu_items (vendor_id, item_name, price, category) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, item_name, price, category || 'other');
    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/menu/:id', (req, res) => {
  try {
    const { item_name, price, category, available } = req.body;
    db.prepare(
      'UPDATE menu_items SET item_name=?, price=?, category=?, available=? WHERE id=? AND vendor_id=?'
    ).run(item_name, price, category, available ? 1 : 0, req.params.id, req.user.id);
    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/menu/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM menu_items WHERE id = ? AND vendor_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
