/**
 * SHOPORA — Product Catalog Controller
 * "Discover More. Shop Smarter."
 * Real-time database-driven filtering, brand checklists, categories, search, sorting & pagination.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Shared SHOPORA Navbar & Footer
  await Components.renderNavbar('products');
  Components.renderFooter();

  const urlDeal = Utils.getUrlParam('deal');
  const urlIsDeal = Utils.getUrlParam('isDeal');
  const urlPremium = Utils.getUrlParam('premium');
  const urlIsPremium = Utils.getUrlParam('isPremium');
  const urlDiscount = Utils.getUrlParam('hasDiscount');
  const urlOffer = Utils.getUrlParam('offer');

  // State object initialized from URL query parameters
  const state = {
    search: Utils.getUrlParam('search') || '',
    category: Utils.getUrlParam('category') || 'All',
    brands: Utils.getUrlParam('brand') ? [Utils.getUrlParam('brand')] : [],
    minPrice: Utils.getUrlParam('minPrice') || '',
    maxPrice: Utils.getUrlParam('maxPrice') || '',
    rating: Number(Utils.getUrlParam('rating')) || 0,
    inStock: Utils.getUrlParam('inStock') === 'true',
    deal: urlDeal || (urlIsDeal === 'true' ? 'true' : ''),
    isDeal: !!urlDeal || urlIsDeal === 'true',
    isPremium: urlPremium === 'true' || urlIsPremium === 'true',
    hasDiscount: urlDiscount === 'true',
    offer: urlOffer || '',
    isTrending: Utils.getUrlParam('isTrending') === 'true' || Utils.getUrlParam('trending') === 'true',
    isNew: Utils.getUrlParam('isNew') === 'true' || Utils.getUrlParam('new') === 'true',
    sort: Utils.getUrlParam('sort') || 'newest',
    page: Number(Utils.getUrlParam('page')) || 1,
    limit: 12,
  };

  // DOM Elements
  const productsGrid = document.getElementById('catalog-products-grid');
  const resultsCountDisplay = document.getElementById('results-count-display');
  const paginationControls = document.getElementById('pagination-controls');
  const sortDropdown = document.getElementById('sort-dropdown');
  const minPriceInput = document.getElementById('min-price');
  const maxPriceInput = document.getElementById('max-price');
  const applyPriceBtn = document.getElementById('apply-price-btn');
  const clearAllFiltersBtn = document.getElementById('clear-all-filters-btn');
  const inStockCheckbox = document.getElementById('filter-instock');
  const dealsCheckbox = document.getElementById('filter-deals');
  const premiumCheckbox = document.getElementById('filter-premium');
  const trendingCheckbox = document.getElementById('filter-trending');
  const categoriesList = document.getElementById('sidebar-categories-list');
  const brandsList = document.getElementById('sidebar-brands-list');
  const breadcrumbTag = document.getElementById('breadcrumb-category-tag');
  const breadcrumbName = document.getElementById('breadcrumb-category-name');

  // Sync initial state values into inputs
  if (minPriceInput && state.minPrice) minPriceInput.value = state.minPrice;
  if (maxPriceInput && state.maxPrice) maxPriceInput.value = state.maxPrice;
  if (sortDropdown && state.sort) sortDropdown.value = state.sort;
  if (inStockCheckbox) inStockCheckbox.checked = state.inStock;
  if (dealsCheckbox) dealsCheckbox.checked = state.isDeal;
  if (premiumCheckbox) premiumCheckbox.checked = state.isPremium;
  if (trendingCheckbox) trendingCheckbox.checked = state.isTrending;

  // Rating radio sync
  const initialRatingRadio = document.querySelector(`input[name="rating-filter"][value="${state.rating}"]`);
  if (initialRatingRadio) initialRatingRadio.checked = true;

  /**
   * Load Categories into sidebar
   */
  async function loadSidebarCategories() {
    try {
      const res = await API.get('/categories');
      const categories = res.data || [];
      let html = `
        <label class="filter-checkbox-label">
          <input type="radio" name="cat-radio" value="All" ${state.category === 'All' ? 'checked' : ''} />
          <span>All Departments</span>
        </label>
      `;

      categories.forEach((cat) => {
        const isChecked = state.category === cat.slug || state.category === cat.name;
        html += `
          <label class="filter-checkbox-label">
            <input type="radio" name="cat-radio" value="${cat.slug || cat.name}" ${isChecked ? 'checked' : ''} />
            <span>${cat.name}</span>
          </label>
        `;
      });

      if (categoriesList) {
        categoriesList.innerHTML = html;
        categoriesList.querySelectorAll('input[name="cat-radio"]').forEach((radio) => {
          radio.addEventListener('change', (e) => {
            state.category = e.target.value;
            state.page = 1;
            updateBreadcrumb();
            updateUrlParams();
            fetchProducts();
          });
        });
      }
    } catch (err) {
      console.warn('Failed to load sidebar categories:', err);
    }
  }

  /**
   * Load Brands dynamically from DB
   */
  async function loadSidebarBrands() {
    try {
      const res = await API.get('/products?limit=100');
      const products = res.data || [];
      const brandSet = new Set();
      products.forEach((p) => {
        if (p.brand) brandSet.add(p.brand);
      });

      const brands = Array.from(brandSet).sort();
      if (brandsList) {
        if (brands.length === 0) {
          brandsList.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">No brands available</span>`;
          return;
        }

        brandsList.innerHTML = brands
          .map(
            (brand) => `
          <label class="filter-checkbox-label">
            <input type="checkbox" class="brand-filter-cb" value="${brand}" ${state.brands.includes(brand) ? 'checked' : ''} />
            <span>${brand}</span>
          </label>
        `
          )
          .join('');

        brandsList.querySelectorAll('.brand-filter-cb').forEach((cb) => {
          cb.addEventListener('change', () => {
            const checkedBrands = Array.from(brandsList.querySelectorAll('.brand-filter-cb:checked')).map(
              (el) => el.value
            );
            state.brands = checkedBrands;
            state.page = 1;
            updateUrlParams();
            fetchProducts();
          });
        });
      }
    } catch (err) {
      console.warn('Failed to load brands:', err);
    }
  }

  function updateBreadcrumb() {
    if (breadcrumbTag && breadcrumbName) {
      if (state.category && state.category !== 'All') {
        breadcrumbTag.style.display = 'inline';
        breadcrumbName.textContent = state.category;
      } else if (state.deal) {
        breadcrumbTag.style.display = 'inline';
        breadcrumbName.textContent = state.deal === 'flash' ? '⚡ Flash Tech Deals' : '🔥 Deals of the Day';
      } else if (state.isPremium) {
        breadcrumbTag.style.display = 'inline';
        breadcrumbName.textContent = '✨ SHOPORA SELECT';
      } else if (state.hasDiscount) {
        breadcrumbTag.style.display = 'inline';
        breadcrumbName.textContent = '💙 Bank Discount Offers';
      } else {
        breadcrumbTag.style.display = 'none';
      }
    }
  }

  /**
   * Fetch Products from Express MongoDB API
   */
  async function fetchProducts() {
    if (!productsGrid) return;

    // Show skeletons while loading
    productsGrid.innerHTML = Array(6)
      .fill(0)
      .map(
        () => `
      <div class="skeleton-card">
        <div class="skeleton" style="width: 100%; height: 180px; margin-bottom: 14px;"></div>
        <div class="skeleton" style="width: 60%; height: 16px; margin-bottom: 8px;"></div>
        <div class="skeleton" style="width: 90%; height: 22px; margin-bottom: 12px;"></div>
        <div class="skeleton" style="width: 40%; height: 24px; margin-top: auto;"></div>
      </div>
    `
      )
      .join('');

    const params = new URLSearchParams();
    if (state.search) params.set('search', state.search);
    if (state.category && state.category !== 'All') params.set('category', state.category);
    if (state.brands.length > 0) params.set('brand', state.brands[0]);
    if (state.minPrice) params.set('minPrice', state.minPrice);
    if (state.maxPrice) params.set('maxPrice', state.maxPrice);
    if (state.rating > 0) params.set('rating', state.rating);
    if (state.inStock) params.set('inStock', 'true');
    if (state.deal) params.set('deal', state.deal);
    else if (state.isDeal) params.set('isDeal', 'true');
    if (state.isPremium) params.set('isPremium', 'true');
    if (state.hasDiscount) params.set('hasDiscount', 'true');
    if (state.offer) params.set('offer', state.offer);
    if (state.isTrending) params.set('isTrending', 'true');
    if (state.isNew) params.set('isNew', 'true');
    if (state.sort) params.set('sort', state.sort);
    params.set('page', state.page);
    params.set('limit', state.limit);

    try {
      const response = await API.get(`/products?${params.toString()}`);
      let products = response.data || [];
      const total = response.total || products.length;
      const totalPages = response.totalPages || 1;
      const currentPage = response.currentPage || 1;

      // Filter by remaining checked brands client-side if multiple selected
      if (state.brands.length > 1) {
        products = products.filter((p) => state.brands.includes(p.brand));
      }

      if (resultsCountDisplay) {
        let contextLabel = '';
        if (state.deal === 'flash') contextLabel = ' in ⚡ Flash Tech Deals';
        else if (state.deal === 'today' || state.isDeal) contextLabel = ' in 🔥 Deals of the Day';
        else if (state.isPremium) contextLabel = ' in ✨ SHOPORA SELECT';
        else if (state.hasDiscount) contextLabel = ' in 💙 Special Bank Discounts';
        else if (state.category && state.category !== 'All') contextLabel = ` in ${state.category}`;
        else if (state.search) contextLabel = ` for "<em>${state.search}</em>"`;

        resultsCountDisplay.innerHTML = `Showing <strong>${products.length}</strong> of <strong>${total}</strong> products${contextLabel}`;
      }

      if (products.length === 0) {
        productsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 24px; background: #ffffff; border-radius: 16px; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-xs);">
            <div style="font-size: 3.5rem; margin-bottom: 12px;">🔍</div>
            <h3 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">No matching products found</h3>
            <p style="color: #64748b; max-width: 440px; margin: 0 auto 24px; font-size: 0.925rem;">
              We couldn't find any products that match your selected filters. Try broadening your criteria or reset all filters.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-primary" id="catalog-empty-reset-btn">Reset All Filters</button>
              <a href="../index.html" class="btn btn-outline">Explore Trending on Home</a>
            </div>
          </div>
        `;
        const resetBtn = document.getElementById('catalog-empty-reset-btn');
        if (resetBtn) resetBtn.addEventListener('click', resetAllFilters);
        if (paginationControls) paginationControls.style.display = 'none';
        return;
      }

      // Render product cards
      productsGrid.innerHTML = products.map((p) => Components.renderProductCard(p)).join('');
      Components.initProductCardActions(productsGrid, products);

      // Render pagination
      renderPagination(currentPage, totalPages);
    } catch (err) {
      console.error('Error fetching products:', err);
      productsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #ffffff; border-radius: 16px; border: 1px solid #fee2e2;">
          <p style="color: #dc2626; font-weight: 700; margin-bottom: 12px;">Unable to connect to SHOPORA backend. Please try again.</p>
          <button class="btn btn-outline btn-sm" onclick="location.reload()">Retry Connection</button>
        </div>
      `;
      if (resultsCountDisplay) resultsCountDisplay.textContent = 'Connection error';
    }
  }

  /**
   * Render Pagination Buttons
   */
  function renderPagination(current, totalPages) {
    if (!paginationControls) return;
    if (totalPages <= 1) {
      paginationControls.style.display = 'none';
      return;
    }

    paginationControls.style.display = 'flex';
    let html = `
      <button class="page-num-btn" ${current === 1 ? 'disabled' : ''} data-page="${current - 1}" title="Previous Page">
        ‹
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      html += `
        <button class="page-num-btn ${i === current ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `;
    }

    html += `
      <button class="page-num-btn" ${current === totalPages ? 'disabled' : ''} data-page="${current + 1}" title="Next Page">
        ›
      </button>
    `;

    paginationControls.innerHTML = html;

    paginationControls.querySelectorAll('.page-num-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetPage = Number(btn.dataset.page);
        if (targetPage && targetPage !== state.page) {
          state.page = targetPage;
          updateUrlParams();
          fetchProducts();
          window.scrollTo({ top: 120, behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * Update browser URL with active filter state without reloading
   */
  function updateUrlParams() {
    const url = new URL(window.location);
    if (state.search) url.searchParams.set('search', state.search);
    else url.searchParams.delete('search');

    if (state.category && state.category !== 'All') url.searchParams.set('category', state.category);
    else url.searchParams.delete('category');

    if (state.brands.length > 0) url.searchParams.set('brand', state.brands[0]);
    else url.searchParams.delete('brand');

    if (state.minPrice) url.searchParams.set('minPrice', state.minPrice);
    else url.searchParams.delete('minPrice');

    if (state.maxPrice) url.searchParams.set('maxPrice', state.maxPrice);
    else url.searchParams.delete('maxPrice');

    if (state.rating > 0) url.searchParams.set('rating', state.rating);
    else url.searchParams.delete('rating');

    if (state.inStock) url.searchParams.set('inStock', 'true');
    else url.searchParams.delete('inStock');

    if (state.deal) url.searchParams.set('deal', state.deal);
    else if (state.isDeal) url.searchParams.set('isDeal', 'true');
    else url.searchParams.delete('deal');

    if (state.isPremium) url.searchParams.set('isPremium', 'true');
    else url.searchParams.delete('isPremium');

    if (state.hasDiscount) url.searchParams.set('hasDiscount', 'true');
    else url.searchParams.delete('hasDiscount');

    if (state.offer) url.searchParams.set('offer', state.offer);
    else url.searchParams.delete('offer');

    if (state.isTrending) url.searchParams.set('isTrending', 'true');
    else url.searchParams.delete('isTrending');

    if (state.isNew) url.searchParams.set('isNew', 'true');
    else url.searchParams.delete('isNew');

    if (state.sort !== 'newest') url.searchParams.set('sort', state.sort);
    else url.searchParams.delete('sort');

    if (state.page > 1) url.searchParams.set('page', state.page);
    else url.searchParams.delete('page');

    window.history.replaceState({}, '', url);
  }

  /**
   * Reset All Filters
   */
  function resetAllFilters() {
    state.search = '';
    state.category = 'All';
    state.brands = [];
    state.minPrice = '';
    state.maxPrice = '';
    state.rating = 0;
    state.inStock = false;
    state.isDeal = false;
    state.isPremium = false;
    state.isTrending = false;
    state.isNew = false;
    state.sort = 'newest';
    state.page = 1;

    if (minPriceInput) minPriceInput.value = '';
    if (maxPriceInput) maxPriceInput.value = '';
    if (sortDropdown) sortDropdown.value = 'newest';
    if (inStockCheckbox) inStockCheckbox.checked = false;
    if (dealsCheckbox) dealsCheckbox.checked = false;
    if (premiumCheckbox) premiumCheckbox.checked = false;
    if (trendingCheckbox) trendingCheckbox.checked = false;

    const allCatRadio = document.querySelector('input[name="cat-radio"][value="All"]');
    if (allCatRadio) allCatRadio.checked = true;

    const zeroRatingRadio = document.querySelector('input[name="rating-filter"][value="0"]');
    if (zeroRatingRadio) zeroRatingRadio.checked = true;

    if (brandsList) {
      brandsList.querySelectorAll('.brand-filter-cb').forEach((cb) => (cb.checked = false));
    }

    updateBreadcrumb();
    updateUrlParams();
    fetchProducts();
  }

  // Event Listeners
  if (sortDropdown) {
    sortDropdown.addEventListener('change', (e) => {
      state.sort = e.target.value;
      state.page = 1;
      updateUrlParams();
      fetchProducts();
    });
  }

  if (applyPriceBtn) {
    applyPriceBtn.addEventListener('click', () => {
      state.minPrice = minPriceInput ? minPriceInput.value.trim() : '';
      state.maxPrice = maxPriceInput ? maxPriceInput.value.trim() : '';
      state.page = 1;
      updateUrlParams();
      fetchProducts();
    });
  }

  document.querySelectorAll('input[name="rating-filter"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.rating = Number(e.target.value);
      state.page = 1;
      updateUrlParams();
      fetchProducts();
    });
  });

  if (inStockCheckbox) {
    inStockCheckbox.addEventListener('change', (e) => {
      state.inStock = e.target.checked;
      state.page = 1;
      updateUrlParams();
      fetchProducts();
    });
  }

  if (dealsCheckbox) {
    dealsCheckbox.addEventListener('change', (e) => {
      state.isDeal = e.target.checked;
      state.page = 1;
      updateUrlParams();
      fetchProducts();
    });
  }

  if (premiumCheckbox) {
    premiumCheckbox.addEventListener('change', (e) => {
      state.isPremium = e.target.checked;
      state.page = 1;
      updateUrlParams();
      fetchProducts();
    });
  }

  if (trendingCheckbox) {
    trendingCheckbox.addEventListener('change', (e) => {
      state.isTrending = e.target.checked;
      state.page = 1;
      updateUrlParams();
      fetchProducts();
    });
  }

  if (clearAllFiltersBtn) {
    clearAllFiltersBtn.addEventListener('click', resetAllFilters);
  }

  // Mobile Filter Drawer Toggle
  const mobileFilterOpenBtn = document.getElementById('mobile-filter-open-btn');
  const mobileFilterCloseBtn = document.getElementById('mobile-filter-close-btn');
  const filtersSidebar = document.getElementById('filters-sidebar');

  if (mobileFilterOpenBtn && filtersSidebar) {
    mobileFilterOpenBtn.addEventListener('click', () => {
      filtersSidebar.classList.add('drawer-open');
    });
  }

  if (mobileFilterCloseBtn && filtersSidebar) {
    mobileFilterCloseBtn.addEventListener('click', () => {
      filtersSidebar.classList.remove('drawer-open');
    });
  }

  // Real-time Stock Sync via Socket.IO
  try {
    if (typeof io !== 'undefined') {
      const socket = io();
      socket.on('stock:updated', (data) => {
        if (!data || !data.productId) return;
        const addButtons = document.querySelectorAll(`.add-to-cart-btn[data-id="${data.productId}"]`);
        addButtons.forEach((btn) => {
          if (data.stock <= 0) {
            btn.disabled = true;
            btn.innerHTML = `<span>Out of Stock</span>`;
          } else {
            btn.disabled = false;
            btn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              <span>Add to Cart</span>
            `;
          }
        });
      });
    }
  } catch (e) {
    console.warn('[SHOPORA] Catalog Socket.IO skipped:', e);
  }

  // Initial runs
  updateBreadcrumb();
  await loadSidebarCategories();
  await loadSidebarBrands();
  await fetchProducts();
});
