const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');
const { createOrderSchema, updateOrderStatusSchema, assignPartnerSchema, updatePrepTimeSchema } = require('../validation/order');

// @route   GET api/orders
// @desc    Get all orders
// @access  Private (Manager only)
router.get('/', auth, authorize('manager'), async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('deliveryPartnerId', 'name email');
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/orders
// @desc    Create a new order
// @access  Private (Manager only)
router.post('/', auth, authorize('manager'), async (req, res) => {
  try {
    // Validate request body against schema
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ msg: error.details[0].message });
    }
    
    // Generate a unique order ID (format: ORD-YYYYMMDD-XXXX)
    const date = new Date();
    const dateStr = date.getFullYear().toString() +
                  (date.getMonth() + 1).toString().padStart(2, '0') +
                  date.getDate().toString().padStart(2, '0');
    
    // Find the highest order number for today
    const lastOrder = await Order.findOne(
      { orderId: { $regex: `ORD-${dateStr}-` } },
      {},
      { sort: { orderId: -1 } }
    );
    
    let orderNumber = 1;
    if (lastOrder) {
      const lastOrderNumber = parseInt(lastOrder.orderId.split('-')[2]);
      orderNumber = lastOrderNumber + 1;
    }
    
    const orderId = `ORD-${dateStr}-${orderNumber.toString().padStart(4, '0')}`;
    
    // Create new order
    const newOrder = new Order({
      orderId,
      items: value.items,
      totalAmount: value.totalAmount,
      customerName: value.customerName,
      customerAddress: value.customerAddress,
      customerPhone: value.customerPhone,
      prepTime: value.prepTime,
      eta: value.eta || 15
    });
    
    // Calculate dispatch time
    const { dispatchTime, estimatedDeliveryTime } = newOrder.calculateDispatchTime();
    
    // Save the order
    await newOrder.save();
    
    res.status(201).json({
      order: newOrder,
      dispatchTime,
      estimatedDeliveryTime
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

// @route   GET api/orders/:orderId
// @desc    Get order by ID
// @access  Private
router.get('/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }).populate('deliveryPartnerId', 'name email');
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // If user is delivery partner, check if they are assigned to this order
    if (req.user.role === 'delivery_partner' && 
        (!order.deliveryPartnerId || order.deliveryPartnerId.toString() !== req.user.id)) {
      return res.status(403).json({ msg: 'Not authorized to view this order' });
    }
    
    // Calculate estimated delivery time if not already delivered
    let estimatedDeliveryTime = null;
    if (order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
      const { dispatchTime, estimatedDeliveryTime: eta } = order.calculateDispatchTime();
      estimatedDeliveryTime = eta;
    }
    
    res.json({
      order,
      estimatedDeliveryTime
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/orders/:orderId/assign
// @desc    Assign a delivery partner to an order
// @access  Private (Manager only)
router.put('/:orderId/assign', auth, async (req, res) => {
  console.log('Request body:', req.body); // Add this line
  try {
    const { orderId } = req.params;
    const { deliveryPartnerId, dispatchTime, estimatedDeliveryTime, eta } = req.body;
    
    // Validate request body
    const { error, value } = assignPartnerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ msg: error.details[0].message });
    }
    
    // Check if order exists
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Validate if partner can be assigned to this order
    const validationResult = await order.canAssignPartner(deliveryPartnerId);
    if (!validationResult.valid) {
      return res.status(400).json({ msg: validationResult.message });
    }
    
    // Find the delivery partner by ID
    let partner;
    try {
      // Check if the ID is a valid MongoDB ObjectId
      if (mongoose.Types.ObjectId.isValid(deliveryPartnerId)) {
        partner = await User.findById(deliveryPartnerId);
      }
      
      if (!partner) {
        return res.status(404).json({ msg: 'Delivery partner not found' });
      }
    } catch (err) {
      console.error('Error finding delivery partner:', err.message);
      return res.status(500).json({ msg: 'Error finding delivery partner' });
    }
    
    // Use the dispatchTime and estimatedDeliveryTime from the request body
    // or calculate them if not provided
    let dispatchTimeToUse = dispatchTime;
    let estimatedDeliveryTimeToUse = estimatedDeliveryTime;

    // If not provided in the request, calculate them
    if (!dispatchTimeToUse || !estimatedDeliveryTimeToUse) {
      const calculated = order.calculateDispatchTime();
      dispatchTimeToUse = calculated.dispatchTime;
      estimatedDeliveryTimeToUse = calculated.estimatedDeliveryTime;
    }
    
    // Update order with delivery partner and dispatch time
    order.deliveryPartnerId = deliveryPartnerId;
    order.dispatchTime = new Date(dispatchTimeToUse);
    order.estimatedDeliveryTime = new Date(estimatedDeliveryTimeToUse);
    order.status = 'ASSIGNED';
    await order.save();
    
    // Update delivery partner availability and current order
    partner.isAvailable = false;
    partner.currentOrderId = order._id;
    await partner.save();
    
    // Get the WebSocket io instance
    const io = req.app.get('io');
    
    // Notify via WebSocket
    if (io) {
      // Notify the specific delivery partner about the new assignment
      io.to(`partner_${partner._id}`).emit('order_assigned', {
        orderId: order.orderId,
        customerName: order.customerName,
        customerAddress: order.customerAddress,
        estimatedDeliveryTime: estimatedDeliveryTimeToUse
      });
      
      // Also notify the delivery partner about their availability change
      io.to(`partner_${partner._id}`).emit('availability_updated', {
        isAvailable: false,
        message: 'You are now unavailable because you have an active order'
      });
      
      // Notify managers about the assignment
      io.to('managers').emit('order_assigned_to_partner', {
        orderId: order.orderId,
        partnerId: partner._id,
        partnerName: partner.name
      });
    }
    
    res.json({ 
      message: 'Delivery partner assigned successfully',
      order: {
        orderId: order.orderId,
        status: order.status,
        deliveryPartnerId: order.deliveryPartnerId,
        dispatchTime: order.dispatchTime,
        estimatedDeliveryTime: order.estimatedDeliveryTime
      }
    });
  } catch (err) {
    console.error('Error assigning delivery partner:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PUT api/orders/:orderId/status
// @desc    Update order status
// @access  Private (Delivery Partner or Manager)
router.put('/:orderId/status', auth, async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updateOrderStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ msg: error.details[0].message });
    }
    
    const { status } = value;
    const orderId = req.params.orderId;
    
    // Valid status progression based on role
    const managerValidStatuses = ['PREPARING', 'READY_FOR_PICKUP', 'CANCELLED'];
    const deliveryPartnerValidStatuses = ['PICKED_UP', 'ON_ROUTE', 'DELIVERED'];
    
    // Check if order exists
    const order = await Order.findOne({ orderId }).populate('deliveryPartnerId', 'name email');
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Check authorization based on role
    if (req.user.role === 'delivery_partner') {
      // Delivery partner can only update orders assigned to them
      if (!order.deliveryPartnerId || order.deliveryPartnerId._id.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'Not authorized to update this order' });
      }
      
      // Delivery partner can only set specific statuses
      if (!deliveryPartnerValidStatuses.includes(status)) {
        return res.status(400).json({ 
          msg: `Delivery partners can only set status to: ${deliveryPartnerValidStatuses.join(', ')}` 
        });
      }
    } else if (req.user.role === 'manager') {
      // Manager can only set specific statuses
      if (!managerValidStatuses.includes(status)) {
        return res.status(400).json({ 
          msg: `Managers can only set status to: ${managerValidStatuses.join(', ')}` 
        });
      }
    }
    
    // Validate status progression logic
    const validTransitions = {
      'PREPARING': ['READY_FOR_PICKUP', 'CANCELLED'],
      'READY_FOR_PICKUP': ['ASSIGNED', 'CANCELLED'],
      'ASSIGNED': ['PICKED_UP', 'CANCELLED'],
      'PICKED_UP': ['ON_ROUTE'],
      'ON_ROUTE': ['DELIVERED'],
      'DELIVERED': [],
      'CANCELLED': []
    };
    
    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({ 
        msg: `Invalid status transition. Current status is ${order.status}. Valid next statuses are: ${validTransitions[order.status].join(', ') || 'none'}` 
      });
    }
    
    // Update order status
    order.status = status;
    
    // If order is delivered, set the delivered time
    if (status === 'DELIVERED') {
      order.deliveredTime = new Date();
    }
    
    // If order is delivered or cancelled, make delivery partner available again
    if (status === 'DELIVERED' || status === 'CANCELLED') {
      if (order.deliveryPartnerId) {
        const partnerId = order.deliveryPartnerId._id || order.deliveryPartnerId;
        const partner = await User.findById(partnerId);
        if (partner) {
          partner.isAvailable = true;
          partner.currentOrderId = null;
          await partner.save();
          
          // Get the WebSocket io instance
          const io = req.app.get('io');
          
          // Notify the delivery partner that they are now available
          if (io) {
            io.to(`partner_${partnerId}`).emit('availability_updated', {
              isAvailable: true,
              message: `You are now available for new orders`
            });
          }
        }
      }
    }
    
    await order.save();
    
    // Get the WebSocket io instance
    const io = req.app.get('io');
    
    // Notify via WebSocket
    if (io) {
      // Notify managers about the status update
      io.to('managers').emit('order_status_updated', {
        orderId: order.orderId,
        status: order.status,
        updatedBy: req.user.role,
        updatedById: req.user.id
      });
      
      // If there's a delivery partner assigned, notify them too
      if (order.deliveryPartnerId) {
        const partnerId = order.deliveryPartnerId._id || order.deliveryPartnerId;
        io.to(`partner_${partnerId}`).emit('order_status_updated', {
          orderId: order.orderId,
          status: order.status
        });
      }
    }
    
    res.json({
      order,
      message: `Order status updated to ${status} successfully`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/orders/partner/assigned
// @desc    Get orders assigned to the logged-in delivery partner
// @access  Private (Delivery Partner only)
router.get('/partner/assigned', auth, authorize('delivery_partner'), async (req, res) => {
  try {
    const orders = await Order.find({ deliveryPartnerId: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/orders/:orderId/prep-time
// @desc    Update order preparation time
// @access  Private (Manager only)
router.put('/:orderId/prep-time', auth, authorize('manager'), async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updatePrepTimeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ msg: error.details[0].message });
    }
    
    const { prepTime } = value;
    const orderId = req.params.orderId;
    
    // Check if order exists
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Only allow updating prep time for orders in PREPARING or READY_FOR_PICKUP status
    if (order.status !== 'PREPARING' && order.status !== 'READY_FOR_PICKUP') {
      return res.status(400).json({ 
        msg: `Cannot update prep time for orders in ${order.status} status. Order must be in PREPARING or READY_FOR_PICKUP status.` 
      });
    }
    
    // Update prep time
    order.prepTime = prepTime;
    
    // Recalculate dispatch time
    const { dispatchTime, estimatedDeliveryTime } = order.calculateDispatchTime();
    
    await order.save();
    
    res.json({
      order,
      dispatchTime,
      estimatedDeliveryTime,
      message: `Order preparation time updated to ${prepTime} minutes`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/orders/available-partners
// @desc    Get all available delivery partners
// @access  Private (Manager only)
router.get('/available-partners', auth, authorize('manager'), async (req, res) => {
  try {
    const availablePartners = await User.find({
      role: 'delivery_partner',
      availability: true,
      order: null
    }).select('name email');
    
    res.json(availablePartners);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
