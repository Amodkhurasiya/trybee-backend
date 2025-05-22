const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body } = require('express-validator');
const { isAdmin, isAuth } = require('../middleware/auth.middleware');
const {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  rateProduct,
  getUserRating
} = require('../controllers/product.controller');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Validation middleware
const validateProduct = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').isIn(['Handicrafts', 'Textiles', 'Jewelry', 'Paintings', 'Forest Goods'])
    .withMessage('Invalid category'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
];

// Public routes
router.get('/', getAllProducts);
router.get('/:id', getProduct);

// User routes (require authentication)
router.post('/:id/rate', isAuth, body('rating').isInt({ min: 1, max: 5 }), rateProduct);
router.get('/:id/userRating', isAuth, getUserRating);

// Admin routes
router.post('/', 
  isAdmin,
  upload.array('images', 5), // Allow up to 5 images
  validateProduct,
  createProduct
);

router.put('/:id',
  isAdmin,
  upload.array('images', 5),
  validateProduct,
  updateProduct
);

router.delete('/:id',
  isAdmin,
  deleteProduct
);

module.exports = router; 