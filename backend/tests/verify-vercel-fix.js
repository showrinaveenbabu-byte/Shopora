/**
 * Verification Test Suite for Vercel Serverless MongoDB Connection & Auth Flow
 * Tests:
 * 1. Mongoose bufferCommands = false is strictly preserved (Req 8)
 * 2. Database connection caching across warm serverless invocations (Req 4, 9)
 * 3. User registration via POST /api/auth/register (Req 5, 13)
 * 4. User login via POST /api/auth/login (Req 5, 6, 13)
 * 5. GET /api/products (Req 7, 13)
 * 6. GET /api/categories (Req 7, 13)
 * 7. Verification that Vercel serverless function entrypoint (api/index.js) operates reliably
 */

const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const vercelHandler = require('../../api/index');
const connectDB = require('../config/db');

// Start an HTTP server powered directly by the Vercel serverless function handler
function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      vercelHandler(req, res);
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

function makeRequest(port, options, body = null) {
  return new Promise((resolve, reject) => {
    const jsonBody = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: options.path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(jsonBody ? { 'Content-Length': Buffer.byteLength(jsonBody) } : {}),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let resBody = '';
        res.on('data', (chunk) => (resBody += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(resBody);
            resolve({ statusCode: res.statusCode, data: parsed });
          } catch {
            resolve({ statusCode: res.statusCode, body: resBody });
          }
        });
      }
    );

    req.on('error', reject);
    if (jsonBody) {
      req.write(jsonBody);
    }
    req.end();
  });
}

async function runVerification() {
  console.log('===============================================================');
  console.log('🧪 VERIFYING VERCEL SERVERLESS MONGOOSE CONNECTION & AUTH FIX');
  console.log('===============================================================\n');

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

  const { server, port } = await createServer();

  try {
    // Check 1: bufferCommands is preserved as false
    console.log('--- 1. Configuration & bufferCommands Verification ---');
    assert(
      mongoose.get('bufferCommands') === false,
      'Mongoose bufferCommands is strictly set to false (Req 8)'
    );

    // Check 2: Direct connectDB() properly awaits and connects
    console.log('\n--- 2. Database Connection & Caching ---');
    const conn1 = await connectDB();
    assert(
      conn1 && mongoose.connection.readyState === 1,
      `connectDB() properly awaited and connected (readyState = ${mongoose.connection.readyState})`
    );

    // Warm container cache reuse check:
    const conn2 = await connectDB();
    assert(
      conn1 === conn2,
      'Consecutive connectDB() calls return cached connection instance without reconnecting (Req 4)'
    );

    // Check 3: Products API via Vercel Handler
    console.log('\n--- 3. /api/products API (Vercel Handler) ---');
    const prodRes = await makeRequest(port, {
      method: 'GET',
      path: '/api/products',
    });
    assert(
      prodRes.statusCode === 200,
      `/api/products returned status 200 (status: ${prodRes.statusCode})`
    );
    assert(
      prodRes.data && Array.isArray(prodRes.data.data),
      `/api/products returned valid product list (found ${prodRes.data?.data?.length || 0} products)`
    );

    // Check 4: Categories API via Vercel Handler
    console.log('\n--- 4. /api/categories API (Vercel Handler) ---');
    const catRes = await makeRequest(port, {
      method: 'GET',
      path: '/api/categories',
    });
    assert(
      catRes.statusCode === 200,
      `/api/categories returned status 200 (status: ${catRes.statusCode})`
    );
    assert(
      catRes.data && Array.isArray(catRes.data.data),
      `/api/categories returned valid category list (found ${catRes.data?.data?.length || 0} categories)`
    );

    // Check 5: User Registration via Vercel Handler
    console.log('\n--- 5. User Registration Flow (POST /api/auth/register) ---');
    const testTimestamp = Date.now();
    const testUser = {
      name: `Test User ${testTimestamp}`,
      email: `testuser_${testTimestamp}@shopora.com`,
      phone: `99999${String(testTimestamp).slice(-5)}`,
      password: 'SecurePassword123!',
    };

    const regRes = await makeRequest(
      port,
      {
        method: 'POST',
        path: '/api/auth/register',
      },
      testUser
    );

    assert(
      regRes.statusCode === 201,
      `User registration succeeded with HTTP 201 (got status ${regRes.statusCode})`
    );
    assert(
      regRes.data && regRes.data.success === true,
      'Registration response returned success: true'
    );
    assert(
      regRes.data && Boolean(regRes.data.token),
      'Registration response generated valid JWT token'
    );
    assert(
      regRes.data && regRes.data.user && regRes.data.user.email === testUser.email,
      `Registered user email matches (${regRes.data?.user?.email})`
    );

    // Check 6: User Login via Vercel Handler with newly created user
    console.log('\n--- 6. User Login/Sign In Flow (POST /api/auth/login) ---');
    const loginRes = await makeRequest(
      port,
      {
        method: 'POST',
        path: '/api/auth/login',
      },
      {
        email: testUser.email,
        password: testUser.password,
      }
    );

    assert(
      loginRes.statusCode === 200,
      `User login succeeded with HTTP 200 (got status ${loginRes.statusCode})`
    );
    assert(
      loginRes.data && loginRes.data.success === true,
      'Login response returned success: true'
    );
    assert(
      loginRes.data && Boolean(loginRes.data.token),
      'Login response returned valid JWT token'
    );
    assert(
      loginRes.data && loginRes.data.user && loginRes.data.user.name === testUser.name,
      `Logged in user name matches (${loginRes.data?.user?.name})`
    );

    // Check 7: Duplicate registration error handling
    console.log('\n--- 7. Duplicate Registration Handling ---');
    const dupRegRes = await makeRequest(
      port,
      {
        method: 'POST',
        path: '/api/auth/register',
      },
      testUser
    );
    assert(
      dupRegRes.statusCode === 400,
      `Duplicate email correctly rejected with HTTP 400 (got status ${dupRegRes.statusCode})`
    );
    assert(
      dupRegRes.data && dupRegRes.data.success === false,
      `Duplicate rejection returned proper message: "${dupRegRes.data?.message}"`
    );

    // Check 8: Clean up test user
    const User = require('../models/User');
    await User.deleteOne({ email: testUser.email });
    console.log('\n  ✓ Cleaned up test user record.');

    console.log('\n===============================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    server.close();

    if (failed === 0) {
      console.log('🎉 ALL VERCEL MONGOOSE AUTHENTICATION TESTS PASSED!\n');
      process.exit(0);
    } else {
      console.error('❌ Some tests failed. Inspect details above.\n');
      process.exit(1);
    }
  } catch (err) {
    server.close();
    console.error('Unhandled test failure:', err);
    process.exit(1);
  }
}

runVerification();
