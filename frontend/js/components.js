/**
 * SHOPORA — Global Components, Navbar, Footer, Product Cards & Carousels
 * "Discover More. Shop Smarter."
 * Design: White Background + Clean Neutrals + Modern Blue Accents
 */

const Components = {
  // Toast notifications (Clean White with Status Borders and Action CTA)
  showToast(message, type = 'info', duration = 3500, action = null) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'warning') icon = '⚠';

    let actionHtml = '';
    if (action && action.url && action.text) {
      actionHtml = `
        <a href="${action.url}" class="toast-action-btn" style="background: var(--primary); color: #ffffff; padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 800; text-decoration: none; white-space: nowrap; margin-left: 10px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(37,99,235,0.25);">
          ${action.text}
        </a>
      `;
    }

    toast.innerHTML = `
      <div style="font-weight: 800; font-size: 1.1rem; color: var(--primary);">${icon}</div>
      <div style="flex: 1; font-size: 0.9rem; font-weight: 600; color: var(--text-main); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
        <span>${message}</span>
        ${actionHtml}
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(60px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  // Confirmation Modal Dialog
  confirmModal({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) {
    let modalOverlay = document.getElementById('global-confirm-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'global-confirm-modal';
      modalOverlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5);
        backdrop-filter: blur(4px); z-index: 9999; display: none;
        align-items: center; justify-content: center; padding: 20px;
      `;
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div style="background: #ffffff; border-radius: 16px; max-width: 440px; width: 100%; padding: 28px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); border: 1px solid #e2e8f0; animation: slideDown 200ms ease-out;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a;">${title}</h3>
          <button id="modal-close-btn" style="font-size: 1.4rem; color: #94a3b8; padding: 4px;">&times;</button>
        </div>
        <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px;">${message}</p>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button class="btn btn-outline" id="modal-cancel-action" style="padding: 10px 18px;">${cancelText}</button>
          <button class="btn btn-danger" id="modal-confirm-action" style="padding: 10px 18px;">${confirmText}</button>
        </div>
      </div>
    `;

    modalOverlay.style.display = 'flex';

    const close = () => {
      modalOverlay.style.display = 'none';
    };

    modalOverlay.querySelector('#modal-close-btn').onclick = close;
    modalOverlay.querySelector('#modal-cancel-action').onclick = close;
    modalOverlay.querySelector('#modal-confirm-action').onclick = () => {
      close();
      if (typeof onConfirm === 'function') onConfirm();
    };
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) close();
    };
  },

  // Render Flagship White + Blue SHOPORA Navbar
  async renderNavbar(activePage = '') {
    const navPlaceholder = document.getElementById('navbar-placeholder');
    if (!navPlaceholder) return;

    const user = window.Auth ? Auth.getUser() : null;
    const cartCount = window.Cart ? Cart.getCount() : 0;
    const wishlistCount = window.Wishlist ? Wishlist.getCount() : 0;
    const isAdmin = window.Auth ? Auth.isAdmin() : false;

    const isPagesSubdir = window.location.pathname.includes('/pages/');
    const basePath = isPagesSubdir ? '' : 'pages/';
    const homePath = isPagesSubdir ? '../index.html' : 'index.html';

    navPlaceholder.innerHTML = `
      <!-- Top Utility Bar -->
      <div class="top-announcement-bar">
        <div class="top-announcement-inner">
          <div class="announcement-highlights">
            <span>✨ <strong>SHOPORA Prime:</strong> Free Express Delivery on orders over ₹999</span>
            <span class="announcement-link"><a href="${basePath}products.html?isDeal=true" style="color: #93c5fd;">Shop Today's Deals &rarr;</a></span>
          </div>
          <div class="announcement-tools">
            <a href="${basePath}order-tracking.html" class="announcement-tool-item">📍 Track Order</a>
            <a href="${basePath}profile.html#help" class="announcement-tool-item">💬 24/7 Help</a>
          </div>
        </div>
      </div>

      <!-- Main Sticky Header -->
      <header class="site-header glass-header" id="site-header">
        <div class="container navbar-main">
          <!-- SHOPORA Logo -->
          <a href="${homePath}" class="brand-logo" title="SHOPORA — Discover More. Shop Smarter.">
            <div class="brand-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
            <div class="brand-name">SHOP<span>ORA</span><span class="brand-plus-tag">Plus <span>✦</span></span></div>
          </a>

          <!-- Delivery Location Selector Button -->
          <button type="button" class="nav-delivery-btn" id="nav-delivery-loc-btn" title="Choose Delivery Location">
            <span class="nav-delivery-icon">📍</span>
            <div class="nav-delivery-text-wrap">
              <span class="nav-delivery-sub">Deliver to</span>
              <span class="nav-delivery-main" id="nav-delivery-loc-label">Select Location</span>
            </div>
          </button>

          <!-- Search Bar with Category Dropdown -->
          <div class="nav-search-container">
            <form class="nav-search-form" id="global-search-form" action="${basePath}products.html" method="GET">
              <input
                type="text"
                class="nav-search-input"
                id="global-search-input"
                name="search"
                placeholder="Search for products, brands and more"
                autocomplete="off"
                required
              />
              <button type="button" class="nav-search-clear" id="global-search-clear" aria-label="Clear Search">✕</button>
              <button type="submit" class="nav-search-submit" aria-label="Submit Search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </form>
            <!-- Suggestions Dropdown with Recent & Popular Searches -->
            <div class="search-suggestions-dropdown" id="search-suggestions-box"></div>
          </div>

          <!-- Desktop Actions -->
          <div class="navbar-actions">
            <!-- SHOPORA PRO VIP Link -->
            <a href="${basePath}pro.html" class="nav-action-btn ${user?.isPro ? 'pro-active-btn' : 'pro-trial-btn'}" title="${user?.isPro ? 'SHOPORA PRO Active Member' : 'Try SHOPORA PRO 30-Day Free Trial'}">
              <span style="font-size: 1.15rem; filter: drop-shadow(0 2px 4px rgba(234, 179, 8, 0.4));">👑</span>
              <span style="${user?.isPro ? 'color: #fbbf24; font-weight: 800;' : 'color: #6366f1; font-weight: 700;'}">${user?.isPro ? 'PRO' : 'Try Pro'}</span>
            </a>

            <!-- Account Dropdown Trigger -->
            <div class="nav-account-dropdown-wrapper">
              <a href="${user ? `${basePath}profile.html` : `${basePath}login.html`}" class="nav-action-btn" id="account-menu-trigger" aria-haspopup="true" aria-expanded="false" title="${user ? `Hello, ${user.name}` : 'Sign In'}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>${user ? user.name.split(' ')[0] : 'Sign In'}</span>
                ${user?.isPro ? '<span style="font-size: 0.65rem; background: #fbbf24; color: #78350f; font-weight: 800; padding: 1px 5px; border-radius: 4px; margin-left: 2px;">PRO</span>' : ''}
              </a>

              <div class="account-dropdown-menu" id="account-dropdown-menu">
                ${user ? `
                  <div class="account-menu-header">
                    <div class="account-menu-name" style="display: flex; align-items: center; justify-content: space-between;">
                      <span>${user.name}</span>
                      ${user.isPro ? '<span style="font-size: 0.68rem; background: #fbbf24; color: #78350f; font-weight: 800; padding: 2px 6px; border-radius: 4px;">👑 PRO</span>' : ''}
                    </div>
                    <div class="account-menu-email">${user.email}</div>
                  </div>
                  <a href="${basePath}pro.html" class="account-menu-link" style="color: #b45309; font-weight: 700;">
                    👑 SHOPORA PRO ${user.isPro ? '(Active)' : '(30-Day Free Trial)'}
                  </a>
                  <a href="${basePath}profile.html" class="account-menu-link">👤 My Profile</a>
                  <a href="${basePath}orders.html" class="account-menu-link">📦 My Orders</a>
                  <a href="${basePath}wishlist.html" class="account-menu-link">❤️ My Wishlist</a>
                  ${isAdmin ? `
                    <div class="account-menu-divider"></div>
                    <a href="${basePath}admin.html" class="account-menu-link" style="color: var(--primary); font-weight: 700;">
                      ⚡ Admin Dashboard
                    </a>
                  ` : ''}
                  <div class="account-menu-divider"></div>
                  <button class="account-menu-link" id="nav-signout-btn" style="color: var(--danger); width: 100%; text-align: left;">
                    🚪 Sign Out
                  </button>
                ` : `
                  <div style="padding: 16px; text-align: center;">
                    <a href="${basePath}login.html" class="btn btn-primary" style="width: 100%; margin-bottom: 10px;">Sign In</a>
                    <a href="${basePath}pro.html" style="font-size: 0.8rem; color: #b45309; font-weight: 700; display: block; margin-bottom: 8px;">👑 Try SHOPORA PRO Free</a>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                      New customer? <a href="${basePath}register.html" style="color: var(--primary); font-weight: 700;">Start here.</a>
                    </div>
                  </div>
                `}
              </div>
            </div>

            <!-- Orders Link -->
            <a href="${basePath}orders.html" class="nav-action-btn" title="Track &amp; View Orders">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <span>Orders</span>
            </a>

            <!-- Cart Link with Live Counter -->
            <a href="${basePath}cart.html" class="nav-action-btn" id="nav-cart-btn" title="Shopping Cart">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span>Cart</span>
              <span class="nav-badge danger" id="cart-counter">${cartCount}</span>
            </a>
          </div>
        </div>
      </header>

      <!-- Flipkart / Amazon Style Category Navigation Strip -->
      <nav class="category-strip-bar" id="category-strip-bar">
        <div class="container category-strip-inner">
          <a href="${basePath}pro.html" class="category-strip-item ${activePage === 'pro' ? 'active' : ''}" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.18) 0%, rgba(24, 27, 38, 0.15) 100%); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 6px;">
            <span class="cat-strip-icon-box">👑</span>
            <span class="cat-strip-title" style="color: #b45309; font-weight: 800;">PRO &amp; LUXURY</span>
          </a>
          <a href="${basePath}products.html?deal=flash" class="category-strip-item ${activePage === 'deals' ? 'active' : ''}">
            <span class="cat-strip-icon-box">⚡</span>
            <span class="cat-strip-title">Top Deals</span>
          </a>
          <a href="${basePath}products.html?category=mobiles-and-tablets" class="category-strip-item">
            <span class="cat-strip-icon-box">📱</span>
            <span class="cat-strip-title">Mobiles</span>
          </a>
          <a href="${basePath}products.html?category=laptops-and-computing" class="category-strip-item">
            <span class="cat-strip-icon-box">💻</span>
            <span class="cat-strip-title">Electronics</span>
          </a>
          <a href="${basePath}products.html?category=smart-home-and-appliances" class="category-strip-item">
            <span class="cat-strip-icon-box">🏠</span>
            <span class="cat-strip-title">Appliances</span>
          </a>
          <a href="${basePath}products.html?category=fashion-and-apparel" class="category-strip-item">
            <span class="cat-strip-icon-box">👔</span>
            <span class="cat-strip-title">Fashion</span>
          </a>
          <a href="${basePath}products.html?category=audio-and-headphones" class="category-strip-item">
            <span class="cat-strip-icon-box">🎧</span>
            <span class="cat-strip-title">Audio & Sound</span>
          </a>
          <a href="${basePath}products.html?category=beauty-and-personal-care" class="category-strip-item">
            <span class="cat-strip-icon-box">✨</span>
            <span class="cat-strip-title">Beauty & Care</span>
          </a>
          <a href="${basePath}products.html?category=sports-and-fitness" class="category-strip-item">
            <span class="cat-strip-icon-box">🏋️</span>
            <span class="cat-strip-title">Sports & Fitness</span>
          </a>
        </div>
      </nav>

      <!-- Fixed Mobile Bottom Navigation Bar (5 Core Shopping Tabs) -->
      <nav class="mobile-bottom-nav">
        <div class="mobile-nav-items">
          <a href="${homePath}" class="mobile-nav-item ${activePage === 'home' ? 'active' : ''}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Home</span>
          </a>
          <a href="${basePath}products.html" class="mobile-nav-item ${activePage === 'categories' || activePage === 'products' ? 'active' : ''}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Categories</span>
          </a>
          <a href="${basePath}cart.html" class="mobile-nav-item ${activePage === 'cart' ? 'active' : ''}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span>Cart</span>
            <span class="mobile-nav-badge" id="mobile-cart-counter">${cartCount}</span>
          </a>
          <a href="${basePath}orders.html" class="mobile-nav-item ${activePage === 'orders' ? 'active' : ''}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            <span>Orders</span>
          </a>
          <a href="${user ? `${basePath}profile.html` : `${basePath}login.html`}" class="mobile-nav-item ${activePage === 'account' ? 'active' : ''}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Account</span>
          </a>
        </div>
      </nav>
    `;

    // Dropdown toggle
    const accountTrigger = document.getElementById('account-menu-trigger');
    const accountMenu = document.getElementById('account-dropdown-menu');
    if (accountTrigger && accountMenu) {
      accountTrigger.onclick = (e) => {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
          if (!accountMenu.classList.contains('show')) {
            e.preventDefault();
            e.stopPropagation();
            accountMenu.classList.add('show');
          }
        }
      };
      accountMenu.onclick = (e) => e.stopPropagation();
      document.addEventListener('click', () => accountMenu.classList.remove('show'));
    }

    const signoutBtn = document.getElementById('nav-signout-btn');
    if (signoutBtn && window.Auth) {
      signoutBtn.onclick = () => Auth.logout();
    }

    // Delivery Location Modal & Real Commercial App Experience
    const initDeliveryLocation = () => {
      const PIN_DIRECTORY = {
        '560': { city: 'Bengaluru', state: 'Karnataka' },
        '400': { city: 'Mumbai', state: 'Maharashtra' },
        '401': { city: 'Thane / Mumbai', state: 'Maharashtra' },
        '110': { city: 'New Delhi', state: 'Delhi' },
        '500': { city: 'Hyderabad', state: 'Telangana' },
        '600': { city: 'Chennai', state: 'Tamil Nadu' },
        '700': { city: 'Kolkata', state: 'West Bengal' },
        '411': { city: 'Pune', state: 'Maharashtra' },
        '380': { city: 'Ahmedabad', state: 'Gujarat' },
        '302': { city: 'Jaipur', state: 'Rajasthan' },
        '122': { city: 'Gurugram', state: 'Haryana' },
        '201': { city: 'Noida', state: 'Uttar Pradesh' },
        '682': { city: 'Kochi', state: 'Kerala' },
        '226': { city: 'Lucknow', state: 'Uttar Pradesh' },
        '440': { city: 'Nagpur', state: 'Maharashtra' },
        '452': { city: 'Indore', state: 'Madhya Pradesh' },
        '160': { city: 'Chandigarh', state: 'Chandigarh' },
        '800': { city: 'Patna', state: 'Bihar' },
        '781': { city: 'Guwahati', state: 'Assam' },
        '97477': { city: 'Springfield', state: 'OR' },
        '94105': { city: 'San Francisco', state: 'CA' },
        '95134': { city: 'San Jose', state: 'CA' },
      };

      const lookupPincode = (pin) => {
        if (!pin) return null;
        const p = pin.trim();
        if (PIN_DIRECTORY[p]) return PIN_DIRECTORY[p];
        const prefix3 = p.slice(0, 3);
        if (PIN_DIRECTORY[prefix3]) return PIN_DIRECTORY[prefix3];
        return null;
      };

      let savedLoc = { city: 'Bengaluru', pincode: '560001', state: 'Karnataka' };
      try {
        const stored = localStorage.getItem('shopora_delivery_loc');
        if (stored) savedLoc = JSON.parse(stored);
      } catch {}

      const locLabel = document.getElementById('nav-delivery-loc-label');
      if (locLabel) locLabel.textContent = `${savedLoc.city} ${savedLoc.pincode}`;

      const locBtn = document.getElementById('nav-delivery-loc-btn');
      let locModal = document.getElementById('delivery-location-modal');

      if (!locModal) {
        locModal = document.createElement('div');
        locModal.id = 'delivery-location-modal';
        locModal.className = 'delivery-modal-overlay';
        locModal.innerHTML = `
          <div class="delivery-modal-card">
            <div class="loc-modal-header">
              <h3 class="loc-modal-title">
                <span>📍</span> Choose your location
              </h3>
              <button id="close-delivery-modal" style="background:none; border:none; font-size: 1.4rem; color: #94a3b8; cursor:pointer; padding: 4px;">&times;</button>
            </div>
            <p class="loc-modal-subtitle">
              Select a delivery location to see accurate product availability, express shipping options, and local deals.
            </p>

            <!-- Dynamic Saved Addresses or Sign-In Banner -->
            <div id="loc-user-addresses-wrapper"></div>

            <!-- Use Current Location GPS Button -->
            <button type="button" class="loc-detect-btn" id="loc-use-gps-btn">
              <span>🎯</span>
              <span>Use my current location</span>
            </button>
            <div id="loc-status-feedback" class="loc-status-feedback"></div>

            <!-- Divider -->
            <div class="loc-modal-divider">
              <span>or enter an Indian pincode</span>
            </div>

            <!-- Pincode Input & Validation -->
            <form id="custom-delivery-loc-form" style="margin-bottom: 16px;">
              <div class="loc-pincode-box">
                <input
                  type="text"
                  id="loc-input-pincode"
                  class="form-control loc-pincode-input"
                  placeholder="Enter 6-digit PIN code"
                  maxlength="6"
                  value="${savedLoc.pincode}"
                  required
                />
                <button type="submit" class="btn btn-primary" style="padding: 10px 22px; font-weight: 700; white-space: nowrap;">
                  Apply
                </button>
              </div>
              <div id="loc-pin-match-hint" style="font-size: 0.8rem; color: #16a34a; font-weight: 600; display: none;"></div>
            </form>

            <!-- Popular Metros -->
            <div>
              <div style="font-size: 0.725rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
                Popular Delivery Hubs
              </div>
              <div class="metro-pills-wrap">
                <button type="button" class="metro-pill-btn" data-city="Bengaluru" data-pin="560001" data-state="Karnataka">Bengaluru 560001</button>
                <button type="button" class="metro-pill-btn" data-city="Mumbai" data-pin="400001" data-state="Maharashtra">Mumbai 400001</button>
                <button type="button" class="metro-pill-btn" data-city="New Delhi" data-pin="110001" data-state="Delhi">New Delhi 110001</button>
                <button type="button" class="metro-pill-btn" data-city="Hyderabad" data-pin="500001" data-state="Telangana">Hyderabad 500001</button>
                <button type="button" class="metro-pill-btn" data-city="Chennai" data-pin="600001" data-state="Tamil Nadu">Chennai 600001</button>
                <button type="button" class="metro-pill-btn" data-city="Kolkata" data-pin="700001" data-state="West Bengal">Kolkata 700001</button>
                <button type="button" class="metro-pill-btn" data-city="Pune" data-pin="411001" data-state="Maharashtra">Pune 411001</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(locModal);

        const closeLocModal = () => { locModal.style.display = 'none'; };
        locModal.querySelector('#close-delivery-modal').onclick = closeLocModal;
        locModal.onclick = (e) => { if (e.target === locModal) closeLocModal(); };

        const setAndSaveLocation = (city, pincode, state = 'India', fullName = '') => {
          const data = { city: city.trim(), pincode: pincode.trim(), state, fullName };
          localStorage.setItem('shopora_delivery_loc', JSON.stringify(data));
          const lbl = document.getElementById('nav-delivery-loc-label');
          if (lbl) lbl.textContent = `${data.city} ${data.pincode}`;
          Components.showToast(`Delivery location set to ${data.city} (${data.pincode})`, 'success');
          closeLocModal();
          window.dispatchEvent(new CustomEvent('delivery:updated', { detail: data }));
        };

        // Popular pills
        locModal.querySelectorAll('.metro-pill-btn').forEach((b) => {
          b.onclick = () => setAndSaveLocation(b.dataset.city, b.dataset.pin, b.dataset.state);
        });

        // Live Pincode Type-Ahead Check
        const pinInput = locModal.querySelector('#loc-input-pincode');
        const pinHint = locModal.querySelector('#loc-pin-match-hint');

        const updatePinHint = () => {
          const val = pinInput.value.trim();
          if (val.length >= 3) {
            const match = lookupPincode(val);
            if (match) {
              pinHint.style.display = 'block';
              pinHint.innerHTML = `⚡ Available: <strong>${match.city}, ${match.state}</strong> (Express 2-3 Days)`;
              return match;
            }
          }
          pinHint.style.display = 'none';
          return null;
        };

        pinInput.addEventListener('input', updatePinHint);

        // Form Submit
        locModal.querySelector('#custom-delivery-loc-form').onsubmit = (e) => {
          e.preventDefault();
          const pin = pinInput.value.trim();
          if (!pin || pin.length < 5) {
            Components.showToast('Please enter a valid 6-digit pincode', 'error');
            return;
          }
          const match = lookupPincode(pin) || { city: 'Bengaluru', state: 'Karnataka' };
          setAndSaveLocation(match.city, pin, match.state);
        };

        // Geolocation GPS detection
        const gpsBtn = locModal.querySelector('#loc-use-gps-btn');
        const statusFeedback = locModal.querySelector('#loc-status-feedback');

        if (gpsBtn) {
          gpsBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
              Components.showToast('Geolocation is not supported by your browser', 'warning');
              return;
            }

            statusFeedback.className = 'loc-status-feedback loading';
            statusFeedback.innerHTML = `⏳ Detecting your GPS location...`;

            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                  // Attempt reverse geocode via OpenStreetMap with short timeout
                  const ctrl = new AbortController();
                  const timer = setTimeout(() => ctrl.abort(), 4000);
                  const geoRes = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                    { signal: ctrl.signal }
                  );
                  clearTimeout(timer);
                  const geoData = await geoRes.json();

                  const detectedCity = geoData.address?.city || geoData.address?.town || geoData.address?.state_district || 'Bengaluru';
                  const detectedPin = geoData.address?.postcode || '560001';
                  const detectedState = geoData.address?.state || 'Karnataka';

                  statusFeedback.className = 'loc-status-feedback success';
                  statusFeedback.innerHTML = `📍 Located: ${detectedCity} (${detectedPin})`;

                  setTimeout(() => {
                    setAndSaveLocation(detectedCity, detectedPin, detectedState);
                  }, 600);
                } catch {
                  // Graceful fallback to nearest hub
                  statusFeedback.className = 'loc-status-feedback success';
                  statusFeedback.innerHTML = `📍 Location detected: Bengaluru (560001)`;
                  setTimeout(() => {
                    setAndSaveLocation('Bengaluru', '560001', 'Karnataka');
                  }, 600);
                }
              },
              (err) => {
                console.warn('Geolocation error:', err);
                statusFeedback.className = 'loc-status-feedback error';
                statusFeedback.innerHTML = `⚠️ Location permission denied or unavailable. Please enter your pincode above.`;
              },
              { timeout: 8000, enableHighAccuracy: false }
            );
          });
        }
      }

      // Populate User Addresses when opening modal
      const loadUserAddressesIntoModal = async () => {
        const wrap = locModal.querySelector('#loc-user-addresses-wrapper');
        if (!wrap) return;

        if (!Auth.isAuthenticated()) {
          wrap.innerHTML = `
            <div class="loc-auth-banner">
              <div>
                <p>Sign in to see your addresses</p>
                <span style="font-size: 0.74rem; color: #1e40af;">Access your MongoDB saved addresses with 1-click delivery</span>
              </div>
              <a href="login.html" class="btn btn-primary btn-sm" style="font-size: 0.78rem; padding: 6px 14px; white-space: nowrap;">
                Sign In
              </a>
            </div>
          `;
          return;
        }

        try {
          wrap.innerHTML = `<div style="font-size: 0.8rem; color: #64748b; margin-bottom: 8px;">Loading your saved addresses...</div>`;
          const res = await API.get('/auth/addresses');
          const addresses = res.data || [];

          if (addresses.length === 0) {
            wrap.innerHTML = `
              <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px; text-align: center;">
                <span style="font-size: 0.82rem; color: #64748b;">No saved addresses yet in your account.</span>
                <a href="profile.html#addresses" style="font-size: 0.82rem; font-weight: 700; color: var(--primary); margin-left: 6px;">+ Add Address</a>
              </div>
            `;
            return;
          }

          let activePin = '';
          try {
            const cur = JSON.parse(localStorage.getItem('shopora_delivery_loc') || '{}');
            activePin = cur.pincode || '';
          } catch {}

          wrap.innerHTML = `
            <div style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <span>Your Saved Addresses (${addresses.length})</span>
              <a href="profile.html#addresses" style="font-size: 0.725rem; font-weight: 700; color: var(--primary);">Manage</a>
            </div>
            <div class="loc-saved-addresses-list">
              ${addresses
                .map((addr, idx) => {
                  const isSelected = activePin === addr.pincode || (idx === 0 && !activePin);
                  const typeClass = (addr.addressType || 'home').toLowerCase();
                  return `
                    <div class="loc-address-item ${isSelected ? 'active' : ''}" data-idx="${idx}">
                      <input type="radio" name="loc-address-radio" ${isSelected ? 'checked' : ''} />
                      <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                          <strong style="font-size: 0.88rem; color: #0f172a;">${addr.fullName}</strong>
                          <span class="badge-addr-type ${typeClass}">${addr.addressType || 'Home'}</span>
                          ${addr.isDefault ? '<span class="badge-addr-default">DEFAULT</span>' : ''}
                        </div>
                        <div style="font-size: 0.78rem; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                          ${addr.addressLine1 || addr.street || ''}, ${addr.city} ${addr.pincode || addr.postalCode || ''}
                        </div>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          `;

          wrap.querySelectorAll('.loc-address-item').forEach((item) => {
            item.addEventListener('click', () => {
              const idx = Number(item.dataset.idx);
              const chosen = addresses[idx];
              if (chosen) {
                const pin = chosen.pincode || chosen.postalCode || '560001';
                const cit = chosen.city || 'Bengaluru';
                const st = chosen.state || 'Karnataka';
                setAndSaveLocation(cit, pin, st, chosen.fullName);
              }
            });
          });
        } catch (err) {
          console.warn('Could not load modal addresses:', err);
          wrap.innerHTML = '';
        }
      };

      if (locBtn) {
        locBtn.onclick = () => {
          if (locModal) {
            locModal.style.display = 'flex';
            loadUserAddressesIntoModal();
          }
        };
      }
    };
    initDeliveryLocation();



    // Search bar input & live suggestions + Recent/Popular searches
    const searchForm = document.getElementById('global-search-form');
    const searchInput = document.getElementById('global-search-input');
    const searchClear = document.getElementById('global-search-clear');
    const suggestionsBox = document.getElementById('search-suggestions-box');

    const saveRecentSearch = (q) => {
      if (!q || q.trim().length < 2) return;
      try {
        let rec = JSON.parse(localStorage.getItem('shopora_recent_searches') || '[]');
        rec = [q.trim(), ...rec.filter((x) => x.toLowerCase() !== q.trim().toLowerCase())].slice(0, 8);
        localStorage.setItem('shopora_recent_searches', JSON.stringify(rec));
      } catch {}
    };

    const renderRecentAndPopular = () => {
      if (!suggestionsBox) return;
      let recent = [];
      try {
        recent = JSON.parse(localStorage.getItem('shopora_recent_searches') || '[]');
      } catch {}

      const popular = [
        'iPhone 15 Pro',
        'MacBook Pro M3',
        'Sony Headphones',
        'Running Shoes',
        'Air Fryer',
        'Smartwatch',
        'iPad Pro',
        'Designer Jackets',
      ];

      let html = '';
      if (recent.length > 0) {
        html += `
          <div class="search-section-title">
            <span>Recent Searches</span>
            <span class="search-clear-all-link" id="clear-recent-searches-btn">Clear All</span>
          </div>
          ${recent
            .slice(0, 5)
            .map(
              (q) => `
            <div class="search-recent-item" data-query="${q}">
              <span>🕒 ${q}</span>
              <button type="button" class="search-recent-remove" data-remove="${q}" title="Remove">✕</button>
            </div>
          `
            )
            .join('')}
        `;
      }

      html += `
        <div class="search-section-title">Popular Searches</div>
        <div class="search-tags-wrap">
          ${popular.map((p) => `<span class="search-tag-chip" data-query="${p}">🔥 ${p}</span>`).join('')}
        </div>
      `;

      suggestionsBox.innerHTML = html;
      suggestionsBox.classList.add('open');

      // Click on search tag or recent search
      suggestionsBox.querySelectorAll('[data-query]').forEach((item) => {
        item.onclick = (e) => {
          if (e.target.closest('.search-recent-remove')) return;
          const q = item.dataset.query;
          searchInput.value = q;
          saveRecentSearch(q);
          window.location.href = `${basePath}products.html?search=${encodeURIComponent(q)}`;
        };
      });

      // Remove single recent search
      suggestionsBox.querySelectorAll('.search-recent-remove').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const rm = btn.dataset.remove;
          let rec = JSON.parse(localStorage.getItem('shopora_recent_searches') || '[]');
          rec = rec.filter((x) => x !== rm);
          localStorage.setItem('shopora_recent_searches', JSON.stringify(rec));
          renderRecentAndPopular();
        };
      });

      const clearAllBtn = suggestionsBox.querySelector('#clear-recent-searches-btn');
      if (clearAllBtn) {
        clearAllBtn.onclick = (e) => {
          e.stopPropagation();
          localStorage.removeItem('shopora_recent_searches');
          renderRecentAndPopular();
        };
      }
    };

    if (searchForm) {
      searchForm.onsubmit = () => {
        const q = searchInput.value.trim();
        saveRecentSearch(q);
      };
    }

    if (searchInput && suggestionsBox) {
      searchInput.addEventListener('focus', () => {
        if (!searchInput.value.trim()) {
          renderRecentAndPopular();
        }
      });

      if (searchClear) {
        searchClear.onclick = () => {
          searchInput.value = '';
          searchClear.classList.remove('active');
          renderRecentAndPopular();
          searchInput.focus();
        };
      }

      searchInput.addEventListener(
        'input',
        Utils.debounce(async (e) => {
          const val = e.target.value.trim();
          if (searchClear) {
            searchClear.classList.toggle('active', val.length > 0);
          }
          if (val.length < 2) {
            renderRecentAndPopular();
            return;
          }

          try {
            const res = await API.get(`/products/suggestions?q=${encodeURIComponent(val)}`);
            if (res.success && Array.isArray(res.data) && res.data.length > 0) {
              suggestionsBox.innerHTML = `
                <div class="search-section-title">Matching Products</div>
                ${res.data
                  .slice(0, 6)
                  .map(
                    (p) => `
                  <div class="suggestion-item" onclick="window.location.href='${basePath}product-details.html?id=${p._id}'">
                    <img src="${p.image}" alt="${p.name}" onerror="Utils.imgFallback(this)" />
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${p.name}
                      </div>
                      <div style="font-size: 0.75rem; color: #64748b;">
                        ${p.brand || ''} &middot; <span style="color: #2563eb;">${p.categoryName || 'Products'}</span>
                      </div>
                    </div>
                    <div style="font-weight: 800; color: #0f172a;">
                      ${Utils.formatPrice(p.finalPrice || p.price)}
                    </div>
                  </div>
                `
                  )
                  .join('')}
              `;
              suggestionsBox.classList.add('open');
            } else {
              suggestionsBox.classList.remove('open');
            }
          } catch {
            suggestionsBox.classList.remove('open');
          }
        }, 220)
      );

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-search-container')) {
          suggestionsBox.classList.remove('open');
        }
      });
    }

    // Listen to cart and wishlist updates with real-time bounce feedback
    window.addEventListener('cart:updated', () => {
      const cnt = window.Cart ? Cart.getCount() : 0;
      const b1 = document.getElementById('cart-counter');
      const b2 = document.getElementById('mobile-cart-counter');
      if (b1) {
        b1.textContent = cnt;
        b1.classList.remove('badge-bounce');
        void b1.offsetWidth;
        b1.classList.add('badge-bounce');
      }
      if (b2) {
        b2.textContent = cnt;
        b2.classList.remove('badge-bounce');
        void b2.offsetWidth;
        b2.classList.add('badge-bounce');
      }
    });

    window.addEventListener('wishlist:updated', () => {
      const cnt = window.Wishlist ? Wishlist.getCount() : 0;
      const b = document.getElementById('wishlist-counter');
      if (b) {
        b.textContent = cnt;
        b.classList.remove('badge-bounce');
        void b.offsetWidth;
        b.classList.add('badge-bounce');
      }
    });
  },

  // Render Redesigned Product Card
  renderProductCard(product) {
    if (!product || !product._id) return '';

    const isPagesSubdir = window.location.pathname.includes('/pages/');
    const detailsPath = isPagesSubdir ? 'product-details.html' : 'pages/product-details.html';

    const isWishlisted = window.Wishlist ? Wishlist.hasItem(product._id) : false;
    const finalPrice = product.finalPrice || product.price || 0;
    const origPrice = product.originalPrice || product.price || 0;
    const discount = product.discountPercentage || product.discount || 0;
    const hasDiscount = discount > 0;

    // Badges determination (Single primary badge priority from DB)
    let badgeHtml = '';
    if (product.offerText && product.offerText.trim()) {
      badgeHtml = `<span class="card-badge deal">⚡ ${product.offerText}</span>`;
    } else if (product.isDeal) {
      badgeHtml = `<span class="card-badge deal">⚡ FLASH DEAL</span>`;
    } else if (product.isPremium) {
      badgeHtml = `<span class="card-badge premium">👑 SELECT</span>`;
    } else if (product.isTrending) {
      badgeHtml = `<span class="card-badge trending">🔥 TRENDING</span>`;
    } else if (product.isNew) {
      badgeHtml = `<span class="card-badge new">✨ NEW</span>`;
    } else if (hasDiscount) {
      badgeHtml = `<span class="card-badge discount">${discount}% OFF</span>`;
    }

    const ratingVal = Number(product.rating || 4.5).toFixed(1);
    const reviewsVal = product.reviewCount || 0;
    const stockVal = product.stock !== undefined ? product.stock : 15;
    const isOutOfStock = stockVal <= 0;
    const stockPct = Math.min(100, Math.max(15, Math.round((stockVal / 30) * 100)));

    return `
      <article class="product-card" data-id="${product._id}">
        <div class="card-media-wrapper">
          <div class="card-badge-container">${badgeHtml}</div>
          <button class="card-wishlist-btn ${isWishlisted ? 'active' : ''}" data-id="${product._id}" title="Add to Wishlist" aria-label="Toggle Wishlist">
            ${isWishlisted ? '❤️' : '🤍'}
          </button>
          <a href="${detailsPath}?id=${product._id}" style="display: block; width: 100%; height: 100%;">
            <img
              src="${product.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'}"
              alt="${product.name}"
              class="card-image"
              loading="lazy"
              onerror="Utils.imgFallback(this)"
            />
          </a>
        </div>

        <div class="card-content">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
            <div class="card-brand">${Utils.safeStr(product.brand, 'SHOPORA')}</div>
            <span class="shopora-assured-badge" title="SHOPORA Assured Quality Checked">Assured <span>✦</span></span>
          </div>
          <h3 class="card-title" title="${product.name}">
            <a href="${detailsPath}?id=${product._id}">${product.name}</a>
          </h3>

          <div class="card-rating-wrap">
            <span class="rating-badge">★ ${ratingVal}</span>
            <span class="rating-count">(${reviewsVal} reviews)</span>
          </div>

          <div class="card-price-row">
            <span class="price-current">${Utils.formatPrice(finalPrice)}</span>
            ${hasDiscount ? `<span class="price-original">${Utils.formatPrice(origPrice)}</span>` : ''}
            ${hasDiscount ? `<span class="price-discount-pill">${discount}% OFF</span>` : ''}
          </div>

          ${
            stockVal <= 5 && stockVal > 0
              ? `<div style="font-size: 0.72rem; color: #dc2626; font-weight: 700; margin: 4px 0 2px;">⚡ Only ${stockVal} left in stock - order soon</div>`
              : product.isTrending
              ? `<div style="font-size: 0.72rem; color: #2563eb; font-weight: 700; margin: 4px 0 2px;">🔥 14+ bought recently</div>`
              : ''
          }

          ${product.isDeal ? `
            <div class="flash-stock-wrap">
              <div class="flash-stock-label">
                <span>Limited Stock Deal</span>
                <span>Only ${stockVal} left!</span>
              </div>
              <div class="flash-stock-meter">
                <div class="flash-stock-fill" style="width: ${stockPct}%;"></div>
              </div>
            </div>
          ` : ''}

          <div class="card-delivery-text">
            <span>⚡ FREE Delivery by <strong>Tomorrow, 9 PM</strong></span>
          </div>

          <button
            class="btn-card-add add-to-cart-btn"
            data-id="${product._id}"
            ${isOutOfStock ? 'disabled' : ''}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span>${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
          </button>
        </div>
      </article>
    `;
  },

  // Render Horizontal Product Carousel
  renderProductCarousel({ title, badgeText, badgeColor = 'blue', viewAllLink, products = [], carouselId }) {
    const trackId = `carousel-track-${carouselId || Math.random().toString(36).substring(2, 7)}`;
    const prevBtnId = `prev-${trackId}`;
    const nextBtnId = `next-${trackId}`;

    const cardsHtml = products
      .map((p) => `<div class="carousel-card-item">${Components.renderProductCard(p)}</div>`)
      .join('');

    const html = `
      <section class="section-wrapper" id="section-${carouselId}">
        <div class="container">
          <div class="section-header">
            <div class="section-title-wrap">
              <h2 class="section-title">${title}</h2>
              ${badgeText ? `<span class="section-badge ${badgeColor}">${badgeText}</span>` : ''}
            </div>
            <div class="section-controls">
              ${viewAllLink ? `<a href="${viewAllLink}" class="view-all-link">View All &rarr;</a>` : ''}
              <button class="carousel-arrow-btn" id="${prevBtnId}" aria-label="Previous Products">‹</button>
              <button class="carousel-arrow-btn" id="${nextBtnId}" aria-label="Next Products">›</button>
            </div>
          </div>
          <div class="product-carousel-track" id="${trackId}">
            ${cardsHtml}
          </div>
        </div>
      </section>
    `;

    // Return HTML and attach helper
    return {
      html,
      initArrows() {
        const track = document.getElementById(trackId);
        const prev = document.getElementById(prevBtnId);
        const next = document.getElementById(nextBtnId);
        if (!track) return;

        const scrollAmount = 300;
        if (prev) {
          prev.onclick = () => track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
        if (next) {
          next.onclick = () => track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      },
    };
  },

  // Attach card action listeners (Add to Cart, Wishlist toggle)
  initProductCardActions(container, products = []) {
    if (!container) return;

    container.addEventListener('click', async (e) => {
      // Add to Cart
      const cartBtn = e.target.closest('.add-to-cart-btn');
      if (cartBtn) {
        e.preventDefault();
        const isPages = window.location.pathname.includes('/pages/');
        const cartUrl = isPages ? 'cart.html' : 'pages/cart.html';

        if (cartBtn.dataset.inCart === 'true') {
          window.location.href = cartUrl;
          return;
        }

        const id = cartBtn.dataset.id;
        const product = products.find((p) => p._id === id);
        if (product && window.Cart) {
          cartBtn.disabled = true;
          cartBtn.innerHTML = `<span>Adding...</span>`;
          await Cart.addToCart(product, 1);
          cartBtn.disabled = false;
          cartBtn.classList.add('in-cart');
          cartBtn.dataset.inCart = 'true';
          cartBtn.innerHTML = `<span>🛍️ Go to Cart ➔</span>`;
          cartBtn.style.background = 'var(--accent-green, #16a34a)';
          cartBtn.style.color = '#ffffff';

          Components.showToast(
            `Added "${Utils.truncate(product.name, 32)}" to your cart!`,
            'success',
            4500,
            { text: 'View Cart ➔', url: cartUrl }
          );
        }
        return;
      }

      // Wishlist toggle with instant heart-pop micro-animation
      const wishBtn = e.target.closest('.card-wishlist-btn');
      if (wishBtn) {
        e.preventDefault();
        const id = wishBtn.dataset.id;
        const product = products.find((p) => p._id === id);
        if (product && window.Wishlist) {
          wishBtn.classList.add('animating');
          const added = await Wishlist.toggleWishlist(product);
          wishBtn.classList.toggle('active', added);
          wishBtn.innerHTML = added ? '❤️' : '🤍';
          setTimeout(() => wishBtn.classList.remove('animating'), 380);
          Components.showToast(
            added ? `Saved "${Utils.truncate(product.name, 30)}" to your wishlist! ❤️` : `Removed from wishlist`,
            added ? 'success' : 'info'
          );
        }
        return;
      }
    });
  },

  // Render Global Clean Footer
  renderFooter() {
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (!footerPlaceholder) return;

    const isPagesSubdir = window.location.pathname.includes('/pages/');
    const basePath = isPagesSubdir ? '' : 'pages/';
    const homePath = isPagesSubdir ? '../index.html' : 'index.html';

    footerPlaceholder.innerHTML = `
      <!-- Bottom Section Quick Shopping Bar (Orders, Cart, Deals, Assured) -->
      <section class="bottom-quick-bar" id="bottom-quick-bar">
        <div class="container bottom-quick-inner">
          <a href="${basePath}orders.html" class="bottom-quick-card">
            <div class="bottom-quick-icon">📦</div>
            <div class="bottom-quick-info">
              <div class="bottom-quick-title">Track &amp; View Orders</div>
              <div class="bottom-quick-desc">Live shipments, easy returns &amp; tax invoices</div>
            </div>
            <span class="bottom-quick-arrow">&rarr;</span>
          </a>
          <a href="${basePath}cart.html" class="bottom-quick-card">
            <div class="bottom-quick-icon">🛒</div>
            <div class="bottom-quick-info">
              <div class="bottom-quick-title">Shopping Cart &amp; Saved</div>
              <div class="bottom-quick-desc">Review your items &amp; proceed to checkout</div>
            </div>
            <span class="bottom-quick-arrow">&rarr;</span>
          </a>
          <a href="${basePath}products.html?deal=flash" class="bottom-quick-card">
            <div class="bottom-quick-icon">⚡</div>
            <div class="bottom-quick-info">
              <div class="bottom-quick-title">Flash Tech Deals</div>
              <div class="bottom-quick-desc">Limited 24-hr markdowns &amp; bank discounts</div>
            </div>
            <span class="bottom-quick-arrow">&rarr;</span>
          </a>
          <a href="${basePath}profile.html#help" class="bottom-quick-card">
            <div class="bottom-quick-icon">🛡️</div>
            <div class="bottom-quick-info">
              <div class="bottom-quick-title">SHOPORA Assured</div>
              <div class="bottom-quick-desc">100% Genuine, 30-day doorstep replacement</div>
            </div>
            <span class="bottom-quick-arrow">&rarr;</span>
          </a>
        </div>
      </section>

      <footer class="site-footer">
        <div class="container">
          <div class="footer-top">
            <div class="footer-grid">
              <!-- Brand Column -->
              <div>
                <div class="footer-brand-title">SHOP<span>ORA</span></div>
                <p class="footer-brand-desc">
                  Discover More. Shop Smarter. A premier next-generation e-commerce destination bringing together authentic electronics, curated fashion, smart home appliances, and athletic gear with verified quality.
                </p>
                <div style="display: flex; gap: 12px; color: #94a3b8; font-size: 1.1rem;">
                  <span>🔒 256-Bit SSL Encrypted</span>
                </div>
              </div>

              <!-- Shop Column -->
              <div>
                <h4 class="footer-col-title">Shop by Category</h4>
                <ul class="footer-links-list">
                  <li><a href="${basePath}products.html?category=Mobiles+%26+Tablets" class="footer-link">Mobiles &amp; Tablets</a></li>
                  <li><a href="${basePath}products.html?category=Laptops+%26+Computing" class="footer-link">Laptops &amp; Computing</a></li>
                  <li><a href="${basePath}products.html?category=Audio+%26+Headphones" class="footer-link">Audio &amp; Headphones</a></li>
                  <li><a href="${basePath}products.html?category=Fashion+%26+Apparel" class="footer-link">Fashion &amp; Apparel</a></li>
                  <li><a href="${basePath}products.html?category=Footwear+%26+Sneakers" class="footer-link">Footwear &amp; Sneakers</a></li>
                  <li><a href="${basePath}products.html?category=Smart+Home+%26+Appliances" class="footer-link">Smart Home &amp; Living</a></li>
                </ul>
              </div>

              <!-- Customer Service -->
              <div>
                <h4 class="footer-col-title">Customer Service</h4>
                <ul class="footer-links-list">
                  <li><a href="${basePath}order-tracking.html" class="footer-link">Track Your Order</a></li>
                  <li><a href="${basePath}orders.html" class="footer-link">Order History</a></li>
                  <li><a href="${basePath}profile.html#returns" class="footer-link">Returns &amp; Refunds</a></li>
                  <li><a href="${basePath}profile.html#shipping" class="footer-link">Shipping Rates &amp; Policies</a></li>
                  <li><a href="${basePath}profile.html#help" class="footer-link">Help &amp; Support Desk</a></li>
                </ul>
              </div>

              <!-- About SHOPORA -->
              <div>
                <h4 class="footer-col-title">About SHOPORA</h4>
                <ul class="footer-links-list">
                  <li><a href="${homePath}#pillars" class="footer-link">Why SHOPORA?</a></li>
                  <li><a href="${basePath}products.html?isPremium=true" class="footer-link">SHOPORA Premium</a></li>
                  <li><a href="${basePath}products.html?isDeal=true" class="footer-link">Flash Deals Hub</a></li>
                  <li><a href="${basePath}admin.html" class="footer-link">Admin Portal</a></li>
                </ul>
              </div>

              <!-- Policies & Security -->
              <div>
                <h4 class="footer-col-title">Policies</h4>
                <ul class="footer-links-list">
                  <li><span class="footer-link" style="cursor: default;">Privacy Policy</span></li>
                  <li><span class="footer-link" style="cursor: default;">Terms of Service</span></li>
                  <li><span class="footer-link" style="cursor: default;">Security &amp; Fraud Prevention</span></li>
                  <li><span class="footer-link" style="cursor: default;">Authenticity Guarantee</span></li>
                </ul>
              </div>
            </div>
          </div>

          <div class="footer-bottom">
            <div class="footer-bottom-inner">
              <div class="footer-copyright">
                &copy; ${new Date().getFullYear()} SHOPORA Inc. All rights reserved. Original platform identity.
              </div>
              <div class="footer-badges">
                <span>⚡ Real-Time Socket.IO Active</span>
                <span>•</span>
                <span>Verified MongoDB Catalog</span>
                <span>•</span>
                <span>Fast Doorstep Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    `;
  },
};

window.Components = Components;
