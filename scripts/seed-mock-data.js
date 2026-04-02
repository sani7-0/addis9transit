#!/usr/bin/env node

/**
 * Mock Data Seeder for AddisTransit
 * 
 * This script populates the database with realistic mock data that corresponds
 * to actual GTFS data already loaded in the database.
 * 
 * Usage:
 *   npm run seed
 *   
 * Environment:
 *   Requires DATABASE_URL to be set in .env file
 */

const { DataSource } = require('typeorm');
const { createHash, randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import entities
const Bus = require('../dist/entities/bus.entity').Bus;
const GpsDevice = require('../dist/entities/gps-device.entity').GpsDevice;
const ApiKey = require('../dist/entities/api-key.entity').ApiKey;
const AdminUser = require('../dist/entities/admin-user.entity').AdminUser;
const VehicleAssignment = require('../dist/entities/vehicle-assignment.entity').VehicleAssignment;
const Trip = require('../dist/entities/trip.entity').Trip;
const Agency = require('../dist/entities/agency.entity').Agency;
const Route = require('../dist/entities/route.entity').Route;
const Stop = require('../dist/entities/stop.entity').Stop;
const Calendar = require('../dist/entities/calendar.entity').Calendar;

// DataSource configuration
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Bus, GpsDevice, ApiKey, AdminUser, VehicleAssignment, Trip, Agency, Route, Stop, Calendar],
  synchronize: false,
  logging: false,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Utility functions
