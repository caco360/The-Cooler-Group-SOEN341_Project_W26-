const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const randomstring = require('randomstring');
const path = require('path');
const app = express();




app.use(express.static(path.join(__dirname, 'public'))); // Middleware to parse JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Store generated OTPs and corresponding email addresses
const otpCache = {};

// Generate OTP
function generateOTP() {
    return randomstring.generate({ length : 4, charset: 'numeric' });
}

// Send OTP via email
async function sendOTPEmail(email, otp) {
    const mailOptions = {
        from: 'jerrish.github@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}`  
    };

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'jerrish.github@gmail.com',
            pass: 'your-email-password'
        },
        tls: {
            rejectUnauthorized: false // Disable certificate validation
        }
            
    });

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

// route to request OTP
app.post('/reqOTP', (req, res)=> {
    const { email } = req.body;
    const otp = generateOTP();
    otpCache[email] = otp; // Store OTP against the email
    
    // Send OTP by email
    sendOTPEmail(email, otp);
    res.cookie('otpCache', otpCache, {maxAge: 30000, httpOnly: true});
    res.status(200).json({ message: 'OTP sent successfully'});
});

// route to verify OTP
app.post('/verifyOTP', (req, res) => {
    const { email, otp } = req.body;
    
    //check if email exists in the cache
    if (!otpCache.hasOwnProperty(email)) {
        return res.status(400).json({ message: 'Email not found' });
    }

    // Check if OTP matches teh one stored in the cache
    if (otpCache[email] === otp.trim()){
        // Remove OTP from cache after successful verification
        delete otpCache[email];
        return res.status(200).json({ message: 'OTP verified successfully' });
    } else
        return res.status(400).json({ message: 'Invalid OTP' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Website is running on port ${PORT}`);
});