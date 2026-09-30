/**
 * SHOPORA (NovaMart) — Shopping Cart Management (LocalStorage + Server Sync)
 */

const Cart = {
  STORAGE_KEY: 'novamart_cart',

  getItems() {
    try {
      const items = localStorage.getItem(this.STORAGE_KEY);
      return items ? JSON.parse(items) : [];
    } catch {
      return [];
    }
  },

  saveItems(items) {
    const cleanItems = Array.isArray(items) ? items : [];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanItems));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items: cleanItems } }));
    }
  },

  getCount() {
    const items = this.getItems();
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  },

  getSubtotal() {
    const items = this.getItems();
    return items.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + price * qty;
    }, 0);
  },

  async addToCart(product, quantity = 1, showToastNotification = true) {
    if (!product) return;

    const items = this.getItems();
    const productId = String(product._id || product.id || product.product || '').trim();
    const maxStock = product.stock !== undefined ? product.stock : 99;
    const addQty = Math.max(1, Number(quantity) || 1);

    const existingIndex = items.findIndex(
      (i) => String(i._id || i.product || '').trim() === productId
    );

    if (existingIndex > -1) {
      const newQty = items[existingIndex].quantity + addQty;
      items[existingIndex].quantity = Math.min(newQty, maxStock);
    } else {
      items.push({
        _id: productId,
        product: productId,
        name: product.name || 'Product',
        brand: product.brand || 'SHOPORA',
        price: Number(product.price) || 0,
        originalPrice: Number(product.originalPrice) || Number(product.price) || 0,
        image: product.image || (product.images && product.images[0]) || '',
        category: product.category,
        stock: maxStock,
        quantity: Math.min(addQty, maxStock),
      });
    }

    this.saveItems(items);

    // If logged in, sync to server in background
    if (typeof window !== 'undefined' && window.Auth && typeof window.Auth.isAuthenticated === 'function' && window.Auth.isAuthenticated()) {
      try {
        if (window.API && typeof window.API.post === 'function') {
          await window.API.post('/cart', { productId, quantity: addQty });
        }
      } catch (err) {
        console.warn('[Cart Sync Warning]', err.message);
      }
    }

    if (typeof window !== 'undefined' && window.Components && typeof window.Components.showToast === 'function' && showToastNotification) {
      const isPages = window.location.pathname ? window.location.pathname.includes('/pages/') : false;
      const cartUrl = isPages ? 'cart.html' : 'pages/cart.html';
      window.Components.showToast(`"${product.name || 'Product'}" added to cart!`, 'success', 4500, {
        text: 'Go to Cart ➔',
        url: cartUrl,
      });
    }
  },

  // Alias for addToCart
  async addItem(product, quantity = 1, showToastNotification = true) {
    return this.addToCart(product, quantity, showToastNotification);
  },

  /**
   * Remove item from cart (both LocalStorage and Server)
   */
  async removeFromCart(productId, showToast = false) {
    if (!productId) return null;

    let items = this.getItems();
    const targetId = String(productId).trim();

    const itemToRemove = items.find(
      (i) => String(i._id || i.product || '').trim() === targetId
    );

    // Filter out item immediately
    items = items.filter(
      (i) => String(i._id || i.product || '').trim() !== targetId
    );
    this.saveItems(items);

    // Sync deletion to MongoDB if logged in
    if (typeof window !== 'undefined' && window.Auth && typeof window.Auth.isAuthenticated === 'function' && window.Auth.isAuthenticated()) {
      try {
        if (window.API && typeof window.API.delete === 'function') {
          await window.API.delete(`/cart/${encodeURIComponent(targetId)}`);
        }
      } catch (err) {
        console.warn('[Cart Sync Warning]', err.message);
      }
    }

    if (showToast && typeof window !== 'undefined' && window.Components && typeof window.Components.showToast === 'function' && itemToRemove) {
      window.Components.showToast(`"${itemToRemove.name}" removed from cart`, 'info');
    }

    return itemToRemove;
  },

  // Alias for removeFromCart
  async removeItem(productId, showToast = false) {
    return this.removeFromCart(productId, showToast);
  },

  async updateQuantity(productId, quantity) {
    if (!productId) return;

    let items = this.getItems();
    const targetId = String(productId).trim();
    const index = items.findIndex(
      (i) => String(i._id || i.product || '').trim() === targetId
    );

    if (index > -1) {
      const numQty = Number(quantity);
      if (numQty <= 0) {
        return this.removeFromCart(productId);
      }

      const maxStock = items[index].stock !== undefined ? items[index].stock : 99;
      items[index].quantity = Math.min(numQty, maxStock);
      this.saveItems(items);

      if (typeof window !== 'undefined' && window.Auth && typeof window.Auth.isAuthenticated === 'function' && window.Auth.isAuthenticated()) {
        try {
          if (window.API && typeof window.API.put === 'function') {
            await window.API.put(`/cart/${encodeURIComponent(targetId)}`, {
              quantity: items[index].quantity,
            });
          }
        } catch (err) {
          console.warn('[Cart Sync Warning]', err.message);
        }
      }
    }
  },

  async decreaseQuantity(productId) {
    if (!productId) return;
    const items = this.getItems();
    const targetId = String(productId).trim();
    const item = items.find(
      (i) => String(i._id || i.product || '').trim() === targetId
    );

    if (item) {
      const currentQty = Number(item.quantity) || 1;
      if (currentQty <= 1) {
        return this.removeFromCart(productId);
      }
      return this.updateQuantity(productId, currentQty - 1);
    }
  },

  async increaseQuantity(productId) {
    if (!productId) return;
    const items = this.getItems();
    const targetId = String(productId).trim();
    const item = items.find(
      (i) => String(i._id || i.product || '').trim() === targetId
    );

    if (item) {
      const currentQty = Number(item.quantity) || 1;
      const maxStock = item.stock !== undefined ? item.stock : 99;
      return this.updateQuantity(productId, Math.min(currentQty + 1, maxStock));
    }
  },

  async clear() {
    this.saveItems([]);
    if (typeof window !== 'undefined' && window.Auth && typeof window.Auth.isAuthenticated === 'function' && window.Auth.isAuthenticated()) {
      try {
        if (window.API && typeof window.API.delete === 'function') {
          await window.API.delete('/cart');
        }
      } catch (err) {
        console.warn('[Cart Sync Warning]', err.message);
      }
    }
  },

  // Sync server cart into local cart upon login
  async syncWithServer() {
    if (typeof window === 'undefined' || !window.Auth || typeof window.Auth.isAuthenticated !== 'function' || !window.Auth.isAuthenticated()) {
      return;
    }

    try {
      if (window.API && typeof window.API.get === 'function') {
        const res = await window.API.get('/cart');
        if (res.success && res.data && Array.isArray(res.data.items)) {
          const serverItems = res.data.items
            .filter((item) => item && item.product)
            .map((item) => {
              const p = item.product;
              return {
                _id: p._id || p,
                product: p._id || p,
                name: p.name || 'Product',
                brand: p.brand || 'SHOPORA',
                price: Number(p.price) || 0,
                originalPrice: Number(p.originalPrice) || Number(p.price) || 0,
                image: p.image || (p.images && p.images[0]) || '',
                category: p.category,
                stock: p.stock !== undefined ? p.stock : 50,
                quantity: Number(item.quantity) || 1,
              };
            });

          this.saveItems(serverItems);
        }
      }
    } catch (err) {
      console.warn('[Cart sync failed]', err);
    }
  },
};

if (typeof window !== 'undefined') {
  window.Cart = Cart;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Cart;
}
