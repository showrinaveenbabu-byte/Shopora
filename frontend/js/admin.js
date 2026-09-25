/**
 * SHOPORA — Admin Operations Console Controller
 * "Discover More. Shop Smarter."
 * Full CRUD for Products, Categories, Orders with Socket.IO status emission, and User roles.
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Components.renderNavbar('admin');
  Components.renderFooter();

  if (!Auth.requireAdmin()) return;

  // Tabs
  const tabBtns = document.querySelectorAll('.admin-tab-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabKey = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(`pane-${tabKey}`);
      if (targetPane) targetPane.classList.add('active');

      if (tabKey === 'overview') loadOverview();
      if (tabKey === 'products') loadProducts();
      if (tabKey === 'categories') loadCategories();
      if (tabKey === 'orders') loadOrders();
      if (tabKey === 'users') loadUsers();
      if (tabKey === 'deals') loadDeals();
      if (tabKey === 'reviews') loadReviews();
    });
  });

  // Cached data
  let productsCache = [];
  let categoriesCache = [];
  let ordersCache = [];

  // ==========================================
  // TAB 1: OVERVIEW METRICS
  // ==========================================
  async function loadOverview() {
    const metricsGrid = document.getElementById('overview-metrics-grid');
    const recentTbody = document.getElementById('overview-orders-tbody');

    try {
      const res = await API.get('/admin/overview');
      const d = res.data;

      metricsGrid.innerHTML = `
        <div class="admin-stat-card">
          <div>
            <div class="stat-label">Total Revenue</div>
            <div class="stat-value" style="color: var(--primary);">${Utils.formatPrice(d.totalRevenue || 0)}</div>
          </div>
          <div class="stat-icon-wrap">💰</div>
        </div>
        <div class="admin-stat-card">
          <div>
            <div class="stat-label">Total Orders</div>
            <div class="stat-value">${d.totalOrders || 0}</div>
          </div>
          <div class="stat-icon-wrap">📦</div>
        </div>
        <div class="admin-stat-card">
          <div>
            <div class="stat-label">Active Catalog</div>
            <div class="stat-value">${d.totalProducts || 0}</div>
          </div>
          <div class="stat-icon-wrap">🏷️</div>
        </div>
        <div class="admin-stat-card">
          <div>
            <div class="stat-label">Registered Customers</div>
            <div class="stat-value">${d.totalUsers || 0}</div>
          </div>
          <div class="stat-icon-wrap">👥</div>
        </div>
        <div class="admin-stat-card">
          <div>
            <div class="stat-label">Active Deals</div>
            <div class="stat-value" style="color: #dc2626;">${d.activeDeals || 0}</div>
          </div>
          <div class="stat-icon-wrap">🔥</div>
        </div>
        <div class="admin-stat-card">
          <div>
            <div class="stat-label">Pending Orders</div>
            <div class="stat-value" style="color: #2563eb;">${d.pendingOrders || 0}</div>
          </div>
          <div class="stat-icon-wrap">⏳</div>
        </div>
        <div class="admin-stat-card">
          <div>
            <div class="stat-label">Delivered Orders</div>
            <div class="stat-value" style="color: #16a34a;">${d.deliveredOrders || 0}</div>
          </div>
          <div class="stat-icon-wrap">✓</div>
        </div>
        <div class="admin-stat-card">
          <div>
            <div class="stat-label">Low Stock Alerts</div>
            <div class="stat-value" style="color: ${d.lowStockCount > 0 ? '#ea580c' : 'var(--text-main)'};">${d.lowStockCount || 0}</div>
          </div>
          <div class="stat-icon-wrap">⚠️</div>
        </div>
      `;

      if (d.recentOrders && d.recentOrders.length > 0) {
        recentTbody.innerHTML = d.recentOrders
          .map((o) => {
            const num = o.orderNumber || o._id.slice(-8).toUpperCase();
            const cust = o.user?.name || o.shippingAddress?.fullName || 'Customer';
            return `
            <tr>
              <td>
                <a href="order-tracking.html?orderId=${o._id}" style="color: var(--primary); font-weight: 700; font-family: monospace;">
                  #${num}
                </a>
              </td>
              <td style="font-weight: 700; color: var(--text-main);">${cust}</td>
              <td style="color: var(--text-muted);">${Utils.formatDate(o.createdAt)}</td>
              <td style="font-weight: 800; color: var(--text-main);">${Utils.formatPrice(o.totalAmount || o.total || 0)}</td>
              <td>${o.paymentMethod || 'COD'}</td>
              <td>
                <span style="font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 9999px; background: var(--primary-soft); color: var(--primary);">
                  ${o.orderStatus}
                </span>
              </td>
              <td style="text-align: right;">
                <a href="order-tracking.html?orderId=${o._id}" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 4px 10px;">
                  Timeline
                </a>
              </td>
            </tr>
          `;
          })
          .join('');
      } else {
        recentTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No orders recorded yet.</td></tr>`;
      }
    } catch (err) {
      console.error('Error loading overview:', err);
      Components.showToast('Failed to load overview data', 'error');
    }
  }

  // ==========================================
  // TAB 2: PRODUCTS CRUD & INSTANT TOGGLES
  // ==========================================
  const prodTbody = document.getElementById('products-admin-tbody');
  const prodCountEl = document.getElementById('products-metric-count');
  const btnCreateProd = document.getElementById('btn-create-product');
  const prodModal = document.getElementById('product-modal-backdrop');
  const closeProdModal = document.getElementById('close-prod-modal-btn');
  const cancelProdModal = document.getElementById('cancel-prod-modal-btn');
  const prodForm = document.getElementById('product-admin-form');
  const prodModalTitle = document.getElementById('prod-modal-title');

  const inProdId = document.getElementById('admin-prod-id');
  const inProdName = document.getElementById('admin-prod-name');
  const inProdBrand = document.getElementById('admin-prod-brand');
  const inProdCat = document.getElementById('admin-prod-category');
  const inProdPrice = document.getElementById('admin-prod-price');
  const inProdDiscount = document.getElementById('admin-prod-discount');
  const inProdStock = document.getElementById('admin-prod-stock');
  const inProdImage = document.getElementById('admin-prod-image');
  const inProdDesc = document.getElementById('admin-prod-desc');
  const inProdPremium = document.getElementById('admin-prod-premium');
  const inProdTrending = document.getElementById('admin-prod-trending');
  const inProdDeal = document.getElementById('admin-prod-deal');

  async function populateCategoryDropdown() {
    try {
      const res = await API.get('/categories');
      categoriesCache = res.data || [];
      inProdCat.innerHTML = categoriesCache
        .map(
          (c) => `
        <option value="${c._id}">${c.name}</option>
      `
        )
        .join('');
    } catch (err) {
      console.warn('Failed to populate categories:', err);
    }
  }

  function openProductModal(isEdit = false, prod = null) {
    prodForm.reset();
    populateCategoryDropdown();

    if (isEdit && prod) {
      prodModalTitle.textContent = 'Edit Product';
      inProdId.value = prod._id;
      inProdName.value = prod.name;
      inProdBrand.value = prod.brand || '';
      inProdCat.value = prod.category?._id || prod.category || '';
      inProdPrice.value = prod.price;
      inProdDiscount.value = prod.discountPercentage || prod.discount || 0;
      inProdStock.value = prod.stock;
      inProdImage.value = prod.image || (prod.images && prod.images[0]) || '';
      inProdDesc.value = prod.description || '';
      inProdPremium.checked = !!prod.isPremium;
      inProdTrending.checked = !!prod.isTrending;
      inProdDeal.checked = !!prod.isDeal;
    } else {
      prodModalTitle.textContent = 'Add New Product';
      inProdId.value = '';
      inProdBrand.value = 'SHOPORA Select';
      inProdPrice.value = '999';
      inProdDiscount.value = '0';
      inProdStock.value = '25';
      inProdImage.value =
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';
    }

    prodModal.style.display = 'flex';
  }

  if (btnCreateProd) btnCreateProd.onclick = () => openProductModal(false);
  if (closeProdModal) closeProdModal.onclick = () => (prodModal.style.display = 'none');
  if (cancelProdModal) cancelProdModal.onclick = () => (prodModal.style.display = 'none');

  if (prodForm) {
    prodForm.onsubmit = async (e) => {
      e.preventDefault();
      const id = inProdId.value;
      const payload = {
        name: inProdName.value.trim(),
        brand: inProdBrand.value.trim(),
        category: inProdCat.value,
        price: Number(inProdPrice.value),
        discount: Number(inProdDiscount.value),
        discountPercentage: Number(inProdDiscount.value),
        stock: Number(inProdStock.value),
        image: inProdImage.value.trim(),
        images: [inProdImage.value.trim()],
        description: inProdDesc.value.trim(),
        isPremium: inProdPremium.checked,
        isTrending: inProdTrending.checked,
        isDeal: inProdDeal.checked,
      };

      try {
        if (id) {
          await API.put(`/products/${id}`, payload);
          Components.showToast('Product updated successfully!', 'success');
        } else {
          await API.post('/products', payload);
          Components.showToast('New product added to catalog!', 'success');
        }
        prodModal.style.display = 'none';
        await loadProducts();
      } catch (err) {
        console.error('Failed to save product:', err);
        Components.showToast(err.message || 'Failed to save product', 'error');
      }
    };
  }

  async function loadProducts() {
    try {
      const res = await API.get('/products?limit=200');
      productsCache = res.data || [];
      prodCountEl.textContent = `Catalog: ${productsCache.length} active products`;

      prodTbody.innerHTML = productsCache
        .map((p) => {
          const catName = p.category?.name || p.category || 'General';
          const isLowStock = p.stock <= 5;
          const discount = p.discountPercentage || p.discount || 0;

          return `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <img src="${p.image}" alt="${p.name}" style="width: 44px; height: 44px; object-fit: contain; border-radius: 4px; border: 1px solid var(--border-subtle); background: #ffffff;" onerror="Utils.imgFallback(this)" />
                <div>
                  <div style="font-weight: 700; color: var(--text-main); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${p.name}
                  </div>
                  <small style="color: var(--text-muted); font-size: 0.75rem;">SKU: ${p.sku || 'N/A'}</small>
                </div>
              </div>
            </td>
            <td style="color: var(--primary); font-weight: 700;">${p.brand || 'Official'}</td>
            <td><span style="font-size: 0.8rem; background: var(--bg-subtle); padding: 3px 8px; border-radius: 4px;">${catName}</span></td>
            <td>
              <strong style="color: var(--text-main);">${Utils.formatPrice(p.finalPrice || p.price)}</strong>
              ${discount > 0 ? `<small style="color: #16a34a; font-weight: 700; margin-left: 4px;">(-${discount}%)</small>` : ''}
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: 800; color: ${isLowStock ? '#dc2626' : '#16a34a'};">
                  ${p.stock} ${isLowStock ? '⚠️' : ''}
                </span>
                <button class="btn btn-outline btn-sm quick-stock-btn" data-id="${p._id}" data-stock="${p.stock}" style="padding: 2px 6px; font-size: 0.7rem;" title="Adjust Stock">
                  ✏️
                </button>
              </div>
            </td>
            <td>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="toggle-switch-btn ${p.isPremium ? 'active' : 'inactive'} toggle-prem-btn" data-id="${p._id}" title="Toggle Premium">
                  👑 Prem: ${p.isPremium ? 'ON' : 'OFF'}
                </button>
                <button class="toggle-switch-btn ${p.isTrending ? 'active' : 'inactive'} toggle-trend-btn" data-id="${p._id}" title="Toggle Trending">
                  🔥 Trend: ${p.isTrending ? 'ON' : 'OFF'}
                </button>
                <button class="toggle-switch-btn ${p.isDeal ? 'active' : 'inactive'} toggle-deal-btn" data-id="${p._id}" title="Toggle Deal">
                  ⚡ Deal: ${p.isDeal ? 'ON' : 'OFF'}
                </button>
              </div>
            </td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 6px;">
                <button class="btn btn-outline btn-sm edit-prod-btn" data-id="${p._id}" style="padding: 4px 8px; font-size: 0.78rem;">Edit</button>
                <button class="btn btn-outline btn-sm del-prod-btn" data-id="${p._id}" style="padding: 4px 8px; font-size: 0.78rem; color: var(--danger); border-color: #fecaca;">Del</button>
              </div>
            </td>
          </tr>
        `;
        })
        .join('');

      attachProductRowEvents();
    } catch (err) {
      console.error('Failed to load products:', err);
      prodTbody.innerHTML = `<tr><td colspan="7" style="color: #dc2626; text-align: center;">Error loading products.</td></tr>`;
    }
  }

  function attachProductRowEvents() {
    // Quick Stock Adjust
    prodTbody.querySelectorAll('.quick-stock-btn').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const currentStock = btn.dataset.stock;
        const newStockStr = prompt(`Update stock count (current: ${currentStock}):`, currentStock);
        if (newStockStr !== null) {
          const newStock = parseInt(newStockStr, 10);
          if (!isNaN(newStock) && newStock >= 0) {
            try {
              await API.put(`/admin/products/${id}/stock`, { stock: newStock });
              Components.showToast(`Stock updated to ${newStock}`, 'success');
              loadProducts();
            } catch (e) {
              Components.showToast('Failed to update stock', 'error');
            }
          }
        }
      };
    });

    // Premium Toggle
    prodTbody.querySelectorAll('.toggle-prem-btn').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try {
          const res = await API.put(`/admin/products/${id}/toggle-premium`);
          Components.showToast(`Premium status: ${res.data.isPremium ? 'ACTIVATED' : 'DEACTIVATED'}`, 'success');
          loadProducts();
        } catch (e) {
          Components.showToast('Failed to toggle premium', 'error');
        }
      };
    });

    // Trending Toggle
    prodTbody.querySelectorAll('.toggle-trend-btn').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try {
          const res = await API.put(`/admin/products/${id}/toggle-trending`);
          Components.showToast(`Trending status: ${res.data.isTrending ? 'ACTIVATED' : 'DEACTIVATED'}`, 'success');
          loadProducts();
        } catch (e) {
          Components.showToast('Failed to toggle trending', 'error');
        }
      };
    });

    // Deal Toggle
    prodTbody.querySelectorAll('.toggle-deal-btn').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try {
          const res = await API.put(`/admin/products/${id}/toggle-deal`);
          Components.showToast(`Deal status: ${res.data.isDeal ? 'ACTIVATED' : 'DEACTIVATED'}`, 'success');
          loadProducts();
        } catch (e) {
          Components.showToast('Failed to toggle deal', 'error');
        }
      };
    });

    // Edit Product
    prodTbody.querySelectorAll('.edit-prod-btn').forEach((btn) => {
      btn.onclick = () => {
        const prod = productsCache.find((p) => p._id === btn.dataset.id);
        if (prod) openProductModal(true, prod);
      };
    });

    // Delete Product
    prodTbody.querySelectorAll('.del-prod-btn').forEach((btn) => {
      btn.onclick = () => {
        const prod = productsCache.find((p) => p._id === btn.dataset.id);
        if (!prod) return;
        Components.confirmModal({
          title: 'Delete Product?',
          message: `Are you sure you want to permanently delete "${prod.name}" from MongoDB?`,
          confirmText: 'Yes, Delete Permanently',
          onConfirm: async () => {
            try {
              await API.delete(`/products/${prod._id}`);
              Components.showToast('Product deleted from database', 'info');
              await loadProducts();
            } catch (err) {
              Components.showToast(err.message || 'Failed to delete product', 'error');
            }
          },
        });
      };
    });
  }

  // ==========================================
  // TAB 3: CATEGORIES CRUD
  // ==========================================
  const catTbody = document.getElementById('categories-admin-tbody');
  const btnCreateCat = document.getElementById('btn-create-category');
  const catModal = document.getElementById('category-modal-backdrop');
  const closeCatModal = document.getElementById('close-cat-modal-btn');
  const cancelCatModal = document.getElementById('cancel-cat-modal-btn');
  const catForm = document.getElementById('category-admin-form');
  const catModalTitle = document.getElementById('cat-modal-title');

  const inCatId = document.getElementById('admin-cat-id');
  const inCatName = document.getElementById('admin-cat-name');
  const inCatIcon = document.getElementById('admin-cat-icon');
  const inCatDesc = document.getElementById('admin-cat-desc');

  function openCategoryModal(isEdit = false, cat = null) {
    catForm.reset();
    if (isEdit && cat) {
      catModalTitle.textContent = 'Edit Category';
      inCatId.value = cat._id;
      inCatName.value = cat.name;
      inCatIcon.value = cat.icon || '';
      inCatDesc.value = cat.description || '';
    } else {
      catModalTitle.textContent = 'Create Category';
      inCatId.value = '';
    }
    catModal.style.display = 'flex';
  }

  if (btnCreateCat) btnCreateCat.onclick = () => openCategoryModal(false);
  if (closeCatModal) closeCatModal.onclick = () => (catModal.style.display = 'none');
  if (cancelCatModal) cancelCatModal.onclick = () => (catModal.style.display = 'none');

  if (catForm) {
    catForm.onsubmit = async (e) => {
      e.preventDefault();
      const id = inCatId.value;
      const payload = {
        name: inCatName.value.trim(),
        icon: inCatIcon.value.trim() || '🏷️',
        description: inCatDesc.value.trim(),
      };

      try {
        if (id) {
          await API.put(`/categories/${id}`, payload);
          Components.showToast('Category updated!', 'success');
        } else {
          await API.post('/categories', payload);
          Components.showToast('Category created!', 'success');
        }
        catModal.style.display = 'none';
        await loadCategories();
      } catch (err) {
        Components.showToast(err.message || 'Error saving category', 'error');
      }
    };
  }

  async function loadCategories() {
    try {
      const res = await API.get('/categories');
      categoriesCache = res.data || [];

      catTbody.innerHTML = categoriesCache
        .map(
          (c) => `
        <tr>
          <td style="font-size: 1.5rem;">${c.icon || '🏷️'}</td>
          <td style="font-weight: 700; color: var(--text-main);">${c.name}</td>
          <td><code style="color: var(--primary);">${c.slug}</code></td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">${c.description || 'No description'}</td>
          <td style="text-align: right;">
            <button class="btn btn-outline btn-sm edit-cat-btn" data-id="${c._id}" style="padding: 4px 8px; font-size: 0.78rem;">Edit</button>
          </td>
        </tr>
      `
        )
        .join('');

      catTbody.querySelectorAll('.edit-cat-btn').forEach((btn) => {
        btn.onclick = () => {
          const cat = categoriesCache.find((c) => c._id === btn.dataset.id);
          if (cat) openCategoryModal(true, cat);
        };
      });
    } catch (err) {
      console.warn(err);
    }
  }

  // ==========================================
  // TAB 4: ORDERS & STATUS UPDATES (SOCKET.IO)
  // ==========================================
  const ordersTbody = document.getElementById('orders-admin-tbody');
  const ordersMetricEl = document.getElementById('orders-metric-count');
  const ordersFilterSelect = document.getElementById('orders-filter-select');

  async function loadOrders(filterStatus = 'All') {
    try {
      const res = await API.get('/orders');
      ordersCache = res.data || [];

      let filtered = ordersCache;
      if (filterStatus !== 'All') {
        filtered = ordersCache.filter((o) => o.orderStatus === filterStatus);
      }

      ordersMetricEl.textContent = `Fulfillment Queue: ${filtered.length} orders`;

      ordersTbody.innerHTML = filtered
        .map((o) => {
          const num = o.orderNumber || o._id.slice(-8).toUpperCase();
          const cust = o.user?.name || o.shippingAddress?.fullName || 'Customer';
          const totalItems = (o.items || []).reduce((acc, i) => acc + i.quantity, 0);

          return `
          <tr>
            <td>
              <a href="order-tracking.html?orderId=${o._id}" style="font-family: monospace; font-weight: 700; color: var(--primary);">
                #${num}
              </a>
            </td>
            <td style="color: var(--text-muted); font-size: 0.825rem;">${Utils.formatDate(o.createdAt)}</td>
            <td style="font-weight: 700; color: var(--text-main);">${cust}</td>
            <td>${totalItems} items</td>
            <td style="font-weight: 800; color: var(--text-main);">${Utils.formatPrice(o.totalAmount || o.total || 0)}</td>
            <td>
              <select class="form-control status-select" data-id="${o._id}" style="padding: 4px 8px; font-size: 0.8rem; width: auto;">
                ${['Order Placed', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']
                  .map(
                    (st) => `
                  <option value="${st}" ${o.orderStatus === st ? 'selected' : ''}>${st}</option>
                `
                  )
                  .join('')}
              </select>
            </td>
            <td style="text-align: right;">
              <a href="order-tracking.html?orderId=${o._id}" class="btn btn-outline btn-sm" style="padding: 4px 8px; font-size: 0.78rem;">
                Tracker
              </a>
            </td>
          </tr>
        `;
        })
        .join('');

      // Status change listener (Triggers Socket.IO update)
      ordersTbody.querySelectorAll('.status-select').forEach((sel) => {
        sel.addEventListener('change', async (e) => {
          const orderId = sel.dataset.id;
          const newStatus = e.target.value;

          try {
            const res = await API.put(`/orders/${orderId}/status`, {
              status: newStatus,
              location: 'SHOPORA Primary Fulfillment Hub',
              message: `Status updated by administrator to ${newStatus}`,
            });

            if (res.success) {
              Components.showToast(`Order #${orderId.slice(-6)} status updated to "${newStatus}"! Broadcasted live.`, 'success');
              loadOrders(ordersFilterSelect.value);
            } else {
              Components.showToast(res.message || 'Status update failed', 'error');
            }
          } catch (err) {
            Components.showToast(err.message || 'Error updating status', 'error');
          }
        });
      });
    } catch (err) {
      console.warn(err);
    }
  }

  if (ordersFilterSelect) {
    ordersFilterSelect.addEventListener('change', (e) => {
      loadOrders(e.target.value);
    });
  }

  // ==========================================
  // TAB 5: USERS MANAGEMENT
  // ==========================================
  const usersTbody = document.getElementById('users-admin-tbody');

  async function loadUsers() {
    try {
      const res = await API.get('/admin/users');
      const users = res.data || [];

      usersTbody.innerHTML = users
        .map((u) => {
          const isAdm = u.role === 'admin';
          return `
          <tr>
            <td style="font-weight: 700; color: var(--text-main);">${u.name}</td>
            <td>${u.email}</td>
            <td style="color: var(--text-muted);">${u.phone || 'N/A'}</td>
            <td>
              <span style="font-size: 0.75rem; font-weight: 800; padding: 3px 8px; border-radius: 9999px; ${
                isAdm ? 'background: var(--primary-soft); color: var(--primary);' : 'background: var(--bg-subtle); color: var(--text-muted);'
              }">
                ${u.role.toUpperCase()}
              </span>
            </td>
            <td style="color: var(--text-muted); font-size: 0.825rem;">${Utils.formatDate(u.createdAt)}</td>
            <td style="text-align: right;">
              <button class="btn btn-outline btn-sm toggle-role-btn" data-id="${u._id}" data-role="${u.role}" style="padding: 4px 8px; font-size: 0.78rem;">
                Set as ${isAdm ? 'Customer' : 'Admin'}
              </button>
            </td>
          </tr>
        `;
        })
        .join('');

      usersTbody.querySelectorAll('.toggle-role-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const uId = btn.dataset.id;
          const nextRole = btn.dataset.role === 'admin' ? 'user' : 'admin';

          try {
            await API.put(`/admin/users/${uId}/role`, { role: nextRole });
            Components.showToast(`User role updated to ${nextRole}`, 'success');
            loadUsers();
          } catch (e) {
            Components.showToast('Failed to update user role', 'error');
          }
        });
      });
    } catch (err) {
      console.warn(err);
    }
  }

  // ==========================================
  // TAB 6: DEALS & OFFERS MANAGEMENT
  // ==========================================
  async function loadDeals() {
    const dealsTbody = document.getElementById('deals-admin-tbody');
    const countDisplay = document.getElementById('deals-count-display');
    if (!dealsTbody) return;

    try {
      const res = await API.get('/admin/deals');
      const deals = res.data || [];
      if (countDisplay) countDisplay.textContent = `${deals.length} Active Deals`;

      if (deals.length === 0) {
        dealsTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No active promotional deals. Mark products as Deal in Product Catalog.</td></tr>`;
        return;
      }

      dealsTbody.innerHTML = deals
        .map((p) => {
          const discount = p.discountPercentage || p.discount || 0;
          const origPrice = p.originalPrice || p.price;
          const dealPrice = p.finalPrice || (origPrice * (1 - discount / 100));

          return `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <img src="${p.image}" alt="${p.name}" style="width: 36px; height: 36px; object-fit: contain; border-radius: 4px; border: 1px solid var(--border-subtle);" onerror="Utils.imgFallback(this)" />
                  <div style="font-weight: 700; color: var(--text-main); font-size: 0.875rem;">${p.name}</div>
                </div>
              </td>
              <td>${p.brand || 'SHOPORA'}</td>
              <td>${Utils.formatPrice(origPrice)}</td>
              <td><strong style="color: #dc2626;">${discount}% OFF</strong></td>
              <td><strong style="color: var(--primary);">${Utils.formatPrice(dealPrice)}</strong></td>
              <td><span class="badge" style="background: #eff6ff; color: #1d4ed8; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">${p.offerText || 'Special Deal'}</span></td>
              <td><span class="badge" style="background: #fef2f2; color: #dc2626; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">🔥 Active</span></td>
              <td style="text-align: right;">
                <button class="btn btn-outline btn-sm toggle-deal-action-btn" data-id="${p._id}" style="padding: 4px 10px; font-size: 0.78rem;">
                  Remove Deal
                </button>
              </td>
            </tr>
          `;
        })
        .join('');

      dealsTbody.querySelectorAll('.toggle-deal-action-btn').forEach((btn) => {
        btn.onclick = async () => {
          const id = btn.dataset.id;
          try {
            await API.put(`/admin/products/${id}/toggle-deal`, {});
            Components.showToast('Deal status updated!', 'success');
            loadDeals();
            loadProducts();
          } catch (e) {
            Components.showToast('Error toggling deal', 'error');
          }
        };
      });
    } catch (e) {
      console.error('Error loading deals:', e);
      dealsTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger);">Failed to load deals.</td></tr>`;
    }
  }

  // ==========================================
  // TAB 7: VERIFIED REVIEWS MODERATION
  // ==========================================
  async function loadReviews() {
    const reviewsTbody = document.getElementById('reviews-admin-tbody');
    const countDisplay = document.getElementById('reviews-count-display');
    if (!reviewsTbody) return;

    try {
      const res = await API.get('/admin/reviews');
      const reviews = res.data || [];
      if (countDisplay) countDisplay.textContent = `${reviews.length} Verified Reviews`;

      if (reviews.length === 0) {
        reviewsTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No customer reviews found.</td></tr>`;
        return;
      }

      reviewsTbody.innerHTML = reviews
        .map((r) => {
          const prodName = r.product?.name || 'Product';
          const prodImg = r.product?.image || '';

          return `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${prodImg ? `<img src="${prodImg}" style="width: 32px; height: 32px; object-fit: contain; border-radius: 4px;" onerror="Utils.imgFallback(this)" />` : ''}
                  <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-main);">${prodName}</div>
                </div>
              </td>
              <td><strong>${r.userName || 'Customer'}</strong></td>
              <td><span class="rating-badge">★ ${r.rating}</span></td>
              <td>
                <div style="font-weight: 700; font-size: 0.85rem;">${r.title}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${r.comment}</div>
              </td>
              <td>${r.isVerifiedPurchase ? '<span style="color: #16a34a; font-weight: 700;">✓ Verified</span>' : '<span style="color: var(--text-muted);">Standard</span>'}</td>
              <td style="font-size: 0.8rem;">${Utils.formatDate(r.createdAt)}</td>
              <td style="text-align: right;">
                <button class="btn btn-danger btn-sm delete-review-action-btn" data-id="${r._id}" style="padding: 4px 8px; font-size: 0.78rem;">
                  Delete
                </button>
              </td>
            </tr>
          `;
        })
        .join('');

      reviewsTbody.querySelectorAll('.delete-review-action-btn').forEach((btn) => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          Components.confirmModal({
            title: 'Delete Customer Review',
            message: 'Are you sure you want to remove this customer review? The product average rating will be recalculated automatically.',
            confirmText: 'Delete Review',
            onConfirm: async () => {
              try {
                await API.delete(`/reviews/${id}`);
                Components.showToast('Review removed successfully', 'success');
                loadReviews();
              } catch (e) {
                Components.showToast('Error removing review', 'error');
              }
            },
          });
        };
      });
    } catch (e) {
      console.error('Error loading reviews:', e);
      reviewsTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Failed to load reviews.</td></tr>`;
    }
  }

  // Initial load
  loadOverview();
});
