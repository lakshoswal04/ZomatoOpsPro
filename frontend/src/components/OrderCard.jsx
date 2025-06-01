import React from 'react';
import OrderTracker from './OrderTracker.jsx';

const OrderCard = ({ order, onStatusUpdate, isDeliveryPartner = false }) => {
  // Map backend status to frontend display status
  const mapStatusForDisplay = (backendStatus) => {
    const statusMap = {
      'PREPARING': 'PREP',
      'READY_FOR_PICKUP': 'READY',
      'ASSIGNED': 'ASSIGNED',
      'PICKED_UP': 'PICKED',
      'ON_ROUTE': 'ON_ROUTE',
      'DELIVERED': 'DELIVERED',
      'CANCELLED': 'CANCELLED'
    };
    return statusMap[backendStatus] || backendStatus;
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    const displayStatus = mapStatusForDisplay(status);
    switch (displayStatus) {
      case 'PREP':
        return 'status-badge status-prep';
      case 'READY':
        return 'status-badge status-ready';
      case 'ASSIGNED':
        return 'status-badge status-assigned';
      case 'PICKED':
        return 'status-badge status-picked';
      case 'ON_ROUTE':
        return 'status-badge status-on-route';
      case 'DELIVERED':
        return 'status-badge status-delivered';
      case 'CANCELLED':
        return 'status-badge status-cancelled';
      default:
        return 'status-badge';
    }
  };

  // Get next valid status for an order
  const getNextStatus = (currentStatus) => {
    // This maps the current backend status to the next valid backend status
    // These must match exactly what the backend expects
    const statusFlow = {
      'ASSIGNED': 'PICKED_UP',
      'PICKED_UP': 'ON_ROUTE',
      'ON_ROUTE': 'DELIVERED'
    };
    
    const nextStatus = statusFlow[currentStatus] || null;
    console.log(`Next status for ${currentStatus} is ${nextStatus}`);
    return nextStatus;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  // Calculate total price
  const calculateTotal = () => {
    if (!order?.items || !Array.isArray(order.items) || order.items.length === 0) {
      return '0.00';
    }
    
    try {
      return order.items.reduce((total, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 0;
        return total + (price * quantity);
      }, 0).toFixed(2);
    } catch (err) {
      console.error('Error calculating total in OrderCard:', err);
      return '0.00';
    }
  };

  return (
    <div className="order-card">
      <div className="flex flex-wrap justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Order #{order.orderId}</h3>
          <p className="text-gray-600">Created: {formatDate(order.createdAt)}</p>
          {order.dispatchTime && (
            <p className="text-gray-600">Dispatch: {formatDate(order.dispatchTime)}</p>
          )}
        </div>
        
        <div className="flex items-center">
          <span className={getStatusBadgeClass(order.status)}>
            {order.status}
          </span>
        </div>
      </div>
      
      {/* Order Items */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Items:</h4>
        <ul className="list-disc list-inside">
          {order?.items && Array.isArray(order.items) ? order.items.map((item, index) => (
            <li key={index} className="text-gray-700">
              {item.name} x{item.quantity} - ₹{parseFloat(item.price).toFixed(2)}
            </li>
          )) : (
            <li className="text-gray-700">No items available</li>
          )}
        </ul>
        <div className="mt-2 font-semibold">
          Total: ₹{calculateTotal()}
        </div>
      </div>
      
      {/* Order Tracker - Now interactive for delivery partners */}
      <OrderTracker 
        currentStatus={order.status} 
        isDeliveryPartner={isDeliveryPartner}
        onStatusUpdate={onStatusUpdate}
        orderId={order.orderId}
      />
      
      {/* Action Button for Delivery Partner */}
      {isDeliveryPartner && getNextStatus(order.status) && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => {
              const nextStatus = getNextStatus(order.status);
              console.log(`Directly updating order ${order.orderId} status to: ${nextStatus}`);
              onStatusUpdate(order.orderId, nextStatus);
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Update to {getNextStatus(order.status)}
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderCard;
