const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Set environment variables manually if they're not loaded from .env
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb+srv://lakshoswal04:lakshoswal040306@cluster0.exbg41d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = '654812a3f89630c69d9476103c1f616093202a9b72557bc4d6c376f76b0632086abd2203ed5c0b9b54bac66720d9765cde3f2abbe06f50c57ca34818da9f30d8f';
}

if (!process.env.PORT) {
  process.env.PORT = 5000;
}

// Debug: Log environment variables
console.log('MongoDB URI:', process.env.MONGO_URI);
console.log('JWT Secret exists:', !!process.env.JWT_SECRET);
console.log('PORT:', process.env.PORT);

// Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

// Import models
const User = require('./models/User');

// Initialize express app
const app = express();

// Create HTTP server and socket.io instance
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join rooms based on user role
  socket.on('join', (data) => {
    if (data.role === 'manager') {
      socket.join('managers');
      console.log(`Manager ${socket.id} joined managers room`);
    } else if (data.role === 'delivery_partner') {
      socket.join('delivery_partners');
      socket.join(`partner_${data.userId}`);
      console.log(`Delivery partner ${data.userId} joined delivery_partners room`);
    }
  });
  
  // Handle delivery completion event for analytics
  socket.on('delivery_completed', async (data) => {
    console.log('Delivery completed event received:', data);
    
    // Broadcast to managers for analytics update
    io.to('managers').emit('delivery_completed', {
      orderId: data.orderId,
      partnerId: data.partnerId,
      deliveredTime: data.deliveredTime
    });
    
    // Also notify the specific partner's room
    if (data.partnerId) {
      io.to(`partner_${data.partnerId}`).emit('delivery_completed', {
        orderId: data.orderId,
        deliveredTime: data.deliveredTime
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to our routes
app.set('io', io);

// Middleware
// Remove this line
// app.use(cors());

// Keep only this specific CORS configuration
app.use(cors({
  origin: ['https://zomato-ops-pro2.netlify.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
  connectTimeoutMS: 10000, // Timeout after 10 seconds instead of default
})
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit with error if MongoDB connection fails
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Zomato Ops Pro API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server is running`);
});
