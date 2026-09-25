const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  createProductReview,
  deleteReview,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

router.get('/:productId', getProductReviews);
router.post('/', protect, createProductReview);
router.post('/:productId', protect, createProductReview);
router.delete('/:id', protect, adminOnly, deleteReview);

module.exports = router;
