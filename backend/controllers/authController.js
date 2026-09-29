const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'shopora_super_secure_jwt_secret_2026',
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const emailNorm = email.toLowerCase().trim();
    const userExists = await User.findOne({ email: emailNorm });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: emailNorm,
      phone: phone ? phone.trim() : '',
      password,
      role: 'user',
    });

    const token = generateToken(user._id);
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      isPro: Boolean(user.isPro),
      proPlan: user.proPlan || 'none',
      proExpiresAt: user.proExpiresAt,
      proTrialUsed: Boolean(user.proTrialUsed),
      addresses: user.addresses,
    };

    res.status(201).json({
      success: true,
      token,
      user: userData,
      data: {
        ...userData,
        token,
      },
      message: 'Account registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token (supports email or phone)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/phone and password' });
    }

    const identifier = email.toLowerCase().trim();

    // Query by email OR phone
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Check email/phone or password.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Check email/phone or password.' });
    }

    const token = generateToken(user._id);
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      isPro: Boolean(user.isPro),
      proPlan: user.proPlan || 'none',
      proExpiresAt: user.proExpiresAt,
      proTrialUsed: Boolean(user.proTrialUsed),
      addresses: user.addresses,
    };

    res.json({
      success: true,
      token,
      user: userData,
      data: {
        ...userData,
        token,
      },
      message: 'Signed in successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.body.name) user.name = req.body.name.trim();
    if (req.body.phone !== undefined) user.phone = req.body.phone.trim();
    if (req.body.avatar) user.avatar = req.body.avatar.trim();

    if (req.body.password) {
      if (req.body.password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        isPro: Boolean(updatedUser.isPro),
        proPlan: updatedUser.proPlan || 'none',
        proExpiresAt: updatedUser.proExpiresAt,
        proTrialUsed: Boolean(updatedUser.proTrialUsed),
        addresses: updatedUser.addresses,
        token: generateToken(updatedUser._id),
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADDRESS MANAGEMENT (Sub-document operations)
// ==========================================

// @desc    Get saved addresses
// @route   GET /api/auth/addresses
// @access  Private
const getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: user.addresses || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new address
// @route   POST /api/auth/addresses
// @access  Private
const addAddress = async (req, res, next) => {
  try {
    const fullName = (req.body.fullName || '').trim();
    const phone = (req.body.phone || '').trim();
    const addressLine1 = (req.body.addressLine1 || req.body.street || '').trim();
    const addressLine2 = (req.body.addressLine2 || '').trim();
    const landmark = (req.body.landmark || '').trim();
    const city = (req.body.city || '').trim();
    const state = (req.body.state || '').trim();
    const pincode = (req.body.pincode || req.body.postalCode || '').trim();
    const country = req.body.country ? req.body.country.trim() : 'India';
    const addressType = req.body.addressType || 'Home';
    const isDefault = req.body.isDefault;

    if (!fullName || !phone || !addressLine1 || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Full name, phone, address line, city, state, and postal code are required',
      });
    }

    const user = await User.findById(req.user._id);

    // If marked default or first address, set others as not default
    const makeDefault = Boolean(isDefault) || user.addresses.length === 0;
    if (makeDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    const newAddress = {
      fullName,
      phone,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      country,
      addressType,
      isDefault: makeDefault,
    };

    user.addresses.push(newAddress);
    await user.save();

    const addedItem = user.addresses[user.addresses.length - 1];

    res.status(201).json({
      success: true,
      data: user.addresses,
      address: addedItem,
      message: 'Delivery address added successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update address
// @route   PUT /api/auth/addresses/:addressId
// @access  Private
const updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (req.body.isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    const updatePayload = { ...req.body };
    if (updatePayload.street && !updatePayload.addressLine1) {
      updatePayload.addressLine1 = updatePayload.street;
    }
    if (updatePayload.postalCode && !updatePayload.pincode) {
      updatePayload.pincode = updatePayload.postalCode;
    }

    Object.assign(address, updatePayload);
    await user.save();

    res.json({
      success: true,
      data: user.addresses,
      address,
      message: 'Address updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete address
// @route   DELETE /api/auth/addresses/:addressId
// @access  Private
const deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.pull({ _id: req.params.addressId });

    // If remaining addresses and none default, make the first one default
    if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      data: user.addresses,
      message: 'Address removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set default address
// @route   PUT /api/auth/addresses/:addressId/default
// @access  Private
const setDefaultAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    user.addresses.forEach((a) => {
      a.isDefault = a._id.toString() === req.params.addressId;
    });

    await user.save();

    res.json({
      success: true,
      data: user.addresses,
      message: 'Default address updated',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SHOPORA PRO MEMBERSHIP MANAGEMENT
// ==========================================

// @desc    Activate SHOPORA Pro (Trial or Paid Plan)
// @route   POST /api/auth/pro/activate
// @access  Private
const activatePro = async (req, res, next) => {
  try {
    const { plan = 'trial' } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (plan === 'trial' && user.proTrialUsed && !user.isPro) {
      return res.status(400).json({
        success: false,
        message: 'You have already used your 30-Day Free Trial. Please choose Monthly (₹199/mo) or Annual (₹999/yr) plan.',
      });
    }

    let durationDays = 30;
    if (plan === 'monthly') durationDays = 30;
    if (plan === 'annual') durationDays = 365;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    user.isPro = true;
    user.proPlan = plan;
    user.proExpiresAt = expiresAt;
    if (plan === 'trial') user.proTrialUsed = true;

    await user.save();

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      isPro: user.isPro,
      proPlan: user.proPlan,
      proExpiresAt: user.proExpiresAt,
      proTrialUsed: user.proTrialUsed,
      addresses: user.addresses,
    };

    res.json({
      success: true,
      message: plan === 'trial'
        ? '🎉 Congratulations! Your 30-Day SHOPORA PRO Free Trial is now active!'
        : '🎉 Welcome to SHOPORA PRO! Your membership is active.',
      data: userData,
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user Pro membership status
// @route   GET /api/auth/pro/status
// @access  Private
const getProStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if expired
    let isExpired = false;
    if (user.isPro && user.proExpiresAt && new Date() > new Date(user.proExpiresAt)) {
      user.isPro = false;
      user.proPlan = 'none';
      await user.save();
      isExpired = true;
    }

    const daysRemaining = user.proExpiresAt
      ? Math.max(0, Math.ceil((new Date(user.proExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
      : 0;

    res.json({
      success: true,
      data: {
        isPro: Boolean(user.isPro),
        proPlan: user.proPlan || 'none',
        proExpiresAt: user.proExpiresAt,
        proTrialUsed: Boolean(user.proTrialUsed),
        daysRemaining,
        isExpired,
        benefits: [
          '⚡ Guaranteed Lightning Express & Same-Day Delivery',
          '🏷️ Extra 5% Instant Pro Member Discount on All Products',
          '🎁 Zero Convenience / Shipping Fees',
          '🛡️ VIP Priority 24/7 Phone Concierge',
          '🔄 30-Day No-Questions-Asked Express Returns',
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel Pro membership auto-renew
// @route   POST /api/auth/pro/cancel
// @access  Private
const cancelPro = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isPro = false;
    user.proPlan = 'none';
    user.proExpiresAt = null;
    await user.save();

    res.json({
      success: true,
      message: 'SHOPORA PRO membership has been cancelled.',
      data: { isPro: false, proPlan: 'none' },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
