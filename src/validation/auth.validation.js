// validation/auth.validation.js
const Joi = require("joi");

class AuthValidation {
  // Register Validation
  static registerSchema = Joi.object({
    username: Joi.string()
      .trim()
      .min(3)
      .max(30)
      .required()
      .messages({
        "string.empty": "Username is required",
        "string.min": "Username must be at least 3 characters",
        "string.max": "Username cannot exceed 30 characters",
      }),

    email: Joi.string()
      .trim()
      .email()
      .required()
      .messages({
        "string.email": "Please provide a valid email address",
        "string.empty": "Email is required",
      }),

    password: Joi.string()
      .min(6)
      .max(50)
      .required()
      .messages({
        "string.min": "Password must be at least 6 characters",
        "string.max": "Password cannot exceed 50 characters",
        "string.empty": "Password is required",
      }),

    full_name: Joi.string()
      .trim()
      .min(3)
      .max(100)
      .required()
      .messages({
        "string.empty": "Full name is required",
        "string.min": "Full name must be at least 3 characters",
      }),

    role_id: Joi.number()
      .integer()
      .optional()
      .default(2)
      .messages({
        "number.base": "Role ID must be a valid number",
      }),
  });

  // Login Validation
  static loginSchema = Joi.object({
    email: Joi.string()
      .trim()
      .email()
      .required()
      .messages({
        "string.email": "Please provide a valid email",
        "string.empty": "Email is required",
      }),

    password: Joi.string()
      .required()
      .messages({
        "string.empty": "Password is required",
      }),
  });

  // Change Password Validation
  static changePasswordSchema = Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        "string.empty": "Current password is required",
      }),

    newPassword: Joi.string()
      .min(6)
      .max(50)
      .required()
      .invalid(Joi.ref("currentPassword"))
      .messages({
        "string.min": "New password must be at least 6 characters",
        "any.invalid":
          "New password cannot be the same as current password",
      }),

    confirmPassword: Joi.string()
      .required()
      .valid(Joi.ref("newPassword"))
      .messages({
        "any.only": "Confirm password must match new password",
        "string.empty": "Confirm password is required",
      }),
  });

  // Update Profile Validation
  static updateProfileSchema = Joi.object({
    username: Joi.string()
      .trim()
      .min(3)
      .max(30)
      .optional(),

    full_name: Joi.string()
      .trim()
      .min(3)
      .max(100)
      .optional(),

    email: Joi.string()
      .trim()
      .email()
      .optional(),
  });
}

module.exports = AuthValidation;