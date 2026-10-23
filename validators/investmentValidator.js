const Joi = require("joi")

const createInvestmentPlanSchema = Joi.object({
  userId: Joi.string().required().messages({
    "string.empty": "User ID is required",
  }),

  investmentPlanName: Joi.string().min(3).max(500).required().messages({
    "string.min": "Investment plan name must be at least 3 characters long",
    "string.max": "Investment plan name cannot exceed 500 characters",
  }),

  investmentPlanId: Joi.string().min(3).max(500).required().messages({
    "string.min": "Investment plan ID must be at least 3 characters long",
    "string.max": "Investment plan ID cannot exceed 500 characters",
  }),

  dailyPercentage: Joi.number().min(0.01).max(100).required().messages({
    "number.min": "Daily percentage must be at least 0.01%",
    "number.max": "Daily percentage cannot exceed 100%",
  }),

  withdrawalDay: Joi.number().integer().min(1).max(3650).required().messages({
    "number.min": "Withdrawal day must be at least 1 day",
    "number.max": "Withdrawal day cannot exceed 3650 days (10 years)",
  }),

  amount: Joi.number().min(0.01).required().messages({
    "number.min": "Amount must be greater than 0",
  }),

  currency: Joi.string().length(3).required().messages({
    "string.length": "Currency must be a 3-letter code (e.g., USD, EUR)",
  }),

  amountInCrypto: Joi.number().min(0.00000001).required().messages({
    "number.min": "Crypto amount must be greater than 0",
  }),

  cryptoCoinName: Joi.string().min(2).max(200).required().messages({
    "string.min": "Crypto coin name must be at least 2 characters",
    "string.max": "Crypto coin name cannot exceed 200 characters",
  }),
})

const depositToPlanSchema = Joi.object({
  investmentPlanId: Joi.string().required().messages({
    "string.empty": "Investment plan ID is required",
  }),

  userId: Joi.string().required().messages({
    "string.empty": "User ID is required",
  }),

  amount: Joi.number().min(0.01).required().messages({
    "number.min": "Amount must be greater than 0",
  }),

  amountInCrypto: Joi.number().min(0.00000001).required().messages({
    "number.min": "Crypto amount must be greater than 0",
  }),

  cryptoCoinName: Joi.string().min(2).max(200).required().messages({
    "string.min": "Crypto coin name must be at least 2 characters",
    "string.max": "Crypto coin name cannot exceed 200 characters",
  }),
})

const userIdParamSchema = Joi.object({
  userId: Joi.string().required().messages({
    "string.empty": "User ID is required",
  }),
})

module.exports = {
  createInvestmentPlanSchema,
  depositToPlanSchema,
  userIdParamSchema,
}
