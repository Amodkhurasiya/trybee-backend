const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const productRoutes = require('./routes/product.routes');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at: ${uploadsDir}`);
} else {
  console.log(`Using existing uploads directory at: ${uploadsDir}`);
}

// Middleware
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Limit URL-encoded payload size

// Configure CORS - allow ALL origins as a fallback for Railway deployment issues
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add more specific CORS headers as backup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(morgan('dev'));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Improve static file serving configuration
console.log(`Serving static files from: ${uploadsDir}`);
// Serve uploads directory directly to fix path issues
app.use('/uploads', express.static(uploadsDir));
// For backward compatibility
app.use('/uploads/uploads', express.static(uploadsDir));

// Add a health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Database connection with improved error handling
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    // Don't crash the server, retry connection
  });

// Handle MongoDB connection errors
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

// Reconnect if MongoDB connection is lost
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected! Attempting to reconnect...');
  setTimeout(() => {
    mongoose.connect(process.env.MONGODB_URI).catch(err => {
      console.error('Error reconnecting to MongoDB:', err);
    });
  }, 5000); // Wait 5 seconds before reconnecting
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/products', productRoutes);
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/contact', require('./routes/contact.routes'));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Something went wrong!', error: process.env.NODE_ENV === 'production' ? null : err.message });
});

// Process handling for graceful shutdown
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Keep the process running instead of crashing
  console.log('Application will continue running despite the error');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep the process running instead of crashing
  console.log('Application will continue running despite the rejection');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully.');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
  
  // If MongoDB doesn't close in 5 seconds, force shutdown
  setTimeout(() => {
    console.log('Could not close MongoDB connections in time, forcing shutdown');
    process.exit(1);
  }, 5000);
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 