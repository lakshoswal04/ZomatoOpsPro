// In-memory database for users and orders
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Helper function to generate MongoDB-compatible ObjectIds
const generateObjectId = () => new mongoose.Types.ObjectId().toString();

// In-memory data store
const db = {
  users: [
    {
      id: generateObjectId(), // MongoDB-compatible ObjectId
      name: 'Restaurant Manager',
      email: 'manager@zomato.com',
      password: bcrypt.hashSync('password123', 10),
      role: 'manager',
      isAvailable: true,
      currentOrderId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: generateObjectId(), // MongoDB-compatible ObjectId
      name: 'Delivery Partner 1',
      email: 'delivery1@zomato.com',
      password: bcrypt.hashSync('password123', 10),
      role: 'delivery_partner',
      isAvailable: true,
      currentOrderId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: generateObjectId(), // MongoDB-compatible ObjectId
      name: 'Delivery Partner 2',
      email: 'delivery2@zomato.com',
      password: bcrypt.hashSync('password123', 10),
      role: 'delivery_partner',
      isAvailable: true,
      currentOrderId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  orders: [],
  // Counter for generating order IDs
  orderIdCounter: 1
};

// Helper functions to interact with the in-memory database
const dbOperations = {
  // Add a MongoDB user to the in-memory database
  addMongoUserToMemory: (mongoUser) => {
    // Check if user already exists in memory
    const existingUser = db.users.find(u => u.id === mongoUser._id.toString() || u.email === mongoUser.email);
    
    if (existingUser) {
      console.log(`User ${mongoUser.email} already exists in memory, updating...`);
      // Update the existing user
      return dbOperations.updateUser(existingUser.id, {
        name: mongoUser.name,
        email: mongoUser.email,
        role: mongoUser.role,
        isAvailable: mongoUser.isAvailable,
        currentOrderId: mongoUser.currentOrderId
      });
    } else {
      console.log(`Adding MongoDB user ${mongoUser.email} to in-memory database`);
      // Create a new user in memory
      const newUser = {
        id: mongoUser._id.toString(),
        name: mongoUser.name,
        email: mongoUser.email,
        password: mongoUser.password, // Already hashed
        role: mongoUser.role,
        isAvailable: mongoUser.isAvailable || true,
        currentOrderId: mongoUser.currentOrderId || null,
        createdAt: mongoUser.createdAt || new Date(),
        updatedAt: mongoUser.updatedAt || new Date()
      };
      
      db.users.push(newUser);
      console.log(`User ${newUser.email} added to in-memory database with ID: ${newUser.id}`);
      return newUser;
    }
  },
  
  // User operations
  findUserByEmail: (email) => {
    return db.users.find(user => user.email === email);
  },
  
  findUserById: (id) => {
    console.log(`Finding user with ID: ${id}`);
    console.log(`Available users:`, db.users.map(u => ({ id: u.id, name: u.name, role: u.role })));
    
    // Try exact match first
    let user = db.users.find(user => user.id === id);
    
    // If not found and id is a string, try to find by string comparison
    if (!user && typeof id === 'string') {
      user = db.users.find(user => String(user.id) === id);
    }
    
    if (!user) {
      console.log(`User not found with ID: ${id}`);
    } else {
      console.log(`Found user: ${user.name} (${user.role})`);
    }
    
    return user;
  },
  
  updateUser: (id, updates) => {
    console.log(`Updating user with ID: ${id}`, updates);
    
    // Try exact match first
    let index = db.users.findIndex(user => user.id === id);
    
    // If not found and id is a string, try to find by string comparison
    if (index === -1 && typeof id === 'string') {
      index = db.users.findIndex(user => String(user.id) === id);
    }
    
    if (index !== -1) {
      db.users[index] = { ...db.users[index], ...updates, updatedAt: new Date() };
      console.log(`User updated successfully: ${db.users[index].name}`);
      return db.users[index];
    } else {
      console.error(`Failed to update user: User with ID ${id} not found`);
      return null;
    }
    return null;
  },
  
  getAvailableDeliveryPartners: () => {
    return db.users.filter(user => 
      user.role === 'delivery_partner' && user.isAvailable === true
    );
  },
  
  // Order operations
  createOrder: (orderData) => {
    const orderId = `ORD${String(db.orderIdCounter).padStart(4, '0')}`;
    db.orderIdCounter++;
    
    const newOrder = {
      ...orderData,
      orderId,
      status: 'PREP',
      deliveryPartnerId: null,
      dispatchTime: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    db.orders.push(newOrder);
    return newOrder;
  },
  
  findOrderById: (orderId) => {
    return db.orders.find(order => order.orderId === orderId);
  },
  
  updateOrder: (orderId, updates) => {
    const index = db.orders.findIndex(order => order.orderId === orderId);
    if (index !== -1) {
      db.orders[index] = { ...db.orders[index], ...updates, updatedAt: new Date() };
      return db.orders[index];
    }
    return null;
  },
  
  getAllOrders: () => {
    return [...db.orders];
  },
  
  getOrdersByDeliveryPartnerId: (deliveryPartnerId) => {
    return db.orders.filter(order => order.deliveryPartnerId === deliveryPartnerId);
  },
  
  // Calculate dispatch time (prepTime + ETA)
  calculateDispatchTime: (prepTime, eta = 15) => {
    const now = new Date();
    const prepTimeMs = prepTime * 60 * 1000; // Convert minutes to milliseconds
    const etaMs = eta * 60 * 1000; // Default ETA is 15 minutes
    
    return new Date(now.getTime() + prepTimeMs + etaMs);
  }
};

module.exports = { db, dbOperations };
