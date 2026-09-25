const express = require('express');
const router = express.Router();
const {
  getOverview,
  getAllOrders,
  updateOrderStatus,
  getAllUsers,
  updateUserStatus,
  toggleProductPremium,
  toggleProductTrending,
  toggleProductDeal,
  updateProductStock,
  getDealsAdmin,
  getAllReviewsAdmin,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

router.use(protect);
router.use(adminOnly);

router.get('/overview', getOverview);
router.get('/orders', getAllOrders);
router.put('/orders/:id', updateOrderStatus);
router.put('/orders/:id/status', updateOrderStatus);
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/deals', getDealsAdmin);
router.get('/reviews', getAllReviewsAdmin);

// Product controls
router.put('/products/:id/toggle-premium', toggleProductPremium);
router.put('/products/:id/toggle-trending', toggleProductTrending);
router.put('/products/:id/toggle-deal', toggleProductDeal);
router.put('/products/:id/stock', updateProductStock);

module.exports = router;
