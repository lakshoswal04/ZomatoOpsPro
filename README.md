Zomato Ops Pro

A logistics coordination platform for restaurant managers and delivery partners built with the MERN stack (MongoDB, Express, React, Node.js).

Overview

Zomato Ops Pro is a comprehensive logistics management system designed to streamline the coordination between restaurant managers and delivery partners. The platform enables restaurant managers to create orders, assign delivery partners, and track order status in real-time. Delivery partners can view their assigned orders, update order status, and toggle their availability.

Deployment Link
-https://zomato-ops-pro2.netlify.app/

Features

For Restaurant Managers
- Create new orders with multiple items
- View all orders in a tabular format
- Assign available delivery partners to orders
- Track order status with visual progress indicators
- Real-time updates via polling

- ![image](https://github.com/user-attachments/assets/4658d765-914f-4119-8fd8-cc9b81237c10)
- ![image](https://github.com/user-attachments/assets/da97ba5c-2e33-4d36-93ba-216bb18d2e05)



For Delivery Partners
- View assigned orders with detailed information
- Update order status sequentially (PREP → PICKED → ON_ROUTE → DELIVERED)
- Toggle availability status (cannot toggle if active orders exist)
- View completed orders history

- ![image](https://github.com/user-attachments/assets/c2d08057-c8cc-4484-8d8b-0355df76ec79)
- ![image](https://github.com/user-attachments/assets/9e7e4881-605a-454e-96e4-3d5bdc30d5cb)


Tech Stack

Frontend
- React.js with React Router for navigation
- Context API for state management (AuthContext)
- Axios for API requests
- Tailwind CSS for styling
- Protected routes for role-based access control

Backend
- Node.js with Express
- MongoDB for data storage
- JWT authentication
- RESTful API architecture

Components

Core Components
- OrderTracker: Visual progress indicator for order status
- CreateOrderForm: Form for restaurant managers to create new orders
- OrdersTable: Tabular display of orders for managers
- OrderCard: Card-style order display for delivery partners
- LoadingSpinner: Reusable loading indicator

Pages
- Login: Authentication page with role-based redirection
- ManagerDashboard: Dashboard for restaurant managers
- DeliveryPartnerDashboard: Dashboard for delivery partners
- NotFound: 404 page for unmatched routes

Installation and Setup

Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or Atlas)

Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```
4. Start the development server:
   ```
   npm run dev
   ```

Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

   API Endpoints

Authentication
- `POST /api/auth/login`: User login
- `GET /api/auth/user`: Get current user data

Orders
- `GET /api/orders`: Get all orders (for managers)
- `POST /api/orders`: Create a new order
- `GET /api/orders/:id`: Get order by ID
- `PUT /api/orders/:id/assign`: Assign delivery partner to order
- `PUT /api/orders/:id/status`: Update order status
- `GET /api/orders/partner/assigned`: Get orders assigned to current delivery partner

Users
- `GET /api/users/delivery-partners`: Get available delivery partners
- `PUT /api/users/availability`: Update delivery partner availability


   Demo Credentials

- Restaurant Manager:
  - Email: manager@zomato.com
  - Password: password123

- Delivery Partner:
  - Email: delivery1@zomato.com
  - Password: password123

