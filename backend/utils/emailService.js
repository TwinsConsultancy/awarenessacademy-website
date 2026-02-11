const nodemailer = require('nodemailer');
require('dotenv').config({ path: './backend/.env' });

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5000';

// Log SMTP configuration status
console.log('📧 Email Service Configuration:');
console.log('   SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com (default)');
console.log('   SMTP_PORT:', process.env.SMTP_PORT || '587 (default)');
console.log('   SMTP_USER:', process.env.SMTP_USER ? '✅ Configured' : '❌ NOT SET');
console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ Configured' : '❌ NOT SET');

// Create Reusable Transporter (SMTP via EmailJS)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send Verification Email
 */
exports.sendVerificationEmail = async (email, token) => {
    try {
        const verifyLink = `${CLIENT_URL}/api/auth/verify-email?token=${token}`;

        await transporter.sendMail({
            from: `"InnerSpark Support" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Verify your InnerSpark Account',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4a90e2;">Welcome to InnerSpark!</h2>
                    <p>Please click the button below to verify your email address:</p>
                    <a href="${verifyLink}" style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">If you didn't create an account, you can ignore this email.</p>
                </div>
            `
        });
        console.log(`✅ Verification email sent to ${email} (via SMTP)`);
    } catch (error) {
        console.error('❌ Error sending verification email:', error);
        throw error;
    }
};

/**
 * Send Password Reset Email
 */
exports.sendPasswordResetEmail = async (email, token) => {
    try {
        const resetLink = `${CLIENT_URL}/reset-password.html?token=${token}`;

        await transporter.sendMail({
            from: `"InnerSpark Security" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Reset your InnerSpark Password',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #d9534f;">Password Reset Request</h2>
                    <p>You requested a password reset. Click the button below to set a new password:</p>
                    <a href="${resetLink}" style="background-color: #d9534f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                    <p style="margin-top: 20px;">Or copy this link: <br> <a href="${resetLink}">${resetLink}</a></p>
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">This link expires in 1 hour.</p>
                </div>
            `
        });
        console.log(`✅ Password reset email sent to ${email} (via SMTP)`);
    } catch (error) {
        console.error('❌ Error sending reset email:', error);
        throw error; // Throw error so controller handles it
    }
};

/**
 * Send OTP Email for Registration using SMTP (EmailJS)
 */
