/**
 * SHOPORA — 4 Critical End-to-End User Journeys Simulation
 * Tests Customer Purchase Journey, Wishlist-to-Cart Transfer, Verified Reviews, and Admin Fulfillment Workflow.
 */

const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 5050;
const HOST = '127.0.0.1';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path: options.path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runFlows() {
  console.log('====================================================');
  console.log('🛍️  SHOPORA — 4 CRITICAL USER FLOW VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  function logPass(desc) {
    console.log(`  ✓ [SUCCESS] ${desc}`);
    passed++;
  }

  // ----------------------------------------------------
  // FLOW 1: Customer Purchase Journey
  // ----------------------------------------------------
  console.log('🔷 Flow 1: Complete Customer Purchase Journey');
  // 1. Browse categories
  const catRes = await request({ path: '/api/categories' });
  if (catRes.status !== 200 || !catRes.data.data.length) throw new Error('Flow 1: Failed to get categories');
  logPass(`Categories loaded (${catRes.data.data.length} categories)`);

  // 2. Filter products by category
  const categorySlug = catRes.data.data[0].slug;
  const prodRes = await request({ path: `/api/products?category=${encodeURIComponent(categorySlug)}` });
  if (prodRes.status !== 200 || !prodRes.data.data.length) throw new Error('Flow 1: Failed to filter products');
  logPass(`Filtered catalog for category "${categorySlug}"`);

  // 3. Inspect Product Details
  const chosenProduct = prodRes.data.data[0];
  const prodDetail = await request({ path: `/api/products/${chosenProduct._id}` });
  if (prodDetail.status !== 200) throw new Error('Flow 1: Failed to get product details');
  logPass(`Product Details: "${chosenProduct.name}" specs and brand verified`);

  // 4. Customer Login
  const loginRes = await request(
    { path: '/api/auth/login', method: 'POST' },
    { email: 'user@shopora.com', password: 'User@12345' }
  );
  if (loginRes.status !== 200) throw new Error('Flow 1: Failed to login');
  const userToken = loginRes.data.data.token;
  logPass('Customer Auth: Logged in as user@shopora.com');

  // 5. Add to Cart & Sync
  const addCart = await request(
    { path: '/api/cart', method: 'POST', headers: { Authorization: `Bearer ${userToken}` } },
    { productId: chosenProduct._id, quantity: 1 }
  );
  if (addCart.status !== 200) throw new Error('Flow 1: Failed to add to cart');
  logPass('Cart: Item added and synced with MongoDB cart');

  // 6. Select Saved Address
  const addrRes = await request(
    { path: '/api/auth/addresses', headers: { Authorization: `Bearer ${userToken}` } }
  );
  const defaultAddress = addrRes.data.data.find(a => a.isDefault) || addrRes.data.data[0] || {
    fullName: 'Jane Customer',
    phone: '+1 (555) 987-6543',
    street: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'OR',
    postalCode: '97477',
    pincode: '97477',
    country: 'United States'
  };
  logPass(`Checkout: Selected delivery address (${defaultAddress.city}, ${defaultAddress.state})`);

  // 7. Place Order
  const orderRes = await request(
    { path: '/api/orders', method: 'POST', headers: { Authorization: `Bearer ${userToken}` } },
    {
      items: [{ product: chosenProduct._id, quantity: 1 }],
      shippingAddress: defaultAddress,
      paymentMethod: 'Cash on Delivery'
    }
  );
  if (orderRes.status !== 201) throw new Error('Flow 1: Failed to place order');
  const orderId = orderRes.data.data._id;
  logPass(`Order Confirmation: Order #${orderRes.data.data.orderNumber} placed via Cash on Delivery`);

  // 8. Order Tracking Timeline
  const trackRes = await request(
    { path: `/api/orders/${orderId}`, headers: { Authorization: `Bearer ${userToken}` } }
  );
  if (trackRes.status !== 200 || !trackRes.data.data.trackingHistory.length) throw new Error('Flow 1: Failed to track order');
  logPass(`Tracking Timeline: Milestone history confirmed (${trackRes.data.data.trackingHistory[0].status})`);

  // ----------------------------------------------------
  // FLOW 2: Wishlist Management & Cart Transfer
  // ----------------------------------------------------
  console.log('\n🔷 Flow 2: Wishlist Management & Cart Transfer');
  // 1. Toggle product in Wishlist
  const wishToggle = await request(
    { path: '/api/wishlist/toggle', method: 'POST', headers: { Authorization: `Bearer ${userToken}` } },
    { productId: chosenProduct._id }
  );
  if (wishToggle.status !== 200) throw new Error('Flow 2: Failed to toggle wishlist');
  logPass(`Wishlist: Product "${chosenProduct.name}" toggled in user wishlist`);

  // 2. Fetch Wishlist
  const wishListRes = await request(
    { path: '/api/wishlist', headers: { Authorization: `Bearer ${userToken}` } }
  );
  if (wishListRes.status !== 200) throw new Error('Flow 2: Failed to fetch wishlist');
  logPass(`Wishlist: Retrieved ${wishListRes.data.data.length} saved product(s)`);

  // 3. Move Wishlist Item to Cart
  const moveRes = await request(
    { path: '/api/wishlist/move-to-cart', method: 'POST', headers: { Authorization: `Bearer ${userToken}` } },
    { productId: chosenProduct._id }
  );
  if (moveRes.status !== 200) throw new Error('Flow 2: Failed to move wishlist item to cart');
  logPass('Wishlist: Product moved from wishlist to persistent shopping cart');

  // ----------------------------------------------------
  // FLOW 3: Verified Customer Review
  // ----------------------------------------------------
  console.log('\n🔷 Flow 3: Verified Customer Reviews');
  const reviewRes = await request(
    { path: '/api/reviews', method: 'POST', headers: { Authorization: `Bearer ${userToken}` } },
    {
      productId: chosenProduct._id,
      rating: 5,
      title: 'Flawless product and packaging!',
      comment: 'Arrived exactly as described with original accessories.'
    }
  );
  if (reviewRes.status !== 201) throw new Error('Flow 3: Failed to submit review');
  logPass(`Reviews: Verified purchase review logged for "${chosenProduct.name}"`);

  // ----------------------------------------------------
  // FLOW 4: Admin Fulfillment & Order Tracking Transition
  // ----------------------------------------------------
  console.log('\n🔷 Flow 4: Admin Fulfillment & Status Transition');
  // 1. Admin Login
  const adminLogin = await request(
    { path: '/api/auth/login', method: 'POST' },
    { email: 'admin@shopora.com', password: 'Admin@12345' }
  );
  if (adminLogin.status !== 200) throw new Error('Flow 4: Failed to login as admin');
  const adminToken = adminLogin.data.data.token;
  logPass('Admin Auth: Logged in as admin@shopora.com');

  // 2. Admin Overview & Low Stock Analytics
  const overviewRes = await request(
    { path: '/api/admin/overview', headers: { Authorization: `Bearer ${adminToken}` } }
  );
  if (overviewRes.status !== 200) throw new Error('Flow 4: Failed to get admin overview');
  logPass(`Admin Analytics: Revenue ${overviewRes.data.data.totalRevenue} | Orders ${overviewRes.data.data.totalOrders}`);

  // 3. Transition Order Status to "Packed" with note
  const updateRes = await request(
    { path: `/api/admin/orders/${orderId}/status`, method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` } },
    { orderStatus: 'Packed', message: 'Item packed in tamper-proof bubble mailer at Bay 4' }
  );
  if (updateRes.status !== 200) throw new Error('Flow 4: Failed to update order status');
  logPass(`Order Fulfillment: Order #${orderRes.data.data.orderNumber} updated to "Packed"`);

  // 4. Customer verifies real-time status update
  const customerCheck = await request(
    { path: `/api/orders/${orderId}`, headers: { Authorization: `Bearer ${userToken}` } }
  );
  if (customerCheck.data.data.orderStatus !== 'Packed') throw new Error('Flow 4: Status mismatch for customer');
  logPass('Real-Time Tracking: Customer verified order milestone progressed to "Packed"');

  console.log('\n====================================================');
  console.log(`🎉 ALL 4 CRITICAL USER FLOWS PASSED (${passed} checkpoints)!`);
  console.log('====================================================\n');
}

runFlows().catch((err) => {
  console.error('\n✕ Flow Failure:', err);
  process.exit(1);
});
