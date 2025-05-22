/**
 * Utility script to check and fix uploads directory permissions
 */
const fs = require('fs');
const path = require('path');

// Get uploads directory path
const uploadsDir = path.join(__dirname, '../uploads');

console.log('Checking uploads directory:', uploadsDir);

// Check if directory exists
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads directory created successfully.');
} else {
  console.log('Uploads directory already exists.');
}

// Test writing a file
const testFilePath = path.join(uploadsDir, 'test-write.txt');
try {
  fs.writeFileSync(testFilePath, 'Test write access');
  console.log('Successfully wrote test file, directory has write permissions.');
  
  // Clean up test file
  fs.unlinkSync(testFilePath);
  console.log('Test file cleaned up.');
} catch (error) {
  console.error('ERROR: Cannot write to uploads directory!', error.message);
  console.log('Please check directory permissions and ensure the application has write access.');
}

console.log('Upload directory check complete.'); 