function generateSerialNumber(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(3, '0')}-${Date.now().toString(36).toUpperCase().substring(0, 6)}`;
}

function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'at_';
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function hashApiKey(apiKey) {
  return createHash('sha256').update(apiKey).digest('hex');
}

async function fetchGtfsData() {
  console.log('Fetching GTFS data from database...\n');
  
  const agencyRepository = dataSource.getRepository(Agency);
  const routeRepository = dataSource.getRepository(Route);
  const tripRepository = dataSource.getRepository(Trip);
  const stopRepository = dataSource.getRepository(Stop);
  
  // Fetch agencies
  const agencies = await agencyRepository.find();
  console.log(`✓ Found ${agencies.length} agencies:`);
  agencies.forEach(a => console.log(`   - ${a.agency_name} (ID: ${a.agency_id})`));
  
  if (agencies.length === 0) {
    console.error('\n❌ No agencies found. Please load GTFS data first using: npm run load-gtfs');
    process.exit(1);
  }
  
  // Fetch routes grouped by agency
  const routesByAgency = {};
  for (const agency of agencies) {
    const routes = await routeRepository.find({ 
      where: { agency_id: agency.agency_id },
      take: 10 // Get top 10 routes per agency
    });
    routesByAgency[agency.agency_id] = routes;
    console.log(`✓ Agency ${agency.agency_id}: ${routes.length} routes`);
  }
  
  // Fetch trips for each route
  const tripsByRoute = {};
  let totalTrips = 0;
  for (const agencyId in routesByAgency) {
    for (const route of routesByAgency[agencyId]) {
      const trips = await tripRepository.find({
        where: { route_id: route.route_id },
        take: 5 // Get 5 trips per route
      });
      if (trips.length > 0) {
        tripsByRoute[route.route_id] = trips;
        totalTrips += trips.length;
      }
    }
  }
  console.log(`✓ Found ${totalTrips} trips across all routes`);
  
  // Fetch some stops
  const stops = await stopRepository.find({ take: 50 });
  console.log(`✓ Found ${stops.length} stops\n`);
  
  return { agencies, routesByAgency, tripsByRoute, stops };
}

async function seedBuses(agencies, routesByAgency) {
  console.log('🚌 Seeding buses...');
  const busRepository = dataSource.getRepository(Bus);
  const buses = [];
  
  // Bus models commonly used in Ethiopia
  const busModels = [
    { model: 'Mercedes-Benz Citaro', capacity: 80 },
    { model: 'MAN Lion\'s City', capacity: 85 },
    { model: 'Yutong ZK6120', capacity: 90 },
    { model: 'Golden Dragon XML6125', capacity: 85 },
    { model: 'Higer KLQ6129', capacity: 88 },
  ];
  
  let busCounter = 1;
  
  for (const agency of agencies) {
    const routes = routesByAgency[agency.agency_id] || [];
    const numBuses = agency.agency_name.includes('Anbessa') ? 15 : 5; // 15 for Anbessa, 5 for others
    
    for (let i = 0; i < numBuses; i++) {
      const busNumber = `${agency.agency_id.substring(0, 1).toUpperCase()}-${String(busCounter).padStart(3, '0')}`;
      const busModel = busModels[i % busModels.length];
      const year = 2018 + (i % 4); // 2018-2021
      
      const existingBus = await busRepository.findOne({
        where: { bus_number: busNumber }
      });
      
      if (existingBus) {
        console.log(`  ⚠️  Bus ${busNumber} already exists, skipping...`);
        buses.push(existingBus);
        busCounter++;
        continue;
      }
      
      // Generate Ethiopian-style license plate
      const regionCode = '1'; // Addis Ababa
      const plateLetter = agency.agency_id.substring(0, 1).toUpperCase();
      const plateNumber = String(12345 + busCounter).padStart(5, '0');
      const licensePlate = `Addis Ababa ${regionCode} ${plateLetter} ${plateNumber}`;
      
      const bus = busRepository.create({
        bus_number: busNumber,
        license_plate: licensePlate,
        bus_model: busModel.model,
        capacity: busModel.capacity,
        year: year,
        agency_id: agency.agency_id,
        is_active: true,
        commission_date: new Date(`${year}-01-15`),
        notes: `${agency.agency_name} fleet vehicle`,
      });
      
      const savedBus = await busRepository.save(bus);
      buses.push(savedBus);
      console.log(`  ✓ Created bus: ${busNumber} (${licensePlate}) - ${agency.agency_name}`);
      busCounter++;
    }
  }
  
  console.log(`✅ Seeded ${buses.length} buses\n`);
  return buses;
}

async function seedGpsDevices(buses) {
  console.log('📡 Seeding GPS devices...');
  const deviceRepository = dataSource.getRepository(GpsDevice);
  const devices = [];
  
  for (let i = 0; i < buses.length; i++) {
    const bus = buses[i];
    
    const existingDevice = await deviceRepository.findOne({
      where: { bus_id: bus.bus_id }
    });
    
    if (existingDevice) {
      console.log(`  ⚠️  GPS device for bus ${bus.bus_number} already exists, skipping...`);
      devices.push(existingDevice);
      continue;
    }
    
    const device = deviceRepository.create({
      device_name: `GPS-${bus.bus_number}`,
      device_type: 'tracker',
      device_model: 'TK103-A',
      serial_number: generateSerialNumber('GPS', i),
      bus_id: bus.bus_id,
      firmware_version: '2.1.4',
      is_active: true,
      installation_date: new Date('2024-01-01'),
      last_online_at: new Date(),
    });
    
    const savedDevice = await deviceRepository.save(device);
    devices.push(savedDevice);
    console.log(`  ✓ Created GPS device: ${device.device_name} (${device.serial_number})`);
  }
  
  console.log(`✅ Seeded ${devices.length} GPS devices\n`);
  return devices;
}

async function seedApiKeys(devices) {
  console.log('🔑 Seeding API keys...');
  const apiKeyRepository = dataSource.getRepository(ApiKey);
  const apiKeys = [];
  const generatedKeys = [];
  
  for (const device of devices) {
    const existingKey = await apiKeyRepository.findOne({
      where: { device_id: device.device_id }
    });
    
    if (existingKey) {
      console.log(`  ⚠️  API key for device ${device.device_name} already exists, skipping...`);
      apiKeys.push(existingKey);
      continue;
    }
    
    const apiKeyValue = generateApiKey();
    const apiKeyHash = hashApiKey(apiKeyValue);
    const apiKeyPrefix = apiKeyValue.substring(0, 10); // First 10 chars as prefix
    
    const apiKey = apiKeyRepository.create({
      device_id: device.device_id,
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
      key_name: `Production Key for ${device.device_name}`,
      is_active: true,
      expires_at: new Date('2026-12-31'),
    });
    
    const savedKey = await apiKeyRepository.save(apiKey);
    apiKeys.push(savedKey);
    
    generatedKeys.push({
      device_name: device.device_name,
      bus_number: device.bus?.bus_number || 'Unknown',
      api_key: apiKeyValue,
      api_key_id: savedKey.key_id,
    });
    
    console.log(`  ✓ Created API key for: ${device.device_name}`);
  }
  
  // Save keys to file
  const keysFile = path.join(__dirname, 'generated-api-keys.json');
  fs.writeFileSync(keysFile, JSON.stringify(generatedKeys, null, 2));
  console.log(`\n💾 API keys saved to: ${keysFile}`);
  console.log(`⚠️  IMPORTANT: Keep these keys secure and do not commit them to version control!\n`);
  
  console.log(`✅ Seeded ${apiKeys.length} API keys\n`);
  return apiKeys;
}

async function seedAdminUsers() {
  console.log('👤 Seeding admin users...');
  const adminRepository = dataSource.getRepository(AdminUser);
  const createdUsers = [];
  
  const adminUsers = [
    {
      email: 'admin@addistransit.et',
      password: 'Admin@2024!',
      first_name: 'System',
      last_name: 'Administrator',
      role: 'super_admin',
    },
    {
      email: 'operator@addistransit.et',
      password: 'Operator@2024!',
      first_name: 'Fleet',
      last_name: 'Operator',
      role: 'admin',
    },
    {
      email: 'viewer@addistransit.et',
      password: 'Viewer@2024!',
      first_name: 'Read Only',
      last_name: 'User',
      role: 'viewer',
    },
  ];
  
  for (const userData of adminUsers) {
    const existingUser = await adminRepository.findOne({
      where: { email: userData.email }
    });
    
    if (existingUser) {
      console.log(`  ⚠️  Admin user ${userData.email} already exists, skipping...`);
      createdUsers.push(existingUser);
      continue;
    }
    
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const user = adminRepository.create({
      user_id: randomUUID(),
      email: userData.email,
      password_hash: passwordHash,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
      is_active: true,
      last_login_at: null,
    });
    
    const savedUser = await adminRepository.save(user);
    createdUsers.push(savedUser);
    console.log(`  ✓ Created admin user: ${user.email} (${user.role})`);
  }
  
  console.log(`✅ Seeded ${createdUsers.length} admin users\n`);
  return createdUsers;
}

async function seedVehicleAssignments(buses, devices, tripsByRoute, stops) {
  console.log('🚌📍 Seeding vehicle assignments with real GTFS data...');
  const assignmentRepository = dataSource.getRepository(VehicleAssignment);
  const assignments = [];
  
  if (Object.keys(tripsByRoute).length === 0) {
    console.log('⚠️  No trips found in database. Skipping vehicle assignments.\n');
    return [];
  }
  
  const now = new Date();
  let assignmentCount = 0;
  
  // Create assignments for each bus
  for (let i = 0; i < buses.length && assignmentCount < 20; i++) {
    const bus = buses[i];
    const device = devices[i];
    
    // Get a random route with trips
    const routeIds = Object.keys(tripsByRoute);
    if (routeIds.length === 0) break;
    
    const randomRouteId = routeIds[Math.floor(Math.random() * routeIds.length)];
    const trips = tripsByRoute[randomRouteId];
    
    if (!trips || trips.length === 0) continue;
    
    // Get a random trip from this route
    const trip = trips[Math.floor(Math.random() * trips.length)];
    
    // Check for existing assignment for this bus
    const existingAssignment = await assignmentRepository.findOne({
      where: { bus_id: bus.bus_id }
    });
    
    if (existingAssignment) {
      console.log(`  ⚠️  Assignment for bus ${bus.bus_number} already exists, skipping...`);
      assignments.push(existingAssignment);
      continue;
    }
    
    // Get random start and end stops
    const startStop = stops[Math.floor(Math.random() * stops.length)];
    const endStop = stops[Math.floor(Math.random() * stops.length)];
    
    const assignment = assignmentRepository.create({
      bus_id: bus.bus_id,
      device_id: device.device_id,
      trip_id: trip.trip_id,
      route_id: trip.route_id,
      direction_id: trip.direction_id || 0,
      start_stop_id: startStop?.stop_id || null,
      end_stop_id: endStop?.stop_id || null,
      assigned_at: new Date(now.getTime() - Math.random() * 3600000), // Assigned 0-60 mins ago
    });
    
    try {
      const savedAssignment = await assignmentRepository.save(assignment);
      assignments.push(savedAssignment);
      console.log(`  ✓ Created assignment: Bus ${bus.bus_number} → Trip ${trip.trip_id.substring(0, 15)}... (Route: ${trip.route_id.substring(0, 15)}...)`);
      assignmentCount++;
    } catch (error) {
      console.log(`  ⚠️  Failed to create assignment for bus ${bus.bus_number}: ${error.message}`);
    }
  }
  
  console.log(`✅ Seeded ${assignments.length} vehicle assignments with real GTFS trip data\n`);
  return assignments;
}

async function main() {
  console.log('🚀 AddisTransit Mock Data Seeder');
  console.log('================================\n');
  console.log('This script creates mock data linked to actual GTFS data in your database.\n');
  
  try {
    // Initialize database connection
    console.log('📡 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected\n');
    
    // Fetch actual GTFS data
    const { agencies, routesByAgency, tripsByRoute, stops } = await fetchGtfsData();
    
    // Seed data in order
    const buses = await seedBuses(agencies, routesByAgency);
    
    if (buses.length === 0) {
      console.log('⚠️  No buses were created. Existing data found or no agencies available.\n');
    }
    
    const devices = await seedGpsDevices(buses);
    const apiKeys = await seedApiKeys(devices);
    const adminUsers = await seedAdminUsers();
    const assignments = await seedVehicleAssignments(buses, devices, tripsByRoute, stops);
    
    // Summary
    console.log('================================');
    console.log('📊 SEEDING SUMMARY');
    console.log('================================');
    console.log(`✅ Buses: ${buses.length} (linked to ${agencies.length} agencies)`);
    console.log(`✅ GPS Devices: ${devices.length} (linked to buses)`);
    console.log(`✅ API Keys: ${apiKeys.length} (linked to devices)`);
    console.log(`✅ Admin Users: ${adminUsers.length}`);
    console.log(`✅ Vehicle Assignments: ${assignments.length} (linked to real GTFS trips)`);
    
    if (assignments.length > 0) {
      console.log('\n📍 Active vehicle assignments:');
      assignments.forEach(a => {
        const bus = buses.find(b => b.bus_id === a.bus_id);
        console.log(`   - Bus ${bus?.bus_number || 'Unknown'} on Trip ${a.trip_id.substring(0, 20)}...`);
      });
    }
    
    console.log('\n🎉 Mock data seeding completed successfully!');
    console.log('\n🔐 Admin Login Credentials:');
    console.log('   Email: admin@addistransit.et');
    console.log('   Password: Admin@2024!');
    console.log('\n⚠️  Change these passwords in production!\n');
    
  } catch (error) {
    console.error('\n❌ Error seeding mock data:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('👋 Database connection closed.');
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
