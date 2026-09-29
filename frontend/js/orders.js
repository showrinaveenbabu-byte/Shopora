/**
 * SHOPORA — Orders List & Invoice Controller
 * "Discover More. Shop Smarter."
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Components.renderNavbar('orders');
  Components.renderFooter();

  if (!Auth.isAuthenticated()) {
    Components.showToast('Please log in to view your orders', 'warning');
    setTimeout(() => {
      window.location.href = `login.html?redirect=orders.html`;
    }, 600);
    return;
  }

  const listTarget = document.getElementById('orders-list-target');
  const invoiceModal = document.getElementById('invoice-modal');
  const invoiceArea = document.getElementById('invoice-printable-area');

  let ordersCache = [];

  async function loadOrders() {
    try {
      const res = await API.get('/orders');
      const orders = res.data || [];
      ordersCache = orders;

      if (orders.length === 0) {
        listTarget.innerHTML = `
          <div style="text-align: center; padding: 70px 24px; background: #ffffff; border-radius: 16px; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-xs);">
            <div style="font-size: 3.5rem; margin-bottom: 12px;">📦</div>
            <h3 style="font-size: 1.4rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">You haven't placed an order yet.</h3>
            <p style="color: #64748b; max-width: 440px; margin: 0 auto 24px; font-size: 0.95rem;">
              When you complete a purchase, your shipment tracking, delivery updates, and tax invoices will appear right here.
            </p>
            <a href="products.html" class="btn btn-primary">Browse Products &rarr;</a>
          </div>
        `;
        return;
      }

      listTarget.innerHTML = orders
        .map((order) => {
          const orderNum = order.orderNumber || order._id.slice(-8).toUpperCase();
          const addr = order.shippingAddress || {};
          const isCancellable = ['Order Placed', 'Confirmed'].includes(order.orderStatus);

          let statusBadgeStyle = 'color: var(--primary); background: var(--primary-soft);';
          if (order.orderStatus === 'Delivered') {
            statusBadgeStyle = 'color: #15803d; background: #dcfce7;';
          } else if (order.orderStatus === 'Cancelled') {
            statusBadgeStyle = 'color: #dc2626; background: #fee2e2;';
          }

          return `
          <div class="order-card" data-id="${order._id}">
            <div class="order-card-header">
              <div class="order-header-metric">
                <span>Order Placed</span>
                <strong>${Utils.formatDate(order.createdAt)}</strong>
              </div>
              <div class="order-header-metric">
                <span>Total Amount</span>
                <strong style="color: var(--primary);">${Utils.formatPrice(order.totalAmount || order.total || 0)}</strong>
              </div>
              <div class="order-header-metric">
                <span>Ship To</span>
                <strong>${addr.fullName || 'Customer'}</strong>
              </div>
              <div class="order-header-metric" style="text-align: right;">
                <span>Order #</span>
                <strong style="color: var(--text-main); font-family: monospace;">${orderNum}</strong>
              </div>
            </div>

            <div class="order-card-body">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 800; font-size: 0.8rem; ${statusBadgeStyle}">
                    ● ${order.orderStatus}
                  </span>
                  <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">
                    Carrier: <strong>${order.carrier || 'SHOPORA Express'}</strong>
                  </span>
                </div>
                <span style="font-size: 0.825rem; color: var(--text-muted);">
                  Payment: <strong>${order.paymentMethod}</strong> &middot; <span style="font-weight: 800; color: ${order.paymentStatus && (order.paymentStatus.includes('Completed') || order.paymentStatus.includes('Paid')) ? '#16a34a' : '#b45309'};">${order.paymentStatus}</span>
                </span>
              </div>

              ${(order.items || [])
                .map(
                  (item) => `
                <div class="order-item-row">
                  <img src="${item.image}" alt="${item.name}" class="order-item-img" onerror="Utils.imgFallback(this)" />
                  <div style="flex: 1; min-width: 0;">
                    ${item.brand ? `<div style="font-size: 0.75rem; font-weight: 700; color: var(--primary); text-transform: uppercase;">${item.brand}</div>` : ''}
                    <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin: 2px 0;">
                      ${item.name || item.product?.name || 'Product'}
                    </h4>
                    <div style="font-size: 0.825rem; color: var(--text-muted);">
                      Qty: ${item.quantity} &times; ${Utils.formatPrice(item.price || item.finalPrice)}
                    </div>
                  </div>
                  <div style="font-weight: 800; color: var(--text-main); font-size: 1rem;">
                    ${Utils.formatPrice((item.price || item.finalPrice) * item.quantity)}
                  </div>
                </div>
              `
                )
                .join('')}
            </div>

            <div class="order-card-footer">
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <a href="order-tracking.html?orderId=${order._id}" class="btn btn-primary btn-sm">
                  📍 Track Order
                </a>
                <button class="btn btn-outline btn-sm view-invoice-btn" data-id="${order._id}">
                  📄 View Invoice
                </button>
              </div>

              ${
                isCancellable
                  ? `
                <button class="btn btn-danger btn-sm cancel-order-btn" data-id="${order._id}" style="padding: 6px 14px; font-size: 0.8rem;">
                  ✕ Cancel Order
                </button>
              `
                  : ''
              }
            </div>
          </div>
        `;
        })
        .join('');

      attachOrderEvents();
    } catch (err) {
      console.error('Failed to load orders:', err);
      listTarget.innerHTML = `
        <div style="text-align: center; padding: 48px; background: #ffffff; border-radius: 16px; border: 1px solid #fee2e2;">
          <p style="color: #dc2626; font-weight: 700; margin-bottom: 12px;">Failed to load order history. Please try again.</p>
          <button class="btn btn-outline btn-sm" onclick="location.reload()">Retry Connection</button>
        </div>
      `;
    }
  }

  function attachOrderEvents() {
    // Invoice view clicker
    document.querySelectorAll('.view-invoice-btn').forEach((btn) => {
      btn.onclick = () => {
        const oId = btn.dataset.id;
        const order = ordersCache.find((o) => o._id === oId);
        if (order) showInvoiceModal(order);
      };
    });

    // Cancel order clicker
    document.querySelectorAll('.cancel-order-btn').forEach((btn) => {
      btn.onclick = () => {
        const oId = btn.dataset.id;
        Components.confirmModal({
          title: 'Cancel Order',
          message: 'Are you sure you want to cancel this order? This action cannot be reversed.',
          confirmText: 'Yes, Cancel Order',
          cancelText: 'Keep Order',
          onConfirm: async () => {
            try {
              const res = await API.put(`/orders/${oId}/cancel`, {
                reason: 'Customer requested cancellation via portal',
              });
              if (res.success) {
                Components.showToast('Order has been cancelled successfully', 'info');
                loadOrders();
              } else {
                Components.showToast(res.message || 'Could not cancel order', 'error');
              }
            } catch (e) {
              Components.showToast(e.message || 'Error cancelling order', 'error');
            }
          },
        });
      };
    });
  }

  function showInvoiceModal(order) {
    if (!invoiceModal || !invoiceArea) return;
    const addr = order.shippingAddress || {};

    invoiceArea.innerHTML = `
      <div style="border-bottom: 2px solid var(--border-subtle); padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--primary);">SHOPORA</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">Official Tax Invoice &amp; Fulfillment Receipt</div>
        </div>
        <div style="text-align: right; font-size: 0.85rem;">
          <strong>Invoice #: INV-${order.orderNumber || order._id.slice(-8).toUpperCase()}</strong>
          <div style="color: var(--text-muted);">${Utils.formatDate(order.createdAt)}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; font-size: 0.875rem;">
        <div>
          <strong style="color: var(--text-main); display: block; margin-bottom: 4px;">Billed &amp; Shipped To:</strong>
          <div style="color: var(--text-secondary); line-height: 1.4;">
            ${addr.fullName || 'Recipient'}<br />
            ${addr.addressLine1 || addr.street || ''}<br />
            ${addr.city || ''}, ${addr.state || ''} ${addr.pincode || addr.postalCode || ''}<br />
            Phone: ${addr.phone || 'N/A'}
          </div>
        </div>
        <div>
          <strong style="color: var(--text-main); display: block; margin-bottom: 4px;">Payment Summary:</strong>
          <div style="color: var(--text-secondary); line-height: 1.4;">
            Method: <strong>${order.paymentMethod}</strong><br />
            Status: <strong>${order.paymentStatus}</strong><br />
            Carrier: <strong>${order.carrier || 'SHOPORA Express'}</strong>
          </div>
        </div>
      </div>

      <table class="data-table" style="margin-bottom: 20px;">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(order.items || [])
            .map(
              (i) => `
            <tr>
              <td><strong>${i.name}</strong></td>
              <td>${i.quantity}</td>
              <td style="text-align: right;">${Utils.formatPrice(i.price || i.finalPrice)}</td>
              <td style="text-align: right; font-weight: 700;">${Utils.formatPrice((i.price || i.finalPrice) * i.quantity)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; font-size: 1rem; font-weight: 800; color: var(--text-main);">
        Total Paid:&nbsp;<span style="color: var(--primary);">${Utils.formatPrice(order.totalAmount || order.total || 0)}</span>
      </div>
    `;

    invoiceModal.style.display = 'flex';

    const closeBtn = document.getElementById('close-invoice-btn');
    if (closeBtn) closeBtn.onclick = () => (invoiceModal.style.display = 'none');

    const printBtn = document.getElementById('print-invoice-btn');
    if (printBtn) {
      printBtn.onclick = () => {
        window.print();
      };
    }
  }

  loadOrders();
});
