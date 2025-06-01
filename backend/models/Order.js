const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  items: [{
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerAddress: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  prepTime: {
    type: Number,
    required: true,
    min: 1 // Minimum prep time in minutes
  },
  eta: {
    type: Number,
    default: 15 // Default ETA in minutes
  },
  status: {
    type: String,
    enum: ['PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'ON_ROUTE', 'DELIVERED', 'CANCELLED'],
    default: 'PREPARING'
  },
  deliveryPartnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  dispatchTime: {
    type: Date,
    default: null
  },
  deliveredTime: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
OrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate dispatch time and estimated delivery time
OrderSchema.methods.calculateDispatchTime = function() {
  const now = new Date();
  const prepTimeMs = this.prepTime * 60 * 1000; // Convert minutes to milliseconds
  const etaMs = (this.eta || 15) * 60 * 1000; // Convert minutes to milliseconds, default 15 min
  
  // Calculate dispatch time: current time + prep time
  const dispatchTime = new Date(now.getTime() + prepTimeMs);
  this.dispatchTime = dispatchTime;
  
  // Calculate estimated delivery time: dispatch time + ETA
  const estimatedDeliveryTime = new Date(dispatchTime.getTime() + etaMs);
  
  return {
    dispatchTime,
    estimatedDeliveryTime
  };
};

// Method to validate if a delivery partner can be assigned
OrderSchema.methods.canAssignPartner = async function(partnerId) {
  // Check if the order already has a delivery partner assigned
  if (this.deliveryPartnerId) {
    return { valid: false, message: 'Order already has a delivery partner assigned' };
  }
  
  // Check if the partner exists and is available
  const User = mongoose.model('User');
  let partner;
  
  try {
    // Find by MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(partnerId)) {
      partner = await User.findById(partnerId);
    } else {
      return { valid: false, message: 'Invalid delivery partner ID format' };
    }
    
    if (!partner) {
      return { valid: false, message: 'Delivery partner not found' };
    }
    
    if (partner.role !== 'delivery_partner') {
      return { valid: false, message: 'User is not a delivery partner' };
    }
    
    if (!partner.isAvailable) {
      return { valid: false, message: 'Delivery partner is not available' };
    }
    
    // Check if the partner is already assigned to another active order
    if (partner.currentOrderId) {
      return { valid: false, message: 'Delivery partner is already assigned to another order' };
    }
    
    return { valid: true };
  } catch (err) {
    console.error('Error validating delivery partner:', err.message);
    return { valid: false, message: 'Error validating delivery partner' };
  }
};

module.exports = mongoose.model('Order', OrderSchema);
