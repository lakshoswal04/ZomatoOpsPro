import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllOrders, getAvailableDeliveryPartners } from '../utils/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useSocket } from '../context/SocketContext';

const PartnerAnalytics = () => {
  const { socket, connected } = useSocket();
  const [orders, setOrders] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketStatus, setSocketStatus] = useState(connected ? 'Connected' : 'Disconnected');
  const [partnerStats, setPartnerStats] = useState([]);
  
  // Function to fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, partnersRes] = await Promise.all([
        getAllOrders(),
        getAvailableDeliveryPartners()
      ]);
      
      setOrders(ordersRes.data);
      setDeliveryPartners(partnersRes.data);
      
      // Calculate partner statistics
      calculatePartnerStats(ordersRes.data, partnersRes.data);
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics for each delivery partner
  const calculatePartnerStats = (orders, partners) => {
    // Create a map to store partner stats
    const statsMap = {};
    
    // Initialize stats for each partner
    partners.forEach(partner => {
      statsMap[partner._id || partner.id] = {
        id: partner._id || partner.id,
        name: partner.name,
        totalOrders: 0,
        completedOrders: 0,
        inProgressOrders: 0,
        avgDeliveryTime: 0,
        totalDeliveryTime: 0,
        isAvailable: partner.isAvailable || false,
        workloadPercentage: 0,
        workloadStatus: 'Low'
      };
    });
    
    // Create a map of all partners by ID for quick lookup
    const partnerLookup = {};
    partners.forEach(partner => {
      partnerLookup[partner._id || partner.id] = partner;
    });
    
    // Process orders to calculate stats
    orders.forEach(order => {
      // Check for deliveryPartner or deliveryPartnerId
      const partnerRef = order.deliveryPartner || order.deliveryPartnerId;
      if (!partnerRef) return;
      
      // Get the partner ID, handling both object and string references
      let partnerId;
      if (typeof partnerRef === 'object') {
        partnerId = partnerRef._id || partnerRef.id;
      } else {
        partnerId = partnerRef;
      }
      
      if (!partnerId) return;
      
      // Skip orders with partners that don't exist in our current partners list
      // This prevents "Unknown Partner" entries
      if (!statsMap[partnerId] && !partnerLookup[partnerId]) {
        return;
      }
      
      // If this partner isn't in our stats map but exists in our lookup, add them
      if (!statsMap[partnerId] && partnerLookup[partnerId]) {
        const partner = partnerLookup[partnerId];
        statsMap[partnerId] = {
          id: partnerId,
          name: partner.name,
          totalOrders: 0,
          completedOrders: 0,
          inProgressOrders: 0,
          avgDeliveryTime: 0,
          totalDeliveryTime: 0,
          isAvailable: partner.isAvailable || false,
          workloadPercentage: 0,
          workloadStatus: 'Low'
        };
      }
      
      // Increment total orders
      statsMap[partnerId].totalOrders++;
      
      // Check order status
      if (order.status === 'DELIVERED') {
        statsMap[partnerId].completedOrders++;
        
        // Calculate delivery time if available
        if (order.dispatchTime && order.deliveredTime) {
          const dispatchTime = new Date(order.dispatchTime);
          const deliveredTime = new Date(order.deliveredTime);
          const diffInMinutes = (deliveredTime - dispatchTime) / (1000 * 60);
          
          if (!isNaN(diffInMinutes) && diffInMinutes > 0) {
            statsMap[partnerId].totalDeliveryTime += diffInMinutes;
            console.log(`Added delivery time for order ${order.orderId}: ${diffInMinutes} minutes`);
          }
        } else if (order.status === 'DELIVERED') {
          // If order is delivered but missing times, estimate with a default value
          // This ensures we have some data for avg delivery time calculation
          console.log(`Order ${order.orderId} is delivered but missing time data, using estimated value`);
          statsMap[partnerId].totalDeliveryTime += 30; // Default 30 minutes if times are missing
          statsMap[partnerId].hasEstimatedTimes = true;
        }
      } else if (['ASSIGNED', 'PICKED_UP', 'ON_ROUTE'].includes(order.status)) {
        statsMap[partnerId].inProgressOrders++;
      }
    });
    
    // Calculate average delivery time and workload metrics
    Object.values(statsMap).forEach(partner => {
      // Calculate average delivery time
      if (partner.completedOrders > 0 && partner.totalDeliveryTime > 0) {
        partner.avgDeliveryTime = partner.totalDeliveryTime / partner.completedOrders;
        // Add indicator if times were estimated
        if (partner.hasEstimatedTimes) {
          partner.hasEstimatedDeliveryTime = true;
        }
      }
      
      // Calculate workload percentage (based on in-progress orders)
      // Assuming 3 orders is 100% workload
      partner.workloadPercentage = Math.min((partner.inProgressOrders / 3) * 100, 100);
      
      // Determine workload status
      if (partner.workloadPercentage >= 66) {
        partner.workloadStatus = 'High';
      } else if (partner.workloadPercentage >= 33) {
        partner.workloadStatus = 'Medium';
      } else {
        partner.workloadStatus = 'Low';
      }
    });
    
    // Convert map to array and sort by total orders
    const statsArray = Object.values(statsMap).sort((a, b) => b.totalOrders - a.totalOrders);
    console.log('Calculated partner stats:', statsArray);
    setPartnerStats(statsArray);
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
    
    // Listen for delivery completion events specifically for analytics
    socket.on('delivery_completed', (data) => {
      console.log('Delivery completed event received for analytics:', data);
      fetchData(); // Refresh analytics data when an order is delivered
    });
    
    // Clean up event listeners on unmount
    return () => {
      socket.off('delivery_partner_availability_changed');
      socket.off('order_status_updated');
      socket.off('order_assigned_to_partner');
      socket.off('delivery_completed');
    };
  }, [socket]);
  
  if (loading && partnerStats.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Link 
            to="/manager" 
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 px-3 py-2 rounded-lg transition duration-200 flex items-center mr-4"
            aria-label="Back to Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Delivery Partner Analytics</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`text-sm px-3 py-1 rounded-full ${connected ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:bg-opacity-20 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:bg-opacity-20 dark:text-red-100'}`}>
            <span className="mr-1">•</span>
            {socketStatus}
          </div>
          
          <button 
            onClick={fetchData} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center"
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
      
      {/* Partner Performance Overview */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Partner Performance Overview</h2>
        
        <div className="text-xs text-gray-500 mb-3">
          * Indicates estimated delivery time where precise timestamps were not available
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Progress</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Delivery Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {partnerStats.map((partner) => (
                <tr key={partner.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${partner.isAvailable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {partner.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {partner.totalOrders}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {partner.completedOrders}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {partner.inProgressOrders}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {partner.avgDeliveryTime > 0 
                      ? `${partner.avgDeliveryTime.toFixed(1)} min${partner.hasEstimatedDeliveryTime ? '*' : ''}` 
                      : 'N/A'}
                  </td>
                </tr>
              ))}
              
              {partnerStats.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-3 text-center text-sm text-gray-500">
                    No delivery partner data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Partner Workload Distribution */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Partner Workload Distribution</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partnerStats.map((partner) => (
            <div key={partner.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="h-10 w-10 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className={`h-2 w-2 rounded-full ${partner.isAvailable ? 'bg-green-500' : 'bg-gray-500'} mr-1`}></span>
                    {partner.isAvailable ? 'Available' : 'Unavailable'}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Total Orders</span>
                  <span className="text-sm font-medium">{partner.totalOrders}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Completed</span>
                  <span className="text-sm font-medium text-green-600">{partner.completedOrders}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">In Progress</span>
                  <span className="text-sm font-medium text-blue-600">{partner.inProgressOrders}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Avg. Delivery Time</span>
                  <span className="text-sm font-medium">{partner.avgDeliveryTime.toFixed(1)} min</span>
                </div>
                
                {/* Progress bar for workload */}
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">Workload</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${partner.inProgressOrders > 2 ? 'bg-red-500' : partner.inProgressOrders > 0 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min((partner.inProgressOrders / 3) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {partnerStats.length === 0 && (
            <div className="col-span-3 text-center py-4 text-gray-500">
              No delivery partner data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerAnalytics;