/**
 * SHOPORA — Wishlist State & Server Synchronization
 */

const Wishlist = {
  STORAGE_KEY: 'shopora_wishlist_ids',

  getIds() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveIds(ids) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: { ids } }));
  },

  hasItem(productId) {
    const ids = this.getIds();
    return ids.includes(productId);
  },

  getCount() {
    return this.getIds().length;
  },

  async toggleWishlist(product) {
    const productId = product._id || product.id;
    const ids = this.getIds();
    const index = ids.indexOf(productId);
    let added = false;

    if (index > -1) {
      ids.splice(index, 1);
      added = false;
    } else {
      ids.push(productId);
      added = true;
    }

    this.saveIds(ids);

    if (window.Auth && Auth.isAuthenticated()) {
      try {
        await API.post('/wishlist', { productId });
      } catch (err) {
        console.warn('Wishlist server sync error:', err.message);
      }
    }

    if (window.Components) {
      Components.showToast(
        added ? `Added "${product.name || 'Item'}" to Wishlist` : 'Removed from Wishlist',
        added ? 'success' : 'info'
      );
    }

    return added;
  },

  async removeItem(productId) {
    let ids = this.getIds();
    ids = ids.filter((id) => id !== productId);
    this.saveIds(ids);

    if (window.Auth && Auth.isAuthenticated()) {
      try {
        await API.delete(`/wishlist/${productId}`);
      } catch (err) {
        console.warn('Wishlist server remove error:', err.message);
      }
    }

    if (window.Components) {
      Components.showToast('Item removed from your Wishlist', 'info');
    }
  },

  async moveToCart(product) {
    const productId = product._id || product.id;
    if (window.Cart) {
      await Cart.addToCart(product, 1);
      await this.removeItem(productId);
    }
  },

  async syncWithServer() {
    if (!window.Auth || !Auth.isAuthenticated()) return;

    try {
      const res = await API.get('/wishlist');
      if (res.success && Array.isArray(res.data)) {
        const serverIds = res.data.map((p) => p._id);
        this.saveIds(serverIds);
      }
    } catch (err) {
      console.warn('Could not sync wishlist with server:', err);
    }
  },
};

window.Wishlist = Wishlist;
