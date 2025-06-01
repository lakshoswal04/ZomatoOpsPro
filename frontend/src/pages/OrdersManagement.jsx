import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllOrders } from '../utils/api.js';
import OrdersTable from '../components/OrdersTable.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext.jsx';

const OrdersManagement = () => {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketStatus, setSocketStatus] = useState(connected ? 'Connected' : 'Disconnected');
  
  // Function to fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await getAllOrders();
      setOrders(response.data);
    } catch (err) {
      setError('Failed to load orders. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load orders on component mount
  useEffect(() => {
    fetchOrders();
    
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
    
    // Listen for order status updates
    socket.on('order_status_updated', (data) => {
      console.log('Order status updated:', data);
      fetchOrders(); // Refresh data when order status changes
    });
    
    // Listen for order assignment updates
    socket.on('order_assigned_to_partner', (data) => {
      console.log('Order assigned to partner:', data);
      fetchOrders(); // Refresh data when order is assigned
    });
    
    // Clean up event listeners on unmount
    return () => {
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
    <div className="page-container bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Link 
            to="/manager" 
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-lg transition duration-200 flex items-center mr-4"
            aria-label="Back to Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link 
            to="/manager/create-order" className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center shadow-md hover:shadow-lg transform hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Order
          </Link>
          
          <button 
            onClick={fetchOrders} 
            className="bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center shadow-md hover:shadow-lg transform hover:scale-105"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 shadow-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}
      
      <div className="card-gradient p-6">
        <OrdersTable 
          orders={orders} 
          refreshOrders={fetchOrders} 
          userRole={user?.role || 'manager'} 
          onOrderUpdate={fetchOrders}
        />
      </div>
    </div>
  );
};

export default OrdersManagement;