exports.sendRegistrationOTP = async (email, otp, recipientName) => {
    try {
        const mailOptions = {
            from: `"InnerSpark Registration" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Verify Your Email - InnerSpark Registration',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); padding: 40px 30px; text-align: center; color: white; }
                        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
                        .header p { margin: 10px 0 0 0; opacity: 0.95; font-size: 14px; }
                        .content { padding: 40px 30px; }
                        .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
                        .otp-box { background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border: 2px dashed #D97706; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0; }
                        .otp-label { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
                        .otp-code { font-size: 36px; font-weight: 700; color: #D97706; letter-spacing: 8px; font-family: 'Courier New', monospace; }
                        .validity { margin-top: 15px; font-size: 13px; color: #DC2626; font-weight: 600; }
                        .message { line-height: 1.8; color: #555; font-size: 15px; margin-bottom: 20px; }
                        .warning { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
                        .warning p { margin: 0; color: #991B1B; font-size: 14px; }
                        .footer { background: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB; }
                        .footer p { margin: 5px 0; color: #6B7280; font-size: 13px; }
                        .brand { color: #D97706; font-weight: 600; }
                        .icon { font-size: 48px; margin-bottom: 15px; }
                        .info-section { background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0; }
                        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
                        .info-row:last-child { border-bottom: none; }
                        .info-label { color: #6B7280; font-size: 14px; }
                        .info-value { color: #111827; font-weight: 600; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="icon">✨</div>
                            <h1>InnerSpark</h1>
                            <p>Your Journey to Inner Light Begins Here</p>
                        </div>
                        <div class="content">
                            <div class="greeting">Hello ${recipientName || 'There'},</div>
                            <p class="message">
                                Welcome to <span class="brand">InnerSpark</span>! We're excited to have you join our community of seekers and learners.
                            </p>
                            <p class="message">
                                To complete your registration, please verify your email address using the One-Time Password (OTP) below:
                            </p>
                            <div class="otp-box">
                                <div class="otp-label">Your Verification Code</div>
                                <div class="otp-code">${otp}</div>
                                <div class="validity">⏱ Valid for 10 minutes</div>
                            </div>
                            
                            <div class="info-section">
                                <div class="info-row">
                                    <span class="info-label">Recipient Email:</span>
                                    <span class="info-value">${email}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Purpose:</span>
                                    <span class="info-value">Email Verification</span>
                                </div>
                            </div>
                            
                            <p class="message">
                                Enter this code on the registration page to verify your email and proceed with creating your account.
                            </p>
                            <div class="warning">
                                <p>🔒 <strong>Security Notice:</strong> Never share this OTP with anyone. InnerSpark staff will never ask for your OTP.</p>
                            </div>
                        </div>
                        <div class="footer">
                            <p><strong>InnerSpark Sanctuary</strong></p>
                            <p>A sacred space for ancient wisdom and modern mindfulness</p>
                            <p style="margin-top: 15px; font-size: 11px; opacity: 0.7;">
                                If you didn't request this code, please ignore this email.
                            </p>
                            <p style="margin-top: 10px; font-size: 11px; opacity: 0.7;">
                                This is an automated message from InnerSpark Registration System.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP email sent to ${email} via SMTP (${process.env.EMAILJS_SERVICE_ID})`);
        return { success: true, email };
    } catch (error) {
        console.error('❌ Error sending OTP email:', error);
        throw error;
    }
};
// Send Course Published Notification to Subscribers
exports.sendCoursePublishedNotification = async ({
    subscriberName,
    subscriberEmail,
    courseTitle,
    courseCategory,
    courseMentor,
    coursePrice
}) => {
    try {


        const mailOptions = {
            from: `"InnerSpark" <${process.env.SMTP_USER}>`,
            to: subscriberEmail,
            subject: `🎉 ${courseTitle} is Now Available!`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #F3F4F6; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); padding: 40px 30px; text-align: center; color: white; }
                        .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
                        .header p { opacity: 0.95; font-size: 15px; }
                        .content { padding: 40px 30px; }
                        .greeting { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 20px; }
                        .message { color: #374151; font-size: 15px; line-height: 1.7; margin-bottom: 15px; }
                        .course-box { background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 6px solid #D97706; }
                        .course-title { font-size: 22px; font-weight: 700; color: #92400E; margin-bottom: 15px; }
                        .course-details { background: white; border-radius: 8px; padding: 15px; margin-top: 15px; }
                        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F3F4F6; }
                        .detail-row:last-child { border-bottom: none; }
                        .detail-label { color: #6B7280; font-size: 14px; font-weight: 500; }
                        .detail-value { color: #111827; font-weight: 600; font-size: 14px; }
                        .price { font-size: 24px; color: #10B981; font-weight: 700; }
                        .cta-button { display: inline-block; background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; text-align: center; }
                        .cta-button:hover { background: linear-gradient(135deg, #B45309 0%, #D97706 100%); }
                        .contact-box { background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
                        .contact-box p { color: #6B7280; font-size: 14px; margin-bottom: 10px; }
                        .contact-info { color: #D97706; font-weight: 600; }
                        .footer { background: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB; }
                        .footer p { margin: 5px 0; color: #6B7280; font-size: 13px; }
                        .brand { color: #D97706; font-weight: 600; }
                        .icon { font-size: 48px; margin-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="icon">🎉</div>
                            <h1>Course Now Available!</h1>
                            <p>The course you've been waiting for is here</p>
                        </div>
                        <div class="content">
                            <div class="greeting">Hello ${subscriberName},</div>
                            <p class="message">
                                Great news! The course you subscribed to is now available on <span class="brand">InnerSpark</span>.
                            </p>
                            <p class="message">
                                We're excited to invite you to begin your transformative course with this newly published course.
                            </p>
                            
                            <div class="course-box">
                                <div class="course-title">📚 ${courseTitle}</div>
                                <div class="course-details">
                                    <div class="detail-row">
                                        <span class="detail-label">Category:</span>
                                        <span class="detail-value">${courseCategory}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Mentor:</span>
                                        <span class="detail-value">${courseMentor}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Price:</span>
                                        <span class="price">₹${coursePrice}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <p class="message">
                                This course is designed to guide you through an enlightening experience. Don't miss this opportunity to expand your knowledge and grow spiritually.
                            </p>
                            
                            <div style="text-align: center;">
                                <a href="http://localhost:5001" class="cta-button">
                                    🌟 Visit Our Website
                                </a>
                            </div>
                            
                            <div class="contact-box">
                                <p>For further details or enrollment assistance, please:</p>
                                <p class="contact-info">📧 Visit our website or contact our support team</p>
                            </div>
                            
                            <p class="message" style="margin-top: 25px; font-size: 14px; color: #6B7280;">
                                We look forward to seeing you in class!<br>
                                With light and wisdom,<br>
                                <strong class="brand">The InnerSpark Team</strong>
                            </p>
                        </div>
                        <div class="footer">
                            <p><strong>InnerSpark Sanctuary</strong></p>
                            <p>A sacred space for ancient wisdom and modern mindfulness</p>
                            <p style="margin-top: 15px; font-size: 11px; opacity: 0.7;">
                                You received this email because you subscribed to notifications for this course.
                            </p>
                            <p style="margin-top: 5px; font-size: 11px; opacity: 0.7;">
                                This is an automated notification from InnerSpark Course System.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Course notification sent to ${subscriberEmail}`);
        return { success: true, email: subscriberEmail };
    } catch (error) {
        console.error(`❌ Error sending course notification to ${subscriberEmail}:`, error);
        throw error;
    }
};

/**
 * Generic Send Mail Function
 */
exports.sendMail = async ({ to, subject, html }) => {
    try {
        console.log(`📤 Attempting to send email to ${to}...`);

        // Check if SMTP credentials are configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            throw new Error('SMTP credentials not configured. Set SMTP_USER and SMTP_PASS in .env file');
        }

        await transporter.sendMail({
            from: `"InnerSpark Security" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html
        });
        console.log(`✅ Email sent successfully to ${to}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Error sending email to ${to}:`);
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        if (error.code === 'EAUTH') {
            console.error('   → Authentication failed. Check SMTP_USER and SMTP_PASS credentials');
        } else if (error.code === 'ECONNECTION') {
            console.error('   → Connection failed. Check SMTP_HOST and network connection');
        }
        throw error;
    }
};

/**
 * Send Payment Confirmation Email
 */
exports.sendPaymentConfirmationEmail = async (email, paymentData) => {
    try {
        const { 
            studentName, 
            studentId, 
            courseName, 
            amount, 
            transactionId, 
            paymentId, 
            paymentMethod, 
            date 
        } = paymentData;

        const formattedDate = new Date(date).toLocaleString('en-IN', {
            dateStyle: 'full',
            timeStyle: 'long',
            timeZone: 'Asia/Kolkata'
        });

        await transporter.sendMail({
            from: `"InnerSpark Academy" <${process.env.SMTP_USER}>`,
            to: email,
            subject: '✅ Payment Successful - Course Enrollment Confirmed',
            html: `
                <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <!-- Header -->
                    <div style="background: rgba(255,255,255,0.1); padding: 30px; text-align: center; backdrop-filter: blur(10px);">
                        <h1 style="margin: 0; font-size: 2rem; color: #FFD700;">InnerSpark Academy</h1>
                        <p style="margin: 10px 0 0; font-size: 1.1rem; color: rgba(255,255,255,0.9);">Payment Confirmation</p>
                    </div>

                    <!-- Success Icon -->
                    <div style="text-align: center; padding: 20px 0;">
                        <div style="display: inline-block; background: #28a745; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-size: 2rem;">
                            ✓
                        </div>
                    </div>

                    <!-- Content -->
                    <div style="padding: 30px; background: white; color: #333; margin: 0 20px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                        <h2 style="color: #667eea; margin-Bottom: 20px; text-align: center;">Payment Successful!</h2>
                        
                        <p style="font-size: 1.1rem; margin-bottom: 25px;">Dear <strong>${studentName}</strong>,</p>
                        
                        <p style="margin-bottom: 25px;">Your payment has been successfully processed and you are now enrolled in the course. Here are your payment details:</p>

                        <!-- Payment Details Card -->
                        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #667eea;">
                            <h3 style="color: #667eea; margin-top: 0; margin-bottom: 20px;">Payment Details</h3>
                            
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Student Name:</td>
                                    <td style="padding: 10px 0; color: #212529;">${studentName}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Student ID:</td>
                                    <td style="padding: 10px 0; color: #212529;">${studentId || 'N/A'}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Course Name:</td>
                                    <td style="padding: 10px 0; color: #212529;">${courseName}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Amount Paid:</td>
                                    <td style="padding: 10px 0; color: #28a745; font-weight: 700; font-size: 1.1rem;">₹${amount}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Transaction ID:</td>
                                    <td style="padding: 10px 0; color: #212529; font-family: 'Courier New', monospace;">${transactionId}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Payment ID:</td>
                                    <td style="padding: 10px 0; color: #212529; font-family: 'Courier New', monospace;">${paymentId}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Payment Method:</td>
                                    <td style="padding: 10px 0; color: #212529;">${paymentMethod}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Status:</td>
                                    <td style="padding: 10px 0; color: #28a745; font-weight: 600;">COMPLETED</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Date & Time:</td>
                                    <td style="padding: 10px 0; color: #212529;">${formattedDate}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Next Steps -->
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <h3 style="margin-top: 0; margin-bottom: 15px;">🎯 What's Next?</h3>
                            <ul style="margin: 0; padding-left: 20px;">
                                <li style="margin-bottom: 8px;">Log in to your student dashboard to access your course</li>
                                <li style="margin-bottom: 8px;">Start your learning journey immediately</li>
                                <li style="margin-bottom: 8px;">Track your progress and earn certificates</li>
                                <li>Get support from our community and instructors</li>
                            </ul>
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${CLIENT_URL}/frontend/html/student-dashboard.html" 
                               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                      color: white; 
                                      text-decoration: none; 
                                      padding: 15px 30px; 
                                      border-radius: 25px; 
                                      font-weight: 600; 
                                      font-size: 1.1rem;
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                                🚀 Access Your Course Now
                            </a>
                        </div>

                        <p style="margin-top: 30px; font-size: 0.9rem; color: #6c757d; text-align: center;">
                            Need help? Contact us at <a href="mailto:${process.env.SMTP_USER}" style="color: #667eea;">${process.env.SMTP_USER}</a>
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.8);">
                        <p style="margin: 0; font-size: 0.9rem;">© 2026 InnerSpark Academy. Empowering minds, transforming lives.</p>
                    </div>
                </div>
            `
        });
        
        console.log(`✅ Payment confirmation email sent to ${email}`);
    } catch (error) {
        console.error('❌ Error sending payment confirmation email:', error);
        throw error;
    }
};

/**
 * Send Payment Failure Email
 */
exports.sendPaymentFailureEmail = async (email, paymentData) => {
    try {
        const { 
            studentName, 
            courseName, 
            amount, 
            transactionId, 
            failureReason, 
            date 
        } = paymentData;

        const formattedDate = new Date(date).toLocaleString('en-IN', {
            dateStyle: 'full',
            timeStyle: 'long',
            timeZone: 'Asia/Kolkata'
        });

        await transporter.sendMail({
            from: `"InnerSpark Academy" <${process.env.SMTP_USER}>`,
            to: email,
            subject: '⚠️ Payment Failed - InnerSpark Academy',
            html: `
                <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #ff6b6b 0%, #ffdde1 100%); color: white;">
                    <!-- Header -->
                    <div style="background: rgba(255,255,255,0.1); padding: 30px; text-align: center; backdrop-filter: blur(10px);">
                        <h1 style="margin: 0; font-size: 2rem; color: #FFD700;">InnerSpark Academy</h1>
                        <p style="margin: 10px 0 0; font-size: 1.1rem; color: rgba(255,255,255,0.9);">Payment Failed</p>
                    </div>

                    <!-- Failure Icon -->
                    <div style="text-align: center; padding: 20px 0;">
                        <div style="display: inline-block; background: #dc3545; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-size: 2rem;">
                            ✕
                        </div>
                    </div>

                    <!-- Content -->
                    <div style="padding: 30px; background: white; color: #333; margin: 0 20px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                        <h2 style="color: #dc3545; margin-bottom: 20px; text-align: center;">Payment Failed</h2>
                        
                        <p style="font-size: 1.1rem; margin-bottom: 25px;">Dear <strong>${studentName}</strong>,</p>
                        
                        <p style="margin-bottom: 25px;">Unfortunately, your payment could not be processed. Please find the details below:</p>

                        <!-- Payment Details Card -->
                        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #dc3545;">
                            <h3 style="color: #dc3545; margin-top: 0; margin-bottom: 20px;">Payment Details</h3>
                            
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Student Name:</td>
                                    <td style="padding: 10px 0; color: #212529;">${studentName}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Course Name:</td>
                                    <td style="padding: 10px 0; color: #212529;">${courseName}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Amount:</td>
                                    <td style="padding: 10px 0; color: #212529; font-weight: 700; font-size: 1.1rem;">₹${amount}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Transaction ID:</td>
                                    <td style="padding: 10px 0; color: #212529; font-family: 'Courier New', monospace;">${transactionId}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Status:</td>
                                    <td style="padding: 10px 0; color: #dc3545; font-weight: 600;">FAILED</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Reason:</td>
                                    <td style="padding: 10px 0; color: #dc3545;">${failureReason}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 15px 10px 0; font-weight: 600; color: #495057;">Date & Time:</td>
                                    <td style="padding: 10px 0; color: #212529;">${formattedDate}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Next Steps -->
                        <div style="background: #e3f2fd; color: #0d47a1; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #2196f3;">
                            <h3 style="margin-top: 0; margin-bottom: 15px; color: #0d47a1;">💡 What to do next?</h3>
                            <ul style="margin: 0; padding-left: 20px;">
                                <li style="margin-bottom: 8px;">Check your card/account balance and limits</li>
                                <li style="margin-bottom: 8px;">Verify your payment details</li>
                                <li style="margin-bottom: 8px;">Try a different payment method</li>
                                <li>Contact your bank if the issue persists</li>
                            </ul>
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${CLIENT_URL}/frontend/html/student-dashboard.html" 
                               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                      color: white; 
                                      text-decoration: none; 
                                      padding: 15px 30px; 
                                      border-radius: 25px; 
                                      font-weight: 600; 
                                      font-size: 1.1rem;
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                                🔄 Try Payment Again
                            </a>
                        </div>

                        <p style="margin-top: 30px; font-size: 0.9rem; color: #6c757d; text-align: center;">
                            Need help? Contact us at <a href="mailto:${process.env.SMTP_USER}" style="color: #667eea;">${process.env.SMTP_USER}</a>
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.8);">
                        <p style="margin: 0; font-size: 0.9rem;">© 2026 InnerSpark Academy. We're here to help you succeed.</p>
                    </div>
                </div>
            `
        });
        
        console.log(`✅ Payment failure notification sent to ${email}`);
    } catch (error) {
        console.error('❌ Error sending payment failure email:', error);
        throw error;
    }
};
