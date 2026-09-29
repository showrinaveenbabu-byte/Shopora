/**
 * NovaMart — Shopping Cart Management (LocalStorage + Server Sync)
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
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items } }));
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
    const items = this.getItems();
    const productId = product._id || product.id;
    const existingIndex = items.findIndex((i) => (i._id || i.product) === productId);

    const maxStock = product.stock !== undefined ? product.stock : 99;

    if (existingIndex > -1) {
      const newQty = items[existingIndex].quantity + quantity;
      items[existingIndex].quantity = Math.min(newQty, maxStock);
    } else {
      items.push({
        _id: productId,
        product: productId,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        category: product.category,
        stock: product.stock,
        quantity: Math.min(quantity, maxStock),
      });
    }

    this.saveItems(items);

    // If logged in, sync to server in background
    if (window.Auth && Auth.isAuthenticated()) {
      try {
        await API.post('/cart', { productId, quantity });
      } catch (err) {
        console.warn('[Cart Sync Warning]', err.message);
      }
    }

    if (window.Components && showToastNotification) {
      const isPages = window.location.pathname.includes('/pages/');
      const cartUrl = isPages ? 'cart.html' : 'pages/cart.html';
      Components.showToast(`"${product.name}" added to cart!`, 'success', 4500, {
        text: 'Go to Cart ➔',
        url: cartUrl,
      });
    }
  },

  async updateQuantity(productId, quantity) {
    let items = this.getItems();
    const index = items.findIndex((i) => (i._id || i.product) === productId);

    if (index > -1) {
      if (quantity <= 0) {
        return this.removeItem(productId);
      }
      const maxStock = items[index].stock || 99;
      items[index].quantity = Math.min(quantity, maxStock);
      this.saveItems(items);

      if (window.Auth && Auth.isAuthenticated()) {
        try {
          await API.put(`/cart/${productId}`, { quantity: items[index].quantity });
        } catch (err) {
          console.warn('[Cart Sync Warning]', err.message);
        }
      }
    }
  },

  async removeItem(productId) {
    let items = this.getItems();
    const itemToRemove = items.find((i) => (i._id || i.product) === productId);
    items = items.filter((i) => (i._id || i.product) !== productId);
    this.saveItems(items);

    if (window.Auth && Auth.isAuthenticated()) {
      try {
        await API.delete(`/cart/${productId}`);
      } catch (err) {
        console.warn('[Cart Sync Warning]', err.message);
      }
    }

    if (window.Components && itemToRemove) {
      Components.showToast(`"${itemToRemove.name}" removed from cart`, 'info');
    }
  },

  async clear() {
    this.saveItems([]);
    if (window.Auth && Auth.isAuthenticated()) {
      try {
        await API.delete('/cart');
      } catch (err) {
        console.warn('[Cart Sync Warning]', err.message);
      }
    }
  },

  // Sync server cart into local cart upon login
  async syncWithServer() {
    if (!window.Auth || !Auth.isAuthenticated()) return;

    try {
      const res = await API.get('/cart');
      if (res.success && res.data && res.data.items) {
        const serverItems = res.data.items.map((item) => {
          const p = item.product;
          return {
            _id: p._id,
            product: p._id,
            name: p.name,
            price: p.price,
            originalPrice: p.originalPrice,
            image: p.image,
            category: p.category,
            stock: p.stock,
            quantity: item.quantity,
          };
        });
        if (serverItems.length > 0) {
          this.saveItems(serverItems);
        }
      }
    } catch (err) {
      console.warn('[Cart sync failed]', err);
    }
  },
};

window.Cart = Cart;
