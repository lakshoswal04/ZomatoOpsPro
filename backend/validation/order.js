const Joi = require('joi');

// Validation schema for creating a new order
const createOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      price: Joi.number().min(0).required()
    })
  ).min(1).required(),
  totalAmount: Joi.number().min(0).required(),
  customerName: Joi.string().required(),
  customerAddress: Joi.string().required(),
  customerPhone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  prepTime: Joi.number().integer().min(1).required(),
  eta: Joi.number().integer().min(5)
});

// Validation schema for updating an order status
const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'ON_ROUTE', 'DELIVERED', 'CANCELLED').required()
});

// Validation schema for assigning a delivery partner
const assignPartnerSchema = Joi.object({
  deliveryPartnerId: Joi.string().required(),
  dispatchTime: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  estimatedDeliveryTime: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  eta: Joi.number().integer().min(1).optional()
});

// Validation schema for updating prep time
const updatePrepTimeSchema = Joi.object({
  prepTime: Joi.number().integer().min(1).required()
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  assignPartnerSchema,
  updatePrepTimeSchema
};
