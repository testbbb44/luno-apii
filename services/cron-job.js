require('dotenv').config();
const { initializeFirebase } = require("../config/firebase");
const investmentController = require("../controllers/investmentController");

async function runDailyJob() {
  console.log(
    "🕐 Running scheduled profit calculation at:",
    new Date().toISOString()
  );

  try {
    console.log("🔥 Initializing Firebase...");
    initializeFirebase();
    console.log("✅ Firebase initialized successfully");
    console.log("✅ Firebase initialized successfully");
    await investmentController.calculateDailyProfits();
    console.log("✅ Profit calculation completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Profit calculation failed:", error);
    process.exit(1);
  }
}

runDailyJob();
