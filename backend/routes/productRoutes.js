const express = require('express');
const router = express.Router();
const {
  getProducts,
  getSearchSuggestions,
  getBrands,
  getDeals,
  getFlashDeals,
  getPremiumProducts,
  getLuxuryProducts,
  getTrendingProducts,
  getNewArrivals,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

// Public routes
router.get('/', getProducts);
router.get('/suggestions', getSearchSuggestions);
router.get('/brands', getBrands);
router.get('/deals', getDeals);
router.get('/flash-deals', getFlashDeals);
router.get('/premium', getPremiumProducts);
router.get('/luxury', getLuxuryProducts);
router.get('/trending', getTrendingProducts);
router.get('/new-arrivals', getNewArrivals);
router.get('/featured', getFeaturedProducts);
router.get('/:id', getProductById);

// Admin protected routes
router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
