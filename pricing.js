/**
 * SF Bay Area Kitchen Remodel Pricing Engine
 *
 * All costs in USD. Based on 2025 SF Bay Area labor/material rates.
 * Sources: Houzz, Block Renovation, Green Group Remodeling, NKBA data.
 */

// Base labor rate per sqft (SF Bay Area premium)
const LABOR_BASE_PER_SQFT = {
  low: 45,
  mid: 75,
  high: 110
};

// Cabinet costs per linear foot (installed)
const CABINET_COST_PER_LF = {
  stock: { low: 150, high: 250 },      // IKEA, Home Depot stock
  mid: { low: 350, high: 600 },         // Semi-custom
  custom: { low: 800, high: 1500 }      // Full custom
};

// Countertop per sqft (installed)
const COUNTERTOP_COST_PER_SQFT = {
  laminate: { low: 25, high: 50 },
  mid: { low: 65, high: 120 },          // Quartz, granite
  premium: { low: 150, high: 300 }      // Marble, quartzite
};

// Flooring per sqft (installed)
const FLOORING_COST_PER_SQFT = {
  vinyl: { low: 4, high: 8 },
  mid: { low: 10, high: 18 },           // Tile, LVP
  hardwood: { low: 18, high: 35 }
};

// Appliance packages (supply only — install separate)
const APPLIANCE_PACKAGE = {
  budget: { low: 3000, high: 5000 },
  mid: { low: 6000, high: 10000 },
  premium: { low: 12000, high: 25000 }
};

// Fixed item costs
const FIXED_COSTS = {
  backsplash_per_sqft: { low: 15, high: 40 },
  lighting_allowance: { low: 800, high: 2500 },
  painting_per_sqft: { low: 2, high: 4 },
  plumbing_fixtures: { low: 400, high: 1200 },  // sink, faucet
  plumbing_relocation: { low: 2500, high: 6000 },
  electrical_upgrade: { low: 1500, high: 4000 },
  wall_removal_lf: { low: 800, high: 2500 },    // per linear foot of wall
  permit_sf: { low: 2000, high: 5000 },          // SF permit fees
  demo_per_sqft: { low: 8, high: 15 },
  project_mgmt_pct: 0.08,  // 8% of materials+labor
};

// House age multipliers (older = more surprises)
const AGE_MULTIPLIER = {
  'before_1980': 1.25,  // lead paint, old wiring, asbestos risk
  '1980_2000': 1.10,
  '2000_2026': 1.0
};

/**
 * Calculate estimate given form inputs
 * @param {Object} inputs - Form data from client
 * @param {Object} contractor - Contractor with overhead_pct, profit_pct
 * @returns {Object} Detailed cost breakdown
 */
