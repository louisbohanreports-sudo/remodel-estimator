# Kitchen Remodel Estimator — SF Bay Area

A web app for contractors to give homeowners instant kitchen remodel estimates. The client fills out a form, gets a price range. The contractor sees the full breakdown including overhead and profit.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env — set JWT_SECRET to a random string
npm start
```

Visit:
- **Client estimator:** http://localhost:3000
- **Contractor login:** http://localhost:3000/contractor

## Default Credentials

```
Username: contractor1
Password: contractor123
```

Change these immediately in production via the DB or by adding a password reset route.

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Auth:** JWT
- **Frontend:** Vanilla HTML/CSS/JS (no build step, deploys anywhere)

## Features

### Client-Facing
- 4-step guided form
- Kitchen dimensions, structural questions, material tier selection
- Instant price range estimate
- Submit to contractor for detailed follow-up

### Contractor Dashboard
- View all incoming leads with status tracking
- Full cost breakdown (cost + overhead + profit = proposal price)
- Configurable overhead % and profit % per contractor
- Lead status tracking (new → viewed → quoted → won/lost)
- Pipeline value stats

## Pricing Logic

All rates based on 2025 SF Bay Area data. See `pricing.js` for full breakdown:
- Per-sqft labor rates
- Cabinet, countertop, flooring tier pricing
- Structural work (wall removal, plumbing, electrical)
- SF permit fees
- Age-of-home multiplier (pre-1980 homes cost ~25% more)

## Deploy to Railway

1. Push to GitHub
2. Connect repo to Railway
3. Set `JWT_SECRET` env var
4. Deploy
