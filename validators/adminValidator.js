const Joi = require("joi")

const updateTransactionStatusSchema = Joi.object({
  transactionId: Joi.string().required().messages({
    "string.empty": "Transaction ID is required",
  }),

  status: Joi.string().valid("success", "failed").required().messages({
    "any.only": "Status must be either 'success' or 'failed'",
  }),

  adminNote: Joi.string().max(500).optional().messages({
    "string.max": "Admin note cannot exceed 500 characters",
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
  updateTransactionStatusSchema,
  approveTierUpgradeSchema,
}
