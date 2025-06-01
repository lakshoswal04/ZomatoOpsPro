const Joi = require('joi');

// Register validation schema
const registerValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).max(1024).required(),
    role: Joi.string().valid('manager', 'delivery_partner').required()
  });
  
  return schema.validate(data);
};

// Login validation schema
const loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).max(1024).required()
  });
  
  return schema.validate(data);
};

// Password change validation schema
const passwordChangeValidation = (data) => {
  const schema = Joi.object({
    currentPassword: Joi.string().min(6).max(1024).required(),
    newPassword: Joi.string().min(6).max(1024).required()
  });
  
  return schema.validate(data);
};

module.exports = {
  registerValidation,
  loginValidation,
  passwordChangeValidation
};
