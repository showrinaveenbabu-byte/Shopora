/**
 * Verification Test Suite for Checkout & Product Catalog Resolution Fix
 *
 * Specifically verifies:
 * 1. Product "6ab1406e86bd12f142ac00db" (Apple iPhone 15 Pro Max) resolves reliably.
 * 2. If the product was not yet inserted into MongoDB (empty/unseeded DB), resolveProduct
 *    automatically seeds it with its static _id, category, price, and stock into MongoDB.
 * 3. POST /api/orders with product "6ab1406e86bd12f142ac00db" successfully creates the order,
 *    decrements stock, and returns HTTP 201 with full order details.
 * 4. POST /api/cart with product "6ab1406e86bd12f142ac00db" successfully adds the item to cart.
 * 5. Fallback matching by SKU and Name works if ID was stale or missing.
 * 6. The previous failure: "Product with ID 6ab1406e86bd12f142ac00db was not found in catalog" is completely resolved!
 */

const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const vercelHandler = require('../../api/index');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');
const { resolveProduct, ensureDefaultCatalog } = require('../utils/productResolver');

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

async function runCheckoutTests() {
  console.log('===============================================================');
  console.log('🧪 VERIFYING CHECKOUT & PRODUCT ID RESOLUTION FIX');
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
    await connectDB();

    const targetProductId = '6ab1406e86bd12f142ac00db';

    // 1. Test resolveProduct directly
    console.log('--- 1. Testing resolveProduct for 6ab1406e86bd12f142ac00db ---');
    // Temporarily delete product to simulate unseeded/empty database state
    await Product.deleteOne({ _id: targetProductId });

    let resolved = await resolveProduct(targetProductId);
    assert(resolved !== null, 'resolveProduct found item when missing from MongoDB');
    assert(
      resolved && resolved._id.toString() === targetProductId,
      `Resolved product has exact _id "${targetProductId}"`
    );
    assert(
      resolved && resolved.name === 'Apple iPhone 15 Pro Max (256GB Titanium)',
      'Resolved product has expected name "Apple iPhone 15 Pro Max (256GB Titanium)"'
    );

    // Verify it is now persisted in MongoDB
    const persistedInDB = await Product.findById(targetProductId);
    assert(persistedInDB !== null, 'Product was auto-persisted into MongoDB collection');
    assert(
      persistedInDB && persistedInDB.stock > 0,
      `Persisted product has active stock (${persistedInDB ? persistedInDB.stock : 0})`
    );

    // 2. Register a test customer to perform authenticated checkout
    console.log('\n--- 2. Registering Customer for Authenticated Checkout ---');
    const timestamp = Date.now();
    const testEmail = `checkout_test_${timestamp}@shopora.com`;
    const regRes = await makeRequest(
      port,
      { path: '/api/auth/register', method: 'POST' },
      {
        name: 'Checkout Tester',
        email: testEmail,
        password: 'Password123!',
        phone: '+91 98765 43210',
      }
    );
    assert(regRes.statusCode === 201, `Customer registered successfully (status: ${regRes.statusCode})`);
    const authToken = regRes.data.token;
    const authHeaders = { Authorization: `Bearer ${authToken}` };

    // 3. Test Cart Add with product 6ab1406e86bd12f142ac00db
    console.log('\n--- 3. Testing POST /api/cart with 6ab1406e86bd12f142ac00db ---');
    const cartRes = await makeRequest(
      port,
      { path: '/api/cart', method: 'POST', headers: authHeaders },
      { productId: targetProductId, quantity: 1 }
    );
    assert(cartRes.statusCode === 200, `POST /api/cart succeeded (status: ${cartRes.statusCode})`);
    assert(
      cartRes.data && cartRes.data.success === true,
      'POST /api/cart returned success: true'
    );
    const cartItems = cartRes.data?.data?.items || [];
    assert(
      cartItems.some((i) => (i.product?._id || i.product) === targetProductId),
      `Cart contains item with product ID ${targetProductId}`
    );

    // 4. Test Checkout: POST /api/orders with product 6ab1406e86bd12f142ac00db
    console.log('\n--- 4. Testing POST /api/orders (Checkout Flow) ---');
    const stockBefore = persistedInDB.stock;
    const orderPayload = {
      items: [
        {
          product: targetProductId,
          name: 'Apple iPhone 15 Pro Max (256GB Titanium)',
          quantity: 1,
        },
      ],
      shippingAddress: {
        fullName: 'Checkout Tester',
        phone: '+91 98765 43210',
        addressLine1: '42 Innovation Parkway, Tech Ridge',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560100',
        country: 'India',
      },
      shippingMethod: 'express',
      paymentMethod: 'Instant UPI',
    };

    const orderRes = await makeRequest(
      port,
      { path: '/api/orders', method: 'POST', headers: authHeaders },
      orderPayload
    );

    assert(
      orderRes.statusCode === 201,
      `POST /api/orders returned HTTP 201 Created (got: ${orderRes.statusCode})`
    );
    assert(
      orderRes.data && orderRes.data.success === true,
      'POST /api/orders returned success: true'
    );
    assert(
      orderRes.data?.data?.orderNumber?.startsWith('SHP-'),
      `Generated valid order number: ${orderRes.data?.data?.orderNumber}`
    );
    assert(
      orderRes.data?.data?.items?.length === 1,
      'Order contains exactly 1 item'
    );
    assert(
      (orderRes.data?.data?.items[0]?.product?._id || orderRes.data?.data?.items[0]?.product) === targetProductId,
      `Order item references product ID "${targetProductId}"`
    );

    // Verify stock decrement
    const productAfter = await Product.findById(targetProductId);
    assert(
      productAfter && productAfter.stock === stockBefore - 1,
      `Stock was properly decremented: was ${stockBefore}, now ${productAfter ? productAfter.stock : 'N/A'}`
    );

    // 5. Test Resilient Fallback Matching by SKU
    console.log('\n--- 5. Testing Resilient Resolution by SKU/Name ---');
    const resolvedBySku = await resolveProduct(null, { sku: 'APL-IP15PM-256' });
    assert(resolvedBySku !== null, 'Resolved product by SKU "APL-IP15PM-256"');
    assert(
      resolvedBySku && resolvedBySku._id.toString() === targetProductId,
      'SKU lookup returned matching product document'
    );

    // 6. Test Simulation: Checkout with ID that exists in fallback catalog when deleted from DB
    console.log('\n--- 6. Testing Full Checkout with Another Fallback Item Missing from DB ---');
    // Samsung Galaxy S24 Ultra (6ab1406e86bd12f142ac00dc)
    const secondFallbackId = '6ab1406e86bd12f142ac00dc';
    await Product.deleteOne({ _id: secondFallbackId });

    const secondOrderPayload = {
      items: [
        {
          product: secondFallbackId,
          quantity: 2,
        },
      ],
      shippingAddress: {
        fullName: 'Checkout Tester',
        phone: '+91 98765 43210',
        addressLine1: '77 Silicon Avenue',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560100',
        country: 'India',
      },
      shippingMethod: 'standard',
      paymentMethod: 'Credit Card',
    };

    const secondOrderRes = await makeRequest(
      port,
      { path: '/api/orders', method: 'POST', headers: authHeaders },
      secondOrderPayload
    );

    assert(
      secondOrderRes.statusCode === 201,
      `Order placed successfully for second fallback product (status: ${secondOrderRes.statusCode})`
    );
    assert(
      secondOrderRes.data?.data?.items[0]?.name?.includes('Samsung Galaxy S24 Ultra'),
      `Correct product resolved: ${secondOrderRes.data?.data?.items[0]?.name}`
    );

    // Clean up created test records
    console.log('\n--- Cleaning up test records ---');
    if (orderRes.data?.data?._id) {
      await Order.findByIdAndDelete(orderRes.data.data._id);
    }
    if (secondOrderRes.data?.data?._id) {
      await Order.findByIdAndDelete(secondOrderRes.data.data._id);
    }
    await User.deleteOne({ email: testEmail });
    console.log('  ✓ Test orders and customer user cleaned up.');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n===============================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL CHECKOUT & PRODUCT RESOLUTION TESTS PASSED!\n');
    process.exit(0);
  }
}

runCheckoutTests();
