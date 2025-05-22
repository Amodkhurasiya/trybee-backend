const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Check if Cloudinary env variables are set
if (process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET) {
  
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
  console.log('Cloudinary configured successfully');
} else {
  console.warn('Cloudinary not configured. Image uploads will be stored locally only.');
}

// Enhanced mock upload function when Cloudinary is not configured
const mockUpload = (filePath, options = {}) => {
  console.log(`Mock Cloudinary upload for ${filePath}`);
  
  // Ensure the file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  // Get just the filename
  const filename = path.basename(filePath);
  
  // Return a response similar to Cloudinary's
  return {
    public_id: filename.split('.')[0],
    secure_url: `/uploads/${filename}`,
    url: `/uploads/${filename}`,
    format: path.extname(filePath).replace('.', ''),
    width: 800, // mock value
    height: 600, // mock value
    resource_type: 'image',
    created_at: new Date().toISOString(),
    bytes: fs.statSync(filePath).size
  };
};

// Export modified cloudinary object with enhanced fallback
module.exports = {
  ...cloudinary,
  uploader: {
    ...cloudinary.uploader,
    upload: process.env.CLOUDINARY_CLOUD_NAME ? 
      cloudinary.uploader.upload : 
      ((filePath, options) => {
        try {
          const result = mockUpload(filePath, options);
          console.log(`Local storage mock successful: ${result.secure_url}`);
          return Promise.resolve(result);
        } catch (error) {
          console.error('Local storage mock failed:', error);
          return Promise.reject(error);
        }
      })
  }
}; 