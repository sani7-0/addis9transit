const io = require('socket.io-client');
const https = require('https');

// Configuration
const API_KEY = 'test-api-key-123';
const BASE_URL = 'localhost';
const PORT = 3000;
const WS_URL = `http://${BASE_URL}:${PORT}`;
const HTTP_OPTIONS = {
  hostname: BASE_URL,
  port: PORT,
  path: '/api/api/v1/vehicles/position',
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
};

// Test data for vehicle position update
const vehicleData = {
  latitude: 9.03,
  longitude: 38.75,
  altitude: 0,
  heading: 0,
  speed: 0,
  accuracy: 10,
  passengers_onboard: 0,
  timestamp: "2024-03-18T20:50:00Z"
};

// Connect to WebSocket server
const socket = io(WS_URL, {
  transports: ['websocket']
});

let vehicleUpdateReceived = false;

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  // Subscribe to the route we assigned the test vehicle to
  socket.emit('subscribeToRoute', '10400029');
  console.log('Subscribed to route 10400029');
});

socket.on('vehicleUpdate', (data) => {
  console.log('Received vehicle update via WebSocket:');
  console.log(JSON.stringify(data, null, 2));
  vehicleUpdateReceived = true;
  // Disconnect after receiving the update
  socket.disconnect();
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from WebSocket server:', reason);
  if (!vehicleUpdateReceived) {
    console.log('WARNING: Did not receive vehicle update before disconnection');
  }
  // Exit the process
  process.exit(0);
});

socket.on('error', (err) => {
  console.error('WebSocket error:', err);
  process.exit(1);
});

// Function to send HTTP POST request
function sendVehicleUpdate() {
  const data = JSON.stringify(vehicleData);
  HTTP_OPTIONS.headers['Content-Length'] = Buffer.byteLength(data);

  const req = https.request(HTTP_OPTIONS, (res) => {
    console.log(`HTTP response status: ${res.statusCode}`);
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      console.log(`HTTP response body: ${responseData}`);
    });
  });

  req.on('error', (e) => {
    console.error(`HTTP request error: ${e.message}`);
    process.exit(1);
  });

  req.write(data);
  req.end();
}

// Wait a bit for the WebSocket connection to establish, then send the update
setTimeout(() => {
  console.log('Sending vehicle position update via HTTP...');
  sendVehicleUpdate();
}, 1000); // 1 second delay

// Set a timeout to disconnect if we don't get a response within 10 seconds
setTimeout(() => {
  if (!vehicleUpdateReceived) {
    console.log('ERROR: Timeout waiting for vehicle update');
    socket.disconnect();
    process.exit(1);
  }
}, 10000); // 10 seconds timeout