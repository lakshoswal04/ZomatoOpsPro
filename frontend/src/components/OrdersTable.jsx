import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { assignDeliveryPartner } from '../utils/api.js';

const OrdersTable = ({ orders, userRole, onOrderUpdate, onRefresh }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [availablePartners, setAvailablePartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newPrepTime, setNewPrepTime] = useState('');

  // Fetch available delivery partners when needed
  useEffect(() => {
    if (selectedOrder && userRole === 'manager') {
      fetchDeliveryPartners();
    }
  }, [selectedOrder, userRole]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Format time helper function
  const formatTime = (date) => {
    if (!date) return 'Not set';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate dispatch time and estimated delivery time
  const calculateDispatchTime = (prepTimeMinutes, etaMinutes) => {
    const now = new Date();
    const prepTimeMs = prepTimeMinutes * 60 * 1000; // Convert minutes to milliseconds
    const etaMs = etaMinutes * 60 * 1000; // Convert minutes to milliseconds
    
    // Calculate dispatch time: current time + prep time
    const dispatchTime = new Date(now.getTime() + prepTimeMs);
    
    // Calculate estimated delivery time: dispatch time + ETA
    const estimatedDeliveryTime = new Date(dispatchTime.getTime() + etaMs);
    
    return {
      dispatchTime,
      estimatedDeliveryTime
    };
  };

  // Get status badge class based on status
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PREPARING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
      case 'READY_FOR_PICKUP':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'ASSIGNED':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300';
      case 'PICKED_UP':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
      case 'ON_ROUTE':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  // Fetch available delivery partners
  const fetchDeliveryPartners = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users/delivery-partners', {
        headers: {
          'x-auth-token': token
        }
      });
      setAvailablePartners(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch delivery partners');
      setLoading(false);
    }
  };

  // Handle assigning a delivery partner to an order
  const handleAssignPartner = async (orderId) => {
    if (!selectedPartner) {
      setError('Please select a delivery partner');
      return;
    }
    
    // Log detailed debugging information
    console.log('Selected partner ID:', selectedPartner);
    console.log('Available partners:', availablePartners);
    console.log('Selected order ID:', orderId);
    
    // Find the selected partner in the availablePartners array
    const selectedPartnerObj = availablePartners.find(p => 
      p._id === selectedPartner || p.id === selectedPartner
    );
    
    if (!selectedPartnerObj) {
      setError('Selected partner not found or no longer available');
      return;
    }
    
    // Check if partner is actually available
    if (!selectedPartnerObj.isAvailable) {
      setError('This delivery partner is no longer available. Please select another partner.');
      return;
    }
    
    // Check if partner already has an assigned order
    if (selectedPartnerObj.currentOrderId) {
      setError('This delivery partner is already assigned to another order. Please select another partner.');
      return;
    }
    
    // Find the order being assigned
    const orderToAssign = orders.find(o => o.orderId === orderId);
    if (!orderToAssign) {
      setError('Order not found. Please refresh the page.');
      return;
    }
    
    // Validate prep time is set
    if (!orderToAssign.prepTime || orderToAssign.prepTime <= 0) {
      setError('Please set a valid preparation time before assigning a delivery partner.');
      return;
    }
    
    // Determine the correct ID to send - use the actual ID from the object if possible
    const partnerIdToSend = selectedPartnerObj._id || selectedPartnerObj.id;
    
    console.log('Partner ID being sent to API:', partnerIdToSend);
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Calculate dispatch time and ETA based on prep time
      const orderToAssign = orders.find(o => o.orderId === orderId);
      const eta = 30; // Default ETA in minutes (can be adjusted based on distance/traffic)
      const { dispatchTime, estimatedDeliveryTime } = calculateDispatchTime(orderToAssign.prepTime, eta);
      
      console.log(`Calculated dispatch time: ${formatTime(dispatchTime)}`);
      console.log(`Estimated delivery time: ${formatTime(estimatedDeliveryTime)}`);
      
      const response = await assignDeliveryPartner(
        orderId, 
        partnerIdToSend, 
        dispatchTime.toISOString(), 
        estimatedDeliveryTime.toISOString(), 
        eta
      );
    
    setSuccess('Delivery partner assigned successfully');
    setSelectedOrder(null);
    setSelectedPartner('');
    
    // Refresh orders list
    if (onRefresh) onRefresh();
    } catch (err) {
    console.error('Error assigning partner:', err);
    setError(err.response?.data?.msg || err.message || 'Failed to assign delivery partner');
    } finally {
    setLoading(false);
    }
  };

  // Handle updating order status
  const handleUpdateStatus = async (orderId, newStatus) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON response
        const textData = await response.text();
        if (!response.ok) {
          throw new Error(textData || 'Failed to update order status');
        }
        data = { message: textData };
      }
      
      if (!response.ok) {
        throw new Error(data.msg || 'Failed to update order status');
      }
      
      setSuccess(data.message || `Order status updated to ${formatStatus(newStatus)}`);
      
      // Refresh orders list
      if (onRefresh) onRefresh();
      if (onOrderUpdate) onOrderUpdate();
    } catch (err) {
      setError(err.message || 'Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  // Handle updating preparation time
  const handleUpdatePrepTime = async (orderId) => {
    if (!newPrepTime || newPrepTime < 1) {
      setError('Please enter a valid preparation time');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}/prep-time`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ prepTime: parseInt(newPrepTime) })
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON response
        const textData = await response.text();
        if (!response.ok) {
          throw new Error(textData || 'Failed to update preparation time');
        }
        data = { message: textData };
      }
      
      if (!response.ok) {
        throw new Error(data.msg || 'Failed to update preparation time');
      }
      
      setSuccess(data.message || 'Preparation time updated successfully');
      setSelectedOrder(null);
      setNewPrepTime('');
      
      // Refresh orders list
      if (onRefresh) onRefresh();
      if (onOrderUpdate) onOrderUpdate();
    } catch (err) {
      setError(err.message || 'Failed to update preparation time');
    } finally {
      setLoading(false);
    }
  };
  
  // The calculateDispatchTime function is already defined above

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  // Calculate total price for an order
  const calculateTotal = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return '0.00';
    }
    
    try {
      // Make sure we're working with numbers
      let total = 0;
      
      for (const item of items) {
        // Extract price - handle all possible formats
        let price = 0;
        if (item.price !== undefined && item.price !== null) {
          if (typeof item.price === 'number') {
            price = item.price;
          } else if (typeof item.price === 'string') {
            // Remove currency symbols and other non-numeric characters
            const priceString = item.price.replace(/[^0-9.]/g, '');
            price = parseFloat(priceString);
            if (isNaN(price)) price = 0;
          }
        }
        
        // Extract quantity - handle all possible formats
        let quantity = 0;
        if (item.quantity !== undefined && item.quantity !== null) {
          if (typeof item.quantity === 'number') {
            quantity = item.quantity;
          } else if (typeof item.quantity === 'string') {
            quantity = parseInt(item.quantity);
            if (isNaN(quantity)) quantity = 0;
          }
        }
        
        const itemTotal = price * quantity;
        total += itemTotal;
      }
      
      return total.toFixed(2);
    } catch (err) {
      console.error('Error calculating total:', err);
      return '0.00';
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-800">
          <span className="text-primary-600">Orders</span> Management
        </h2>
        <div className="text-sm text-neutral-500 dark:text-neutral-400">{new Date().toLocaleDateString()}</div>
      </div>

      {success && (
        <div className="bg-accent-50 border border-accent-300 text-accent-700 px-4 py-3 rounded-lg mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}

      {error && (
        <div className="bg-primary-50 border border-primary-300 text-primary-700 px-4 py-3 rounded-lg mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {!orders || orders.length === 0 ? (
        <div className="text-center py-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2 font-medium">No orders yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-card dark:shadow-gray-900/30">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-xl">
            <thead>
              <tr className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/40 dark:to-primary-800/40 text-neutral-700 dark:text-neutral-200 text-sm font-medium">
                <th className="py-4 px-6 text-left rounded-tl-xl">Order ID</th>
                <th className="py-4 px-6 text-left">Customer</th>
                <th className="py-4 px-6 text-left">Items</th>
                <th className="py-4 px-6 text-left">Total</th>
                <th className="py-4 px-6 text-left">Prep Time</th>
                <th className="py-4 px-6 text-left">Status</th>
                <th className="py-4 px-6 text-left">Delivery Partner</th>
                <th className="py-4 px-6 text-left">Dispatch Time</th>
                <th className="py-4 px-6 text-left">Est. Delivery</th>
                <th className="py-4 px-6 text-left rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders && orders.length > 0 ? orders.map((order, index) => (
                <tr key={order.orderId} className={`border-b border-neutral-100 dark:border-gray-700 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-neutral-50 dark:bg-gray-750'} hover:bg-primary-50 dark:hover:bg-primary-900/20 transition duration-150`}>
                  <td className="py-4 px-6 text-left">
                    <span className="font-medium text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-full text-sm">{order.orderId}</span>
                  </td>
                  <td className="py-4 px-6 text-left">
                    <div>
                      <p className="font-medium text-neutral-800 dark:text-neutral-100">{order.customerName}</p>
                      <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        {order.customerPhone}
                      </div>
                      <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate max-w-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate">{order.customerAddress}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-left">
                    <div className="max-h-24 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary-200 dark:scrollbar-thumb-primary-700 scrollbar-track-neutral-50 dark:scrollbar-track-gray-700">
                      {order.items && order.items.map((item, idx) => (
                        <div key={idx} className="text-sm mb-2 flex items-center">
                          <span className="bg-secondary-50 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-400 rounded-full px-2 py-0.5 text-xs font-medium mr-2">
                            {item.quantity}x
                          </span>
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">{item.name}</span>
                          <span className="text-neutral-500 dark:text-neutral-400 ml-auto">₹{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-left">
                    <div className="font-medium text-lg text-neutral-800 dark:text-neutral-100">
                      <span className="text-primary-600 dark:text-primary-400">₹</span>
                      {order.totalAmount ? 
                        (typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : order.totalAmount) : 
                        calculateTotal(order.items || [])}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-left">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{order.prepTime} mins</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-left">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-left">
                    {order.deliveryPartnerId ? (
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-400 flex items-center justify-center mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          {typeof order.deliveryPartnerId === 'object' ? order.deliveryPartnerId.name : 'Assigned'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-neutral-500 dark:text-neutral-400 italic">Not assigned</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-left">
                    {order.dispatchTime ? (
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <div className="font-medium text-neutral-700 dark:text-neutral-300">{formatTime(new Date(order.dispatchTime))}</div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(order.dispatchTime).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ) : <span className="text-neutral-500 italic">Not set</span>}
                  </td>
                  <td className="py-4 px-6 text-left">
                    {order.estimatedDeliveryTime ? (
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <div className="font-medium text-neutral-700 dark:text-neutral-300">{formatTime(new Date(order.estimatedDeliveryTime))}</div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(order.estimatedDeliveryTime).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ) : order.dispatchTime && order.prepTime ? (
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <div className="font-medium text-neutral-700 dark:text-neutral-300">{formatTime(new Date(new Date(order.dispatchTime).getTime() + (30 * 60 * 1000)))}</div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 italic">Auto-calculated</div>
                        </div>
                      </div>
                    ) : <span className="text-neutral-500 italic">Not set</span>}
                  </td>
                  <td className="py-4 px-6 text-left">
                    <div className="flex flex-col space-y-2">
                      {/* Assign delivery partner button - only for managers */}
                      {userRole === 'manager' && order.status === 'READY_FOR_PICKUP' && !order.deliveryPartnerId && (
                        <button
                          onClick={() => setSelectedOrder(order.orderId === selectedOrder ? null : order.orderId)}
                          className="px-3 py-1.5 text-xs bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition duration-150 flex items-center justify-center font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                          </svg>
                          Assign Partner
                        </button>
                      )}
                      
                      {/* Update status buttons based on current status and role */}
                      {userRole === 'manager' && order.status === 'PREPARING' && (
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'READY_FOR_PICKUP')}
                          className="px-3 py-1.5 text-xs bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition duration-150 flex items-center justify-center font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Mark Ready
                        </button>
                      )}
                      
                      {/* Delivery partner actions - only for assigned orders */}
                      {userRole === 'delivery_partner' && order.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'PICKED_UP')}
                          className="px-3 py-1.5 text-xs bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition duration-150 flex items-center justify-center font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                          </svg>
                          Mark Picked Up
                        </button>
                      )}
                      
                      {userRole === 'delivery_partner' && order.status === 'PICKED_UP' && (
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'ON_ROUTE')}
                          className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white rounded-lg transition duration-150 flex items-center justify-center font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                          </svg>
                          Mark On Route
                        </button>
                      )}
                      
                      {userRole === 'delivery_partner' && order.status === 'ON_ROUTE' && (
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'DELIVERED')}
                          className="px-3 py-1.5 text-xs bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition duration-150 flex items-center justify-center font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Mark Delivered
                        </button>
                      )}
                      
                      {/* Cancel order button - only for managers */}
                      {userRole === 'manager' && ['PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED'].includes(order.status) && (
                        <button
                          onClick={() => handleUpdateStatus(order.orderId, 'CANCELLED')}
                          className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-150 flex items-center justify-center font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Cancel Order
                        </button>
                      )}
                      
                      {/* Update prep time button - only for managers */}
                      {userRole === 'manager' && ['PREPARING', 'READY_FOR_PICKUP'].includes(order.status) && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order.orderId === selectedOrder ? null : order.orderId);
                            setNewPrepTime(order.prepTime.toString());
                          }}
                          className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition duration-150 flex items-center justify-center font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          Update Prep Time
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="9" className="py-4 text-center text-neutral-500 font-medium italic">
                    No orders available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Modal for assigning delivery partner */}
      {selectedOrder && availablePartners && availablePartners.length > 0 && !newPrepTime && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96 border border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-800">Assign Delivery Partner</h3>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="mb-5">
              <label className="block text-neutral-700 text-sm font-medium mb-2">Select Delivery Partner</label>
              <div className="relative">
                <select
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 appearance-none text-neutral-800 bg-white"
                  value={selectedPartner}
                  onChange={(e) => setSelectedPartner(e.target.value)}
                >
                  <option value="">Select a partner</option>
                  {availablePartners && availablePartners.map(partner => {
                    // Use _id if available, otherwise fall back to id
                    const partnerId = partner._id || partner.id;
                    return (
                      <option key={partnerId} value={partnerId}>
                        {partner.name}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setSelectedPartner('');
                }}
                className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition duration-150 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssignPartner(selectedOrder)}
                className="px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition duration-150 disabled:bg-neutral-300 disabled:text-neutral-500 font-medium text-sm flex items-center justify-center"
                disabled={loading || !selectedPartner}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Assigning...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                    </svg>
                    Assign
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for updating prep time */}
      {selectedOrder && newPrepTime !== '' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96 border border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-800">Update Preparation Time</h3>
              <button 
                onClick={() => {
                  setSelectedOrder(null);
                  setNewPrepTime('');
                }}
                className="text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="mb-5">
              <label className="block text-neutral-700 text-sm font-medium mb-2">Preparation Time (minutes)</label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 text-neutral-800"
                  value={newPrepTime}
                  onChange={(e) => setNewPrepTime(e.target.value)}
                  min="1"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setNewPrepTime('');
                }}
                className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition duration-150 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdatePrepTime(selectedOrder)}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition duration-150 disabled:bg-neutral-300 disabled:text-neutral-500 font-medium text-sm flex items-center justify-center"
                disabled={loading || !newPrepTime || newPrepTime < 1}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Update
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTable;
