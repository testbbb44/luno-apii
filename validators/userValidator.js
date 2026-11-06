const Joi = require("joi")

const userIdParamSchema = Joi.object({
  userId: Joi.string().required().messages({
    "string.empty": "User ID is required",
  }),
})

const tierUpgradeSchema = Joi.object({
  userId: Joi.string().required().messages({
    "string.empty": "User ID is required",
  }),

  socialSecurityNumber: Joi.string()
    .pattern(/^\d{3}-?\d{2}-?\d{4}$/)
    .required()
    .messages({
      "string.pattern.base": "Social Security Number must be 9 digits (with or without dashes)",
      "string.empty": "Social Security Number is required",
    }),
})

const updateBalanceSchema = Joi.object({
  investmentValue: Joi.number().min(0).precision(2).required().messages({
    "number.base": "Investment value must be a number",
    "number.min": "Investment value cannot be negative",
    "number.precision": "Investment value can have at most 2 decimal places",
    "any.required": "Investment value is required",
  }),
})

const approveTierUpgradeSchema = Joi.object({
  userId: Joi.string().required().messages({
    "string.empty": "User ID is required",
  }),

  approved: Joi.boolean().required().messages({
    "boolean.base": "Approved must be true or false",
  }),

  adminNote: Joi.string().max(500).optional().messages({
    "string.max": "Admin note cannot exceed 500 characters",
  }),
})

module.exports = {
  userIdParamSchema,
  tierUpgradeSchema,
  updateBalanceSchema,
  approveTierUpgradeSchema,
}
