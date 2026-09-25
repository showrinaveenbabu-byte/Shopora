/**
 * SHOPORA — Authentication Store & Helpers
 * "Discover More. Shop Smarter."
 */

const Auth = {
  getUser() {
    try {
      const userStr = localStorage.getItem('shopora_user') || localStorage.getItem('novamart_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('shopora_token') || localStorage.getItem('novamart_token') || null;
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('shopora_user', JSON.stringify(user));
      localStorage.setItem('novamart_user', JSON.stringify(user));
    }
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('shopora_token', token);
      localStorage.setItem('novamart_token', token);
    }
  },

  setSession(arg1, arg2) {
    let token = null;
    let user = null;

    if (typeof arg1 === 'string') {
      token = arg1;
      user = arg2;
    } else if (typeof arg2 === 'string') {
      user = arg1;
      token = arg2;
    } else if (arg1 && arg1.token) {
      token = arg1.token;
      user = arg1.user || arg1;
    }

    if (token) this.setToken(token);
    if (user) this.setUser(user);

    if (window.Cart && typeof Cart.syncWithServer === 'function') {
      Cart.syncWithServer().catch(() => {});
    }
    if (window.Wishlist && typeof Wishlist.syncWithServer === 'function') {
      Wishlist.syncWithServer().catch(() => {});
    }
  },

  setAuth(arg1, arg2) {
    this.setSession(arg1, arg2);
  },

  logout() {
    localStorage.removeItem('shopora_token');
    localStorage.removeItem('shopora_user');
    localStorage.removeItem('novamart_token');
    localStorage.removeItem('novamart_user');

    if (window.Cart && typeof Cart.syncWithServer === 'function') {
      Cart.syncWithServer().catch(() => {});
    }
    if (window.Components && typeof Components.showToast === 'function') {
      Components.showToast('You have been logged out successfully', 'info');
    }

    const isPages = window.location.pathname.includes('/pages/');
    const homeUrl = isPages ? '../index.html' : 'index.html';
    setTimeout(() => {
      window.location.href = homeUrl;
    }, 350);
  },

  isAuthenticated() {
    return !!this.getToken() && !!this.getUser();
  },

  isAdmin() {
    const user = this.getUser();
    return !!(user && user.role === 'admin');
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      const isPages = window.location.pathname.includes('/pages/');
      const loginUrl = isPages ? 'login.html' : 'pages/login.html';
      const current = window.location.pathname + window.location.search;
      window.location.href = `${loginUrl}?redirect=${encodeURIComponent(current)}`;
      return false;
    }
    return true;
  },

  requireAdmin() {
    if (!this.isAuthenticated()) {
      const isPages = window.location.pathname.includes('/pages/');
      const loginUrl = isPages ? 'login.html' : 'pages/login.html';
      const current = window.location.pathname + window.location.search;
      window.location.href = `${loginUrl}?redirect=${encodeURIComponent(current)}`;
      return false;
    }
    if (!this.isAdmin()) {
      alert('Access Denied: Administrator privileges are required to view this area.');
      const isPages = window.location.pathname.includes('/pages/');
      window.location.href = isPages ? '../index.html' : 'index.html';
      return false;
    }
    return true;
  },
};

window.Auth = Auth;
