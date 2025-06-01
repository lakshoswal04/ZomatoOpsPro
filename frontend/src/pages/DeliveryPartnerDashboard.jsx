import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext';
import { getAssignedOrders, updateOrderStatus, updateAvailability } from '../utils/api.js';
import OrderCard from '../components/OrderCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useNavigate } from 'react-router-dom';

const DeliveryPartnerDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState(user?.isAvailable || false);
  const [socketStatus, setSocketStatus] = useState(connected ? 'Connected' : 'Disconnected');
  
  // Check if user is authenticated and has the correct role
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (!user) {
      console.error('User object is null');
      navigate('/login');
      return;
    }
    
    // Default to delivery_partner role if missing
    const userRole = user.role || 'delivery_partner';
    console.log('User role:', userRole);
    
    if (userRole !== 'delivery_partner') {
      console.error('Unauthorized access attempt');
      navigate('/login');
    }
  }, [user, isAuthenticated, navigate]);
  
  // Load assigned orders on component mount
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await getAssignedOrders();
        setOrders(res.data);
        setError('');
      } catch (err) {
        setError('Failed to load orders. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
    
    // Set up socket connection status
    if (connected) {
      setSocketStatus('Connected');
    } else {
      setSocketStatus('Disconnected');
    }
  }, [connected]);
  
  // Update availabilityStatus when user changes
  useEffect(() => {
    if (user) {
      console.log('User object updated, availability:', user.isAvailable);
      setAvailabilityStatus(user.isAvailable);
    }
  }, [user]);
  
  // Force refresh orders and availability status when component mounts
  useEffect(() => {
    const refreshUserStatus = async () => {
      try {
        // Get the latest user data from the backend
        const res = await getAssignedOrders();
        // If user has active orders, they should be unavailable
        const hasActiveOrders = res.data.some(order => 
          order.status !== 'DELIVERED' && order.status !== 'CANCELLED'
        );
        
        if (hasActiveOrders && user && user.isAvailable) {
          console.log('User has active orders but shows as available - fixing status');
          setAvailabilityStatus(false);
          user.isAvailable = false;
        } else if (!hasActiveOrders && user && !user.isAvailable) {
          console.log('User has no active orders but shows as unavailable - status should be adjustable');
        }
      } catch (err) {
        console.error('Error refreshing user status:', err);
      }
    };
    
    refreshUserStatus();
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    // Listen for order assignment events
    socket.on('order_assigned', (data) => {
      console.log('New order assigned:', data);
      
      // When an order is assigned, the delivery partner becomes unavailable
      if (user) {
        // Update the user's availability status directly
        user.isAvailable = false;
        // Update the state for UI
        setAvailabilityStatus(false);
        console.log('Setting availability to false due to order assignment');
      }
      
      // Fetch orders to get the full order details
      const fetchOrders = async () => {
        try {
          const res = await getAssignedOrders();
          console.log('Fetched orders after assignment:', res.data);
          setOrders(res.data);
          
          // Force UI update
          setLoading(prev => {
            setTimeout(() => setLoading(false), 0);
            return true;
          });
        } catch (err) {
          console.error('Error fetching orders after assignment:', err);
        }
      };
      
      fetchOrders();
    });
    
    // Listen for order status updates
    socket.on('order_status_updated', (data) => {
      console.log('Order status updated:', data);
      
      // Update the order in the orders list
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.orderId === data.orderId 
            ? { ...order, status: data.status } 
            : order
        )
      );
    });
    
    // Listen for availability updates
    socket.on('availability_updated', (data) => {
      console.log('Availability updated via WebSocket:', data);
      
      // Update the user's availability in the auth context
      if (user) {
        // Create a new user object to ensure React detects the change
        const updatedUser = { ...user, isAvailable: data.isAvailable };
        // Update the user reference
        Object.assign(user, updatedUser);
        
        // Update the state variable for UI display
        setAvailabilityStatus(data.isAvailable);
        
        // Force a re-render with a state update
        setError(''); // Clear any errors
        // Update a state variable to force re-render
        setLoading(prev => {
          setTimeout(() => setLoading(false), 0); // Reset loading state after render
          return true; // Temporarily set to true to trigger re-render
        });
        
        console.log('User availability updated to:', data.isAvailable);
      }
    });
    
    // Clean up event listeners on unmount
    return () => {
      socket.off('order_assigned');
      socket.off('order_status_updated');
      socket.off('availability_updated');
    };
  }, [socket, user]);
  
  // Validate status transition based on current status
  const isValidStatusTransition = (currentStatus, newStatus) => {
    const validTransitions = {
      'ASSIGNED': ['PICKED_UP'],
      'PICKED_UP': ['ON_ROUTE'],
      'ON_ROUTE': ['DELIVERED']
    };
    
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  };

  // Update order status with sequential enforcement
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      // Find the current order
      const currentOrder = orders.find(order => order.orderId === orderId);
      if (!currentOrder) {
        setError('Order not found. Please refresh the page.');
        return;
      }
      
      // Validate the status transition
      if (!isValidStatusTransition(currentOrder.status, newStatus)) {
        setError(`Invalid status transition from ${currentOrder.status} to ${newStatus}. Please follow the correct sequence.`);
        return;
      }
      
      console.log(`Sending status update request for order ${orderId} from ${currentOrder.status} to: ${newStatus}`);
      
      // Make the API call to update the order status
      const res = await updateOrderStatus(orderId, newStatus);
      console.log('Status update response:', res.data);
      
      // Get the updated order from the response
      const updatedOrder = res.data.order;
      
      // Update orders state with the new order data
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.orderId === orderId ? updatedOrder : order
        )
      );
      
      // If this is the final status (DELIVERED), update availability and analytics
      if (newStatus === 'DELIVERED' && user) {
        // Update local state to show as available
        setAvailabilityStatus(true);
        user.isAvailable = true; // Update the user object directly
        console.log('Order delivered, updating availability to true');
        
        // Record delivery time for analytics
        updatedOrder.deliveredTime = new Date().toISOString();
        
        // Also update availability on the server
        try {
          await updateAvailability(true);
          console.log('Availability updated on server after delivery completion');
          
          // Force analytics update via socket
          if (socket) {
            socket.emit('delivery_completed', {
              orderId: orderId,
              partnerId: user.id,
              deliveredTime: updatedOrder.deliveredTime
            });
            console.log('Emitted delivery_completed event for analytics update');
          }
        } catch (availErr) {
          console.error('Failed to update availability on server:', availErr);
        }
        
        // Force a UI update
        setLoading(prev => {
          setTimeout(() => setLoading(false), 0);
          return true;
        });
      }
      
      // Refresh the orders list to get the latest data
      const refreshOrders = async () => {
        try {
          const refreshRes = await getAssignedOrders();
          setOrders(refreshRes.data);
        } catch (refreshErr) {
          console.error('Error refreshing orders after status update:', refreshErr);
        }
      };
      
      refreshOrders();
      
    } catch (err) {
      console.error('Error updating order status:', err);
      if (err.response?.data?.msg) {
        setError(err.response.data.msg);
      } else {
        setError('Failed to update order status. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle availability
  const toggleAvailability = async () => {
    // Check if there are any active orders
    if (orders.some(order => order.status !== 'DELIVERED' && order.status !== 'CANCELLED')) {
      setError('Cannot change availability while you have active orders.');
      return;
    }
    
    try {
      setLoading(true);
      // Use isAvailable property instead of available
      const newAvailability = !availabilityStatus;
      console.log('Toggling availability to:', newAvailability);
      
      const response = await updateAvailability(newAvailability);
      console.log('Availability update response:', response.data);
      
      // Update local state immediately for better UX
      if (user) {
        user.isAvailable = newAvailability;
      }
      
      // Update the state variable for UI display
      setAvailabilityStatus(newAvailability);
      
      // Force a re-render
      setError('');
    } catch (err) {
      console.error('Error updating availability:', err.response?.data || err.message);
      setError('Failed to update availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-gradient-to-r from-primary-600 to-primary-700 dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl shadow-md text-white animate-fadeIn">
      <div className="mb-4 md:mb-0">
      <h1 className="text-2xl font-bold mb-1">Delivery Partner Dashboard</h1>
      <p className="text-primary-100 dark:text-gray-300">
      Welcome back, {user?.name || 'Partner'}
      </p>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 bg-white bg-opacity-10 p-3 rounded-lg backdrop-filter backdrop-blur-sm">
      <div className={`text-sm px-3 py-1 rounded-full flex items-center ${connected ? 'bg-green-500 bg-opacity-20 text-green-100' : 'bg-red-500 bg-opacity-20 text-red-100'}`}>
      <span className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
      {socketStatus}
      </div>
      <div className="flex items-center space-x-2">
      <span>Status:</span>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${availabilityStatus ? 'bg-green-500 bg-opacity-20 text-green-100' : 'bg-red-500 bg-opacity-20 text-red-100'}`}>
      {availabilityStatus ? 'Available' : 'Unavailable'}
      </span>
      </div>
      
      <button
      onClick={toggleAvailability}
      className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 ${availabilityStatus ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400' : 'bg-green-500 hover:bg-green-600 focus:ring-green-400'} text-white ${(loading || orders.some(order => order.status !== 'DELIVERED' && order.status !== 'CANCELLED')) ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={loading || orders.some(order => order.status !== 'DELIVERED' && order.status !== 'CANCELLED')}
      >
      {availabilityStatus ? 'Go Offline' : 'Go Online'}
      </button>
      </div>
      </div>
      

      {error && (
      <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-4 animate-slideIn">
      {error}
      </div>
      )}
      

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-lg animate-slideIn">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-200 dark:border-gray-700">
      Your Assigned Orders
      </h2>
      
      {orders.length === 0 ? (
      <div className="text-center py-8">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-gray-500 dark:text-gray-400">No orders assigned to you yet.</p>
      </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {orders.map((order) => (
      <div key={order.orderId} className="order-card dark:bg-gray-700 dark:border-gray-600 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
      <OrderCard 
      order={order} 
      onStatusUpdate={handleStatusUpdate} 
      isDeliveryPartner={true} 
      />
      </div>
      ))}
      </div>
      )}
      </div>
      

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mt-8 border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-lg animate-slideIn">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-200 dark:border-gray-700">
      Completed Orders
      </h2>
      
      {orders.filter(order => order.status === 'DELIVERED').length === 0 ? (
      <div className="text-center py-8">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
      <p className="text-gray-500 dark:text-gray-400">No completed orders yet.</p>
      </div>
      ) : (
      <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      <thead>
      <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 uppercase text-sm leading-normal">
      <th className="py-3 px-6 text-left">Order ID</th>
      <th className="py-3 px-6 text-left">Items</th>
      <th className="py-3 px-6 text-left">Dispatch Time</th>
      <th className="py-3 px-6 text-left">Completed At</th>
      </tr>
      </thead>
      <tbody className="text-gray-600 dark:text-gray-300 text-sm">
      {orders.filter(order => order.status === 'DELIVERED').map((order) => (
      <tr key={order.orderId} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
      <td className="py-3 px-6 text-left">{order.orderId}</td>
      <td className="py-3 px-6 text-left">
      <ul className="list-disc list-inside">
      {order.items.map((item, index) => (
      <li key={index}>
      {item.name} x{item.quantity}
      </li>
      ))}
      </ul>
      </td>
      <td className="py-3 px-6 text-left">{new Date(order.dispatchTime).toLocaleString()}</td>
      <td className="py-3 px-6 text-left">{new Date(order.updatedAt).toLocaleString()}</td>
      </tr>
      ))}
      </tbody>
      </table>
      </div>
      )}
      </div>
    </div>
  );
};

export default DeliveryPartnerDashboard;
