const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const { loginValidation, registerValidation, passwordChangeValidation } = require('../validation/auth');
const { dbOperations } = require('../config/db'); // Import dbOperations for in-memory sync

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  // Validate request body
  const { error } = registerValidation(req.body);
  if (error) return res.status(400).json({ msg: error.details[0].message });

  const { name, email, password, role } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      role,
      isAvailable: true,
      currentOrderId: null
    });

    // Save user to database (password will be hashed by pre-save middleware)
    await user.save();
    
    // Synchronize with in-memory database
    console.log('Synchronizing new user with in-memory database...');
    dbOperations.addMongoUserToMemory(user);

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'zomatosecret',
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isAvailable: user.isAvailable
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  console.log('Login request received:', req.body);
  
  // Validate request body
  const { error } = loginValidation(req.body);
  if (error) {
    console.log('Validation error:', error.details[0].message);
    return res.status(400).json({ msg: error.details[0].message });
  }

  const { email, password } = req.body;
  console.log('Attempting login for email:', email);

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check password
    console.log('Comparing password...');
    const isMatch = await user.comparePassword(password);
    console.log('Password match:', isMatch ? 'Yes' : 'No');
    
    if (!isMatch) {
      console.log('Password does not match for user:', email);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    
    // Synchronize with in-memory database
    console.log('Synchronizing logged-in user with in-memory database...');
    dbOperations.addMongoUserToMemory(user);

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'zomatosecret',
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isAvailable: user.isAvailable
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Synchronize with in-memory database
    console.log('Synchronizing fetched user with in-memory database...');
    dbOperations.addMongoUserToMemory(user);
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/auth/password
// @desc    Change user password
// @access  Private
router.put('/password', auth, async (req, res) => {
  // Validate request body
  const { error } = passwordChangeValidation(req.body);
  if (error) return res.status(400).json({ msg: error.details[0].message });

  const { currentPassword, newPassword } = req.body;

  try {
    // Get user from database
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
