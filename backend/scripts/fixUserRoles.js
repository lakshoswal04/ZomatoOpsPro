const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/zomato';

async function fixUserRoles() {
  try {
    console.log('=== FIXING USER ROLES ===');
    console.log(`MongoDB URI: ${mongoURI}`);
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
    
    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users in the database`);
    
    // Fix each user
    for (const user of users) {
      console.log(`\nChecking user: ${user.email}`);
      
      let updated = false;
      
      // Ensure role is set correctly
      if (!user.role || (user.role !== 'manager' && user.role !== 'delivery_partner')) {
        // Set default role based on email
        if (user.email === 'manager@zomato.com') {
          user.role = 'manager';
        } else {
          user.role = 'delivery_partner';
        }
        updated = true;
        console.log(`Updated role to: ${user.role}`);
      }
      
      // Ensure name is set
      if (!user.name) {
        user.name = user.email.split('@')[0];
        updated = true;
        console.log(`Set name to: ${user.name}`);
      }
      
      // Ensure isAvailable is set
      if (user.isAvailable === undefined) {
        user.isAvailable = true;
        updated = true;
        console.log('Set isAvailable to: true');
      }
      
      // Save if updated
      if (updated) {
        await user.save();
        console.log(`User ${user.email} updated successfully`);
      } else {
        console.log(`User ${user.email} already has correct data`);
      }
      
      // Print user data
      console.log('User data:', {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAvailable: user.isAvailable
      });
    }
    
    console.log('\nAll users have been fixed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    
    // Force exit to ensure the script completes
    process.exit(0);
  }
}

// Run the function
fixUserRoles();
