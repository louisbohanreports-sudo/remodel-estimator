require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const estimateRoutes = require('./routes/estimates');
const contractorRoutes = require('./routes/contractor');

const app = express();
const PORT = process.env.PORT || 3000;

// Init DB
initDb();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/contractor', contractorRoutes);

// Serve frontend
app.get('/contractor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contractor.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🏠 Remodel Estimator running on http://localhost:${PORT}`);
  console.log(`   Client estimator: http://localhost:${PORT}`);
  console.log(`   Contractor login: http://localhost:${PORT}/contractor`);
});
