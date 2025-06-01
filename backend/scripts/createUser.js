const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// MongoDB connection string - use your actual MongoDB URI from your .env file
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/zomato';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for user creation'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Function to create users
async function createUsers() {
  try {
    // Check if users already exist to avoid duplicates
    const existingManager = await User.findOne({ email: 'manager@zomato.com' });
    const existingPartner1 = await User.findOne({ email: 'delivery1@zomato.com' });
    const existingPartner2 = await User.findOne({ email: 'delivery2@zomato.com' });
    
    // Create manager if doesn't exist
    if (!existingManager) {
      const managerPassword = await bcrypt.hash('password123', 10);
      const manager = new User({
        name: 'Restaurant Manager',
        email: 'manager@zomato.com',
        password: managerPassword,
        role: 'manager',
        isAvailable: true
      });
      
      await manager.save();
      console.log('Manager user created successfully');
    } else {
      console.log('Manager user already exists');
    }
    
    // Create delivery partner 1 if doesn't exist
    if (!existingPartner1) {
      const partner1Password = await bcrypt.hash('password123', 10);
      const partner1 = new User({
        name: 'Delivery Partner 1',
        email: 'delivery1@zomato.com',
        password: partner1Password,
        role: 'delivery_partner',
        isAvailable: true
      });
      
      await partner1.save();
      console.log('Delivery Partner 1 created successfully');
    } else {
      console.log('Delivery Partner 1 already exists');
    }
    
    // Create delivery partner 2 if doesn't exist
    if (!existingPartner2) {
      const partner2Password = await bcrypt.hash('password123', 10);
      const partner2 = new User({
        name: 'Delivery Partner 2',
        email: 'delivery2@zomato.com',
        password: partner2Password,
        role: 'delivery_partner',
        isAvailable: true
      });
      
      await partner2.save();
      console.log('Delivery Partner 2 created successfully');
    } else {
      console.log('Delivery Partner 2 already exists');
    }
    
    console.log('User creation process completed');
    
    // Display all users for verification
    const allUsers = await User.find({}, 'name email role isAvailable');
    console.log('All users in the database:');
    console.table(allUsers);
    
  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
createUsers();
