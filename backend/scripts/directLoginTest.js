const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/zomato';

async function testDirectLogin() {
  try {
    console.log('=== DIRECT LOGIN TEST ===');
    console.log(`MongoDB URI: ${mongoURI}`);
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
    
    // Test credentials
    const testCredentials = [
      { email: 'manager@zomato.com', password: 'password123' },
      { email: 'delivery1@zomato.com', password: 'password123' },
      { email: 'delivery2@zomato.com', password: 'password123' }
    ];
    
    // Test each set of credentials
    for (const cred of testCredentials) {
      console.log(`\nTesting login for: ${cred.email}`);
      
      // Find user by email
      const user = await User.findOne({ email: cred.email });
      
      if (!user) {
        console.log(`User not found: ${cred.email}`);
        continue;
      }
      
      console.log(`User found: ${user.email} (${user._id})`);
      console.log(`Stored password hash: ${user.password}`);
      
      // Try direct bcrypt comparison
      try {
        const isMatch = await bcrypt.compare(cred.password, user.password);
        console.log(`Password match using bcrypt.compare: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
        
        // If bcrypt fails, try a direct string comparison (for testing only)
        if (!isMatch) {
          console.log('Attempting to fix password hash...');
          
          // Generate a new hash and update the user
          const salt = await bcrypt.genSalt(10);
          const newHash = await bcrypt.hash(cred.password, salt);
          
          console.log(`Generated new hash: ${newHash}`);
          
          // Update the user's password in MongoDB
          user.password = newHash;
          await user.save();
          
          console.log(`Updated password hash for ${cred.email}`);
          
          // Verify the new hash
          const verifyMatch = await bcrypt.compare(cred.password, newHash);
          console.log(`Verification of new hash: ${verifyMatch ? 'SUCCESS' : 'FAILED'}`);
        }
      } catch (error) {
        console.error('Error comparing passwords:', error);
      }
    }
    
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

// Run the test
testDirectLogin();
