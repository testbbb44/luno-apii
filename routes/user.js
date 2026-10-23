const express = require("express")
const createRateLimiter = require("../middleware/rateLimiter")
const { upload, handleUploadError } = require("../middleware/fileUpload")
const userController = require("../controllers/userController")
const { userIdParamSchema, tierUpgradeSchema } = require("../validators/userValidator")

const router = express.Router()

// Rate limiting for user endpoints


// Validation middleware for request body
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
    message: "User routes are working!",
    timestamp: new Date().toISOString(),
  })
})

// User profile routes
router.get("/profile/:userId", validateParams(userIdParamSchema), userController.getUserProfile)

router.post(
  "/upgrade-tier",
  upload.fields([
    { name: "idCardFront", maxCount: 1 },
    { name: "idCardBack", maxCount: 1 },
  ]),
  handleUploadError,
  validateRequest(tierUpgradeSchema),
  userController.upgradeTier,
)

console.log("✅ User routes configured successfully")

module.exports = router
