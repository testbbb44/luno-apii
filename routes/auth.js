const express = require("express")
const createRateLimiter = require("../middleware/rateLimiter")

console.log("🔄 Loading auth controller...")
const authController = require("../controllers/authController")
console.log("🔄 Loading validators...")
const { signupSchema, loginSchema } = require("../validators/authValidator")

const router = express.Router()

console.log("🔄 Setting up rate limiting...")
// Rate limiting for auth endpoints
// const authLimiter = createRateLimiter({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10, // limit each IP to 10 requests per windowMs for auth endpoints
//   message: {
//     success: false,
//     message: "Too many authentication attempts, please try again later.",
//   },
// })

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

console.log("🔄 Setting up auth routes...")

// Test route to make sure basic routing works
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes are working!",
    timestamp: new Date().toISOString(),
  })
})

// Routes
router.post("/signup", validateRequest(signupSchema), authController.signup)
router.post("/login", validateRequest(loginSchema), authController.login)

console.log("✅ Auth routes configured successfully")

module.exports = router
