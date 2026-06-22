const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const db = getDb();
  const contractor = db.prepare('SELECT * FROM contractors WHERE username = ?').get(username);

  if (!contractor) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, contractor.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: contractor.id, username: contractor.username, business_name: contractor.business_name },
    process.env.JWT_SECRET || 'dev_secret_change_me',
    { expiresIn: '7d' }
  );

  res.json({
    token,
    contractor: {
      id: contractor.id,
      username: contractor.username,
      business_name: contractor.business_name,
      email: contractor.email,
      phone: contractor.phone,
      overhead_pct: contractor.overhead_pct,
      profit_pct: contractor.profit_pct
    }
  });
});

module.exports = router;
