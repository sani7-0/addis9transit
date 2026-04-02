# AddisTransit Backend

NestJS-based backend API for the AddisTransit public transit platform.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Build the application
npm run build

# Start development server
npm run start:dev
```

## Available Scripts

- `npm run build` - Build the application
- `npm run start:dev` - Development mode with hot reload
- `npm run start:debug` - Debug mode
- `npm run start:prod` - Production mode
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Test coverage
- `npm run lint` - Run ESLint
- `npm run load-gtfs` - Load GTFS data into database

## API Endpoints

### Public APIs (Rate-limited)

- `GET /public/routes` - List all routes
- `GET /public/routes/:route_id` - Get route details
- `GET /public/routes/:route_id/stops` - Get stops for a route
- `GET /public/routes/:route_id/schedule` - Get route schedule
- `GET /public/routes/:route_id/vehicles` - Get vehicles on route
- `GET /public/stops` - List all stops
- `GET /public/stops/:stop_id` - Get stop details
- `GET /public/stops/:stop_id/schedule` - Get stop schedule
- `GET /public/stops/:stop_id/etas` - Get ETAs for stop

### Admin APIs (JWT Authentication)

- `POST /api/v1/admin/login` - Admin login
- `GET /api/v1/admin/buses` - Get all buses
- `POST /api/v1/admin/buses` - Register new bus
- `GET /api/v1/admin/devices` - Get GPS devices
- `POST /api/v1/admin/devices` - Create GPS device
- `GET /api/v1/admin/api-keys` - Get API keys
- `POST /api/v1/admin/api-keys` - Create API key
- `POST /api/v1/admin/assignments` - Assign trip to bus

### Vehicle APIs (API Key Authentication)

- `POST /api/v1/vehicles/position` - Update vehicle position
- `POST /api/v1/vehicles/assign-trip` - Assign trip
- `POST /api/v1/vehicles/status` - Update vehicle status

### System

- `GET /health` - Health check
- `GET /api/docs` - Swagger API documentation

## Project Structure

```
src/
├── api/v1/
│   ├── admin/          # Admin management
│   └── vehicles/       # Vehicle GPS APIs
├── public/
│   ├── routes/         # Public route APIs
│   ├── stops/          # Public stop APIs
│   └── vehicles/       # Public vehicle tracking
├── auth/               # JWT service
├── common/             # Guards, decorators, constants
├── config/             # Configuration
├── entities/           # TypeORM entities
├── health/             # Health checks
└── main.ts             # Application entry
```

## Environment Variables

See `.env.example` for all required environment variables.

## Database

The application uses PostgreSQL. Database migrations are in the `/database` folder.

## GTFS Data

Load GTFS data from the parent directory:

```bash
npm run load-gtfs
```

## Documentation

- Swagger UI: http://localhost:3000/api/docs
- Health Check: http://localhost:3000/health
