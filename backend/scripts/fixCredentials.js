const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { db, dbOperations } = require('../config/db');
require('dotenv').config();

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/zomato';

async function fixCredentials() {
  try {
    console.log('==================================================');
    console.log('CREDENTIAL FIXING SCRIPT');
    console.log('==================================================');
    console.log(`MongoDB URI: ${mongoURI}`);
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
    
    // Get all users from MongoDB
    const mongoUsers = await User.find({});
    console.log(`Found ${mongoUsers.length} users in MongoDB`);
    
    // Get all users from in-memory database
    console.log(`Found ${db.users.length} users in in-memory database`);
    
    // Create a new password hash that will be the same for all users
    const newPassword = 'password123';
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    console.log('Updating all users with consistent password...');
    
    // Update MongoDB users
    for (const user of mongoUsers) {
      user.password = newPasswordHash;
      await user.save();
      console.log(`Updated MongoDB user: ${user.email} (${user._id})`);
    }
    
    // Update in-memory users
    for (const user of db.users) {
      user.password = newPasswordHash;
      console.log(`Updated in-memory user: ${user.email} (${user.id})`);
    }
    
    // Verify the updates in MongoDB
    const verifiedUsers = await User.find({});
    console.log('\nVerifying MongoDB users after update:');
    for (const user of verifiedUsers) {
      // Test password verification
      const isMatch = await bcrypt.compare(newPassword, user.password);
      console.log(`- ${user.email}: Password verification ${isMatch ? 'SUCCESSFUL' : 'FAILED'}`);
    }
    
    console.log('\nAll users updated with password: password123');
    console.log('You should now be able to log in with any user using this password');
    
    // List all available users
    console.log('\nAvailable users:');
    mongoUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
    
    // Wait a moment to ensure all operations complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.error('Error fixing credentials:', error);
  } finally {
    if (mongoose.connection.readyState) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    console.log('==================================================');
    // Force exit to ensure the script completes
    process.exit(0);
  }
}

// Run the function
fixCredentials();
