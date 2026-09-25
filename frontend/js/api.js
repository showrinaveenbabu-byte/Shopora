/**
 * NovaMart — API Client Module
 */

const API = {
  BASE_URL: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.BASE_URL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Attach Bearer token if user is logged in
    const token = localStorage.getItem('shopora_token') || localStorage.getItem('novamart_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      // Handle unauthenticated (401)
      if (response.status === 401) {
        // If expired or unauthorized, clear token if it wasn't a login attempt
        if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
          localStorage.removeItem('shopora_token');
          localStorage.removeItem('shopora_user');
          localStorage.removeItem('novamart_token');
          localStorage.removeItem('novamart_user');
          if (window.location.pathname.includes('/profile') || 
              window.location.pathname.includes('/orders') || 
              window.location.pathname.includes('/checkout') ||
              window.location.pathname.includes('/admin')) {
            window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
          }
        }
      }

      if (!response.ok) {
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};

window.API = API;
