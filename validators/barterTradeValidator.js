const Joi = require("joi")
const { parseTradeDate } = require("../utils/tradeDate")

const futureTradeDateSchema = Joi.any()
  .required()
  .custom((value, helpers) => {
    const date = parseTradeDate(value)
    if (!date) return helpers.error("date.base")
    if (date <= new Date()) return helpers.error("date.greater")
    return value
  })
  .messages({
    "date.base": "Trade date must be a valid date",
    "date.greater": "Trade date must be in the future",
  })

const createBarterTradeSchema = Joi.object({
  fullName: Joi.string()
    .trim()
    .min(3)
    .max(150)
    .pattern(/^\S+\s+\S+(?:\s+.*)?$/)
    .required()
    .messages({
      "string.pattern.base": "Full name must include at least a first and last name",
    }),

  tradeType: Joi.string().trim().min(1).max(100),

  traceId: Joi.string()
    .pattern(/^\d{16}$/)
    .required()
    .messages({
      "string.pattern.base": "Trace ID must be exactly 16 digits",
    }),

  tradeNumber: Joi.string()
    .pattern(/^\d{3}$/)
    .required()
    .messages({
      "string.pattern.base": "Trade number must be exactly 3 digits",
    }),

  address: Joi.string().trim().min(1).max(300),
  zipCode: Joi.string().trim().min(1).max(20),

  tradeDate: futureTradeDateSchema,
})

module.exports = { createBarterTradeSchema }
