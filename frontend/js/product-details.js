/**
 * SHOPORA — Product Details & Customer Reviews Controller
 * "Discover More. Shop Smarter."
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Components.renderNavbar('products');
  Components.renderFooter();

  const productId = Utils.getUrlParam('id');
  const detailsRoot = document.getElementById('product-details-root');
  const breadcrumbTitle = document.getElementById('breadcrumb-title');
  const breadcrumbCategory = document.getElementById('breadcrumb-category');
  const relatedGrid = document.getElementById('related-products-grid');
  const reviewsTarget = document.getElementById('reviews-list-target');
  const writeReviewOpenBtn = document.getElementById('write-review-open-btn');
  const reviewModal = document.getElementById('review-modal-backdrop');
  const closeReviewModal = document.getElementById('close-review-modal');
  const cancelReviewBtn = document.getElementById('cancel-review-btn');
  const reviewForm = document.getElementById('review-form');

  if (!productId) {
    if (detailsRoot) {
      detailsRoot.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 24px; background: #ffffff; border-radius: 16px; border: 1px solid var(--border-subtle);">
          <h3 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">No Product Specified</h3>
          <p style="color: #64748b; margin-bottom: 24px;">Please select an item from our product catalog.</p>
          <a href="products.html" class="btn btn-primary">Return to Catalog</a>
        </div>
      `;
    }
    return;
  }

  let currentProduct = null;

  try {
    const res = await API.get(`/products/${productId}`);
    const product = res.data;
    currentProduct = product;
    const related = res.related || [];

    // Title & breadcrumbs
    document.title = `${product.name} — SHOPORA`;
    if (breadcrumbTitle) breadcrumbTitle.textContent = product.name;
    if (breadcrumbCategory) {
      const catName = product.category ? product.category.name || product.category : 'General';
      breadcrumbCategory.innerHTML = `<a href="products.html?category=${encodeURIComponent(
        product.category?.slug || catName
      )}" style="color: var(--primary);">${catName}</a>`;
    }

    const discountPercent = product.discountPercentage || product.discount || 0;
    const finalPrice = product.finalPrice || product.price || 0;
    const originalPrice = product.originalPrice || product.price || 0;
    const isInStock = product.stock > 0;
    const images =
      product.images && product.images.length > 0
        ? product.images
        : [product.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'];

    // Specifications table markup
    let specsHtml = '';
    if (product.specifications && product.specifications.length > 0) {
      specsHtml = `
        <div style="margin-top: 24px; border-top: 1px solid var(--border-subtle); padding-top: 20px;">
          <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em;">
            Technical Specifications
          </h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
            <tbody>
              ${product.specifications
                .map(
                  (s) => `
                <tr style="border-bottom: 1px solid var(--border-subtle);">
                  <td style="padding: 8px 0; color: var(--text-muted); width: 35%; font-weight: 600;">${s.key}</td>
                  <td style="padding: 8px 0; color: var(--text-main); font-weight: 600;">${s.value}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Thumbnails markup
    let thumbsHtml = '';
    if (images.length > 1) {
      thumbsHtml = `
        <div class="thumbnail-row">
          ${images
            .map(
              (img, idx) => `
            <button class="thumbnail-item ${idx === 0 ? 'active' : ''}" data-src="${img}" type="button">
              <img src="${img}" alt="Thumbnail ${idx + 1}" onerror="Utils.imgFallback(this)" />
            </button>
          `
            )
            .join('')}
        </div>
      `;
    }

    const isWishlisted = window.Wishlist ? Wishlist.hasItem(product._id) : false;
    const cartItems = window.Cart ? Cart.getItems() : [];
    const alreadyInCart = cartItems.some((i) => (i._id || i.product) === product._id);

    // Build main HTML
    detailsRoot.innerHTML = `
      <!-- Gallery Left -->
      <div class="details-gallery">
        <div class="main-image-display">
          <img src="${images[0]}" id="main-product-img" alt="${product.name}" onerror="Utils.imgFallback(this)" />
        </div>
        ${thumbsHtml}
      </div>

      <!-- Info Right -->
      <div class="details-info">
        <div class="live-viewers-badge">
          <span class="live-viewers-dot"></span>
          <span><strong id="live-viewer-count">7</strong> shoppers are viewing this right now</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center;">
            <div class="details-brand">${Utils.safeStr(product.brand, 'SHOPORA')}</div>
            <span class="shopora-assured-badge" title="SHOPORA Assured Quality Checked">Assured <span>✦</span></span>
          </div>
          <span class="card-badge ${isInStock ? 'new' : 'deal'}" id="stock-status-badge">
            ${isInStock ? `In Stock (${product.stock} units)` : 'Out of Stock'}
          </span>
        </div>

        <h1 class="details-title">${product.name}</h1>

        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          <div class="rating-badge">★ ${(product.rating || 4.5).toFixed(1)}</div>
          <span style="font-size: 0.85rem; color: var(--text-muted);">(${product.reviewCount || 0} verified customer reviews)</span>
          <span style="color: var(--border-medium);">|</span>
          <span style="font-size: 0.8rem; color: var(--text-subtle);">SKU: <code style="color: var(--primary); font-weight: 700;">${product.sku || 'SHP-REF'}</code></span>
        </div>

        <div class="details-price-box">
          <span class="details-price-current">${Utils.formatPrice(finalPrice)}</span>
          ${
            discountPercent > 0
              ? `
            <span class="details-price-orig">${Utils.formatPrice(originalPrice)}</span>
            <span class="details-discount-badge">${discountPercent}% OFF</span>
          `
              : ''
          }
        </div>

        <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.65; margin-bottom: 20px;">
          ${product.description || ''}
        </p>

        <!-- Bank Offers & Partner Promotions (Flipkart Style) -->
        <div class="bank-offers-box">
          <div class="bank-offers-header">
            <div class="bank-offers-title">
              <span>🏷️</span> Available Offers &amp; Partner Discounts
            </div>
            <span style="font-size: 0.775rem; color: #16a34a; font-weight: 700;">4 Offers Active</span>
          </div>
          <div class="bank-offers-list">
            <div class="bank-offer-item">
              <span class="bank-offer-tag">Bank Offer</span>
              <div>10% Instant Discount on HDFC, ICICI &amp; SBI Credit Cards up to ₹1,500 on minimum spend ₹4,999. <a href="javascript:void(0)" class="bank-offer-cta" onclick="Components.showToast('Bank discount will automatically apply at checkout!', 'info')">T&amp;C</a></div>
            </div>
            <div class="bank-offer-item">
              <span class="bank-offer-tag">Special Price</span>
              <div>Get extra ₹1,000 off today (price inclusive of instant discount).</div>
            </div>
            <div class="bank-offer-item">
              <span class="bank-offer-tag">Partner Offer</span>
              <div>Sign up with SHOPORA Plus to receive ₹500 welcome reward coins.</div>
            </div>
            <div class="bank-offer-item">
              <span class="bank-offer-tag">No Cost EMI</span>
              <div>0% interest installment plans available starting ₹1,250/month across major banks.</div>
            </div>
          </div>
        </div>

        <!-- Interactive Pincode Delivery Checker -->
        <div class="pincode-checker-box">
          <div class="pincode-checker-title">
            <span>📍</span> Check Delivery &amp; Cash on Delivery Availability
          </div>
          <form class="pincode-checker-form" id="pincode-checker-form">
            <input type="text" id="pincode-input" class="pincode-checker-input" placeholder="Enter Pincode" maxlength="6" value="560001" required />
            <button type="submit" class="pincode-checker-btn">Check</button>
          </form>
          <div class="pincode-result-text" id="pincode-result-msg"></div>
        </div>

        <!-- Delivery & Return Badges -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
          <div style="background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-md); text-align: center;">
            <div style="font-size: 1.2rem; margin-bottom: 2px;">⚡</div>
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-main);">Express Delivery</div>
            <div style="font-size: 0.725rem; color: var(--text-muted);">${product.deliveryTime || '2-4 Business Days'}</div>
          </div>
          <div style="background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-md); text-align: center;">
            <div style="font-size: 1.2rem; margin-bottom: 2px;">🔄</div>
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-main);">Easy Returns</div>
            <div style="font-size: 0.725rem; color: var(--text-muted);">${product.returnPolicy || '30-Day Guarantee'}</div>
          </div>
          <div style="background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-md); text-align: center;">
            <div style="font-size: 1.2rem; margin-bottom: 2px;">🛡️</div>
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-main);">100% Genuine</div>
            <div style="font-size: 0.725rem; color: var(--text-muted);">Brand Warranty</div>
          </div>
        </div>

        <!-- Specifications -->
        ${specsHtml}

        <!-- Actions -->
        ${
          isInStock
            ? `
          <div style="margin-top: 28px; padding-top: 20px; border-top: 1.5px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
              <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">Quantity:</span>
              <div class="quantity-stepper">
                <button type="button" id="qty-dec">-</button>
                <span id="qty-val">1</span>
                <button type="button" id="qty-inc">+</button>
              </div>
              <span style="font-size: 0.8rem; color: var(--text-muted);">(Max ${product.stock} available)</span>
            </div>

            <!-- Flipkart & Amazon Dual Action Buttons -->
            <div class="details-actions-row">
              <button class="btn-flipkart-cart" id="add-to-cart-btn" data-in-cart="${alreadyInCart ? 'true' : 'false'}" style="${alreadyInCart ? 'background: #16a34a; color: #ffffff;' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                <span>${alreadyInCart ? '🛍️ Go to Cart ➔' : 'Add to Cart'}</span>
              </button>
              <a href="cart.html" class="btn-flipkart-cart btn-go-cart-pill" id="view-cart-direct-btn" style="display: ${alreadyInCart ? 'inline-flex' : 'none'}; background: #0f172a; color: #ffffff; text-decoration: none; align-items: center; justify-content: center; gap: 8px;">
                <span>🛒 View Cart (${Cart.getCount()})</span>
              </a>
              <button class="btn-flipkart-buy" id="buy-now-btn">
                <span>⚡ Buy Now</span>
              </button>
              <button class="details-wishlist-btn ${isWishlisted ? 'active' : ''}" id="wishlist-toggle-btn" title="Add to Wishlist">
                ${isWishlisted ? '❤️' : '🤍'}
              </button>
            </div>
          </div>
        `
            : `
          <div style="margin-top: 24px; padding: 14px 18px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-weight: 700; font-size: 0.925rem;">
            This item is currently out of stock. We are restocking soon!
          </div>
        `
        }
      </div>
    `;

    // Populate Mobile Sticky Action Bar
    const mobileStickyBar = document.getElementById('mobile-sticky-bar');
    if (mobileStickyBar) {
      if (isInStock) {
        mobileStickyBar.innerHTML = `
          <button class="btn-flipkart-cart" id="mobile-add-cart-btn" data-in-cart="${alreadyInCart ? 'true' : 'false'}" style="padding: 12px; font-size: 0.925rem; ${alreadyInCart ? 'background: #16a34a; color: #ffffff;' : ''}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span>${alreadyInCart ? '🛍️ Go to Cart ➔' : 'Add to Cart'}</span>
          </button>
          <a href="cart.html" class="btn-flipkart-cart" id="mobile-go-cart-btn" style="display: ${alreadyInCart ? 'inline-flex' : 'none'}; padding: 12px; font-size: 0.925rem; background: #0f172a; color: #ffffff; text-decoration: none; align-items: center; justify-content: center;">
            <span>🛒 Cart</span>
          </a>
          <button class="btn-flipkart-buy" id="mobile-buy-now-btn" style="padding: 12px; font-size: 0.925rem;">
            <span>⚡ Buy Now</span>
          </button>
        `;
      } else {
        mobileStickyBar.innerHTML = `
          <div style="width: 100%; text-align: center; color: #dc2626; font-weight: 800; font-size: 0.9rem; padding: 10px;">
            Currently Out of Stock
          </div>
        `;
      }
    }

    // Pincode Checker Form Handler
    const pincodeForm = document.getElementById('pincode-checker-form');
    const pincodeInput = document.getElementById('pincode-input');
    const pincodeMsg = document.getElementById('pincode-result-msg');
    if (pincodeForm && pincodeInput && pincodeMsg) {
      pincodeForm.onsubmit = (e) => {
        e.preventDefault();
        const pin = pincodeInput.value.trim();
        if (pin.length === 6 && /^\d+$/.test(pin)) {
          pincodeMsg.style.display = 'block';
          pincodeMsg.innerHTML = `✓ Delivery available to <strong>${pin}</strong> by Tomorrow, 9 PM. Free Express Shipping!`;
        } else {
          pincodeMsg.style.display = 'block';
          pincodeMsg.style.color = '#dc2626';
          pincodeMsg.textContent = 'Please enter a valid 6-digit Indian Pincode.';
        }
      };
    }

    // Hook Thumbnail clicker
    const mainImg = document.getElementById('main-product-img');
    document.querySelectorAll('.thumbnail-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.thumbnail-item').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (mainImg) mainImg.src = btn.dataset.src;
      });
    });

    // Quantity Stepper
    let qty = 1;
    const qtyVal = document.getElementById('qty-val');
    const qtyDec = document.getElementById('qty-dec');
    const qtyInc = document.getElementById('qty-inc');

    if (qtyDec && qtyInc && qtyVal) {
      qtyDec.onclick = () => {
        if (qty > 1) {
          qty--;
          qtyVal.textContent = qty;
        }
      };
      qtyInc.onclick = () => {
        if (qty < product.stock) {
          qty++;
          qtyVal.textContent = qty;
        }
      };
    }

    // Add to Cart Handlers (Desktop & Mobile)
    const handleAddToCart = async (btn) => {
      if (!btn) return;

      // If button is already showing Go to Cart, redirect to cart immediately!
      if (btn.dataset.inCart === 'true') {
        window.location.href = 'cart.html';
        return;
      }

      btn.disabled = true;
      btn.innerHTML = `<span>Adding...</span>`;
      await Cart.addToCart(product, qty, false); // avoid double toast
      btn.disabled = false;
      btn.dataset.inCart = 'true';
      btn.style.background = '#16a34a';
      btn.style.color = '#ffffff';
      btn.innerHTML = `<span>🛍️ Go to Cart ➔</span>`;

      // Reveal direct view cart buttons
      const directViewCart = document.getElementById('view-cart-direct-btn');
      if (directViewCart) {
        directViewCart.style.display = 'inline-flex';
        directViewCart.innerHTML = `<span>🛒 View Cart (${Cart.getCount()})</span>`;
      }
      const mobileGoCart = document.getElementById('mobile-go-cart-btn');
      if (mobileGoCart) {
        mobileGoCart.style.display = 'inline-flex';
      }

      // Sync mobile button if desktop was clicked or vice versa
      const otherBtn = btn.id === 'add-to-cart-btn' ? document.getElementById('mobile-add-cart-btn') : document.getElementById('add-to-cart-btn');
      if (otherBtn) {
        otherBtn.dataset.inCart = 'true';
        otherBtn.style.background = '#16a34a';
        otherBtn.style.color = '#ffffff';
        otherBtn.innerHTML = `<span>🛍️ Go to Cart ➔</span>`;
      }

      Components.showToast(
        `Added ${qty} &times; "${Utils.truncate(product.name, 32)}" to your cart!`,
        'success',
        5000,
        { text: 'Go to Cart ➔', url: 'cart.html' }
      );
    };

    const addBtn = document.getElementById('add-to-cart-btn');
    if (addBtn) addBtn.onclick = () => handleAddToCart(addBtn);

    const mobileAddBtn = document.getElementById('mobile-add-cart-btn');
    if (mobileAddBtn) mobileAddBtn.onclick = () => handleAddToCart(mobileAddBtn);

    // Buy Now Handlers (Direct to Checkout)
    const handleBuyNow = async () => {
      await Cart.addToCart(product, qty);
      window.location.href = 'checkout.html';
    };

    const buyBtn = document.getElementById('buy-now-btn');
    if (buyBtn) buyBtn.onclick = handleBuyNow;

    const mobileBuyBtn = document.getElementById('mobile-buy-now-btn');
    if (mobileBuyBtn) mobileBuyBtn.onclick = handleBuyNow;

    // Wishlist Toggle with Heart-Pop Micro-Animation
    const wishBtn = document.getElementById('wishlist-toggle-btn');
    if (wishBtn) {
      wishBtn.onclick = async () => {
        wishBtn.classList.add('animating');
        const added = await Wishlist.toggleWishlist(product);
        wishBtn.classList.toggle('active', added);
        wishBtn.innerHTML = added ? '❤️' : '🤍';
        setTimeout(() => wishBtn.classList.remove('animating'), 380);
        Components.showToast(
          added ? `Saved "${Utils.truncate(product.name, 30)}" to your wishlist! ❤️` : 'Removed from wishlist',
          added ? 'success' : 'info'
        );
      };
    }

    // Real-Time Socket.IO Synchronization (Live Stock & Viewers)
    if (typeof io !== 'undefined') {
      try {
        const socket = io();
        socket.emit('join_product_room', product._id);

        socket.on('live_viewers', (data) => {
          if (data && data.productId === product._id && document.getElementById('live-viewer-count')) {
            document.getElementById('live-viewer-count').textContent = data.viewers;
          }
        });

        socket.on('stock:updated', (data) => {
          if (data && data.productId === product._id) {
            product.stock = data.stock;
            const stockBadge = document.getElementById('stock-status-badge');
            if (stockBadge) {
              stockBadge.className = `card-badge ${data.stock > 0 ? 'new' : 'deal'}`;
              stockBadge.textContent = data.stock > 0 ? `In Stock (${data.stock} units)` : 'Out of Stock';
            }
            const allAddBtns = [addBtn, mobileAddBtn].filter(Boolean);
            const allBuyBtns = [buyBtn, mobileBuyBtn].filter(Boolean);
            if (data.stock <= 0) {
              allAddBtns.forEach((b) => {
                b.disabled = true;
                b.innerHTML = '<span>Out of Stock</span>';
              });
              allBuyBtns.forEach((b) => {
                b.disabled = true;
                b.style.opacity = '0.5';
              });
            } else {
              allAddBtns.forEach((b) => {
                b.disabled = false;
                b.innerHTML = `<span>Add to Cart</span>`;
              });
              allBuyBtns.forEach((b) => {
                b.disabled = false;
                b.style.opacity = '1';
              });
            }
          }
        });
      } catch (e) {
        console.warn('Socket product room connection skipped:', e);
      }
    }

    // Render Related Products
    if (relatedGrid && related.length > 0) {
      relatedGrid.innerHTML = related.slice(0, 4).map((p) => Components.renderProductCard(p)).join('');
      Components.initProductCardActions(relatedGrid, related);
    }

    // Fetch and render verified reviews
    loadProductReviews(product._id);
  } catch (err) {
    console.error('Error fetching product details:', err);
    if (detailsRoot) {
      detailsRoot.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #ffffff; border-radius: 16px; border: 1px solid #fee2e2;">
          <p style="color: #dc2626; font-weight: 700; margin-bottom: 12px;">Unable to load product details. Please try again.</p>
          <a href="products.html" class="btn btn-outline">Back to Catalog</a>
        </div>
      `;
    }
  }

  /**
   * Load Product Reviews from API
   */
  async function loadProductReviews(prodId) {
    if (!reviewsTarget) return;
    try {
      const res = await API.get(`/reviews/${prodId}`);
      const reviews = res.data || [];

      if (reviews.length === 0) {
        reviewsTarget.innerHTML = `
          <div style="padding: 24px; text-align: center; color: var(--text-muted); background: var(--bg-subtle); border-radius: var(--radius-md);">
            No customer reviews yet. Be the first to share your thoughts on this product!
          </div>
        `;
        return;
      }

      reviewsTarget.innerHTML = reviews
        .map(
          (r) => `
        <div style="padding: 18px 0; border-bottom: 1px solid var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; color: var(--text-main);">${Utils.safeStr(r.userName || r.user?.name, 'Verified Customer')}</span>
              ${r.isVerifiedPurchase ? `<span style="font-size: 0.75rem; color: #16a34a; font-weight: 700;">✓ Verified Purchase</span>` : ''}
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${Utils.formatDate(r.createdAt)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            ${Utils.renderStars(r.rating)}
            <strong style="font-size: 0.9rem; color: var(--text-main); margin-left: 4px;">${r.title}</strong>
          </div>
          <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">${r.comment}</p>
        </div>
      `
        )
        .join('');
    } catch (e) {
      console.warn('Reviews load error:', e);
      reviewsTarget.innerHTML = `<p style="color: var(--text-muted);">Customer reviews could not be loaded.</p>`;
    }
  }

  // Review modal listeners
  if (writeReviewOpenBtn && reviewModal) {
    writeReviewOpenBtn.onclick = () => {
      if (!Auth.isAuthenticated()) {
        Components.showToast('Please sign in to write a product review.', 'warning');
        setTimeout(() => {
          window.location.href = `login.html?redirect=product-details.html?id=${productId}`;
        }, 1200);
        return;
      }
      reviewModal.style.display = 'flex';
    };
  }

  const hideModal = () => {
    if (reviewModal) reviewModal.style.display = 'none';
  };
  if (closeReviewModal) closeReviewModal.onclick = hideModal;
  if (cancelReviewBtn) cancelReviewBtn.onclick = hideModal;

  if (reviewForm) {
    reviewForm.onsubmit = async (e) => {
      e.preventDefault();
      const rating = Number(document.getElementById('review-rating-select').value);
      const title = document.getElementById('review-title-input').value.trim();
      const comment = document.getElementById('review-comment-input').value.trim();

      try {
        const res = await API.post('/reviews', {
          product: productId,
          rating,
          title,
          comment,
        });

        if (res.success) {
          Components.showToast('Thank you! Your verified review has been posted.', 'success');
          hideModal();
          reviewForm.reset();
          loadProductReviews(productId);
        } else {
          Components.showToast(res.message || 'Could not post review.', 'error');
        }
      } catch (err) {
        Components.showToast(err.message || 'Error submitting review.', 'error');
      }
    };
  }
});
