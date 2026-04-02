# Mock Data Seeding Guide

## Overview

The mock data seeder creates realistic test data that is **linked to actual GTFS data** already in your database. This ensures that:
- Buses are assigned to real agencies (Anbessa, Sheger, etc.)
- Vehicle assignments use real trip IDs from GTFS
- Routes and stops correspond to actual transit data
- The system can be tested with realistic scenarios

## Prerequisites

Before running the seeder, ensure:
1. ✅ GTFS data is loaded in the database (`npm run load-gtfs`)
2. ✅ Database connection is configured in `.env` or `.env.development`
3. ✅ Application builds successfully (`npm run build`)

## Usage

### Run the Seeder

```bash
cd backend
npm run seed
```

This will:
1. Connect to your database
2. Fetch actual GTFS data (agencies, routes, trips, stops)
3. Create 20-30 buses linked to real agencies
4. Create GPS devices for each bus
5. Generate API keys for each device
6. Create admin users
7. Create vehicle assignments using real trip IDs

### What Gets Created

#### Buses (20-30 vehicles)
- **Anbessa buses**: 15 vehicles (A-001 to A-015)
- **Sheger buses**: 5 vehicles (S-001 to S-005)
- Linked to actual agency IDs from GTFS
- Realistic Ethiopian license plates
- Common bus models (Mercedes, MAN, Yutong)

#### GPS Devices (20-30 devices)
- One per bus
- Unique serial numbers
- Linked to bus IDs

#### API Keys (20-30 keys)
- One per GPS device
- Format: `at_[48 random chars]`
- Stored securely (SHA256 hashed)
- **Saved to**: `scripts/generated-api-keys.json`

#### Admin Users (3 accounts)
- **Super Admin**: `admin@addistransit.et` / `Admin@2024!`
- **Operator**: `operator@addistransit.et` / `Operator@2024!`
- **Viewer**: `viewer@addistransit.et` / `Viewer@2024!`

#### Vehicle Assignments (up to 20)
- Buses assigned to actual trips from GTFS
- Real route IDs and trip IDs
- Active status with timestamps

## GTFS Data Linkage

The seeder queries your database to get:

```sql
-- Agencies from GTFS
SELECT agency_id, agency_name FROM agencies;

-- Routes per agency
SELECT route_id, route_short_name FROM routes WHERE agency_id = ?;

-- Trips per route
SELECT trip_id, route_id, direction_id FROM trips WHERE route_id = ?;

-- Stops
SELECT stop_id, stop_name FROM stops LIMIT 50;
```

Then creates assignments like:
```
Bus A-001 → Agency Anbessa → Route 001 → Trip 12345 → Direction 0
```

## Output Files

### API Keys File
**Location**: `backend/scripts/generated-api-keys.json`

```json
[
  {
    "device_name": "GPS-A-001",
    "bus_number": "A-001",
    "api_key": "at_aB3dE5fG7hI9jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1fG2",
    "api_key_id": "550e8400-e29b-41d4-a716-446655440000"
  }
]
```

⚠️ **IMPORTANT**: Keep this file secure! It contains actual API keys for testing.

## Testing with Mock Data

### Test Vehicle GPS Updates

```bash
# Use an API key from generated-api-keys.json
curl -X POST http://localhost:3000/api/v1/vehicles/position \
  -H "Content-Type: application/json" \
  -H "X-API-Key: at_aB3dE5fG7hI9jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1fG2" \
  -d '{
    "latitude": 9.005,
    "longitude": 38.789,
    "speed": 45.5,
    "heading": 180,
    "passengers_onboard": 32
  }'
```

### Test Admin Login

```bash
curl -X POST http://localhost:3000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@addistransit.et",
    "password": "Admin@2024!"
  }'
```

### View Public Routes

```bash
curl http://localhost:3000/api/public/routes
```

## Re-seeding (Starting Fresh)

To clear all mock data and re-seed:

```bash
# Connect to your database and run:
TRUNCATE TABLE buses CASCADE;
TRUNCATE TABLE gps_devices CASCADE;
TRUNCATE TABLE api_keys CASCADE;
TRUNCATE TABLE admin_users CASCADE;
TRUNCATE TABLE vehicle_assignments CASCADE;

# Then re-run the seeder
npm run seed
```

## Troubleshooting

### Error: "No agencies found"
**Solution**: Load GTFS data first:
```bash
npm run load-gtfs
```

### Error: "Cannot find module"
**Solution**: Build the project first:
```bash
npm run build
```

### Error: "Bus already exists"
**Explanation**: The seeder is idempotent - it skips existing records. This is expected behavior.

### Database Connection Issues
**Check**: Ensure `DATABASE_URL` is set correctly in `.env`:
```bash
# For Supabase
DATABASE_URL=postgresql://username:password@host:port/database
```

## Data Relationships

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agency    │────▶│    Route    │────▶│    Trip     │
│  (from GTFS)│     │  (from GTFS)│     │  (from GTFS)│
└─────────────┘     └─────────────┘     └─────────────┘
       │                                      │
       │                                      │
       ▼                                      ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│     Bus     │────▶│ GPS Device  │────▶│    API Key      │
│   (mock)    │     │   (mock)    │     │    (mock)       │
└─────────────┘     └─────────────┘     └─────────────────┘
       │
       │
       ▼
┌─────────────────────────┐
│   Vehicle Assignment    │
│ (Bus + Trip from GTFS)  │
└─────────────────────────┘
```

## Security Notes

1. **API Keys**: Generated keys are for development/testing only
2. **Admin Passwords**: Default passwords must be changed in production
3. **Generated Files**: `generated-api-keys.json` contains secrets - never commit to git
4. **Re-seeding**: In production, consider using migrations instead of the seeder

## Next Steps

After seeding:
1. ✅ Test vehicle position updates
2. ✅ Test admin dashboard operations
3. ✅ Test public API endpoints
4. ✅ Build mobile app with real data

## Support

For issues with the seeder:
- Check database connection
- Verify GTFS data is loaded
- Review `scripts/seed-mock-data.js` logs
- Check `generated-api-keys.json` for API credentials
