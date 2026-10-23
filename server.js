const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const CronService = require("./services/cronService");
require("dotenv").config();


console.log("🔄 Starting server initialization...");

// Initialize Firebase FIRST, before importing controllers
const { initializeFirebase } = require("./config/firebase");
console.log("🔄 Initializing Firebase...");
initializeFirebase();

console.log("🔄 Importing routes...");
// Now import routes (which import controllers)
const authRoutes = require("./routes/auth");
const investmentRoutes = require("./routes/investment");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/user");
const imageRoutes = require("./routes/images");

const app = express();
const PORT = process.env.PORT || 8000;

console.log("🔄 Setting up middleware...");

// Security middleware
app.use(helmet());

// const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:1573"];

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin) return callback(null, true);
//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       } else {
//         return callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//   })
// );

// Custom rate limiting
// const limiter = createRateLimiter({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: "Too many requests from this IP, please try again later.",
// })
// app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

console.log("🔄 Setting up routes...");
app.get("/", (req, res) => {
  res.status(201).json({
    message: "welcome to bitstock api ",
  });
});
// Health check endpoint (simple route first)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Crypto Investment API is running",
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/investment", investmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/images", imageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

console.log("🔄 Starting server...");

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/`);
  console.log(
    `💰 Investment endpoints: http://localhost:${PORT}/api/investment/`
  );
  console.log(`👨‍💼 Admin endpoints: http://localhost:${PORT}/api/admin/`);
  console.log(`👤 User endpoints: http://localhost:${PORT}/api/user/`);
  console.log(`🖼️ Image endpoints: http://localhost:${PORT}/api/images/`);
  console.log(`📝 Node.js version: ${process.version}`);

  // Initialize cron jobs after server starts
  CronService.initializeCronJobs();
});

module.exports = app;
