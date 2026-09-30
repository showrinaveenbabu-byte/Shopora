/**
 * Verification of Offline / Fallback behavior:
 * 1. When MongoDB is disconnected, /api/products returns 200 fallback catalog (Req 7)
 * 2. When MongoDB is disconnected, /api/categories returns 200 fallback catalog (Req 7)
 * 3. When MongoDB is disconnected, POST /api/auth/register returns 503 instead of crashing with bufferCommands error (Req 5, 8)
 * 4. When MongoDB is disconnected, POST /api/auth/login returns 503 instead of crashing with bufferCommands error (Req 5, 6, 8)
 */

const http = require('http');
const mongoose = require('mongoose');

// Disconnect mongoose if connected
async function testOfflineBehavior() {
  console.log('===============================================================');
  console.log('🧪 VERIFYING OFFLINE / DISCONNECTED ERROR HANDLING & FALLBACKS');
  console.log('===============================================================\n');

  // Disconnect from MongoDB to simulate disconnected state
  await mongoose.disconnect();
  // Clear cached connection
  if (global.mongoose) {
    global.mongoose.conn = null;
    global.mongoose.promise = null;
  }

  // Force invalid URI to simulate missing/failed connection
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27099/nonexistent_db'; // closed port
  process.env.NODE_ENV = 'production';
  process.env.VERCEL = '1';

  const vercelHandler = require('../../api/index');

  const server = http.createServer((req, res) => {
    vercelHandler(req, res);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  function makeReq(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const jsonBody = body ? JSON.stringify(body) : null;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(jsonBody ? { 'Content-Length': Buffer.byteLength(jsonBody) } : {}),
          },
        },
        (res) => {
          let resBody = '';
          res.on('data', (chunk) => (resBody += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(resBody) });
            } catch {
              resolve({ status: res.statusCode, body: resBody });
            }
          });
        }
      );
      req.on('error', reject);
      if (jsonBody) req.write(jsonBody);
      req.end();
    });
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✕ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Products when DB disconnected
    console.log('--- 1. /api/products when DB disconnected (Fallback Mode) ---');
    const prodRes = await makeReq('/api/products');
    assert(
      prodRes.status === 200,
      `Products API returns 200 OK using fallback (status: ${prodRes.status})`
    );
    assert(
      prodRes.data && Array.isArray(prodRes.data.data) && prodRes.data.data.length > 0,
      `Products fallback returned ${prodRes.data?.data?.length || 0} products without error`
    );

    // 2. Categories when DB disconnected
    console.log('\n--- 2. /api/categories when DB disconnected (Fallback Mode) ---');
    const catRes = await makeReq('/api/categories');
    assert(
      catRes.status === 200,
      `Categories API returns 200 OK using fallback (status: ${catRes.status})`
    );
    assert(
      catRes.data && Array.isArray(catRes.data.data) && catRes.data.data.length > 0,
      `Categories fallback returned ${catRes.data?.data?.length || 0} categories without error`
    );

    // 3. Register when DB disconnected
    console.log('\n--- 3. /api/auth/register when DB disconnected ---');
    const regRes = await makeReq('/api/auth/register', 'POST', {
      name: 'Offline User',
      email: 'offline@shopora.com',
      password: 'Password123!',
    });
    assert(
      regRes.status === 503,
      `Registration safely returns 503 Service Unavailable (status: ${regRes.status})`
    );
    assert(
      !JSON.stringify(regRes.data || regRes.body).includes('bufferCommands = false'),
      'Response does NOT crash with "Cannot call users.findOne() before initial connection is complete"'
    );
    assert(
      regRes.data && regRes.data.success === false,
      `Returns structured error: "${regRes.data?.message}"`
    );

    // 4. Login when DB disconnected
    console.log('\n--- 4. /api/auth/login when DB disconnected ---');
    const loginRes = await makeReq('/api/auth/login', 'POST', {
      email: 'offline@shopora.com',
      password: 'Password123!',
    });
    assert(
      loginRes.status === 503,
      `Login safely returns 503 Service Unavailable (status: ${loginRes.status})`
    );
    assert(
      !JSON.stringify(loginRes.data || loginRes.body).includes('bufferCommands = false'),
      'Login does NOT crash with "Cannot call users.findOne() before initial connection is complete"'
    );

    console.log('\n===============================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    server.close();
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    server.close();
    console.error('Test error:', err);
    process.exit(1);
  }
}

testOfflineBehavior();
