const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'estimator.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function initDb() {
  const db = getDb();

  // Contractors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS contractors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      business_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      license_number TEXT,
      overhead_pct REAL DEFAULT 15,
      profit_pct REAL DEFAULT 20,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Estimates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS estimates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contractor_id INTEGER REFERENCES contractors(id),
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      project_address TEXT,
      -- Kitchen dimensions
      kitchen_length REAL,
      kitchen_width REAL,
      ceiling_height REAL,
      -- Scope
      walls_moving INTEGER DEFAULT 0,
      plumbing_moving INTEGER DEFAULT 0,
      electrical_upgrade INTEGER DEFAULT 0,
      -- House age
      house_age_range TEXT,
      -- Material tiers
      cabinet_tier TEXT DEFAULT 'mid',
      countertop_tier TEXT DEFAULT 'mid',
      flooring_tier TEXT DEFAULT 'mid',
      appliance_tier TEXT DEFAULT 'mid',
      -- Scope checkboxes
      include_cabinets INTEGER DEFAULT 1,
      include_countertops INTEGER DEFAULT 1,
      include_flooring INTEGER DEFAULT 1,
      include_appliances INTEGER DEFAULT 0,
      include_backsplash INTEGER DEFAULT 1,
      include_lighting INTEGER DEFAULT 1,
      include_painting INTEGER DEFAULT 1,
      include_plumbing_fixtures INTEGER DEFAULT 1,
      -- Additional
      additional_notes TEXT,
      -- Calculated values
      materials_cost REAL,
      labor_cost REAL,
      overhead_amount REAL,
      profit_amount REAL,
      subtotal REAL,
      total_low REAL,
      total_high REAL,
      -- Meta
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Seed a default contractor if none exist
  const count = db.prepare('SELECT COUNT(*) as c FROM contractors').get();
  if (count.c === 0) {
    const hash = bcrypt.hashSync('contractor123', 10);
    db.prepare(`
      INSERT INTO contractors (username, password_hash, business_name, phone, email, overhead_pct, profit_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('contractor1', hash, 'Bay Area Remodeling Co.', '(415) 555-0100', 'contractor@example.com', 15, 20);
    console.log('✅ Default contractor created: username=contractor1 password=contractor123');
  }
}

module.exports = { getDb, initDb };
