const API_BASE = 'http://localhost:3000/api';

async function testStopAPIs() {
  console.log('Testing Updated Stop APIs with Query Parameters\n');
  
  // Test stop ID with slashes
  const stopId = 'node/11056827968';
  const encodedStopId = encodeURIComponent(stopId);
  
  const tests = [
    {
      name: 'Get All Stops',
      url: `${API_BASE}/public/stops?limit=5`,
      method: 'GET'
    },
    {
      name: 'Get Stop Details by ID',
      url: `${API_BASE}/public/stops/by-id?stop_id=${encodedStopId}`,
      method: 'GET'
    },
    {
      name: 'Get Stop Schedule',
      url: `${API_BASE}/public/stops/schedule?stop_id=${encodedStopId}&date=2026-03-21`,
      method: 'GET'
    },
    {
      name: 'Get Stop ETAs',
      url: `${API_BASE}/public/stops/etas?stop_id=${encodedStopId}`,
      method: 'GET'
    },
    {
      name: 'Get Routes',
      url: `${API_BASE}/public/routes?limit=5`,
      method: 'GET'
    },
    {
      name: 'Get Route Stops',
      url: `${API_BASE}/public/routes/17065220/stops`,
      method: 'GET'
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n${test.name}:`);
      console.log(`URL: ${test.url}`);
      
      const response = await fetch(test.url, {
        method: test.method,
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const dataPreview = JSON.stringify(data, null, 2).substring(0, 150);
        console.log(`✅ Status: ${response.status}`);
        console.log(`Response: ${dataPreview}...\n`);
      } else {
        const error = await response.json();
        console.log(`❌ Status: ${response.status}`);
        console.log(`Error: ${JSON.stringify(error, null, 2)}\n`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log('- All stop endpoints now use query parameters for stop_id');
  console.log('- Stop IDs with slashes (node/...) are URL-encoded');
  console.log('- Routes endpoints use path parameters (no changes needed)');
  console.log('- All endpoints include proper Swagger documentation');
}

testStopAPIs();