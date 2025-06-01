const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');

// @route   GET api/users/delivery-partners
// @desc    Get all available delivery partners
// @access  Private (Manager only)
router.get('/delivery-partners', auth, authorize('manager'), async (req, res) => {
  try {
    // Find all available delivery partners from MongoDB
    const availablePartners = await User.find({
      role: 'delivery_partner',
      isAvailable: true
    }).select('_id name email isAvailable');
    
    // Return partners with consistent ID format
    const partners = availablePartners.map(partner => ({
      _id: partner._id,
      id: partner._id, // For backward compatibility
      name: partner.name,
      isAvailable: partner.isAvailable
    }));
    
    // Notify via WebSocket that delivery partners were fetched
    const io = req.app.get('io');
    if (io) {
      io.to('managers').emit('delivery_partners_fetched', { count: partners.length });
    }
    
    res.json(partners);
  } catch (err) {
    console.error('Error fetching delivery partners:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/availability
// @desc    Update delivery partner availability
// @access  Private (Delivery Partner only)
router.put('/availability', auth, authorize('delivery_partner'), async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    if (isAvailable === undefined) {
      return res.status(400).json({ msg: 'Availability status is required' });
    }
    
    // Find the user in MongoDB
    const user = await User.findById(req.user.id);
    
    // Check if user exists
    if (!user) {
      console.error(`User not found with id: ${req.user.id}`);
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if user has active orders
    if (user.currentOrderId && !isAvailable) {
      return res.status(400).json({ msg: 'Cannot change availability while having an active order' });
    }
    
    // Update availability
    user.isAvailable = isAvailable;
    await user.save();
    
    // Return updated user data without password
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAvailable: user.isAvailable,
      currentOrderId: user.currentOrderId
    };
    
    // Notify via WebSocket that delivery partner availability has changed
    const io = req.app.get('io');
    if (io) {
      // Notify managers about availability change
      io.to('managers').emit('delivery_partner_availability_changed', {
        partnerId: user._id,
        name: user.name,
        isAvailable: user.isAvailable
      });
      
      // Notify the specific delivery partner
      io.to(`partner_${user._id}`).emit('availability_updated', {
        isAvailable: user.isAvailable
      });
    }
    
    console.log('User availability updated successfully:', userData);
    res.json(userData);
  } catch (err) {
    console.error('Error updating availability:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/users/delivery-partners/all
// @desc    Get all delivery partners (available and unavailable)
// @access  Private (Manager only)
router.get('/delivery-partners/all', auth, authorize('manager'), async (req, res) => {
  try {
    // Find all delivery partners from MongoDB
    const allPartners = await User.find({
      role: 'delivery_partner'
    }).select('_id name email isAvailable');
    
    // Return partners with consistent ID format
    const partners = allPartners.map(partner => ({
      _id: partner._id,
      id: partner._id, // For backward compatibility
      name: partner.name,
      isAvailable: partner.isAvailable
    }));
    
    res.json(partners);
  } catch (err) {
    console.error('Error fetching all delivery partners:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
