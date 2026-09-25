const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  activatePro,
  getProStatus,
  cancelPro,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Address Management
router.get('/addresses', protect, getAddresses);
router.post('/addresses', protect, addAddress);
router.put('/addresses/:addressId', protect, updateAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);
router.put('/addresses/:addressId/default', protect, setDefaultAddress);

// Pro Membership Management
router.post('/pro/activate', protect, activatePro);
router.get('/pro/status', protect, getProStatus);
router.post('/pro/cancel', protect, cancelPro);

module.exports = router;