function calculateEstimate(inputs, contractor) {
  const sqft = (inputs.kitchen_length || 12) * (inputs.kitchen_width || 10);
  const perimeter = 2 * ((inputs.kitchen_length || 12) + (inputs.kitchen_width || 10));
  const ageMultiplier = AGE_MULTIPLIER[inputs.house_age_range] || 1.0;

  // Tier maps
  const cabinetTier = inputs.cabinet_tier === 'budget' ? 'stock' : inputs.cabinet_tier === 'premium' ? 'custom' : 'mid';
  const counterTier = inputs.countertop_tier === 'budget' ? 'laminate' : inputs.countertop_tier === 'premium' ? 'premium' : 'mid';
  const floorTier = inputs.flooring_tier === 'budget' ? 'vinyl' : inputs.flooring_tier === 'premium' ? 'hardwood' : 'mid';
  const appTier = inputs.appliance_tier === 'budget' ? 'budget' : inputs.appliance_tier === 'premium' ? 'premium' : 'mid';

  // Linear feet of cabinets (upper + lower = ~60% of perimeter each side)
  const cabinetLF = perimeter * 0.55;

  // Countertop sqft (L-shape estimate ~= 25% of floor sqft)
  const counterSqft = sqft * 0.28;

  // Backsplash sqft (approx 40% of perimeter * 18" height)
  const backsplashSqft = perimeter * 0.4 * 1.5;

  const lineItems = [];

  // Demo
  lineItems.push({
    name: 'Demolition & Disposal',
    low: sqft * FIXED_COSTS.demo_per_sqft.low,
    high: sqft * FIXED_COSTS.demo_per_sqft.high,
    category: 'labor'
  });

  // Cabinets
  if (inputs.include_cabinets) {
    lineItems.push({
      name: `Cabinets (${cabinetTier})`,
      low: cabinetLF * CABINET_COST_PER_LF[cabinetTier].low,
      high: cabinetLF * CABINET_COST_PER_LF[cabinetTier].high,
      category: 'materials'
    });
  }

  // Countertops
  if (inputs.include_countertops) {
    lineItems.push({
      name: `Countertops (${counterTier})`,
      low: counterSqft * COUNTERTOP_COST_PER_SQFT[counterTier].low,
      high: counterSqft * COUNTERTOP_COST_PER_SQFT[counterTier].high,
      category: 'materials'
    });
  }

  // Flooring
  if (inputs.include_flooring) {
    lineItems.push({
      name: `Flooring (${floorTier})`,
      low: sqft * FLOORING_COST_PER_SQFT[floorTier].low,
      high: sqft * FLOORING_COST_PER_SQFT[floorTier].high,
      category: 'materials'
    });
  }

  // Appliances
  if (inputs.include_appliances) {
    lineItems.push({
      name: `Appliance Package (${appTier})`,
      low: APPLIANCE_PACKAGE[appTier].low,
      high: APPLIANCE_PACKAGE[appTier].high,
      category: 'materials'
    });
  }

  // Backsplash
  if (inputs.include_backsplash) {
    lineItems.push({
      name: 'Backsplash (tile + install)',
      low: backsplashSqft * FIXED_COSTS.backsplash_per_sqft.low,
      high: backsplashSqft * FIXED_COSTS.backsplash_per_sqft.high,
      category: 'materials'
    });
  }

  // Lighting
  if (inputs.include_lighting) {
    lineItems.push({
      name: 'Lighting (fixtures + electrical)',
      low: FIXED_COSTS.lighting_allowance.low,
      high: FIXED_COSTS.lighting_allowance.high,
      category: 'materials'
    });
  }

  // Painting
  if (inputs.include_painting) {
    lineItems.push({
      name: 'Painting',
      low: sqft * FIXED_COSTS.painting_per_sqft.low,
      high: sqft * FIXED_COSTS.painting_per_sqft.high,
      category: 'labor'
    });
  }

  // Plumbing fixtures
  if (inputs.include_plumbing_fixtures) {
    lineItems.push({
      name: 'Plumbing Fixtures (sink, faucet)',
      low: FIXED_COSTS.plumbing_fixtures.low,
      high: FIXED_COSTS.plumbing_fixtures.high,
      category: 'materials'
    });
  }

  // Plumbing relocation
  if (inputs.plumbing_moving) {
    lineItems.push({
      name: 'Plumbing Relocation',
      low: FIXED_COSTS.plumbing_relocation.low,
      high: FIXED_COSTS.plumbing_relocation.high,
      category: 'labor'
    });
  }

  // Electrical upgrade
  if (inputs.electrical_upgrade) {
    lineItems.push({
      name: 'Electrical Panel / Wiring Upgrade',
      low: FIXED_COSTS.electrical_upgrade.low,
      high: FIXED_COSTS.electrical_upgrade.high,
      category: 'labor'
    });
  }

  // Wall removal
  if (inputs.walls_moving) {
    lineItems.push({
      name: 'Wall Removal / Structural Work',
      low: FIXED_COSTS.wall_removal_lf.low * 1.5,
      high: FIXED_COSTS.wall_removal_lf.high * 1.5,
      category: 'labor'
    });
  }

  // General labor (installation, carpentry)
  lineItems.push({
    name: 'General Labor & Installation',
    low: sqft * LABOR_BASE_PER_SQFT.low,
    high: sqft * LABOR_BASE_PER_SQFT.high,
    category: 'labor'
  });

  // SF Permit
  lineItems.push({
    name: 'Permits & Inspections (SF)',
    low: FIXED_COSTS.permit_sf.low,
    high: FIXED_COSTS.permit_sf.high,
    category: 'overhead'
  });

  // Apply age multiplier to labor items
  lineItems.forEach(item => {
    if (item.category === 'labor') {
      item.low = Math.round(item.low * ageMultiplier);
      item.high = Math.round(item.high * ageMultiplier);
    }
  });

  // Totals
  const subtotalLow = lineItems.reduce((s, i) => s + i.low, 0);
  const subtotalHigh = lineItems.reduce((s, i) => s + i.high, 0);

  // Project management
  const pmLow = Math.round(subtotalLow * FIXED_COSTS.project_mgmt_pct);
  const pmHigh = Math.round(subtotalHigh * FIXED_COSTS.project_mgmt_pct);
  lineItems.push({ name: 'Project Management', low: pmLow, high: pmHigh, category: 'overhead' });

  const totalLow = subtotalLow + pmLow;
  const totalHigh = subtotalHigh + pmHigh;

  // Contractor view: overhead + profit
  const overheadPct = (contractor.overhead_pct || 15) / 100;
  const profitPct = (contractor.profit_pct || 20) / 100;

  const overheadLow = Math.round(totalLow * overheadPct);
  const overheadHigh = Math.round(totalHigh * overheadPct);
  const profitLow = Math.round(totalLow * profitPct);
  const profitHigh = Math.round(totalHigh * profitPct);

  const proposalLow = totalLow + overheadLow + profitLow;
  const proposalHigh = totalHigh + overheadHigh + profitHigh;

  return {
    sqft: Math.round(sqft),
    lineItems: lineItems.map(i => ({
      ...i,
      low: Math.round(i.low),
      high: Math.round(i.high)
    })),
    ageMultiplier,
    // Client sees this
    clientView: {
      rangeLabel: `$${fmt(proposalLow)} – $${fmt(proposalHigh)}`,
      low: proposalLow,
      high: proposalHigh,
      midpoint: Math.round((proposalLow + proposalHigh) / 2)
    },
    // Contractor sees this
    contractorView: {
      costToComplete: { low: totalLow, high: totalHigh },
      overhead: { low: overheadLow, high: overheadHigh, pct: contractor.overhead_pct },
      profit: { low: profitLow, high: profitHigh, pct: contractor.profit_pct },
      proposal: { low: proposalLow, high: proposalHigh },
      marginPct: Math.round(((proposalLow - totalLow) / proposalLow) * 100)
    }
  };
}

function fmt(n) {
  return n.toLocaleString('en-US');
}

module.exports = { calculateEstimate };
