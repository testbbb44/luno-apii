require('dotenv').config();
const cron = require("node-cron");
const investmentController = require("../controllers/investmentController");
const { initializeFirebase } = require("../config/firebase");

async function runDailyJob() {
  console.log(
    "🕐 Running scheduled profit calculation at:",
    new Date().toISOString()
  );

  try {
    // Initialize Firebase before running the job
    console.log("🔥 Initializing Firebase...");
    initializeFirebase();
    console.log("✅ Firebase initialized successfully");
    await investmentController.calculateDailyProfits();
    console.log("✅ Profit calculation completed successfully");
  } catch (error) {
    console.error("❌ Profit calculation failed:", error);
  }
}

// Run every 5 minutes for testing
console.log("🕐 Starting test cron job - runs every 5 minutes");
cron.schedule('*/2 * * * *', runDailyJob);
// Keep the process running
console.log("✅ Test cron job initialized. Press Ctrl+C to stop.");
