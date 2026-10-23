const express = require("express")
const createRateLimiter = require("../middleware/rateLimiter")
const investmentController = require("../controllers/investmentController")
const {
  createInvestmentPlanSchema,
  depositToPlanSchema,
  userIdParamSchema,
} = require("../validators/investmentValidator")

const router = express.Router()



// Validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((detail) => detail.message),
        timestamp: new Date().toISOString(),
      })
    }
    next()
  }
}

// Validation middleware for params
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params)
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid parameters",
        errors: error.details.map((detail) => detail.message),
        timestamp: new Date().toISOString(),
      })
    }
    next()
  }
}

// Test route
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Investment routes are working!",
    timestamp: new Date().toISOString(),
  })
})

// Investment plan routes
router.post(
  "/create-plan",
 
  validateRequest(createInvestmentPlanSchema),
  investmentController.createInvestmentPlan,
)

router.post("/deposit", validateRequest(depositToPlanSchema), investmentController.depositToPlan)

router.get("/plans/:userId", validateParams(userIdParamSchema), investmentController.getUserPlans)

router.get("/transactions/:userId", validateParams(userIdParamSchema), investmentController.getTransactionHistory)

router.get("/summary/:userId", validateParams(userIdParamSchema), investmentController.getUserInvestmentSummary)

// Manual trigger for daily profits (for testing only)
router.post("/trigger-daily-profits", investmentController.triggerDailyProfits)

console.log("✅ Investment routes configured successfully")

module.exports = router
