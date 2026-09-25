const express = require('express');
const router = express.Router();
const {
  getActiveOffers,
  getOfferById,
  getAllOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} = require('../controllers/offerController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

// Public routes
router.get('/active', getActiveOffers);
router.get('/:id', getOfferById);

// Admin protected routes
router.get('/', protect, adminOnly, getAllOffers);
router.post('/', protect, adminOnly, createOffer);
router.put('/:id', protect, adminOnly, updateOffer);
router.delete('/:id', protect, adminOnly, deleteOffer);

module.exports = router;
