const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/zomato';

// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('MongoDB connected');
  
  try {
    // Create a new password hash
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Update all users with the new password
    const result = await User.updateMany({}, { $set: { password: passwordHash } });
    
    console.log(`Updated ${result.modifiedCount} users with new password`);
    console.log('All users now have password: password123');
    
    // List all users
    const users = await User.find({}, 'email role');
    console.log('\nAvailable users:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
