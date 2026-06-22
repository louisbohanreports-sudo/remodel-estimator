const express = require('express');
const { getDb } = require('../db');
const { calculateEstimate } = require('../pricing');

const router = express.Router();

// POST /api/estimates/calculate — public, no auth
// Calculates estimate and optionally saves it
router.post('/calculate', (req, res) => {
  try {
    const inputs = req.body;

    // Use generic contractor settings for public calculation
    const publicContractor = { overhead_pct: 15, profit_pct: 20 };
    const result = calculateEstimate(inputs, publicContractor);

    res.json({ success: true, estimate: result });
  } catch (err) {
    console.error('Calculate error:', err);
    res.status(500).json({ error: 'Calculation failed', detail: err.message });
  }
});

// POST /api/estimates/submit — saves lead from client form
router.post('/submit', (req, res) => {
  try {
    const inputs = req.body;
    const db = getDb();

    // Get first contractor to assign (in multi-tenant, would use contractor_id from URL)
    const contractor = db.prepare('SELECT * FROM contractors LIMIT 1').get();
    if (!contractor) return res.status(500).json({ error: 'No contractor configured' });

    const result = calculateEstimate(inputs, contractor);

    const stmt = db.prepare(`
      INSERT INTO estimates (
        contractor_id, client_name, client_email, client_phone, project_address,
        kitchen_length, kitchen_width, ceiling_height,
        walls_moving, plumbing_moving, electrical_upgrade, house_age_range,
        cabinet_tier, countertop_tier, flooring_tier, appliance_tier,
        include_cabinets, include_countertops, include_flooring, include_appliances,
        include_backsplash, include_lighting, include_painting, include_plumbing_fixtures,
        additional_notes,
        materials_cost, labor_cost, overhead_amount, profit_amount,
        subtotal, total_low, total_high, status
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?,
        ?, ?, ?, ?,
        ?, ?, ?, 'new'
      )
    `);

    const info = stmt.run(
      contractor.id,
      inputs.client_name || '', inputs.client_email || '', inputs.client_phone || '', inputs.project_address || '',
      inputs.kitchen_length, inputs.kitchen_width, inputs.ceiling_height,
      inputs.walls_moving ? 1 : 0, inputs.plumbing_moving ? 1 : 0,
      inputs.electrical_upgrade ? 1 : 0, inputs.house_age_range,
      inputs.cabinet_tier, inputs.countertop_tier, inputs.flooring_tier, inputs.appliance_tier,
      inputs.include_cabinets ? 1 : 0, inputs.include_countertops ? 1 : 0,
      inputs.include_flooring ? 1 : 0, inputs.include_appliances ? 1 : 0,
      inputs.include_backsplash ? 1 : 0, inputs.include_lighting ? 1 : 0,
      inputs.include_painting ? 1 : 0, inputs.include_plumbing_fixtures ? 1 : 0,
      inputs.additional_notes || '',
      result.contractorView.costToComplete.low, 0,
      result.contractorView.overhead.low, result.contractorView.profit.low,
      result.contractorView.costToComplete.low,
      result.clientView.low, result.clientView.high
    );

    res.json({
      success: true,
      estimate_id: info.lastInsertRowid,
      estimate: result
    });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Failed to save estimate', detail: err.message });
  }
});

module.exports = router;
