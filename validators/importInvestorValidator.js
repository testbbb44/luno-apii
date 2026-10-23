const Joi = require('joi')
const { signupSchema } = require('./authValidator')
module.exports = signupSchema.keys({
  username: Joi.string().trim().lowercase().pattern(/^[a-z0-9_]{3,32}$/).required(),
  importReference: Joi.string().pattern(/^[a-zA-Z0-9_-]{8,100}$/).required(),
  investmentPlanId: Joi.string().valid('starter', 'professional', 'enterprise').required(),
  amount: Joi.number().positive().max(1000000000).precision(2).strict().required(),
  investedAt: Joi.string().isoDate().pattern(/(?:Z|[+-]\d{2}:\d{2})$/).required(),
  currency: Joi.string().valid('USD').default('USD'),
  amountInCrypto: Joi.number().positive().optional(),
  cryptoCoinName: Joi.string().uppercase().min(2).max(20).optional(),
}).and('amountInCrypto', 'cryptoCoinName')
