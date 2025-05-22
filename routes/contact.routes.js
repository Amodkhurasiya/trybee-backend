const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Configure nodemailer
let transporter;

// Create a test account or use existing credentials
async function setupMailer() {
  try {
    // If in production and credentials are available
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true' || false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      console.log('Email service configured with real credentials');
    } else {
      // For development, use ethereal email
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('Email service configured with test credentials');
      console.log('Test email account:', testAccount.user);
    }
  } catch (error) {
    console.error('Failed to setup email service:', error);
  }
}

setupMailer();

// POST /api/contact - Send contact form message
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // If transporter wasn't initialized, try again
    if (!transporter) {
      await setupMailer();
      if (!transporter) {
        return res.status(500).json({ message: 'Email service not available' });
      }
    }
    
    // Email to admin/support
    const adminMailOptions = {
      from: `"Trybee Contact Form" <${process.env.EMAIL_USER || 'contact@trybee.com'}>`,
      to: process.env.ADMIN_EMAIL || 'support@trybee.com', // This should be configurable
      subject: `New Contact Form: ${subject}`,
      html: `
        <h1>New Contact Form Submission</h1>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <h2>Message:</h2>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    };
    
    // Send email to admin
    const adminInfo = await transporter.sendMail(adminMailOptions);
    
    // For ethereal emails in development, log the URL
    if (adminInfo.messageId && adminInfo.previewURL) {
      console.log('Preview URL: %s', adminInfo.previewURL);
    }
    
    // Confirmation email to user
    const userMailOptions = {
      from: `"Trybee Support" <${process.env.EMAIL_USER || 'support@trybee.com'}>`,
      to: email,
      subject: 'Thank you for contacting us',
      html: `
        <h1>Thank You for Contacting Trybee</h1>
        <p>Hello ${name},</p>
        <p>Thank you for reaching out to us. We have received your message regarding:</p>
        <p><strong>${subject}</strong></p>
        <p>We will review your inquiry and get back to you as soon as possible. Our typical response time is within 24-48 hours during business days.</p>
        <p>If your matter is urgent, please call us at +91 0123456789.</p>
        <br>
        <p>Best regards,</p>
        <p>The Trybee Team</p>
      `
    };
    
    // Send confirmation email to user
    const userInfo = await transporter.sendMail(userMailOptions);
    
    // For ethereal emails in development, log the URL
    if (userInfo.messageId && userInfo.previewURL) {
      console.log('User confirmation preview URL: %s', userInfo.previewURL);
    }
    
    res.status(200).json({ 
      message: 'Message sent successfully', 
      adminEmail: process.env.NODE_ENV === 'development' ? adminInfo : undefined,
      userEmail: process.env.NODE_ENV === 'development' ? userInfo : undefined
    });
    
  } catch (error) {
    console.error('Error sending contact form:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

module.exports = router; 