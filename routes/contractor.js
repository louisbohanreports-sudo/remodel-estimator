const express = require('express');
const { getDb } = require('../db');
const { calculateEstimate } = require('../pricing');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All contractor routes require auth
router.use(requireAuth);

// GET /api/contractor/estimates — list all estimates
router.get('/estimates', (req, res) => {
  const db = getDb();
  const estimates = db.prepare(`
    SELECT id, client_name, client_email, client_phone, project_address,
           kitchen_length, kitchen_width, total_low, total_high,
           status, created_at
    FROM estimates
    WHERE contractor_id = ?
    ORDER BY created_at DESC
  `).all(req.contractor.id);

  res.json({ estimates });
});

// GET /api/contractor/estimates/:id — get single estimate detail
router.get('/estimates/:id', (req, res) => {
  const db = getDb();
  const estimate = db.prepare(`
    SELECT * FROM estimates WHERE id = ? AND contractor_id = ?
  `).get(req.params.id, req.contractor.id);

  if (!estimate) return res.status(404).json({ error: 'Not found' });

  // Recalculate with current contractor settings
  const contractor = db.prepare('SELECT * FROM contractors WHERE id = ?').get(req.contractor.id);
  const result = calculateEstimate(estimate, contractor);

  res.json({ estimate, calculation: result });
});

// PATCH /api/contractor/estimates/:id/status
router.patch('/estimates/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['new', 'viewed', 'quoted', 'won', 'lost'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const db = getDb();
  db.prepare(`
    UPDATE estimates SET status = ?, updated_at = datetime('now')
    WHERE id = ? AND contractor_id = ?
  `).run(status, req.params.id, req.contractor.id);

  res.json({ success: true });
});

// GET /api/contractor/profile
router.get('/profile', (req, res) => {
  const db = getDb();
  const contractor = db.prepare(`
    SELECT id, username, business_name, phone, email, license_number,
           overhead_pct, profit_pct, created_at
    FROM contractors WHERE id = ?
  `).get(req.contractor.id);

  res.json({ contractor });
});

// PATCH /api/contractor/profile — update overhead/profit settings
router.patch('/profile', (req, res) => {
  const { overhead_pct, profit_pct, business_name, phone, email, license_number } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE contractors
    SET overhead_pct = COALESCE(?, overhead_pct),
        profit_pct = COALESCE(?, profit_pct),
        business_name = COALESCE(?, business_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        license_number = COALESCE(?, license_number)
    WHERE id = ?
  `).run(overhead_pct, profit_pct, business_name, phone, email, license_number, req.contractor.id);

  res.json({ success: true });
});

// GET /api/contractor/stats
router.get('/stats', (req, res) => {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as c FROM estimates WHERE contractor_id = ?').get(req.contractor.id);
  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM estimates
    WHERE contractor_id = ? GROUP BY status
  `).all(req.contractor.id);

  const totalValue = db.prepare(`
    SELECT SUM(total_low) as low, SUM(total_high) as high
    FROM estimates WHERE contractor_id = ?
  `).get(req.contractor.id);

  res.json({
    total_estimates: total.c,
    by_status: byStatus,
    pipeline_value: {
      low: totalValue.low || 0,
      high: totalValue.high || 0
    }
  });
});

module.exports = router;
