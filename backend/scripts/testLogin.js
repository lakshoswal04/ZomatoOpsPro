const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/zomato';

// Test credentials
const testEmail = 'manager@zomato.com';
const testPassword = 'password123';

async function testLogin() {
  try {
    console.log('='.repeat(50));
    console.log('LOGIN TEST SCRIPT');
    console.log('='.repeat(50));
    console.log(`MongoDB URI: ${mongoURI}`);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
    
    console.log(`Searching for user with email: ${testEmail}`);
    
    // Find the user
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.log('User not found in the database!');
      
      // List all users to see what's available
      const allUsers = await User.find({}, 'email role');
      console.log('Available users in the database:');
      if (allUsers.length === 0) {
        console.log('No users found in the database!');
      } else {
        allUsers.forEach(u => {
          console.log(`- ${u.email} (${u.role})`);
        });
      }
      return;
    }
    
    console.log('User found:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    
    // Test password
    console.log('Testing password authentication...');
    const isMatch = await user.comparePassword(testPassword);
    
    if (isMatch) {
      console.log('Password is correct! Authentication successful.');
    } else {
      console.log('Password is incorrect! Authentication failed.');
      
      // Try direct bcrypt compare as a fallback
      const bcryptMatch = await bcrypt.compare(testPassword, user.password);
      if (bcryptMatch) {
        console.log('Direct bcrypt comparison succeeded!');
        console.log('   The issue might be with the comparePassword method in your User model.');
      } else {
        console.log('Direct bcrypt comparison also failed.');
        console.log(`   Stored password hash: ${user.password}`);
      }
    }
    
  } catch (error) {
    console.error('Error during login test:', error);
  } finally {
    if (mongoose.connection.readyState) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    console.log('='.repeat(50));
  }
}

// Run the test
testLogin();
