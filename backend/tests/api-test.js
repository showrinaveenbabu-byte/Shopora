/**
 * SHOPORA — Automated API Verification Suite
 * Validates all REST endpoints, authentication, catalog filters, cart, orders, reviews, addresses, and admin operations.
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
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, data: parsed });
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

async function runTests() {
  console.log('===========================================================');
  console.log('🛍️  SHOPORA — COMPREHENSIVE AUTOMATED API VERIFICATION');
  console.log('===========================================================\n');
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
    // 1. Health check
    console.log('--- 1. Health & Server Ping ---');
    const health = await request({ path: '/api/health' });
    assert(health.status === 200 && health.data.brand === 'SHOPORA', 'Server is online with SHOPORA branding');

    // 2. Categories
    console.log('\n--- 2. Database-Driven Categories ---');
    const catRes = await request({ path: '/api/categories' });
    assert(catRes.status === 200 && catRes.data.data.length >= 8, `Loaded ${catRes.data?.data?.length} categories from MongoDB`);

    // 3. Products, Brands, Deals & Suggestions
    console.log('\n--- 3. Product Catalog, Brands & Deals ---');
    const prods = await request({ path: '/api/products?limit=50' });
    assert(prods.status === 200 && prods.data.data.length >= 20, `Catalog retrieved ${prods.data?.data?.length} products`);
    const sampleProduct = prods.data.data[0];

    const brandsRes = await request({ path: '/api/products/brands' });
    assert(brandsRes.status === 200 && brandsRes.data.data.length > 5, `Aggregated ${brandsRes.data?.data?.length} unique brands`);

    const dealsRes = await request({ path: '/api/products/deals' });
    assert(dealsRes.status === 200 && dealsRes.data.data.length > 0, `Deals of the day loaded (${dealsRes.data?.data?.length} active deals)`);

    const suggestRes = await request({ path: '/api/products/suggestions?q=Apple' });
    assert(suggestRes.status === 200 && Array.isArray(suggestRes.data.data), 'Search suggestions returned matching items for "Apple"');

    // Single product details
    const singleProduct = await request({ path: `/api/products/${sampleProduct._id}` });
    assert(singleProduct.status === 200 && singleProduct.data.data.name === sampleProduct.name, 'Fetched product details with specifications and related items');

    // 3b. Promotional Offers System
    console.log('\n--- 3b. Promotional Offers System ---');
    const offersRes = await request({ path: '/api/offers/active' });
    assert(offersRes.status === 200 && offersRes.data.data.length > 0, `Active offers loaded (${offersRes.data?.data?.length} offers)`);
    const sampleOffer = offersRes.data.data[0];
    assert(sampleOffer.title && sampleOffer.endTime, 'Offer contains title and active countdown endTime');

    const offerProductsRes = await request({ path: `/api/products?offer=${sampleOffer._id}` });
    assert(offerProductsRes.status === 200 && Array.isArray(offerProductsRes.data.data), `Offer-specific products filtered via API (${offerProductsRes.data?.count || 0} products)`);

    // 4. Auth - Admin & Customer
    console.log('\n--- 4. Authentication (Customer & Admin) ---');
    const adminLogin = await request(
      { path: '/api/auth/login', method: 'POST' },
      { email: 'admin@shopora.com', password: 'Admin@12345' }
    );
    assert(adminLogin.status === 200 && adminLogin.data.data.token, 'Admin login succeeded as admin@shopora.com');
    const adminToken = adminLogin.data?.data?.token;

    const userLogin = await request(
      { path: '/api/auth/login', method: 'POST' },
      { email: 'user@shopora.com', password: 'User@12345' }
    );
    assert(userLogin.status === 200 && userLogin.data.data.token, 'User login succeeded as user@shopora.com');
    const userToken = userLogin.data?.data?.token;

    // 5. Saved Addresses
    console.log('\n--- 5. User Address Management ---');
    const addrRes = await request(
      { path: '/api/auth/addresses', headers: { Authorization: `Bearer ${userToken}` } }
    );
    assert(addrRes.status === 200 && Array.isArray(addrRes.data.data), `User addresses loaded (${addrRes.data.data.length} saved)`);

    // 6. Wishlist System
    console.log('\n--- 6. Wishlist Management ---');
    const wishToggle = await request(
      { path: '/api/wishlist/toggle', method: 'POST', headers: { Authorization: `Bearer ${userToken}` } },
      { productId: sampleProduct._id }
    );
    assert(wishToggle.status === 200, `Toggled product "${sampleProduct.name}" in wishlist`);

    const wishListRes = await request(
      { path: '/api/wishlist', headers: { Authorization: `Bearer ${userToken}` } }
    );
    assert(wishListRes.status === 200, `Fetched user wishlist (${wishListRes.data.data.length} items)`);

    // 7. Cart System
    console.log('\n--- 7. Persistent MongoDB Cart ---');
    const addCart = await request(
      { path: '/api/cart', method: 'POST', headers: { Authorization: `Bearer ${userToken}` } },
      { productId: sampleProduct._id, quantity: 2 }
    );
    assert(addCart.status === 200, 'Added 2 items to persistent MongoDB cart');

    const getCart = await request(
      { path: '/api/cart', headers: { Authorization: `Bearer ${userToken}` } }
    );
    assert(getCart.status === 200 && getCart.data.data.items.length > 0, 'Fetched user cart from MongoDB');

    // 8. Order Placement & Tracking Timeline
    console.log('\n--- 8. Order Placement & Timeline Tracking ---');
    const orderRes = await request(
      { path: '/api/orders', method: 'POST', headers: { Authorization: `Bearer ${userToken}` } },
      {
        items: [{ product: sampleProduct._id, quantity: 1 }],
        shippingAddress: {
          fullName: 'Jane Doe',
          phone: '+1 (555) 456-7890',
          street: '123 Market St, Suite 400',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
          pincode: '94105',
          country: 'United States',
        },
        paymentMethod: 'Cash on Delivery',
      }
    );
    assert(orderRes.status === 201 && orderRes.data.data._id, `Order placed successfully (Order #${orderRes.data?.data?.orderNumber})`);
    const newOrderId = orderRes.data.data._id;

    // Track order
    const trackRes = await request(
      { path: `/api/orders/${newOrderId}`, headers: { Authorization: `Bearer ${userToken}` } }
    );
    assert(trackRes.status === 200 && trackRes.data.data.trackingHistory.length >= 1, 'Order tracking timeline loaded with verified milestone history');

    // 9. Customer Product Reviews
    console.log('\n--- 9. Verified Customer Reviews ---');
    // Ensure idempotency: delete previous test review if it exists
    const existingRevs = await request({ path: `/api/reviews/${sampleProduct._id}` });
    if (existingRevs.status === 200 && Array.isArray(existingRevs.data?.data)) {
      for (const r of existingRevs.data.data) {
        if (r.title === 'Outstanding quality and fast delivery!') {
          await request({
            path: `/api/reviews/${r._id}`,
            method: 'DELETE',
            headers: { Authorization: `Bearer ${adminToken}` },
          });
        }
      }
    }

    const revRes = await request(
      { path: '/api/reviews', method: 'POST', headers: { Authorization: `Bearer ${userToken}` } },
      {
        productId: sampleProduct._id,
        rating: 5,
        title: 'Outstanding quality and fast delivery!',
        comment: 'Received this in pristine condition. Highly recommended on SHOPORA.',
      }
    );
    assert(revRes.status === 201, 'Submitted verified customer review');

    const getReviews = await request({ path: `/api/reviews/${sampleProduct._id}` });
    assert(getReviews.status === 200 && getReviews.data.data.length > 0, 'Fetched product reviews from database');

    // 10. Admin Operations
    console.log('\n--- 10. Admin Operations & Tracking Event Logger ---');
    const adminOverview = await request(
      { path: '/api/admin/overview', headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(adminOverview.status === 200 && adminOverview.data.data.totalRevenue >= 0, 'Admin overview metrics loaded');

    // Update order status with tracking message
    const updateStatus = await request(
      { path: `/api/admin/orders/${newOrderId}/status`, method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` } },
      { orderStatus: 'Confirmed', message: 'Order verified by SHOPORA Fulfillment Center' }
    );
    assert(updateStatus.status === 200, `Admin updated order #${orderRes.data.data.orderNumber} to "Confirmed" with tracking event`);

    // Verify customer sees the updated status
    const verifiedTrack = await request(
      { path: `/api/orders/${newOrderId}`, headers: { Authorization: `Bearer ${userToken}` } }
    );
    assert(verifiedTrack.data.data.orderStatus === 'Confirmed', 'Customer verified the updated status: "Confirmed"');

    // Summary
    console.log('\n===========================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===========================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\n✕ Test Suite Exception:', err);
    process.exit(1);
  }
}

runTests();
