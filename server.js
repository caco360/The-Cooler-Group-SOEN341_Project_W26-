const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const randomstring = require("randomstring");
const path = require("path");
const cors = require("cors");

const app = express();
require("dotenv").config({ path: path.join(__dirname, ".env") });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// OTP Store (In-memory)
const otpCache = {}; 

// Transporter using Gmail Service
function makeTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // MUST BE 16-CHARACTER APP PASSWORD
    },
  });
}

// HEALTH CHECK (Test this first at http://localhost:3000/health)
app.get("/health", (req, res) => res.json({ ok: true, msg: "Server is alive" }));

// Route: Request OTP
app.post("/reqOTP", async (req, res) => {
  const { email } = req.body;
  console.log("📩 OTP Request received for:", email);

  if (!email) return res.status(400).json({ ok: false, error: "Email is required" });

  const otp = randomstring.generate({ length: 4, charset: "numeric" });
  otpCache[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

  try {
    const transporter = makeTransporter();
    await transporter.sendMail({
      from: `"MealMajor" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your verification code is: ${otp}`,
    });

    console.log(`✅ OTP ${otp} sent to ${email}`);
    res.json({ ok: true, msg: "OTP sent successfully!" });
  } catch (err) {
    console.error("❌ SMTP Error:", err.message);
    res.status(500).json({ ok: false, error: "Email failed: " + err.message });
  }
});

// Route: Verify OTP
app.post("/verify", (req, res) => {
  const { email, otp } = req.body;
  const record = otpCache[email];

  if (!record) return res.status(400).json({ ok: false, error: "No OTP found" });
  if (Date.now() > record.expiresAt) return res.status(400).json({ ok: false, error: "OTP expired" });
  if (String(otp) !== String(record.otp)) return res.status(400).json({ ok: false, error: "Invalid OTP" });

  delete otpCache[email];
  res.json({ ok: true, msg: "Verified successfully!" });
});

// Start Server on 0.0.0.0 to fix Mac connection issues
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SERVER IS LIVE!`);
  console.log(`🔗 Local Test: http://127.0.0.1:${PORT}/health`);
});