/**
 * Verification Test Suite for Cart Remove Functionality
 *
 * Verifies:
 * 1. Backend DELETE /api/cart/:productId removes item from user's MongoDB cart.
 * 2. MongoDB Cart document persists removal and reflects remaining items.
 * 3. Removing the last item leaves an empty items array without crashing.
 * 4. Quantity decrement to 0 via PUT /api/cart/:productId auto-removes item.
 * 5. Removing an item from an empty/uninitialized cart returns 200 safely without error.
 * 6. Frontend Cart object in cart.js provides:
 *    - Cart.removeFromCart(productId)
 *    - Cart.removeItem(productId)
 *    - Cart.decreaseQuantity(productId)
 *    - Cart.increaseQuantity(productId)
 *    - Cart.addItem(product, quantity)
 */

const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const vercelHandler = require('../../api/index');
const connectDB = require('../config/db');
const Cart = require('../models/Cart');
const User = require('../models/User');

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

async function runCartRemoveTests() {
  console.log('===============================================================');
  console.log('🧪 VERIFYING CART REMOVE & DELETE FUNCTIONALITY');
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

    const prodA = '6ab1406e86bd12f142ac00db'; // Apple iPhone 15 Pro Max
    const prodB = '6ab1406e86bd12f142ac00dc'; // Samsung Galaxy S24 Ultra

    // 1. Register a test user
    console.log('--- 1. Registering Test Customer ---');
    const timestamp = Date.now();
    const testEmail = `cart_remove_test_${timestamp}@shopora.com`;
    const regRes = await makeRequest(
      port,
      { path: '/api/auth/register', method: 'POST' },
      {
        name: 'Cart Remove Tester',
        email: testEmail,
        password: 'Password123!',
        phone: '+91 98765 43210',
      }
    );
    assert(regRes.statusCode === 201, `Customer registered successfully (status: ${regRes.statusCode})`);
    const authToken = regRes.data.token;
    const authHeaders = { Authorization: `Bearer ${authToken}` };
    const userId = regRes.data.user._id;

    // 2. Add ProdA and ProdB to cart
    console.log('\n--- 2. Adding 2 Items to Cart in MongoDB ---');
    const addA = await makeRequest(
      port,
      { path: '/api/cart', method: 'POST', headers: authHeaders },
      { productId: prodA, quantity: 2 }
    );
    assert(addA.statusCode === 200, `Added Product A to cart (status: ${addA.statusCode})`);

    const addB = await makeRequest(
      port,
      { path: '/api/cart', method: 'POST', headers: authHeaders },
      { productId: prodB, quantity: 1 }
    );
    assert(addB.statusCode === 200, `Added Product B to cart (status: ${addB.statusCode})`);

    // Verify in MongoDB directly
    let dbCart = await Cart.findOne({ user: userId });
    assert(dbCart !== null, 'MongoDB Cart document exists');
    assert(dbCart && dbCart.items.length === 2, `Cart has 2 items in MongoDB (got: ${dbCart?.items?.length})`);

    // 3. Remove Product A via DELETE /api/cart/:productId
    console.log('\n--- 3. Removing Product A via DELETE /api/cart/:productId ---');
    const delResA = await makeRequest(
      port,
      { path: `/api/cart/${prodA}`, method: 'DELETE', headers: authHeaders }
    );
    assert(delResA.statusCode === 200, `DELETE /api/cart/${prodA} returned 200 (status: ${delResA.statusCode})`);
    assert(delResA.data && delResA.data.success === true, 'DELETE response returned success: true');
    assert(delResA.data?.message === 'Item removed from cart', 'Response has message: "Item removed from cart"');

    // 4. Verify MongoDB state after removal
    console.log('\n--- 4. Verifying MongoDB State After Product A Removal ---');
    dbCart = await Cart.findOne({ user: userId });
    assert(dbCart && dbCart.items.length === 1, `Cart has exactly 1 item remaining in MongoDB (got: ${dbCart?.items?.length})`);
    const remainingProdId = dbCart.items[0].product.toString();
    assert(remainingProdId === prodB, `Remaining item is Product B (${remainingProdId})`);
    assert(
      !dbCart.items.some((i) => i.product.toString() === prodA),
      'Product A is completely absent from MongoDB cart'
    );

    // 5. Test removing the last item (Product B)
    console.log('\n--- 5. Removing Product B via DELETE /api/cart/:productId ---');
    const delResB = await makeRequest(
      port,
      { path: `/api/cart/${prodB}`, method: 'DELETE', headers: authHeaders }
    );
    assert(delResB.statusCode === 200, `DELETE /api/cart/${prodB} returned 200 (status: ${delResB.statusCode})`);
    dbCart = await Cart.findOne({ user: userId });
    assert(dbCart && dbCart.items.length === 0, `MongoDB cart is now empty (items length: ${dbCart?.items?.length})`);

    // 6. Test removing an item that is not in cart
    console.log('\n--- 6. Removing Already-Removed Item ---');
    const delResMissing = await makeRequest(
      port,
      { path: `/api/cart/${prodA}`, method: 'DELETE', headers: authHeaders }
    );
    assert(delResMissing.statusCode === 200, `Safely handled missing item removal (status: ${delResMissing.statusCode})`);

    // 7. Test PUT /api/cart/:productId with quantity: 0 auto-removes item
    console.log('\n--- 7. Testing Quantity: 0 Auto-Removal via PUT /api/cart/:productId ---');
    await makeRequest(
      port,
      { path: '/api/cart', method: 'POST', headers: authHeaders },
      { productId: prodA, quantity: 1 }
    );
    const putZeroRes = await makeRequest(
      port,
      { path: `/api/cart/${prodA}`, method: 'PUT', headers: authHeaders },
      { quantity: 0 }
    );
    assert(putZeroRes.statusCode === 200, `PUT with quantity 0 returned 200 (status: ${putZeroRes.statusCode})`);
    dbCart = await Cart.findOne({ user: userId });
    assert(
      dbCart && !dbCart.items.some((i) => i.product.toString() === prodA),
      'Item was auto-removed from MongoDB when quantity set to 0'
    );

    // 8. Test frontend Cart methods contract in cart.js
    console.log('\n--- 8. Verifying frontend/js/cart.js Methods Contract ---');
    // Load frontend Cart in node sandbox
    let mockStorage = {};
    const mockWindow = {
      Auth: { isAuthenticated: () => false },
      dispatchEvent: () => {},
    };
    global.window = mockWindow;
    global.localStorage = {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = v; },
      removeItem: (k) => { delete mockStorage[k]; },
    };
    global.CustomEvent = class { constructor(name, detail) { this.name = name; this.detail = detail; } };

    const fs = require('fs');
    const path = require('path');
    const cartPath = path.resolve(__dirname, '../../frontend/js/cart.js');
    const cartCode = fs.readFileSync(cartPath, 'utf8');
    eval(cartCode);

    const clientCart = global.window.Cart;
    assert(typeof clientCart.removeFromCart === 'function', 'Cart.removeFromCart is defined as a function');
    assert(typeof clientCart.removeItem === 'function', 'Cart.removeItem is defined as a function');
    assert(typeof clientCart.decreaseQuantity === 'function', 'Cart.decreaseQuantity is defined as a function');
    assert(typeof clientCart.increaseQuantity === 'function', 'Cart.increaseQuantity is defined as a function');
    assert(typeof clientCart.addItem === 'function', 'Cart.addItem is defined as a function');

    // Test client-side removal
    clientCart.addToCart({ _id: prodA, name: 'iPhone 15 Pro Max', price: 1199, stock: 10 }, 2, false);
    assert(clientCart.getCount() === 2, `Added item locally: count is 2 (got: ${clientCart.getCount()})`);

    await clientCart.removeFromCart(prodA);
    assert(clientCart.getCount() === 0, `removeFromCart removed item locally: count is 0 (got: ${clientCart.getCount()})`);

    // Test decreaseQuantity to 0 triggers remove
    clientCart.addToCart({ _id: prodB, name: 'Galaxy S24', price: 999, stock: 10 }, 1, false);
    assert(clientCart.getCount() === 1, 'Added 1 item locally');
    await clientCart.decreaseQuantity(prodB);
    assert(clientCart.getCount() === 0, 'decreaseQuantity from 1 to 0 removed item');

    // Clean up test user & cart
    console.log('\n--- Cleaning up test records ---');
    await Cart.deleteOne({ user: userId });
    await User.deleteOne({ _id: userId });
    console.log('  ✓ Test user and MongoDB cart cleaned up.');

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
    console.log('🎉 ALL CART REMOVE & DELETE TESTS PASSED!\n');
    process.exit(0);
  }
}

runCartRemoveTests();
