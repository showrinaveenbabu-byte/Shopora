const express = require('express');
const router = express.Router();
const {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
  moveToCart,
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getWishlist);
router.post('/', toggleWishlist);
router.post('/toggle', toggleWishlist);
router.post('/move-to-cart', moveToCart);
router.post('/:productId/move-to-cart', moveToCart);
router.delete('/:productId', removeFromWishlist);

module.exports = router;
