/**
 * SHOPORA — Comprehensive Automated Verification for SHOPORA PRO Membership & Express Delivery
 */

const BASE_URL = 'http://localhost:5050/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
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

async function runTests() {
  console.log('\n===========================================================');
  console.log('👑  SHOPORA PRO & ADVANCED DELIVERY COMPREHENSIVE TEST SUITE');
  console.log('===========================================================\n');

  // Step 1: Customer Login
  console.log('--- 1. Customer Authentication ---');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'user@shopora.com',
      password: 'User@12345',
    }),
  });

  assert(loginRes.ok && loginRes.data.token, 'Customer logged in successfully');
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Step 2: Check Initial Pro Status
  console.log('\n--- 2. Initial Pro Status Check ---');
  const initialStatusRes = await request('/auth/pro/status', {
    headers: authHeaders,
  });
  assert(initialStatusRes.ok && initialStatusRes.data.success, 'Successfully fetched Pro status endpoint');

  // Step 3: Activate 30-Day Free Trial
  console.log('\n--- 3. Activate 30-Day Pro Free Trial ---');
  const activateTrialRes = await request('/auth/pro/activate', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ plan: 'trial' }),
  });

  assert(activateTrialRes.ok && activateTrialRes.data.success, 'Activated 30-Day Free Trial successfully');
  assert(activateTrialRes.data.data.isPro === true, 'Response confirms isPro is true');
  assert(activateTrialRes.data.data.proPlan === 'trial', 'Response confirms proPlan is "trial"');

  // Verify status reflects 30 days remaining
  const trialStatusRes = await request('/auth/pro/status', { headers: authHeaders });
  assert(trialStatusRes.data.data.isPro === true, 'Live status confirms active Pro');
  assert(trialStatusRes.data.data.daysRemaining >= 29, `Days remaining is ${trialStatusRes.data.data.daysRemaining} days`);
  assert(trialStatusRes.data.data.proTrialUsed === true, 'proTrialUsed is set to true');

  // Step 4: Verify Order Placement as Pro Member (Free Express & 5% Discount)
  console.log('\n--- 4. Order Placement with Pro Member Benefits ---');
  
  // Get catalog products to place order
  const productsRes = await request('/products?limit=2');
  assert(productsRes.ok && productsRes.data.data.length > 0, 'Fetched products for checkout');
  const product = productsRes.data.data[0];

  // Fetch address
  const addrRes = await request('/auth/addresses', { headers: authHeaders });
  assert(addrRes.ok && addrRes.data.data.length > 0, 'Fetched saved user shipping address');
  const address = addrRes.data.data[0];

  // Place order with Lightning Express shipping
  const orderRes = await request('/orders', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          product: product._id,
          name: product.name,
          image: product.thumbnail || product.images[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
          price: product.price,
          quantity: 1,
        },
      ],
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1 || address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode || address.pincode,
        country: address.country || 'India',
      },
      paymentMethod: 'Cash on Delivery',
      shippingMethod: 'express',
    }),
  });

  assert(orderRes.ok && orderRes.data.success, `Order placed successfully (#${orderRes.data.data?.orderNumber})`);
  const placedOrder = orderRes.data.data;

  // Verify Pro benefits in order:
  assert(placedOrder.shippingFee === 0, `Free Express Delivery applied (shippingFee is ₹${placedOrder.shippingFee})`);
  assert(placedOrder.isProOrder === true, 'Order flagged with isProOrder: true in MongoDB');
  assert(placedOrder.proDiscount > 0, `Pro 5% Member Discount applied (discount: ₹${placedOrder.proDiscount})`);

  // Verify tracking history notes Pro priority
  const hasProMilestone = placedOrder.trackingHistory && placedOrder.trackingHistory.some(h => (h.message && h.message.includes('SHOPORA PRO')) || (h.description && h.description.includes('SHOPORA PRO')));
  assert(hasProMilestone, 'Order tracking timeline recorded SHOPORA PRO priority dispatch');

  // Step 5: Upgrade to Annual VIP Plan
  console.log('\n--- 5. Upgrade Pro to Annual VIP Plan ---');
  const upgradeAnnualRes = await request('/auth/pro/activate', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ plan: 'annual' }),
  });

  assert(upgradeAnnualRes.ok && upgradeAnnualRes.data.data.proPlan === 'annual', 'Successfully upgraded to Annual VIP plan');
  const annualStatusRes = await request('/auth/pro/status', { headers: authHeaders });
  assert(annualStatusRes.data.data.daysRemaining >= 364, `Annual plan has ${annualStatusRes.data.data.daysRemaining} days remaining`);

  // Step 6: Membership Cancellation
  console.log('\n--- 6. Pro Membership Cancellation ---');
  const cancelRes = await request('/auth/pro/cancel', {
    method: 'POST',
    headers: authHeaders,
  });

  assert(cancelRes.ok && cancelRes.data.success, 'Successfully cancelled Pro membership');
  const postCancelStatus = await request('/auth/pro/status', { headers: authHeaders });
  assert(postCancelStatus.data.data.isPro === false, 'Confirmed isPro is now false after cancellation');

  // Step 7: Order Placement as Non-Pro (Standard Express Fee Applies)
  console.log('\n--- 7. Non-Pro Express Checkout Verification ---');
  const nonProOrderRes = await request('/orders', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          product: product._id,
          name: product.name,
          image: product.thumbnail || product.images[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
          price: product.price,
          quantity: 1,
        },
      ],
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1 || address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode || address.pincode,
        country: address.country || 'India',
      },
      paymentMethod: 'Cash on Delivery',
      shippingMethod: 'express',
    }),
  });

  assert(nonProOrderRes.ok && nonProOrderRes.data.success, `Non-Pro order placed (#${nonProOrderRes.data.data?.orderNumber})`);
  const nonProOrder = nonProOrderRes.data.data;
  assert(nonProOrder.shippingFee === 149, `Standard express delivery charge applied (₹${nonProOrder.shippingFee})`);
  assert(nonProOrder.isProOrder === false, 'Order isProOrder is false');
  assert((nonProOrder.proDiscount || 0) === 0, 'No Pro discount applied');

  // Step 8: Re-activate Pro Monthly for user demo
  console.log('\n--- 8. Re-activating Pro for Customer Showcase ---');
  const reactivateRes = await request('/auth/pro/activate', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ plan: 'monthly' }),
  });
  assert(reactivateRes.ok && reactivateRes.data.data.isPro === true, 'Re-activated Pro so customer account remains primed for demo');

  console.log('\n===========================================================');
  console.log(`🎉 PRO TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
