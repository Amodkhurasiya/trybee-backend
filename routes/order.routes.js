const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const { auth, admin } = require('../middleware/auth.middleware');

// Get all orders (admin only)
router.get('/', [auth, admin], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name price images')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Order.countDocuments(query);

    res.json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product', 'name price images')
      .sort('-createdAt');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name price images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is admin or order owner
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create order
router.post('/', auth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, totalAmount } = req.body;
    
    console.log('Creating order with data:', JSON.stringify(req.body, null, 2));
    
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required and must be an array' });
    }
    
    if (!shippingAddress) {
      return res.status(400).json({ message: 'Shipping address is required' });
    }
    
    // Ensure all required shipping address fields are present
    const requiredAddressFields = ['fullName', 'email', 'street', 'city', 'state', 'zipCode', 'country'];
    const missingFields = requiredAddressFields.filter(field => !shippingAddress[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required shipping address fields: ${missingFields.join(', ')}` 
      });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }
    
    // Validate payment method
    const validPaymentMethods = ['credit-card', 'paypal', 'cash_on_delivery', 'upi'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ 
        message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}` 
      });
    }
    
    // Calculate total amount if not provided
    let calculatedTotal = 0;
    if (totalAmount) {
      calculatedTotal = parseFloat(totalAmount);
    } else {
      // Calculate from items if no total provided
      calculatedTotal = items.reduce((total, item) => {
        return total + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1));
      }, 0);
    }
    
    // Create the order
    const order = new Order({
      user: req.user._id,
      items: items.map(item => ({
        product: item.product,
        quantity: parseInt(item.quantity) || 1,
        price: parseFloat(item.price) || 0,
        name: item.name || 'Unknown Product',
        image: item.image || ''
      })),
      shippingAddress,
      paymentMethod: paymentMethod === 'credit-card' ? 'credit_card' : paymentMethod,
      totalAmount: calculatedTotal,
      status: 'pending'
    });
    
    // Update product stock for each item
    for (const item of items) {
      if (!item.product) continue;
      
      const productId = item.product;
      const quantity = parseInt(item.quantity) || 1;
      
      try {
        // Find the product and update its stock
        const product = await Product.findById(productId);
        if (product) {
          // Ensure we don't set negative stock
          const newStock = Math.max(0, product.stock - quantity);
          product.stock = newStock;
          await product.save();
          console.log(`Updated stock for product ${productId}: new stock = ${newStock}`);
        }
      } catch (productError) {
        console.error(`Error updating stock for product ${productId}:`, productError);
        // Continue with order creation even if stock update fails
      }
    }
    
    const savedOrder = await order.save();
    console.log('Order created successfully:', savedOrder._id);
    
    // Populate user data for response
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('user', 'name email');
    
    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update order status (admin only)
router.put('/:id/status', [auth, admin], [
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const { status } = req.body;
    order.status = status;

    if (status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment status
router.put('/:id/pay', auth, [
  body('paymentResult').isObject().withMessage('Payment result is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is admin or order owner
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = req.body.paymentResult;

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 