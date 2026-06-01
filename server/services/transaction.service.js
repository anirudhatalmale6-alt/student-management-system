const db = require('../db');

function processPosTap(student, vendorId, amount, itemName) {
  if (student.card_blocked) {
    recordTransaction(student.id, vendorId, amount, itemName, 'declined', 'card_blocked');
    return { success: false, reason: 'card_blocked', message: 'Card is blocked' };
  }

  const todaySpent = getTodaySpending(student.id);
  if (todaySpent + amount > student.spending_limit) {
    recordTransaction(student.id, vendorId, amount, itemName, 'declined', 'limit_exceeded');
    return { success: false, reason: 'limit_exceeded', message: `Daily limit of ${student.spending_limit} OMR exceeded` };
  }

  if (student.card_balance < amount) {
    recordTransaction(student.id, vendorId, amount, itemName, 'declined', 'insufficient_balance');
    return { success: false, reason: 'insufficient_balance', message: 'Insufficient balance' };
  }

  db.prepare('UPDATE students SET card_balance = card_balance - ? WHERE id = ?').run(amount, student.id);
  const tx = recordTransaction(student.id, vendorId, amount, itemName, 'completed', null);

  if (student.parent_id) {
    db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
      student.parent_id, 'Purchase made',
      `${student.full_name} spent ${amount} OMR at canteen${itemName ? ` on ${itemName}` : ''}`
    );
  }

  const updated = db.prepare('SELECT card_balance FROM students WHERE id = ?').get(student.id);

  return { success: true, transaction: tx, new_balance: updated.card_balance };
}

function getTodaySpending(studentId) {
  const row = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE student_id = ? AND status = 'completed' AND date(created_at) = date('now')"
  ).get(studentId);
  return row.total;
}

function recordTransaction(studentId, vendorId, amount, itemName, status, reason) {
  const result = db.prepare(
    'INSERT INTO transactions (student_id, vendor_id, amount, item_name, status, declined_reason) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(studentId, vendorId, amount, itemName, status, reason);
  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
}

module.exports = { processPosTap, getTodaySpending };
