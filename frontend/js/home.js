/**
 * SHOPORA — Production-Grade Homepage Logic
 * Continuous Discovery Flow:
 * OFFER -> PRODUCT -> DEAL -> PRODUCT -> COLLECTION -> PRODUCT
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Render Simplified Navbar & Footer
  await Components.renderNavbar('home');
  Components.renderFooter();

  // 2. User Data Sync if logged in
  if (window.Auth && Auth.isAuthenticated()) {
    if (window.Cart) Cart.syncWithServer().catch(() => {});
    if (window.Wishlist) Wishlist.syncWithServer().catch(() => {});
  }

  // 3. Dynamic Real-Time Social Proof Ticker Rotation
  const socialTickerEl = document.getElementById('social-proof-ticker-text');
  if (socialTickerEl) {
    const tickerMessages = [
      '🔥 <strong>Live Activity:</strong> Over 1,420 shoppers browsing verified deals right now',
      '⚡ <strong>Flash Alert:</strong> Extra 10% Instant Discount on HDFC &amp; ICICI Bank Cards',
      '📦 <strong>Verified Purchase:</strong> Someone in Mumbai just ordered <em>Sony WH-1000XM5 Headphones</em> (1 min ago)',
      '✦ <strong>SHOPORA Assured:</strong> 7-Day Replacement Guarantee &amp; Doorstep Returns on all items',
      '🛒 <strong>Trending Now:</strong> Over 280 units of <em>Noise ColorFit Smartwatch</em> sold today',
      '⭐ <strong>Customer Review:</strong> Customer from Bengaluru rated <em>MacBook Pro M3</em> 5.0 Stars (Just now)',
    ];
    let tickerIdx = 0;
    setInterval(() => {
      tickerIdx = (tickerIdx + 1) % tickerMessages.length;
      socialTickerEl.style.opacity = '0';
      socialTickerEl.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        socialTickerEl.innerHTML = tickerMessages[tickerIdx];
        socialTickerEl.style.opacity = '1';
      }, 300);
    }, 4500);
  }

  // 4. Socket.IO Real-Time Stream
  try {
    if (typeof io !== 'undefined') {
      const socket = io();
      socket.on('connect', () => {
        console.log('[SHOPORA] Connected to real-time event stream');
      });

      // Real-time stock update
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

        // Real-time stock meter fill updates on product cards
        const cards = document.querySelectorAll(`.product-card[data-id="${data.productId}"]`);
        cards.forEach((card) => {
          const fill = card.querySelector('.flash-stock-fill');
          const label = card.querySelector('.flash-stock-label span:last-child');
          if (fill) {
            const stockPct = Math.min(100, Math.max(15, Math.round((data.stock / 30) * 100)));
            fill.style.width = `${stockPct}%`;
          }
          if (label) {
            label.textContent = `Only ${data.stock} left!`;
          }
        });
      });

      // Real-time offer update
      const handleOfferReload = () => {
        console.log('[SHOPORA] Promotional offers updated via Socket.IO. Refreshing...');
        loadActiveOffers();
      };
      socket.on('offerUpdated', handleOfferReload);
      socket.on('offer:updated', handleOfferReload);
    }
  } catch (e) {
    console.warn('[SHOPORA] Socket.IO connection skipped:', e);
  }

  // 4. Load Active Offers & Top Carousel from MongoDB (/api/offers/active)
  let activeOffersList = [];
  let flashCountdownInterval = null;

  const loadActiveOffers = async () => {
    try {
      const res = await API.get('/offers/active');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        activeOffersList = res.data;
        renderTopOffersCarousel(activeOffersList);
        renderFlashOfferProducts(activeOffersList);
      } else {
        // Fallback if no active offers configured
        renderFallbackOffers();
      }
    } catch (err) {
      console.warn('Error loading active offers:', err);
      renderFallbackOffers();
    }
  };

  const renderTopOffersCarousel = (offers) => {
    const track = document.getElementById('offers-slider-track');
    const dotsContainer = document.getElementById('offers-dots-container');
    const prevBtn = document.getElementById('offers-prev-btn');
    const nextBtn = document.getElementById('offers-next-btn');
    const wrapper = document.getElementById('offers-slider-wrapper');

    if (!track) return;

    track.innerHTML = offers
      .map(
        (offer) => {
          const targetLink = offer.ctaLink || `pages/products.html?deal=${offer.type === 'FLASH DEAL' ? 'flash' : 'today'}`;
          return `
          <div class="offer-slide" data-link="${targetLink}" style="background-image: url('${offer.bannerImage || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1400&auto=format&fit=crop&q=80'}'); cursor: pointer;">
            <div class="offer-slide-overlay"></div>
            <div class="offer-slide-content">
              <div class="offer-badge-pill">
                <span>⚡</span> ${offer.badgeText || offer.type || 'SPECIAL OFFER'}
              </div>
              <h1 class="offer-slide-title">${offer.title}</h1>
              <p class="offer-slide-subtitle">${offer.subtitle || 'Discover premium products with verified manufacturer warranty.'}</p>
              <div class="offer-slide-actions">
                <a href="${targetLink}" class="btn-offer-cta" onclick="event.stopPropagation()">
                  <span>${offer.ctaText || 'SHOP NOW'}</span>
                  <span>&rarr;</span>
                </a>
                <div class="offer-slide-discount">
                  ${offer.discountValue ? `UP TO ${offer.discountValue}% OFF` : 'LIMITED DEALS'}
                </div>
              </div>
            </div>
          </div>
        `;
        }
      )
      .join('');

    // Make entire slide clickable to navigate directly to that specific deal
    track.querySelectorAll('.offer-slide').forEach((slide) => {
      slide.addEventListener('click', () => {
        const link = slide.getAttribute('data-link');
        if (link) window.location.href = link;
      });
    });

    const totalSlides = offers.length;
    let currentSlide = 0;
    let autoPlayTimer = null;

    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.className = `offers-dot ${i === 0 ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.onclick = () => goToSlide(i);
        dotsContainer.appendChild(dot);
      }
    }

    const updateDots = () => {
      if (!dotsContainer) return;
      const dots = dotsContainer.querySelectorAll('.offers-dot');
      dots.forEach((d, idx) => {
        d.classList.toggle('active', idx === currentSlide);
      });
    };

    const goToSlide = (idx) => {
      currentSlide = (idx + totalSlides) % totalSlides;
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
      updateDots();
    };

    if (prevBtn) prevBtn.onclick = () => goToSlide(currentSlide - 1);
    if (nextBtn) nextBtn.onclick = () => goToSlide(currentSlide + 1);

    // Auto-swap slides every 2.5 seconds (2500ms)
    const startAutoPlay = () => {
      if (autoPlayTimer) clearInterval(autoPlayTimer);
      autoPlayTimer = setInterval(() => {
        goToSlide(currentSlide + 1);
      }, 2500);
    };

    const stopAutoPlay = () => {
      if (autoPlayTimer) clearInterval(autoPlayTimer);
    };

    if (wrapper) {
      wrapper.addEventListener('mouseenter', stopAutoPlay);
      wrapper.addEventListener('mouseleave', startAutoPlay);
      wrapper.addEventListener('touchstart', stopAutoPlay, { passive: true });
      wrapper.addEventListener('touchend', startAutoPlay, { passive: true });
    }

    startAutoPlay();
  };

  const renderFallbackOffers = () => {
    const track = document.getElementById('offers-slider-track');
    if (!track) return;
    track.innerHTML = `
      <div class="offer-slide" style="background-image: url('https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1400&auto=format&fit=crop&q=80');">
        <div class="offer-slide-overlay"></div>
        <div class="offer-slide-content">
          <div class="offer-badge-pill"><span>⚡</span> FLASH SALE</div>
          <h1 class="offer-slide-title">Upgrade Your Tech Essentials</h1>
          <p class="offer-slide-subtitle">Discover flagship titanium smartphones, M-series ultrabooks, and audiophile gear.</p>
          <div class="offer-slide-actions">
            <a href="pages/products.html?deal=flash" class="btn-offer-cta">
              <span>SHOP FLASH DEALS</span>
              <span>&rarr;</span>
            </a>
            <div class="offer-slide-discount">UP TO 40% OFF</div>
          </div>
        </div>
      </div>
    `;
  };

  // 5. Flash Deals / Offer Products Section with Live Countdown
  const renderFlashOfferProducts = (offers) => {
    const flashTrack = document.getElementById('flash-offer-products-track');
    const timerHours = document.getElementById('timer-hours');
    const timerMinutes = document.getElementById('timer-minutes');
    const timerSeconds = document.getElementById('timer-seconds');

    if (!flashTrack) return;

    // Find the primary flash offer or first offer with products
    const flashOffer = offers.find((o) => o.type === 'FLASH DEAL' && o.products && o.products.length > 0) || offers[0];

    if (flashOffer && flashOffer.products && flashOffer.products.length > 0) {
      flashTrack.innerHTML = flashOffer.products
        .map((p) => `<div class="carousel-card-item">${Components.renderProductCard(p)}</div>`)
        .join('');
      Components.initProductCardActions(flashTrack, flashOffer.products);

      // Initialize real countdown timer based on offer.endTime
      const targetTime = new Date(flashOffer.endTime).getTime();

      const updateCountdown = () => {
        const now = Date.now();
        const diff = Math.max(0, targetTime - now);

        if (diff <= 0) {
          if (flashCountdownInterval) clearInterval(flashCountdownInterval);
          if (timerHours) timerHours.textContent = '00';
          if (timerMinutes) timerMinutes.textContent = '00';
          if (timerSeconds) timerSeconds.textContent = '00';
          // Auto refresh from backend when expired
          loadActiveOffers();
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (timerHours) timerHours.textContent = String(hours).padStart(2, '0');
        if (timerMinutes) timerMinutes.textContent = String(minutes).padStart(2, '0');
        if (timerSeconds) timerSeconds.textContent = String(seconds).padStart(2, '0');
      };

      if (flashCountdownInterval) clearInterval(flashCountdownInterval);
      updateCountdown();
      flashCountdownInterval = setInterval(updateCountdown, 1000);
    } else {
      // Fallback to /api/products/flash-deals
      loadFallbackFlashProducts();
    }
  };

  const loadFallbackFlashProducts = async () => {
    const flashTrack = document.getElementById('flash-offer-products-track');
    if (!flashTrack) return;
    try {
      const res = await API.get('/products/flash-deals');
      const products = res.data || [];
      if (products.length > 0) {
        flashTrack.innerHTML = products
          .map((p) => `<div class="carousel-card-item">${Components.renderProductCard(p)}</div>`)
          .join('');
        Components.initProductCardActions(flashTrack, products);
      }
    } catch (e) {
      console.warn('Fallback flash products error:', e);
    }
  };

  await loadActiveOffers();

  // 6. Section 5: Deals of the Day Carousel
  const dealContainer = document.getElementById('deal-products-container');
  if (dealContainer) {
    try {
      const dealsRes = await API.get('/products/deals');
      const dealProducts = dealsRes.data || [];
      if (dealProducts.length > 0) {
        const carousel = Components.renderProductCarousel({
          title: '🔥 Deals of the Day',
          badgeText: 'Up to 50% OFF',
          badgeColor: 'red',
          viewAllLink: 'pages/products.html?isDeal=true',
          products: dealProducts,
          carouselId: 'deals-today',
        });
        dealContainer.innerHTML = carousel.html;
        carousel.initArrows();
        Components.initProductCardActions(dealContainer, dealProducts);
      }
    } catch (e) {
      console.warn('Deals of day error:', e);
    }
  }

  // 7. Section 6: SHOPORA SELECT (Premium Products Track)
  const selectTrack = document.getElementById('select-products-track');
  if (selectTrack) {
    try {
      const premiumRes = await API.get('/products/premium');
      const premiumProducts = premiumRes.data || [];
      if (premiumProducts.length > 0) {
        selectTrack.innerHTML = premiumProducts
          .map((p) => `<div class="carousel-card-item">${Components.renderProductCard(p)}</div>`)
          .join('');
        Components.initProductCardActions(selectTrack, premiumProducts);
      }
    } catch (e) {
      console.warn('Premium products error:', e);
    }
  }

  // 8. Section 7: Trending Now
  const trendingContainer = document.getElementById('trending-products-container');
  if (trendingContainer) {
    try {
      const trendingRes = await API.get('/products/trending');
      const trendingProducts = trendingRes.data || [];
      if (trendingProducts.length > 0) {
        const carousel = Components.renderProductCarousel({
          title: '🔥 Trending Now',
          badgeText: 'Most Viewed & Ordered',
          badgeColor: 'blue',
          viewAllLink: 'pages/products.html?isTrending=true',
          products: trendingProducts,
          carouselId: 'trending-now',
        });
        trendingContainer.innerHTML = carousel.html;
        carousel.initArrows();
        Components.initProductCardActions(trendingContainer, trendingProducts);
      }
    } catch (e) {
      console.warn('Trending products error:', e);
    }
  }

  // 9. Section 8: New Arrivals
  const newArrivalsContainer = document.getElementById('new-arrivals-container');
  if (newArrivalsContainer) {
    try {
      const newRes = await API.get('/products/new-arrivals');
      const newProducts = newRes.data || [];
      if (newProducts.length > 0) {
        const carousel = Components.renderProductCarousel({
          title: '✨ New Arrivals',
          badgeText: 'Fresh in Catalog',
          badgeColor: 'blue',
          viewAllLink: 'pages/products.html?isNew=true',
          products: newProducts,
          carouselId: 'new-arrivals',
        });
        newArrivalsContainer.innerHTML = carousel.html;
        carousel.initArrows();
        Components.initProductCardActions(newArrivalsContainer, newProducts);
      }
    } catch (e) {
      console.warn('New arrivals error:', e);
    }
  }

  // 10. Section 9: Shop by Category Cards Grid
  const categoryCardsGrid = document.getElementById('category-cards-grid');
  if (categoryCardsGrid) {
    try {
      const catRes = await API.get('/categories');
      if (catRes.success && Array.isArray(catRes.data) && catRes.data.length > 0) {
        categoryCardsGrid.innerHTML = catRes.data
          .map(
            (cat) => `
            <a href="pages/products.html?category=${encodeURIComponent(cat.name)}" class="cat-visual-card" title="${cat.name}">
              <div class="cat-visual-icon">${cat.icon || '🏷️'}</div>
              <div class="cat-visual-name">${cat.name}</div>
            </a>
          `
          )
          .join('');
      }
    } catch (e) {
      console.warn('Category cards error:', e);
    }
  }

  // 11. Section 10: Best Sellers
  const bestSellersContainer = document.getElementById('best-sellers-container');
  if (bestSellersContainer) {
    try {
      const bestRes = await API.get('/products?sort=popular&limit=12');
      const bestProducts = bestRes.data || [];
      if (bestProducts.length > 0) {
        const carousel = Components.renderProductCarousel({
          title: '🏆 Best Sellers',
          badgeText: 'Top Selling',
          badgeColor: 'gold',
          viewAllLink: 'pages/products.html?sort=popular',
          products: bestProducts,
          carouselId: 'best-sellers',
        });
        bestSellersContainer.innerHTML = carousel.html;
        carousel.initArrows();
        Components.initProductCardActions(bestSellersContainer, bestProducts);
      }
    } catch (e) {
      console.warn('Best sellers error:', e);
    }
  }

  // 12. Section 11: Picked For You / Popular For You
  const pickedContainer = document.getElementById('picked-for-you-container');
  if (pickedContainer) {
    try {
      const user = window.Auth ? Auth.getUser() : null;
      const hasHistory = user && (Cart.getCount() > 0 || Wishlist.getCount() > 0);
      const title = hasHistory ? '✨ Picked For You' : '✨ Popular For You';
      const badgeText = hasHistory ? 'Personalized Picks' : 'Customer Favorites';

      const recRes = await API.get('/products?sort=rating&limit=12');
      const recProducts = recRes.data || [];
      if (recProducts.length > 0) {
        const carousel = Components.renderProductCarousel({
          title,
          badgeText,
          badgeColor: 'blue',
          viewAllLink: 'pages/products.html?sort=rating',
          products: recProducts,
          carouselId: 'picked-for-you',
        });
        pickedContainer.innerHTML = carousel.html;
        carousel.initArrows();
        Components.initProductCardActions(pickedContainer, recProducts);
      }
    } catch (e) {
      console.warn('Recommendations error:', e);
    }
  }
});
