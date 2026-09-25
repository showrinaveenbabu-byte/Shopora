/**
 * SHOPORA — Production Utility Functions
 * "Discover More. Shop Smarter."
 */

const Utils = {
  // Format numbers to Indian Rupee (₹) or USD currency cleanly
  formatPrice(amount, currency = 'INR') {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '₹0';
    }
    const num = Number(amount);
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(num);
    }
    // Formats as ₹79,999 or ₹999
    return '₹' + new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(num);
  },

  // Format date to human-readable string
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  // Debounce function for input events
  debounce(func, wait = 250) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Extract query parameter from URL
  getUrlParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  },

  // Image error fallback
  imgFallback(imgElement) {
    if (!imgElement) return;
    imgElement.onerror = null;
    imgElement.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';
  },

  // Truncate text with ellipsis
  truncate(text, length = 85) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  },

  // Render Star Ratings with numeric display
  renderStars(rating = 4.5) {
    const num = Math.min(5, Math.max(0, Number(rating) || 4.5));
    const full = Math.floor(num);
    const hasHalf = num % 1 >= 0.4;
    let stars = '';
    for (let i = 0; i < full; i++) {
      stars += '<span style="color: #f59e0b;">★</span>';
    }
    if (hasHalf) {
      stars += '<span style="color: #f59e0b;">★</span>';
    }
    const empty = 5 - Math.ceil(num);
    for (let i = 0; i < empty; i++) {
      stars += '<span style="color: #cbd5e1;">★</span>';
    }
    return stars;
  },

  // Format countdown milliseconds to { hours, minutes, seconds }
  formatCountdown(targetDateOrMs) {
    let diff = 0;
    if (typeof targetDateOrMs === 'number') {
      diff = targetDateOrMs;
    } else if (targetDateOrMs) {
      diff = new Date(targetDateOrMs).getTime() - Date.now();
    } else {
      // Default rolling 4-hour countdown if null
      const now = new Date();
      const nextInterval = 4 * 3600 * 1000;
      diff = nextInterval - (now.getTime() % nextInterval);
    }

    if (diff < 0) diff = 0;

    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
      isExpired: diff <= 0,
    };
  },

  // Safe string helper
  safeStr(str, fallback = '') {
    if (str === undefined || str === null || str === 'undefined' || str === 'null') {
      return fallback;
    }
    return String(str);
  },
};

window.Utils = Utils;
