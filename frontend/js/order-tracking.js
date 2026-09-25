/**
 * SHOPORA — Real-Time Order Tracking Timeline Controller
 * "Discover More. Shop Smarter."
 * Listens to Socket.IO 'order:status_updated' events for seamless live updates.
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Components.renderNavbar('orders');
  Components.renderFooter();

  const container = document.getElementById('tracking-main-content');
  const lookupInput = document.getElementById('tracking-input-id');
  const lookupBtn = document.getElementById('lookup-order-btn');

  let orderId = Utils.getUrlParam('orderId') || Utils.getUrlParam('id');

  if (orderId && lookupInput) {
    lookupInput.value = orderId;
  }

  // Real-time Socket.IO connection
  try {
    if (typeof io !== 'undefined') {
      const socket = io();
      socket.on('order:status_updated', (data) => {
        if (!data) return;
        const targetId = orderId || (lookupInput ? lookupInput.value.trim() : '');
        if (targetId && (data.orderId === targetId || data.id === targetId || data._id === targetId || data.orderNumber === targetId)) {
          Components.showToast(`Order status updated live to: ${data.orderStatus}`, 'info');
          loadOrderTracking(targetId);
        }
      });
    }
  } catch (e) {
    console.warn('[SHOPORA] Socket.IO listener skipped in order tracking:', e);
  }

  const STANDARD_STAGES = [
    { status: 'Order Placed', title: 'Order Placed', desc: 'Order received and payment verification completed.' },
    { status: 'Confirmed', title: 'Order Confirmed', desc: 'Distributor accepted order and reserved genuine inventory.' },
    { status: 'Processing', title: 'Processing Order', desc: 'Quality inspection passed. Package sent to sorting line.' },
    { status: 'Packed', title: 'Items Packed', desc: 'Sealed with tamper-evident security tape in fulfillment center.' },
    { status: 'Shipped', title: 'In Transit', desc: 'Package dispatched with SHOPORA Prime Express courier.' },
    { status: 'Out for Delivery', title: 'Out for Delivery', desc: 'Courier agent is en route to your doorstep.' },
    { status: 'Delivered', title: 'Delivered', desc: 'Package safely delivered to recipient.' },
  ];

  async function loadOrderTracking(id) {
    if (!id) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 24px; background: #ffffff; border-radius: 16px; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-xs);">
          <div style="font-size: 3.5rem; margin-bottom: 12px;">📦</div>
          <h3 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Track Your Package</h3>
          <p style="color: #64748b; max-width: 440px; margin: 0 auto 20px; font-size: 0.925rem;">
            Please enter your SHOPORA Order Number or ID above to inspect your delivery milestone timeline.
          </p>
          <a href="orders.html" class="btn btn-primary">View My Orders History</a>
        </div>
      `;
      return;
    }

    container.innerHTML = `<div class="skeleton" style="height: 380px; border-radius: 16px;"></div>`;

    try {
      const res = await API.get(`/orders/${id}`);
      const order = res.data;
      renderTrackingView(order);
    } catch (err) {
      console.error('Failed to load tracking info:', err);
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #fee2e2;">
          <div style="font-size: 3.5rem; color: #dc2626; margin-bottom: 12px;">⚠️</div>
          <h3 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Order Not Found</h3>
          <p style="color: #64748b; margin-bottom: 24px; font-size: 0.925rem;">
            No order found matching "${id}". Please check the ID or check your orders history.
          </p>
          <a href="orders.html" class="btn btn-outline">Back to My Orders</a>
        </div>
      `;
    }
  }

  function renderTrackingView(order) {
    const isCancelled = order.orderStatus === 'Cancelled';
    const currentStatusIndex = STANDARD_STAGES.findIndex(
      (s) => s.status.toLowerCase() === (order.orderStatus || '').toLowerCase()
    );

    const trackingHistory = order.trackingHistory || [];

    // Map stages with event logs
    const stagesHtml = STANDARD_STAGES.map((stage, idx) => {
      let isCompleted = false;
      let isActive = false;

      if (!isCancelled) {
        if (idx < currentStatusIndex) isCompleted = true;
        else if (idx === currentStatusIndex) isActive = true;
      }

      // Match log from trackingHistory
      const historyLog = trackingHistory.find((h) => (h.status || '').toLowerCase() === stage.status.toLowerCase());
      const eventTime = historyLog ? Utils.formatDate(historyLog.timestamp || historyLog.date) : '';
      const eventMsg = historyLog ? historyLog.message || historyLog.notes || stage.desc : stage.desc;

      return `
        <div class="timeline-step-row ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
          <div class="node-icon">
            ${isCompleted ? '✓' : isActive ? '●' : idx + 1}
          </div>
          <div class="node-content">
            <div class="node-title">
              <span>${stage.title}</span>
              ${eventTime ? `<span class="node-time">${eventTime}</span>` : ''}
            </div>
            <div class="node-desc">${eventMsg}</div>
          </div>
        </div>
      `;
    }).join('');

    const addr = order.shippingAddress || {};

    let statusBadgeColor = 'var(--primary)';
    let statusBg = 'var(--primary-soft)';
    if (order.orderStatus === 'Delivered') {
      statusBadgeColor = '#15803d';
      statusBg = '#dcfce7';
    } else if (isCancelled) {
      statusBadgeColor = '#dc2626';
      statusBg = '#fee2e2';
    }

    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 32px; box-shadow: var(--shadow-xs);">
        <!-- Top header row -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1.5px solid var(--border-subtle);">
          <div>
            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary); font-weight: 800; margin-bottom: 4px;">
              Live Tracking &middot; SHOPORA Prime
            </div>
            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">
              Order #${order.orderNumber || order._id}
            </h2>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              Placed on ${Utils.formatDate(order.createdAt)}
            </div>
          </div>

          <div style="text-align: right;">
            <span style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-weight: 800; font-size: 0.85rem; color: ${statusBadgeColor}; background: ${statusBg};">
              ${order.orderStatus}
            </span>
            <div style="font-size: 0.825rem; color: var(--text-muted); margin-top: 6px;">
              Carrier: <strong>${order.carrier || 'SHOPORA Express'}</strong>
            </div>
          </div>
        </div>

        <!-- Cancellation Notice if applicable -->
        ${
          isCancelled
            ? `
          <div style="padding: 16px 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-weight: 700; margin-bottom: 24px;">
            This order was cancelled. Reason: ${order.cancelReason || 'Customer requested or stock unavailable'}.
          </div>
        `
            : `
          <!-- Timeline -->
          <div style="margin: 28px 0 32px;">
            ${stagesHtml}
          </div>
        `
        }

        <!-- Delivery Destination & Payment Breakdown -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; padding-top: 20px; border-top: 1.5px solid var(--border-subtle);">
          <div>
            <strong style="display: block; font-size: 0.9rem; color: var(--text-main); margin-bottom: 6px;">Shipping Destination</strong>
            <div style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5;">
              <strong>${addr.fullName || 'Recipient'}</strong><br />
              ${addr.addressLine1 || addr.street || ''}, ${addr.city || ''}<br />
              ${addr.state || ''} ${addr.pincode || addr.postalCode || ''}<br />
              Phone: ${addr.phone || 'N/A'}
            </div>
          </div>

          <div>
            <strong style="display: block; font-size: 0.9rem; color: var(--text-main); margin-bottom: 6px;">Payment &amp; Billing</strong>
            <div style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5;">
              Method: <strong>${order.paymentMethod || 'Cash on Delivery'}</strong><br />
              Status: <span style="font-weight: 700; color: ${order.paymentStatus === 'Paid' ? '#16a34a' : '#ea580c'};">${order.paymentStatus}</span><br />
              Order Total: <strong style="color: var(--primary); font-size: 1.1rem;">${Utils.formatPrice(order.totalAmount || order.total || 0)}</strong>
            </div>
          </div>
        </div>

        <!-- Ordered Items Breakdown Table -->
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1.5px solid var(--border-subtle);">
          <strong style="display: block; font-size: 0.95rem; color: var(--text-main); margin-bottom: 12px;">Package Contents</strong>
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Brand</th>
                <th>Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || [])
                .map(
                  (item) => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px; border: 1px solid var(--border-subtle); background: #ffffff;" onerror="Utils.imgFallback(this)" />` : ''}
                      <span style="font-weight: 700; color: var(--text-main);">${item.name || item.product?.name || 'Product'}</span>
                    </div>
                  </td>
                  <td style="color: var(--text-muted);">${item.brand || 'Official'}</td>
                  <td>${item.quantity}</td>
                  <td style="text-align: right; color: var(--text-muted);">${Utils.formatPrice(item.price || item.finalPrice)}</td>
                  <td style="text-align: right; font-weight: 800; color: var(--text-main);">${Utils.formatPrice((item.price || item.finalPrice) * item.quantity)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        <!-- Actions & Navigation Footer -->
        <div style="margin-top: 28px; padding-top: 20px; border-top: 1.5px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <a href="orders.html" class="btn btn-primary" style="padding: 12px 22px; font-weight: 800; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
            📦 Go to My Orders &rarr;
          </a>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="products.html" class="btn btn-outline" style="padding: 12px 18px; font-weight: 700;">
              🛍️ Continue Shopping
            </a>
            <button type="button" class="btn btn-outline" onclick="window.print()" style="padding: 12px 16px; font-weight: 700;">
              🖨️ Print Tracking Log
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Lookup button click & enter press
  if (lookupBtn && lookupInput) {
    lookupBtn.addEventListener('click', () => {
      const q = lookupInput.value.trim();
      if (q) {
        orderId = q;
        loadOrderTracking(orderId);
      }
    });

    lookupInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const q = lookupInput.value.trim();
        if (q) {
          orderId = q;
          loadOrderTracking(orderId);
        }
      }
    });
  }

  loadOrderTracking(orderId);
});
