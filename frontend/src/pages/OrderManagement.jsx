import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllOrders, getAvailableDeliveryPartners } from '../utils/api.js';
import OrdersTable from '../components/OrdersTable.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load orders and delivery partners on component mount
  useEffect(() => {
    fetchData();
  }, []);
  
  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 dark:bg-gray-900 rounded-xl">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6 dark:border-b dark:border-gray-700 pb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Order Management</h1>
        
        <div className="flex items-center space-x-4">
          <Link to="/manager" className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white px-4 py-2 rounded-lg transition duration-200 flex items-center font-medium shadow-sm dark:shadow-gray-900/20 border border-transparent dark:border-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Dashboard
          </Link>
          
          <Link to="/manager/create-order" className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center font-medium shadow-sm dark:shadow-primary-900/30 border border-transparent dark:border-primary-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Order
          </Link>
          
          <button 
            onClick={fetchData} 
            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center font-medium shadow-sm dark:shadow-blue-900/30 border border-transparent dark:border-blue-500"
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
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4 shadow-sm dark:shadow-red-900/20">
          {error}
        </div>
      )}
      
      {/* Orders table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/30 overflow-hidden border border-gray-100 dark:border-gray-700">
        <OrdersTable 
          orders={orders} 
          availablePartners={deliveryPartners} 
          onRefresh={() => fetchData()}
          userRole="manager"
        />
      </div>
    </div>
  );
};

export default OrderManagement;