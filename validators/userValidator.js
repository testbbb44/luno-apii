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
  approveTierUpgradeSchema,
}
