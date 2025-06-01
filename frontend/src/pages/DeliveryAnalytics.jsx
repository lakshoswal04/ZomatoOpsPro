import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllOrders, getAvailableDeliveryPartners, getAllDeliveryPartners } from '../utils/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useSocket } from '../context/SocketContext';

const DeliveryAnalytics = () => {
  const { socket, connected } = useSocket();
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partnerStats, setPartnerStats] = useState([]);
  const [socketStatus, setSocketStatus] = useState(connected ? 'Connected' : 'Disconnected');
  const [timeStats, setTimeStats] = useState({
    avgPrepTime: 0,
    avgDeliveryTime: 0,
    avgTotalTime: 0
  });
  
  // Function to fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, allPartnersRes] = await Promise.all([
        getAllOrders(),
        getAllDeliveryPartners()
      ]);
      
      setOrders(ordersRes.data);
      setPartners(allPartnersRes.data);
      
      // Calculate statistics
      calculatePartnerStats(ordersRes.data, allPartnersRes.data);
      calculateTimeStats(ordersRes.data);
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate partner statistics
  const calculatePartnerStats = (orders, partners) => {
    // Create a map of all partners by ID for quick lookup
    const partnerLookup = {};
    partners.forEach(partner => {
      partnerLookup[partner._id || partner.id] = partner;
    });
    
    const stats = partners.map(partner => {
      const partnerOrders = orders.filter(o => {
        // Check for deliveryPartner or deliveryPartnerId
        const partnerRef = o.deliveryPartner || o.deliveryPartnerId;
        if (!partnerRef) return false;
        
        // Get the partner ID, handling both object and string references
        let partnerId;
        if (typeof partnerRef === 'object') {
          partnerId = partnerRef._id || partnerRef.id;
        } else {
          partnerId = partnerRef;
        }
        
        return partnerId === partner._id || partnerId === partner.id;
      });
      
      const deliveredOrders = partnerOrders.filter(o => o.status === 'DELIVERED');
      const cancelledOrders = partnerOrders.filter(o => o.status === 'CANCELLED');
      const inProgressOrders = partnerOrders.filter(o => 
        ['ASSIGNED', 'PICKED_UP', 'ON_ROUTE'].includes(o.status)
      );
      
      // Calculate average delivery time
      let avgDeliveryTime = 0;
      let hasEstimatedTimes = false;
      
      if (deliveredOrders.length > 0) {
        let totalDeliveryTime = 0;
        let ordersWithTimes = 0;
        
        deliveredOrders.forEach(o => {
          if (o.dispatchTime && o.deliveredTime) {
            const dispatchTime = new Date(o.dispatchTime);
            const deliveredTime = new Date(o.deliveredTime);
            const diffInMinutes = (deliveredTime - dispatchTime) / (1000 * 60);
            
            if (!isNaN(diffInMinutes) && diffInMinutes > 0) {
              totalDeliveryTime += diffInMinutes;
              ordersWithTimes++;
            }
          } else {
            // Use estimated time for orders without time data
            totalDeliveryTime += 30; // Default 30 minutes
            hasEstimatedTimes = true;
            ordersWithTimes++;
          }
        });
        
        if (ordersWithTimes > 0) {
          avgDeliveryTime = totalDeliveryTime / ordersWithTimes;
        }
      }
      
      return {
        id: partner._id,
        name: partner.name,
        isAvailable: partner.isAvailable,
        totalOrders: partnerOrders.length,
        deliveredOrders: deliveredOrders.length,
        cancelledOrders: cancelledOrders.length,
        inProgressOrders: inProgressOrders.length,
        avgDeliveryTime,
        hasEstimatedDeliveryTime: hasEstimatedTimes
      };
    });
    
    setPartnerStats(stats);
  };

  // Calculate time statistics
  const calculateTimeStats = (orders) => {
    // Calculate average prep time
    const ordersWithPrepTime = orders.filter(o => o.prepTime);
    const avgPrepTime = ordersWithPrepTime.length > 0 
      ? ordersWithPrepTime.reduce((sum, o) => sum + o.prepTime, 0) / ordersWithPrepTime.length
      : 0;
    
    // Calculate average delivery time
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
    
    // Calculate average total time (from order creation to delivery)
    const completedOrdersWithTimes = orders.filter(o => 
      o.status === 'DELIVERED' && o.createdAt && o.deliveredTime
    );
    
    let avgTotalTime = 0;
    if (completedOrdersWithTimes.length > 0) {
      const totalTime = completedOrdersWithTimes.reduce((sum, o) => {
        const createdTime = new Date(o.createdAt);
        const deliveredTime = new Date(o.deliveredTime);
        const diffInMinutes = (deliveredTime - createdTime) / (1000 * 60);
        return sum + diffInMinutes;
      }, 0);
      
      avgTotalTime = totalTime / completedOrdersWithTimes.length;
    }
    
    setTimeStats({
      avgPrepTime,
      avgDeliveryTime,
      avgTotalTime
    });
  };

  // Load data on component mount
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
    
    // Listen for order status updates
    socket.on('order_status_updated', (data) => {
      console.log('Order status updated:', data);
      fetchData(); // Refresh data when order status changes
    });
    
    // Listen for delivery completion events specifically for analytics
    socket.on('delivery_completed', (data) => {
      console.log('Delivery completed event received for analytics:', data);
      fetchData(); // Refresh analytics data when an order is delivered
    });
    
    // Clean up event listeners on unmount
    return () => {
      socket.off('order_status_updated');
      socket.off('delivery_completed');
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Delivery Partner Analytics</h1>
        
        <div className="flex items-center space-x-4">
          <div className={`text-sm px-3 py-1 rounded-full ${connected ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:bg-opacity-20 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:bg-opacity-20 dark:text-red-100'}`}>
            <span className="mr-1">•</span>
            {socketStatus}
          </div>
          <Link to="/manager" className="bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 px-4 py-2 rounded-lg transition duration-200 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Dashboard
          </Link>
          
          <button 
            onClick={fetchData} 
            className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700 px-4 py-2 rounded-lg transition duration-200 flex items-center"
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-primary-500 dark:border-primary-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Avg. Preparation Time</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{timeStats.avgPrepTime.toFixed(1)} min</p>
            </div>
            <div className="bg-primary-100 dark:bg-primary-800 dark:bg-opacity-30 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-secondary-500 dark:border-secondary-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Avg. Delivery Time</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{timeStats.avgDeliveryTime.toFixed(1)} min</p>
            </div>
            <div className="bg-secondary-100 dark:bg-secondary-800 dark:bg-opacity-30 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary-600 dark:text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-accent-500 dark:border-accent-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Avg. Total Order Time</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{timeStats.avgTotalTime.toFixed(1)} min</p>
            </div>
            <div className="bg-accent-100 dark:bg-accent-800 dark:bg-opacity-30 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent-600 dark:text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delivery Partner Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/30 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Delivery Partner Performance</h2>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          * Indicates estimated delivery time where precise timestamps were not available
        </div>
        
        {partnerStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Partner Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delivered</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">In Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cancelled</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg. Delivery Time</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {partnerStats.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-secondary-100 dark:bg-secondary-800 dark:bg-opacity-30 text-secondary-600 dark:text-secondary-400 flex items-center justify-center mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{partner.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${partner.isAvailable ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:bg-opacity-30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:bg-opacity-30 dark:text-red-400'}`}>
                        {partner.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {partner.totalOrders}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {partner.deliveredOrders}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {partner.inProgressOrders}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {partner.cancelledOrders}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {partner.avgDeliveryTime > 0 
                        ? `${partner.avgDeliveryTime.toFixed(1)} min${partner.hasEstimatedDeliveryTime ? '*' : ''}` 
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No delivery partner data available
          </div>
        )}
      </div>
      
      {/* Partner Workload Distribution */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Partner Workload Distribution</h2>
        
        {partnerStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partnerStats.map((partner) => (
              <div key={partner.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{partner.name}</h3>
                    <span className={`text-xs font-semibold rounded px-1.5 py-0.5 ${partner.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {partner.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{partner.totalOrders} orders</p>
                    <p className="text-xs text-gray-500">{partner.deliveredOrders} delivered</p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Workload</span>
                    <span>{Math.min(100, Math.round((partner.totalOrders / (Math.max(...partnerStats.map(p => p.totalOrders)) || 1)) * 100))}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-500 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, Math.round((partner.totalOrders / (Math.max(...partnerStats.map(p => p.totalOrders)) || 1)) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No delivery partner data available
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryAnalytics;