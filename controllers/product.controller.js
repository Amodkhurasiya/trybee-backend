const Product = require('../models/product.model');
const cloudinary = require('../config/cloudinary');
const { validationResult } = require('express-validator');

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
};

// Create product (admin only)
const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, category, stock } = req.body;
    const images = req.files;

    if (!images || images.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    console.log('Processing product with images:', images.map(img => img.filename));

    // Upload images to Cloudinary or fallback to local storage
    const imageUrls = await Promise.all(
      images.map(async (file) => {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'products',
            use_filename: true
          });
          console.log('Cloudinary upload success:', result.secure_url);
          return result.secure_url;
        } catch (error) {
          console.error('Error uploading image to Cloudinary:', error.message);
          // Fix path to prevent duplication of 'uploads' in URL
          const localUrl = `/uploads/${file.filename}`;
          console.log('Using local storage instead:', localUrl);
          return localUrl;
        }
      })
    );

    console.log('Final image URLs:', imageUrls);

    const product = new Product({
      name,
      description,
      price,
      category,
      stock,
      images: imageUrls
    });

    const savedProduct = await product.save();
    console.log('Product saved successfully:', savedProduct._id);
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product', error: error.toString() });
  }
};

// Update product (admin only)
const updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, category, stock } = req.body;
    const images = req.files;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // If new images are uploaded, update them
    if (images && images.length > 0) {
      const imageUrls = await Promise.all(
        images.map(async (file) => {
          try {
            const result = await cloudinary.uploader.upload(file.path, {
              folder: 'products',
              use_filename: true
            });
            return result.secure_url;
          } catch (error) {
            console.error('Error uploading image:', error);
            return `/uploads/${file.filename}`;
          }
        })
      );
      product.images = imageUrls;
    }

    // Update other fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = category || product.category;
    product.stock = stock || product.stock;

    await product.save();
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
};

// Delete product (admin only)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete images from Cloudinary if they are Cloudinary URLs
    if (product.images && product.images.length > 0) {
      try {
        for (const imageUrl of product.images) {
          if (imageUrl && imageUrl.includes('cloudinary.com')) {
            // Extract public ID from Cloudinary URL - simplified approach
            const parts = imageUrl.split('/');
            const fileNameWithExtension = parts[parts.length - 1];
            const publicId = fileNameWithExtension.split('.')[0];
            
            console.log('Trying to delete Cloudinary image with public ID:', publicId);
            try {
              await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
              console.error('Error deleting specific Cloudinary image:', cloudinaryError);
              // Continue with next image
            }
          }
        }
      } catch (imageError) {
        console.error('Error deleting images from Cloudinary:', imageError);
        // Continue with product deletion even if image deletion fails
      }
    }

    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found or already deleted' });
    }
    
    res.json({ message: 'Product deleted successfully', product: deletedProduct });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
};

// Rate product (authenticated users)
const rateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has already rated this product
    const existingRatingIndex = product.ratings.findIndex(r => 
      r.user.toString() === userId.toString()
    );

    if (existingRatingIndex >= 0) {
      // Update existing rating
      product.ratings[existingRatingIndex].rating = rating;
    } else {
      // Add new rating
      product.ratings.push({
        user: userId,
        rating,
        date: new Date()
      });
    }

    // Recalculate average
    if (product.ratings.length > 0) {
      product.averageRating = product.ratings.reduce((sum, item) => sum + item.rating, 0) / product.ratings.length;
    }

    await product.save();
    res.json({ 
      message: 'Rating saved successfully',
      averageRating: product.averageRating
    });
  } catch (error) {
    console.error('Error rating product:', error);
    res.status(500).json({ message: 'Error saving product rating' });
  }
};

// Get user's rating for a product (authenticated users)
const getUserRating = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const userRating = product.ratings.find(r => 
      r.user.toString() === userId.toString()
    );

    if (!userRating) {
      return res.status(404).json({ message: 'Rating not found' });
    }

    res.json({ rating: userRating.rating });
  } catch (error) {
    console.error('Error fetching user rating:', error);
    res.status(500).json({ message: 'Error fetching user rating' });
  }
};

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  rateProduct,
  getUserRating
}; 