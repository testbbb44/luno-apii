const Joi = require("joi");

const signupSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "First name should only contain letters and spaces",
      "string.min": "First name must be at least 2 characters long",
      "string.max": "First name cannot exceed 50 characters",
    }),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      "string.pattern.base": "Last name should only contain letters and spaces",
      "string.min": "Last name must be at least 2 characters long",
      "string.max": "Last name cannot exceed 50 characters",
    }),

  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
  }),

  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),

  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)

    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),

  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
  }),
});

const loginSchema = Joi.object({
  username: Joi.string().trim().lowercase().pattern(/^[a-z0-9_]{3,32}$/),
  email: Joi.string().email().messages({
    "string.email": "Please provide a valid email address",
  }),

  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

const loginSchemaForExport = loginSchema.xor("email", "username");

module.exports = {
  signupSchema,
  loginSchema: loginSchemaForExport,
};
