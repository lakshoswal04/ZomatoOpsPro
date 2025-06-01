import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllOrders, getAvailableDeliveryPartners } from '../utils/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext';

const ManagerDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketStatus, setSocketStatus] = useState(connected ? 'Connected' : 'Disconnected');
  
  // Check if user is authenticated and has the correct role
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (!user) {
      console.error('User object is null');
      navigate('/login');
      return;
    }
    
    // Default to manager role if missing
    const userRole = user.role || 'manager';
    console.log('User role:', userRole);
    
    if (userRole !== 'manager') {
      console.error('Unauthorized access attempt - not a manager');
      navigate('/login');
    }
  }, [user, isAuthenticated, navigate]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    assignedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    availablePartners: 0,
    avgPrepTime: 0,
    avgDeliveryTime: 0,
    totalRevenue: 0
  });
  
  // Function to fetch orders and delivery partners
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, partnersRes] = await Promise.all([
        getAllOrders(),
        getAvailableDeliveryPartners()
      ]);
      
      setOrders(ordersRes.data);
      setDeliveryPartners(partnersRes.data);
      
      // Calculate statistics
      calculateStats(ordersRes.data, partnersRes.data);
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate dashboard statistics
  const calculateStats = (orders, partners) => {
    const totalOrders = orders.length;
    const preparingOrders = orders.filter(o => o.status === 'PREPARING').length;
    const readyOrders = orders.filter(o => o.status === 'READY_FOR_PICKUP').length;
    const assignedOrders = orders.filter(o => ['ASSIGNED', 'PICKED_UP', 'ON_ROUTE'].includes(o.status)).length;
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
    
    // Calculate average prep time
    const ordersWithPrepTime = orders.filter(o => o.prepTime);
    const avgPrepTime = ordersWithPrepTime.length > 0 
      ? ordersWithPrepTime.reduce((sum, o) => sum + o.prepTime, 0) / ordersWithPrepTime.length
      : 0;
    
    // Calculate average delivery time for delivered orders
    const deliveredOrdersWithTimes = orders.filter(o => 
      o.status === 'DELIVERED' && o.dispatchTime && o.deliveredTime
    );
    
    let avgDeliveryTime = 0;
    if (deliveredOrdersWithTimes.length > 0) {
      const totalDeliveryTime = deliveredOrdersWithTimes.reduce((sum, o) => {
        const dispatchTime = new Date(o.dispatchTime);
        const deliveredTime = new Date(o.deliveredTime);
        const diffInMinutes = (deliveredTime - dispatchTime) / (1000 * 60);
        return sum + diffInMinutes;
      }, 0);
      
      avgDeliveryTime = totalDeliveryTime / deliveredOrdersWithTimes.length;
    }
    
    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, o) => {
      if (o.totalAmount) {
        return sum + (typeof o.totalAmount === 'number' ? o.totalAmount : parseFloat(o.totalAmount));
      }
      return sum;
    }, 0);
    
    setStats({
      totalOrders,
      preparingOrders,
      readyOrders,
      assignedOrders,
      deliveredOrders,
      cancelledOrders,
      availablePartners: partners.length,
      avgPrepTime,
      avgDeliveryTime,
      totalRevenue
    });
  };

  // Load orders and delivery partners on component mount
  useEffect(() => {
    fetchData();
    
    // Set up socket connection status
    if (connected) {
      setSocketStatus('Connected');
    } else {
      setSocketStatus('Disconnected');
    }
  }, [connected]);
  
  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    // Listen for delivery partner availability changes
    socket.on('delivery_partner_availability_changed', (data) => {
      console.log('Delivery partner availability changed:', data);
      fetchData(); // Refresh data when availability changes
    });
    
    // Listen for order status updates
    socket.on('order_status_updated', (data) => {
      console.log('Order status updated:', data);
      fetchData(); // Refresh data when order status changes
    });
    
    // Listen for order assignment updates
    socket.on('order_assigned_to_partner', (data) => {
      console.log('Order assigned to partner:', data);
      fetchData(); // Refresh data when order is assigned
    });
    
    // Clean up event listeners on unmount
    return () => {
      socket.off('delivery_partner_availability_changed');
      socket.off('order_status_updated');
      socket.off('order_assigned_to_partner');
    };
  }, [socket]);
  
  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Restaurant Manager Dashboard</h1>
        
        <div className="flex items-center space-x-4">
          <div className={`text-sm px-3 py-1 rounded-full ${connected ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:bg-opacity-20 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:bg-opacity-20 dark:text-red-100'}`}>
            <span className="mr-1">•</span>
            {socketStatus}
          </div>
          
          <button 
            onClick={fetchData} 
            className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700 px-4 py-2 rounded-lg transition duration-200 flex items-center"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Dashboard Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        
        <Link to="/manager/create-order" className="bg-secondary-600 text-white p-4 rounded-lg shadow-md hover:bg-secondary-700 dark:bg-secondary-700 dark:hover:bg-secondary-800 dark:ring-1 dark:ring-secondary-500 transition duration-200 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span>Create Order</span>
        </Link>
        
        <Link to="/manager/orders" className="bg-accent-600 text-white p-4 rounded-lg shadow-md hover:bg-accent-700 dark:bg-accent-700 dark:hover:bg-accent-800 dark:ring-1 dark:ring-accent-500 transition duration-200 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
          <span>Order Management</span>
        </Link>
        
        <Link to="/manager/analytics" className="bg-amber-600 text-white p-4 rounded-lg shadow-md hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800 dark:ring-1 dark:ring-amber-500 transition duration-200 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          <span>Analytics</span>
        </Link>
        
        <Link to="/manager/partners" className="bg-green-600 text-white p-4 rounded-lg shadow-md hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 dark:ring-1 dark:ring-green-500 transition duration-200 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0z" />
            <path fillRule="evenodd" d="M6 18a9 9 0 010-18H0A9 9 0 019 9h6a9 9 0 010 18z" clipRule="evenodd" />
          </svg>
          <span>Partners</span>
        </Link>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-primary-500 dark:border-primary-400">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Orders</h2>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.totalOrders}</p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-800 dark:bg-opacity-30 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <div>
              <span className="text-green-500 font-medium">{stats.deliveredOrders}</span>
              <span className="text-gray-500 ml-1">Delivered</span>
            </div>
            <div>
              <span className="text-amber-500 font-medium">{stats.preparingOrders + stats.readyOrders}</span>
              <span className="text-gray-500 ml-1">In Progress</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-secondary-500 dark:border-secondary-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Available Partners</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.availablePartners}</p>
            </div>
            <div className="bg-primary-100 dark:bg-primary-800 dark:bg-opacity-30 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary-600 dark:text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <div>
              <span className="text-blue-500 dark:text-blue-400 font-medium">{stats.assignedOrders}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Assigned Orders</span>
            </div>
            <div>
              <span className="text-purple-500 dark:text-purple-400 font-medium">{stats.readyOrders}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Ready for Pickup</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-accent-500 dark:border-accent-400">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Avg. Preparation Time</h2>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.avgPrepTime.toFixed(1)} min</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-800 dark:bg-opacity-30 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent-600 dark:text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <div>
              <span className="text-orange-500 dark:text-orange-400 font-medium">{stats.avgDeliveryTime.toFixed(1)}</span>
              <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Avg. Delivery Time</h2>
            </div>
            <div>
              <span className="text-red-500 dark:text-red-400 font-medium">{stats.cancelledOrders}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Cancelled</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-green-500 dark:border-green-400">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Revenue</h2>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">₹{stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-green-100 dark:bg-green-800 dark:bg-opacity-30 p-3 rounded-full">
              <div className="h-6 w-6 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-lg">
                ₹
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <div>
              <span className="text-green-500 dark:text-green-400 font-medium">{stats.deliveredOrders}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Completed Orders</span>
            </div>
            <div>
              <span className="text-blue-500 dark:text-blue-400 font-medium">
                {stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : '0.00'}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Avg. Order Value</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Orders Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/30 p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Recent Orders</h2>
          <Link to="/manager/orders" className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium flex items-center">
            View All
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
        
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.orderId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.orderId}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{order.customerName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{order.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:bg-opacity-30 dark:text-green-400' : ''}
                        ${order.status === 'PREPARING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:bg-opacity-30 dark:text-yellow-400' : ''}
                        ${order.status === 'READY_FOR_PICKUP' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:bg-opacity-30 dark:text-blue-400' : ''}
                        ${order.status === 'ASSIGNED' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:bg-opacity-30 dark:text-indigo-400' : ''}
                        ${order.status === 'PICKED_UP' || order.status === 'ON_ROUTE' ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:bg-opacity-30 dark:text-purple-400' : ''}
                        ${order.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:bg-opacity-30 dark:text-red-400' : ''}
                      `}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      ₹{order.totalAmount ? 
                        (typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : order.totalAmount) : 
                        '0.00'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <Link to="/manager/orders" className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-3">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">No orders available</div>
        )}
      </div>
      
      {/* Delivery Partner Status */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Available Delivery Partners</h2>
          <div className="flex space-x-4">
            <Link to="/manager/partners" className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium flex items-center">
              View All Partners
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link to="/manager/analytics" className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium flex items-center">
              View Analytics
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
        
        {deliveryPartners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveryPartners.map((partner) => (
              <div key={partner._id || partner.id} className="border border-gray-200 rounded-lg p-4 flex items-center">
                <div className="h-10 w-10 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                    Available
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">No delivery partners available</div>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;
