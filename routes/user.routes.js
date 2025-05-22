const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/user.model');
const { auth } = require('../middleware/auth.middleware');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    // Format the user object to match frontend expectations
    const formattedUser = {
      ...user.toObject(),
      // Ensure address fields are included even if null
      address: user.address?.street || '',
      city: user.address?.city || '',
      state: user.address?.state || '',
      postalCode: user.address?.zipCode || '',
      country: user.address?.country || 'India',
      phoneNumber: user.phone || ''
    };
    
    res.json(formattedUser);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please enter a valid email'),
  body('phoneNumber').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('postalCode').optional().trim(),
  body('country').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      name,
      email,
      phoneNumber,
      address,
      city,
      state,
      postalCode,
      country
    } = req.body;

    // Update basic fields
    if (name) user.name = name;
    if (phoneNumber) user.phone = phoneNumber;
    
    // Update address as a nested object
    user.address = {
      street: address || user.address?.street,
      city: city || user.address?.city,
      state: state || user.address?.state,
      zipCode: postalCode || user.address?.zipCode,
      country: country || user.address?.country || 'India'
    };

    // Don't allow email update if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    await user.save();

    // Format the user object to match frontend expectations
    const formattedUser = {
      ...user.toObject(),
      // Frontend expects these flat fields
      address: user.address.street,
      city: user.address.city,
      state: user.address.state,
      postalCode: user.address.zipCode,
      country: user.address.country,
      phoneNumber: user.phone
    };

    res.json(formattedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.post('/change-password', auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete account
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete the user
    await User.findByIdAndDelete(req.user._id);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add to wishlist
router.post('/wishlist/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;

    if (user.wishlist.includes(productId)) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    user.wishlist.push(productId);
    await user.save();

    res.json(user.wishlist);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove from wishlist
router.delete('/wishlist/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;

    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();

    res.json(user.wishlist);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get wishlist
router.get('/wishlist', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('wishlist', 'name price images');
    res.json(user.wishlist);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 