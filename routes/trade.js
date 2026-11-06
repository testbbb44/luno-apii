const express = require("express")
const barterTradeController = require("../controllers/barterTradeController")
const { createBarterTradeSchema } = require("../validators/barterTradeValidator")

const router = express.Router()

const validateRequest = (schema) => (req, res, next) => {
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

router.post("/barter", validateRequest(createBarterTradeSchema), barterTradeController.createBarterTrade)

module.exports = router
