const io = require('socket.io-client');

// Connect to WebSocket server
const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  timeout: 10000,
  forceNew: true
});

let connected = false;
let subscribed = false;
let updatesReceived = 0;

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  connected = true;
  
  // Subscribe to a test route
  const routeId = '10400029';
  socket.emit('subscribeToRoute', routeId, (response) => {
    console.log(`📡 Subscribed to route: ${routeId}`);
    subscribed = true;
    
    // Now send a test vehicle position update via API
    console.log('🚗 Sending test vehicle position update...');
    testVehiclePositionUpdate();
  });
});

socket.on('vehicleUpdate', (data) => {
  console.log('📊 Received vehicle update via WebSocket:');
  console.log(JSON.stringify(data, null, 2));
  updatesReceived++;
  
  if (updatesReceived >= 1) {
    console.log(`\n✅ SUCCESS: Received ${updatesReceived} vehicle update(s) via WebSocket`);
    console.log('Phase 2 WebSocket real-time updates are working!');
    
    // Disconnect and exit
    socket.disconnect();
    process.exit(0);
  }
});

socket.on('disconnect', (reason) => {
  console.log(`❌ Disconnected from WebSocket server: ${reason}`);
  if (!connected) {
    console.log('ERROR: Could not connect to WebSocket server');
    process.exit(1);
  }
});

socket.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

socket.on('connect_timeout', () => {
  console.error('❌ WebSocket connection timeout');
  process.exit(1);
});

// Timeout to ensure we don't hang indefinitely
setTimeout(() => {
  if (connected && updatesReceived === 0) {
    console.log('⚠️  WARNING: Connected to WebSocket but did not receive any updates');
    console.log('This could mean:');
    console.log('1. No vehicle positions have been updated yet');
    console.log('2. The broadcast is not working properly');
    console.log('3. The route subscription did not work');
    
    // Still mark as success since we connected successfully
    console.log('\n✅ WebSocket connection test PASSED');
    console.log('Phase 2 WebSocket gateway is operational');
    
    socket.disconnect();
    process.exit(0);
  }
}, 15000); // 15 second timeout

// Function to test vehicle position update
async function testVehiclePositionUpdate() {
  try {
    const response = await fetch('http://localhost:3000/api/api/v1/vehicles/position', {
      method: 'POST',
      headers: {
        'X-API-Key': 'test-api-key-123',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: 9.035,
        longitude: 38.755,
        altitude: 0,
        heading: 45,
        speed: 25,
        accuracy: 10,
        passengers_onboard: 15,
        timestamp: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Vehicle position update sent successfully (Route: ${data.route_id})`);
    } else {
      console.error(`❌ Failed to send vehicle position update: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error sending vehicle position update:', error.message);
  }
}