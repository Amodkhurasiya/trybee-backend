/**
 * This script helps set up and start the Trybee e-commerce backend server.
 * It checks for required configurations and provides guidance if they're missing.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory...');
  fs.mkdirSync(uploadsDir);
  console.log('✅ Uploads directory created.');
}

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('⚠️ .env file not found. Creating a basic .env file...');
  
  // Create basic .env content
  const envContent = `PORT=5000
MONGODB_URI=mongodb://localhost:27017/trybee
JWT_SECRET=trybee_jwt_secret_${Math.floor(Math.random() * 10000)}
ADMIN_REGISTRATION_KEY=trybee_admin_2024

# Cloudinary Configuration (optional, images will be stored locally if not provided)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration (for contact form)
# For Gmail:
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_SECURE=false
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password
# Note: For Gmail, you need to generate an App Password

# Admin email to receive contact form submissions
ADMIN_EMAIL=admin@trybee.com
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Basic .env file created.');
  console.log('⚠️ You may want to update the .env file with your own values.');
}

// Start the server
console.log('✨ Starting the Trybee backend server...');
try {
  require('./server');
  console.log('🌟 Server startup script completed successfully.');
} catch (error) {
  console.error('❌ Error starting the server:', error);
  console.log('\nSuggestions to fix:');
  console.log('1. Make sure MongoDB is running');
  console.log('2. Check your .env configuration');
  console.log('3. Ensure all dependencies are installed: npm install');
  process.exit(1);
} 