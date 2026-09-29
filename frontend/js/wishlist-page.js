/**
 * SHOPORA — Wishlist Page Controller
 * "Discover More. Shop Smarter."
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Components.renderNavbar('wishlist');
  Components.renderFooter();

  if (!Auth.isAuthenticated()) {
    Components.showToast('Please sign in to view your wishlist', 'warning');
    setTimeout(() => {
      window.location.href = `login.html?redirect=wishlist.html`;
    }, 600);
    return;
  }

  const gridTarget = document.getElementById('wishlist-grid-target');
  const countSub = document.getElementById('wishlist-count-sub');

  async function loadWishlist() {
    try {
      const res = await API.get('/wishlist');
      const products = res.data || [];

      if (countSub) {
        countSub.textContent = `${products.length} saved item${products.length === 1 ? '' : 's'}`;
      }

      if (products.length === 0) {
        gridTarget.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 70px 24px; background: #ffffff; border-radius: 16px; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-xs);">
            <div style="font-size: 3.5rem; margin-bottom: 12px;">❤️</div>
            <h3 style="font-size: 1.4rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Save products you love.</h3>
            <p style="color: #64748b; max-width: 440px; margin: 0 auto 24px; font-size: 0.95rem;">
              Save items you love by clicking the heart icon on any product card, and keep track of availability and deals.
            </p>
            <a href="products.html" class="btn btn-primary">Browse Products &rarr;</a>
          </div>
        `;
        return;
      }

      gridTarget.innerHTML = products
        .map((p) => {
          return `
          <div style="display: flex; flex-direction: column; height: 100%;">
            ${Components.renderProductCard(p)}
            <div style="margin-top: 10px; display: flex; gap: 8px;">
              <button class="btn btn-outline btn-sm move-to-cart-btn" data-id="${p._id}" style="flex: 1;">
                🛒 Move to Cart
              </button>
            </div>
          </div>
        `;
        })
        .join('');

      // Attach card actions
      Components.initProductCardActions(gridTarget, products);

      // Bind Move to Cart buttons
      gridTarget.querySelectorAll('.move-to-cart-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const pId = btn.dataset.id;
          const prod = products.find((p) => p._id === pId);
          if (prod) {
            btn.disabled = true;
            btn.textContent = 'Moving...';
            try {
              await API.post('/wishlist/move-to-cart', { productId: pId });
              await Cart.addToCart(prod, 1);
              if (window.Wishlist) {
                Wishlist.items = Wishlist.items.filter((id) => id !== pId);
              }
              window.dispatchEvent(new Event('wishlist:updated'));
              window.dispatchEvent(new Event('cart:updated'));
              Components.showToast('Item moved to your cart!', 'success');
              loadWishlist();
            } catch (err) {
              console.error(err);
              btn.disabled = false;
              btn.textContent = '🛒 Move to Cart';
            }
          }
        });
      });
    } catch (err) {
      console.error('Wishlist error:', err);
      gridTarget.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #ffffff; border-radius: 16px; border: 1px solid #fee2e2;">
          <p style="color: #dc2626; font-weight: 700; margin-bottom: 12px;">Failed to load your wishlist. Please try again.</p>
          <button class="btn btn-outline btn-sm" onclick="location.reload()">Retry Connection</button>
        </div>
      `;
    }
  }

  loadWishlist();
});
